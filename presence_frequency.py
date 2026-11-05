"""Bounded silence-cycle opportunities, independent of the legacy daily lottery."""
import hashlib
import json
import sqlite3
from datetime import datetime, timedelta

KEY = 'presence_contact_frequency_v1'
DEFAULT = {'enabled': True, 'night_start': 1, 'night_end': 10,
           'day_minutes': [60, 120], 'night_minutes': [180, 240]}


def policy(db):
    try:
        row = db.execute('SELECT value FROM settings WHERE key=?', (KEY,)).fetchone()
        value = json.loads(row[0]) if row else {}
        return DEFAULT if value.get('enabled') is True else None
    except (sqlite3.Error, ValueError, TypeError, AttributeError):
        return None


def period(now):
    return 'night' if 1 <= now.hour < 10 else 'day'


def user_anchor(db, sid):
    row = db.execute("SELECT id,created_at FROM messages WHERE session_id=? AND role='user' ORDER BY created_at DESC,id DESC LIMIT 1", (sid,)).fetchone()
    return (row[0], row[1]) if row else None


def next_at(db, sid, now):
    """Stable jitter per anchor and time band; polling never redraws the delay."""
    user = user_anchor(db, sid)
    if not user:
        return None
    stamps = [user[1]]
    row = db.execute("SELECT MAX(created_at) FROM messages WHERE session_id=? AND proactive=1", (sid,)).fetchone()
    if row and row[0]:
        stamps.append(row[0])
    row = db.execute('SELECT value FROM settings WHERE key=?', ('presence_contact_attempt:'+str(sid),)).fetchone()
    try:
        if row:
            stamps.append(json.loads(row[0])['at'])
        anchor = max(datetime.fromisoformat(s) for s in stamps)
    except (ValueError, TypeError, KeyError):
        return None
    band = period(now)
    low, high = DEFAULT[band+'_minutes']
    seed = f'{sid}:{user[0]}:{anchor.isoformat()}:{band}'.encode()
    delay = low + int.from_bytes(hashlib.sha256(seed).digest()[:4], 'big') % (high-low+1)
    return anchor + timedelta(minutes=delay)


def attempted(db, job, now):
    from presence_contact import record
    value = {'at': now.strftime('%Y-%m-%d %H:%M:%S'), 'job_id': job['id'], 'period': period(now),
             'user_anchor': user_anchor(db, job['target_session_id'])}
    db.execute('INSERT OR REPLACE INTO settings(key,value) VALUES (?,?)',
               ('presence_contact_attempt:'+str(job['target_session_id']), json.dumps(value)))
    record(db, 'frequency_attempt', ('夜间' if period(now)=='night' else '白天')+'这一轮开始，结束后等下一次', value)


def claim_current(db, sid, now):
    row = db.execute('SELECT value FROM settings WHERE key=?', ('presence_contact_attempt:'+str(sid),)).fetchone()
    if not row:
        return False
    value = json.loads(row[0])
    anchor = user_anchor(db, sid)
    return value.get('period') == period(now) and value.get('user_anchor') == (list(anchor) if anchor else None)


def queue(db, triggers, config, now):
    from presence_contact import enabled, record
    if not enabled(db) or not any(t.get('action')=='contact' for t in triggers or [] if isinstance(t, dict)):
        return None
    sid = config.get('target_session_id')
    if not sid or not db.execute('SELECT 1 FROM sessions WHERE id=? AND archived=0', (sid,)).fetchone():
        return None
    if db.in_transaction:
        db.commit()
    db.execute('BEGIN IMMEDIATE')
    try:
        # Across midnight there must still be only one pending/running attempt.
        existing = db.execute("SELECT * FROM proactive_message_jobs WHERE kind='presence' AND status IN ('planned','running') ORDER BY id LIMIT 1").fetchone()
        if existing:
            db.commit()
            return existing['id'] if existing['status']=='planned' else None
        due = next_at(db, sid, now)
        if due is None or now < due:
            db.rollback()
            return None
        day = now.date().isoformat()
        stamp = now.strftime('%Y-%m-%d %H:%M:%S')
        db.execute("INSERT OR IGNORE INTO proactive_message_jobs(plan_date,target_session_id,kind,status) VALUES (?,?,'presence','none')", (day,sid))
        job = db.execute('SELECT * FROM proactive_message_jobs WHERE plan_date=?', (day,)).fetchone()
        if job['status']=='running' or (job['kind']!='presence' and job['status']=='planned'):
            db.rollback()
            return None
        # The existing unique daily row is an executor slot. Immutable events,
        # message versions and tool receipts retain every completed cycle.
        db.execute("UPDATE proactive_message_jobs SET target_session_id=?,kind='presence',status='planned',planned_at=?,wanted=0,regular_selected=0,morning_selected=0,attempt_count=0,retry_count=1,message_id=NULL,decision='',error='',updated_at=? WHERE id=?",
                   (sid,stamp,stamp,job['id']))
        basis = next((t.get('contact_basis') for t in triggers if isinstance(t, dict) and t.get('action')=='contact' and t.get('contact_basis')), None)
        reason = ('夜间' if period(now)=='night' else '白天')+'已经在等了'
        detail = {'job_id':job['id'],'period':period(now),'eligible_at':due.strftime('%Y-%m-%d %H:%M:%S'),'executed':False}
        if basis:
            detail['contact_basis'] = basis
            reason += '（亲近意愿也参与了判断）'
        record(db, 'queued', reason, detail)
        db.commit()
        return job['id']
    except Exception:
        db.rollback()
        raise


def postpone(db, job, not_before, now, reason):
    from presence_contact import record
    db.execute('UPDATE proactive_message_jobs SET planned_at=?,updated_at=?,error=? WHERE id=?',
               (not_before.strftime('%Y-%m-%d %H:%M:%S'),now.strftime('%Y-%m-%d %H:%M:%S'),reason,job['id']))
    record(db, 'deferred', reason, {'job_id':job['id'],'period':period(now),'planned_at':not_before.strftime('%Y-%m-%d %H:%M:%S'),'executed':False})
    return True
