"""Select persisted text bubbles and sent photos; never accept client snapshots."""
import copy
import json
import re
import shutil
import uuid
from pathlib import Path


def parts(snapshot):
    text = str(snapshot.get("content") or "")
    # Mirror chat's blank-line grouping, including fenced code blocks.
    ranges, start, fenced, pos = [], 0, False, 0
    for line in text.splitlines(keepends=True):
        if re.match(r"^\s*(?:>\s*)?```", line):
            fenced = not fenced
        if not line.strip() and not fenced:
            if text[start:pos].strip():
                ranges.append((start, pos))
            start = pos + len(line)
        pos += len(line)
    if text[start:].strip():
        ranges.append((start, len(text)))
    # A voice artifact can split a text block into two visible bubbles.
    offsets = sorted({int(a.get("meta", {}).get("text_offset"))
                      for a in snapshot.get("artifacts", [])
                      if isinstance(a.get("meta"), dict)
                      and isinstance(a["meta"].get("text_offset"), int)
                      and 0 < a["meta"]["text_offset"] < len(text)})
    result = []
    for left, right in ranges:
        cuts = [left] + [v for v in offsets if left < v < right] + [right]
        for left, right in zip(cuts, cuts[1:]):
            while left < right and text[left].isspace():
                left += 1
            while right > left and text[right - 1].isspace():
                right -= 1
            value = text[left:right]
            if value and not re.fullmatch(r"-{3,}", value):
                result.append({"item_id": f"text:{left}:{right}", "kind": "text", "text": value})
    for index, attachment in enumerate(snapshot.get("attachments", [])):
        if attachment.get("type") == "image":
            result.append({"item_id": f"image:{index}", "kind": "image", "attachment": copy.deepcopy(attachment)})
    return result


def stored_keys(row):
    """Legacy snapshots cover the whole message, newer ones cover one version/part."""
    try:
        snapshots = json.loads(row["snapshot"] or "[]")
        ids = {int(v) for v in json.loads(row["message_ids"] or "[]")}
        result = set()
        for snapshot in snapshots:
            if not isinstance(snapshot, dict) or "message_id" not in snapshot:
                continue
            mid = int(snapshot["message_id"])
            part = snapshot.get("selection_id")
            result.add((mid, str(snapshot.get("source_token", "")), part) if part else (mid, "*", "*"))
        for mid in ids - {v[0] for v in result}:
            result.add((mid, "*", "*"))
        return result
    except (ValueError, TypeError, KeyError):
        return set()


def annotate(conn, candidate, snapshot, full=False):
    kept = {}
    for row in conn.execute("SELECT id,message_ids,snapshot FROM keepsakes"):
        for key in stored_keys(row):
            kept[key] = row["id"]
    items = []
    for part in parts(snapshot):
        item = {"item_id": part["item_id"], "kind": part["kind"]}
        if part["kind"] == "text":
            item["text" if full else "preview"] = part["text"] if full else part["text"][:240]
        else:
            item["name"] = part["attachment"].get("name", "已发送照片")
            if full:
                item["url"] = part["attachment"].get("url", "")
        key = (candidate["message_id"], candidate["source_token"], part["item_id"])
        kid = kept.get(key) or kept.get((candidate["message_id"], "*", "*"))
        item.update(already_kept=bool(kid), keepsake_id=kid)
        items.append(item)
    candidate["parts"] = items
    candidate["already_kept"] = bool(items) and all(p["already_kept"] for p in items)


def create(conn, args, session_id, snapshot_message, token_for, positive_id, uploads_dir):
    raw = args.get("selections")
    if not isinstance(raw, list) or not 1 <= len(raw) <= 10:
        raise ValueError("一张留影请选择 1～10 个文字气泡或已发送照片。")
    chosen = set()
    for item in raw:
        if not isinstance(item, dict) or not isinstance(item.get("item_id"), str):
            raise ValueError("请选择候选返回的气泡或照片编号。")
        chosen.add((positive_id(item.get("message_id")), item["item_id"]))
    ids = sorted({mid for mid, _ in chosen})
    tokens = args.get("source_tokens")
    if not isinstance(tokens, dict) or any(not isinstance(tokens.get(str(mid)), str) for mid in ids):
        raise ValueError("请先读取留影候选，提供对应 source_tokens。")
    created = []
    conn.execute("BEGIN IMMEDIATE")
    try:
        session = conn.execute("SELECT title FROM sessions WHERE id=?", (session_id,)).fetchone()
        if not session:
            raise ValueError("当前对话不存在。")
        rows = conn.execute("SELECT id,role,content,attachments,versions,active,created_at FROM messages "
                            "WHERE session_id=? AND hidden=0 AND role IN ('user','assistant') AND id IN ("
                            + ",".join("?" for _ in ids) + ") ORDER BY id", (session_id, *ids)).fetchall()
        if len(rows) != len(ids):
            raise ValueError("来源已删除、隐藏或不属于当前对话，请重新选择。")
        snapshots, keys = [], set()
        for row in rows:
            snap = snapshot_message(conn, row)
            token = token_for(row, snap)
            if token != tokens[str(row["id"])]:
                raise ValueError("消息版本已变化，请重新读取后选择，尚未保存。")
            found = set()
            for part in parts(snap):
                if (row["id"], part["item_id"]) not in chosen:
                    continue
                found.add(part["item_id"])
                value = {k: copy.deepcopy(snap[k]) for k in ("message_id", "role", "created_at")}
                value.update(content=part.get("text", ""), attachments=[part["attachment"]] if part["kind"] == "image" else [],
                             artifacts=[], selection_id=part["item_id"], source_token=token, source_version=int(row["active"] or 0))
                snapshots.append(value)
                keys.add((row["id"], token, part["item_id"]))
            if found != {pid for mid, pid in chosen if mid == row["id"]}:
                raise ValueError("所选气泡或照片不可用，请重新读取候选。")
        for row in conn.execute("SELECT id,message_ids,snapshot FROM keepsakes WHERE session_id=?", (session_id,)):
            existing = stored_keys(row)
            if existing == keys:
                conn.rollback()
                return {"ok": True, "keepsake_id": row["id"], "already_saved": True, "unchanged": True}
            if keys & existing or any((mid, "*", "*") in existing for mid in ids):
                raise ValueError("选中的片段已有留影，请取消已留影的部分。")
        # Only server-resolved, already-sent image paths can be copied.
        for snapshot in snapshots:
            for attachment in snapshot["attachments"]:
                if not uploads_dir:
                    raise ValueError("照片保存暂不可用，请稍后重试。")
                root = Path(uploads_dir).resolve()
                relative = attachment.get("path") or ""
                source = (root / relative).resolve()
                if not relative or not source.is_relative_to(root) or not source.is_file():
                    raise ValueError("原照片不可用，未保存本次留影。")
                folder = root / "keepsakes"
                folder.mkdir(exist_ok=True)
                if folder.is_symlink() or not folder.resolve().is_relative_to(root):
                    raise ValueError("照片保存目录不可用。")
                target = folder / (uuid.uuid4().hex + source.suffix.lower())
                created.append(target)
                shutil.copyfile(source, target)
                attachment["path"] = target.relative_to(root).as_posix()
                attachment["url"] = "/uploads/" + attachment["path"]
        caption = str(args.get("caption") or "").strip()[:1000]
        cursor = conn.execute("INSERT INTO keepsakes(session_id,session_title,message_ids,snapshot,note,favorite) VALUES (?,?,?,?,?,?)",
                              (session_id, session["title"] or "对话", json.dumps(ids), json.dumps(snapshots, ensure_ascii=False), caption, int(args.get("pinned") is True)))
        kid, comment = cursor.lastrowid, None
        reply = str(args.get("assistant_reply") or "").strip()[:2000]
        if reply:
            comment = conn.execute("INSERT INTO keepsake_comments(keepsake_id,author,content) VALUES (?,'assistant',?)", (kid, reply)).lastrowid
        conn.commit()
        return {"ok": True, "keepsake_id": kid, "message_ids": ids, "selection_count": len(keys), "comment_id": comment}
    except Exception as error:
        conn.rollback()
        for path in created:
            path.unlink(missing_ok=True)
        if isinstance(error, OSError):
            raise ValueError("照片副本暂时保存失败，本次留影未保存，请稍后重试。") from error
        raise
