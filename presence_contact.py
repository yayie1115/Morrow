"""Deterministic jiwen contact jobs using the existing delivery ledger."""
import json
from datetime import datetime, timedelta


def enabled(db):
    row = db.execute("SELECT value FROM settings WHERE key='presence_engine'").fetchone()
    try:
        return bool(json.loads(row[0]).get('enabled')) if row else False
    except (ValueError, TypeError, AttributeError):
        return False


def pending(db, now):
    stamp = now.strftime('%Y-%m-%d %H:%M:%S')
    # The built-in switch is off: its old opportunities must not survive.
    db.execute("UPDATE proactive_message_jobs SET status='cancelled',updated_at=? WHERE kind<>'presence' AND status IN ('planned','none')", (stamp,))
    if not enabled(db):
        db.execute("UPDATE proactive_message_jobs SET status='cancelled',updated_at=? WHERE kind='presence' AND status IN ('planned','none')", (stamp,))
        return None
    return db.execute("SELECT * FROM proactive_message_jobs WHERE plan_date=? AND kind='presence'", (now.date().isoformat(),)).fetchone()


def record(db, action, reason, detail=None):
    # Keep this focused module compatible with installations without the UI table.
    if not db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='presence_events'").fetchone():
        return
    columns = {r[1] for r in db.execute('PRAGMA table_info(presence_events)')}
    if {'kind','action','reason','detail_json'} <= columns:
        db.execute("INSERT INTO presence_events(at,kind,action,reason,detail_json) VALUES (?,'delivery',?,?,?)",
                   (datetime.now().strftime('%Y-%m-%d %H:%M:%S'),action, reason, json.dumps(detail or {}, ensure_ascii=False)))


def queue(db, triggers, config, now=None, window=(480, 1350)):
    now = now or datetime.now()
    if not enabled(db) or not any(isinstance(item, dict) and item.get('action') == 'contact' for item in triggers or []):
        return None
    target = config.get('target_session_id')
    if not target or not db.execute('SELECT 1 FROM sessions WHERE id=? AND archived=0', (target,)).fetchone():
        return None
    minute = now.hour * 60 + now.minute
    if not window[0] <= minute < window[1]:
        return None
    day = now.date().isoformat()
    if db.execute("SELECT 1 FROM messages WHERE proactive=1 AND date(created_at)=? LIMIT 1", (day,)).fetchone():
        return None
    # Unique plan_date serializes concurrent ticks. Failed/quiet/sent jobs are not
    # rearmed on every heartbeat; existing bounded retry handling owns failures.
    stamp = now.strftime('%Y-%m-%d %H:%M:%S')
    db.execute("INSERT OR IGNORE INTO proactive_message_jobs(plan_date,target_session_id,kind,planned_at,status) VALUES (?,?,'presence',?,'planned')", (day,target,stamp))
    changed = db.execute("UPDATE proactive_message_jobs SET target_session_id=?,kind='presence',planned_at=?,status='planned',wanted=0,regular_selected=0,morning_selected=0,error='',updated_at=? WHERE plan_date=? AND status IN ('none','cancelled') AND attempt_count=0", (target,stamp,stamp,day)).rowcount
    job = db.execute('SELECT * FROM proactive_message_jobs WHERE plan_date=?', (day,)).fetchone()
    if not job or job['kind'] != 'presence' or job['status'] != 'planned':
        db.commit()
        return None
    # The original engine still labels the signal as unexecuted. Queueing is a
    # distinct event, not a claim that a chat message has already been delivered.
    marker = 'presence_contact_queued_' + day
    prior = db.execute('SELECT 1 FROM settings WHERE key=?', (marker,)).fetchone()
    if not prior:
        db.execute('INSERT OR IGNORE INTO settings(key,value) VALUES (?,?)', (marker,str(job['id'])))
        record(db,'queued','积温 contact 已进入发送队列',{'job_id':job['id'],'executed':False})
    db.commit()
    return job['id']


def postpone(db, job, not_before, now, window=(480,1350), reason='等待发送保护间隔'):
    start = now.replace(hour=window[0]//60,minute=window[0]%60,second=0,microsecond=0)
    end = now.replace(hour=window[1]//60,minute=window[1]%60,second=0,microsecond=0)
    when = max(start, not_before)
    if when >= end:
        db.execute("UPDATE proactive_message_jobs SET status='skipped',planned_at='',error='保护间隔超过今日允许时段',updated_at=? WHERE id=?", (now.strftime('%Y-%m-%d %H:%M:%S'),job['id']))
        record(db,'skipped','保护间隔超过今日允许时段',{'job_id':job['id'],'executed':False})
        return False
    db.execute("UPDATE proactive_message_jobs SET planned_at=?,updated_at=?,error=? WHERE id=?", (when.strftime('%Y-%m-%d %H:%M:%S'),now.strftime('%Y-%m-%d %H:%M:%S'),reason,job['id']))
    record(db,'deferred',reason,{'job_id':job['id'],'planned_at':when.strftime('%Y-%m-%d %H:%M:%S'),'executed':False})
    return True
