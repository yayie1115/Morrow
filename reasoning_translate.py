"""把英文思考翻成中文存起来；原文不动。只在后台扫最近的消息，不改回复链路。"""
import json
import re
import sqlite3
from datetime import datetime, timedelta

import requests

PROVIDER_ID = 5
MODEL = "deepseek-flash"
CJK = re.compile(r"[\u4e00-\u9fff]")
MAX_PER_SWEEP = 3

SYSTEM = (
    "把下面这段英文推理翻译成简体中文。保持技术含义和语气，不要总结、不要删减、不要加解释。"
    "只输出译文，不要任何前后缀。"
)


def _needs_translation(text):
    text = (text or "").strip()
    if len(text) < 40:
        return False
    chinese = len(CJK.findall(text))
    return chinese / max(1, len(text)) < 0.15


def _provider(db):
    row = db.execute("SELECT api_url, api_key FROM providers WHERE id=?", (PROVIDER_ID,)).fetchone()
    if row is None:
        return None
    url = (row["api_url"] or "").rstrip("/")
    key = row["api_key"] or ""
    if not url or not key:
        return None
    return url, key


def _translate(url, key, text):
    payload = {
        "model": MODEL,
        "messages": [{"role": "system", "content": SYSTEM},
                     {"role": "user", "content": text[:6000]}],
        "temperature": 0,
        "max_tokens": 2000,
        "stream": False,
        "chat_template_kwargs": {"thinking": False},
    }
    response = requests.post(url + "/chat/completions",
                             headers={"Authorization": "Bearer " + key,
                                      "Content-Type": "application/json"},
                             json=payload, timeout=60)
    if response.status_code != 200:
        return ""
    body = response.json()
    message = ((body.get("choices") or [{}])[0].get("message") or {})
    content = message.get("content") or message.get("reasoning_content") or ""
    return content.strip()


def sweep(database):
    """每次最多翻 3 条，翻完写进 reasoning_cn。"""
    if not database:
        return 0
    try:
        db = sqlite3.connect(database, timeout=5)
    except sqlite3.Error:
        return 0
    db.row_factory = sqlite3.Row
    try:
        since = (datetime.now() - timedelta(hours=6)).strftime("%Y-%m-%d %H:%M:%S")
        rows = db.execute(
            "SELECT id, reasoning FROM messages WHERE role='assistant' "
            "AND length(reasoning) > 40 AND reasoning_cn='' AND created_at >= ? "
            "ORDER BY id DESC LIMIT 20", (since,)).fetchall()
        pending = [row for row in rows if _needs_translation(row["reasoning"])][:MAX_PER_SWEEP]
        if not pending:
            return 0
        credentials = _provider(db)
        if not credentials:
            return 0
        url, key = credentials
        done = 0
        for row in pending:
            try:
                translated = _translate(url, key, row["reasoning"])
            except Exception:
                continue
            if not translated:
                continue
            db.execute("UPDATE messages SET reasoning_cn=? WHERE id=?", (translated, row["id"]))
            db.commit()
            done += 1
        return done
    except sqlite3.Error:
        return 0
    finally:
        db.close()
