"""Read existing jiwen state for user-initiated chat without advancing it."""
from contextlib import closing
from pathlib import Path
import sqlite3
import presence_audit
import presence_tone


def prepare(database, session_id, user_message_id, run_id):
    # Keep background work and unrelated/deleted user messages out of this path.
    if type(user_message_id) is not int or user_message_id <= 0:
        return '', None
    try:
        with closing(sqlite3.connect(Path(database).resolve().as_uri()+'?mode=ro', uri=True, timeout=.5)) as db:
            valid = db.execute("SELECT 1 FROM messages WHERE id=? AND session_id=? AND role='user' AND COALESCE(hidden,0)=0",
                               (user_message_id, session_id)).fetchone()
    except sqlite3.Error:
        return '', None
    if not valid:
        return '', None
    snapshot = {}
    hint = presence_tone.read(database, snapshot=snapshot)
    if not hint:
        return '', None
    hint = hint.replace('【本次主动联系的积温状态参考】', '【本轮对话的积温状态参考】').replace('仍可自行决定暂不发送。', '')
    audit_id = presence_audit.start(database, session_id, 'chat', snapshot, hint, '', '',
                                    run_id=run_id, user_message_id=user_message_id)
    return hint, audit_id
