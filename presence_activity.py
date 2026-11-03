"""Serialize jiwen activity opportunities into the existing small-room ledger."""
import json
from datetime import datetime,timedelta
import presence_contact


def queue(db,triggers,config,create,alarm_hold,now=None):
    now=now or datetime.now()
    if not presence_contact.enabled(db):return None
    actions={item.get('action') for item in triggers or [] if isinstance(item,dict)}
    if 'find_activity' not in actions or 'contact' in actions:return None
    if not 8<=now.hour<22:return None
    sid=config.get('target_session_id')
    if not sid:return None
    if db.in_transaction:db.commit()
    db.execute('BEGIN IMMEDIATE')
    try:
        if db.execute("SELECT 1 FROM night_runs WHERE status IN ('queued','running')").fetchone():db.rollback();return None
        if db.execute("SELECT 1 FROM night_runs WHERE resume_state IN ('pending','resuming')").fetchone():db.rollback();return None
        if db.execute("SELECT 1 FROM proactive_message_jobs WHERE status IN ('planned','running') AND kind='presence'").fetchone():db.rollback();return None
        if db.execute("SELECT 1 FROM night_runs WHERE origin='presence' AND date(created_at)=?",(now.date().isoformat(),)).fetchone():db.rollback();return None
        latest=db.execute("SELECT MAX(created_at) FROM messages WHERE session_id=? AND role='user'",(sid,)).fetchone()[0]
        if latest and now<datetime.fromisoformat(latest)+timedelta(hours=2):db.rollback();return None
        if alarm_hold(db,sid,now):db.rollback();return None
        run_id=create()
        presence_contact.record(db,'activity_queued','积温自主活动已进入小房间队列',{'run_id':run_id,'executed':False})
        db.commit();return run_id
    except Exception:
        db.rollback();raise


def started(db,run_id):
    if not db.execute("SELECT 1 FROM sqlite_master WHERE name='presence_state'").fetchone():return
    activity={'type':'small_room','label':'小房间活动','at':datetime.now().isoformat(),'run_id':run_id}
    db.execute("UPDATE presence_state SET state_json=json_set(state_json,'$.immersion',0.4,'$.lastActivity',json(?)) WHERE id=1",(json.dumps(activity),))
    presence_contact.record(db,'activity_started','小房间已开始真实执行',{'run_id':run_id,'executed':False})


def finished(db,run_id,status):
    if db.execute("SELECT 1 FROM sqlite_master WHERE name='presence_state'").fetchone():
        db.execute("UPDATE presence_state SET state_json=json_remove(json_set(state_json,'$.immersion',0),'$.lastActivity') WHERE id=1 AND json_extract(state_json,'$.lastActivity.run_id')=?",(run_id,))
    action='activity_completed' if status=='completed' else 'activity_quiet' if status=='quiet' else 'activity_failed'
    presence_contact.record(db,action,{'completed':'小房间活动已完成','quiet':'小房间选择休息，未声称完成活动'}.get(status,'小房间活动未完成'),{'run_id':run_id,'executed':status=='completed'})
