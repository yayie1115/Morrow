"""选项卡：AI 在回复末尾给 2-4 个选项，用户点一下当成普通消息发出去。

标记格式： [选项：A | B | C]
存储：消息的 attachments 里追加 {"type":"options","items":[...],...}
用户点选：用户消息挂 {"type":"pick","of":<AI消息id>,"idx":n,"text":...}
"""

from __future__ import annotations

import json
import re
import time

OPTIONS_CMD_PATTERN = re.compile(r"\[选项\s*[：:]\s*([^\[\]\n]{1,200})\]")
# 模型偶尔吐了半截就断了（没有右括号），定稿时也要清掉
OPTIONS_PARTIAL_PATTERN = re.compile(r"\[选项\s*[：:][^\[\]\n]*$")
MAX_ITEMS = 4
MAX_LEN = 14
PICK_TAG = "[用户点选了你给的选项]"


def extract_options(text):
    """返回 (剥掉标记的正文, attachments 列表)。少于 2 项当没写。"""
    src = str(text or "")
    items = []
    for match in OPTIONS_CMD_PATTERN.finditer(src):
        for part in re.split(r"[|｜]", match.group(1)):
            item = part.strip().strip("。.")
            if item and item not in items and len(items) < MAX_ITEMS:
                items.append(item[:MAX_LEN])
    cleaned = OPTIONS_PARTIAL_PATTERN.sub("", OPTIONS_CMD_PATTERN.sub("", src)).strip()
    if len(items) < 2:
        return cleaned, []
    return cleaned, [{"type": "options", "items": items, "asked_at": time.time()}]


def strip_marker(text):
    """只剥标记，不生成附件（TTS、编辑重发等路径用）。"""
    return OPTIONS_CMD_PATTERN.sub("", str(text or "")).strip()


def parse_attachments(raw):
    if isinstance(raw, list):
        return [item for item in raw if isinstance(item, dict)]
    try:
        value = json.loads(raw or "[]")
    except (TypeError, ValueError):
        return []
    return [item for item in value if isinstance(item, dict)] if isinstance(value, list) else []


def find_options(attachments):
    for item in parse_attachments(attachments):
        if item.get("type") == "options" and isinstance(item.get("items"), list):
            return item
    return None


def has_pick(attachments):
    return any(item.get("type") == "pick" for item in parse_attachments(attachments))


def pick_tail(attachments):
    """用户点选的那句进上下文时加的尾巴。"""
    return PICK_TAG if has_pick(attachments) else ""


def pick_attachment(pick, content):
    return {
        "type": "pick",
        "of": str(pick.get("msg_id") or ""),
        "idx": int(pick.get("idx") or 0),
        "text": str(pick.get("text") or content or "")[:40],
    }


def _load_versions(row):
    try:
        versions = json.loads(row["versions"]) if row["versions"] else None
    except (TypeError, ValueError):
        versions = None
    if not isinstance(versions, list) or not versions:
        versions = [{"c": row["content"] or "",
                     "r": row["reasoning"] or "",
                     "a": parse_attachments(row["attachments"])}]
    for version in versions:
        if isinstance(version, dict) and not isinstance(version.get("a"), list):
            version["a"] = parse_attachments(row["attachments"])
    return versions


def mark_answered(db, session_id, user_msg_id, pick=None):
    """把用户这句之前那条 AI 的 options 标成已答。幂等。"""
    target_id = None
    picked_idx = None
    if isinstance(pick, dict) and pick.get("msg_id"):
        try:
            target_id = int(pick["msg_id"])
        except (TypeError, ValueError):
            target_id = None
        try:
            picked_idx = int(pick.get("idx"))
        except (TypeError, ValueError):
            picked_idx = None
    row = None
    if target_id:
        candidate = db.execute(
            "SELECT id,session_id,role,content,reasoning,attachments,versions,active "
            "FROM messages WHERE id=? AND session_id=? AND role='assistant'",
            (target_id, session_id),
        ).fetchone()
        if candidate is not None:
            versions_candidate = _load_versions(candidate)
            index_candidate = candidate["active"] if isinstance(candidate["active"], int) else 0
            if 0 <= index_candidate < len(versions_candidate):
                active_attachments = parse_attachments(versions_candidate[index_candidate].get("a"))
                if find_options(active_attachments):
                    row = candidate
    if row is None:
        row = db.execute(
            "SELECT id,session_id,role,content,reasoning,attachments,versions,active "
            "FROM messages WHERE session_id=? AND role='assistant' AND id<? "
            "ORDER BY id DESC LIMIT 1",
            (session_id, user_msg_id),
        ).fetchone()
    if row is None:
        return None
    versions = _load_versions(row)
    index = row["active"] if isinstance(row["active"], int) and 0 <= (row["active"] or 0) < len(versions) else 0
    version = versions[index] if isinstance(versions[index], dict) else {}
    attachments = parse_attachments(version.get("a"))
    changed = False
    for item in attachments:
        if item.get("type") != "options" or item.get("answered_by"):
            continue
        count = len(item.get("items") or [])
        item["answered_by"] = str(user_msg_id)
        item["answered_at"] = time.time()
        item["picked"] = picked_idx if (picked_idx is not None and 0 <= picked_idx < count) else None
        changed = True
    if not changed:
        return None
    version["a"] = attachments
    versions[index] = version
    db.execute(
        "UPDATE messages SET versions=?, attachments=? WHERE id=?",
        (json.dumps(versions, ensure_ascii=False),
         json.dumps(attachments, ensure_ascii=False), row["id"]),
    )
    db.commit()
    return int(row["id"])


def question_of(content):
    """卡片上显示的问句：正文最后一行，去掉标记和 markdown。"""
    body = strip_marker(content or "")
    lines = [re.sub(r"[*_`#>]", "", line).strip() for line in body.splitlines()]
    lines = [line for line in lines if line]
    text = lines[-1] if lines else ""
    return text[-63:] if len(text) > 64 else text
