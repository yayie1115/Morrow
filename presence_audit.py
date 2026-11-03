"""Private local receipts for jiwen handoffs; never fed back into model context."""
from contextlib import closing
from pathlib import Path
import json
import logging
import sqlite3
from datetime import datetime


def start(database, session_id, purpose, snapshot, hint, protocol, event, run_id=None, user_message_id=None):
    detail = dict(version=1, session_id=session_id, purpose=purpose, snapshot=snapshot,
                  state_prompt=hint, protocol=protocol, event=event, run_id=run_id,
                  state_transmitted=bool(hint), status='started')
    if user_message_id is not None:
        detail['user_message_id'] = user_message_id
    try:
        with closing(sqlite3.connect(Path(database).resolve().as_uri()+'?mode=rw', uri=True, timeout=2)) as db, db:
            stamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            return db.execute("INSERT INTO presence_events(at,kind,action,reason,detail_json) VALUES (?,'handoff','handoff','积温交接记录',?)",
                              (stamp, json.dumps(detail, ensure_ascii=False))).lastrowid
    except sqlite3.Error:
        logging.warning('Jiwen handoff receipt unavailable')
        return None


def update(db, audit_id, status, message_id=None):
    if not audit_id:
        return
    row = db.execute("SELECT detail_json FROM presence_events WHERE id=? AND kind='handoff'", (audit_id,)).fetchone()
    if not row:
        return
    detail = json.loads(row[0])
    detail.update(status=status, finished_at=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    if message_id is not None:
        detail['message_id'] = message_id
    db.execute('UPDATE presence_events SET detail_json=? WHERE id=?', (json.dumps(detail, ensure_ascii=False), audit_id))


def invoke(database, audit_id, function, **kwargs):
    try:
        result = function(**kwargs)
    except Exception:
        finish(database, audit_id, 'failed')
        raise
    # Generation alone does not establish delivery to chat.
    status = result.get('status') or ('generated' if result.get('ok') else 'failed')
    finish(database, audit_id, status)
    return result


def finish(database, audit_id, status):
    if not audit_id:
        return
    try:
        with closing(sqlite3.connect(Path(database).resolve().as_uri()+'?mode=rw', uri=True, timeout=2)) as db, db:
            update(db, audit_id, status)
    except sqlite3.Error:
        logging.warning('Jiwen handoff receipt update unavailable')


def activity(function, database, audit_run_id=None, **kwargs):
    import presence_tone
    snapshot = {}
    presence_tone.read(database, snapshot=snapshot)
    audit_id = start(database, kwargs['session_id'], 'activity', snapshot, '', '', kwargs['wake_prompt'], run_id=audit_run_id)
    return invoke(database, audit_id, function, **kwargs)
