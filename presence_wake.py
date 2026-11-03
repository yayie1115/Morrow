"""Jiwen wakes the existing tool-capable executor; no synthetic alarm is created."""
import json
from datetime import datetime
import alarm_engine
import chat_engine
import presence_tone

QUIET='[[暂不发送]]'
PROTOCOL='''【积温主动唤醒】
积温状态提供了一次主动联系的机会，这不是对方发来的新消息，也不是到点的闹钟。
沿用原有人设、记忆与当前对话。你可以使用当前已开放的工具，查资料或处理确有依据的事情，
也可以直接说话，或选择暂不说话。工具是否成功以真实回执为准。
有话说时直接输出发给对方的正文，不需要 JSON，也不要输出内部唤醒说明。
不想发送文字时，只输出 [[暂不发送]]。即使已做了工具操作，也可以不再额外发消息。'''


def wake(*,session_id,source='presence',provider_id=None,model='',think=False,
         context_limit=None,image_limit=None,latest_images_only=False,cache_ttl='off',fallback=None,now=None):
    result=alarm_engine._wake_attempt(
        session_id=session_id,event='积温提示：此刻想主动联系对方。请结合当前对话自行决定行动和表达。',
        provider_id=provider_id,model=model,think=think,context_limit=context_limit,
        image_limit=image_limit,latest_images_only=latest_images_only,cache_ttl=cache_ttl,
        protocol=PROTOCOL,volatile_extra=presence_tone.read(chat_engine.DB_PATH),
        max_tool_rounds=8,max_elapsed_seconds=180)
    text=str(result.get('message') or '').strip()
    quiet=text==QUIET or (not text and result.get('material') and result.get('error')=='Morrow醒来后没有留下话')
    if quiet:
        result.update(ok=True,message='',error='',decision='send' if result.get('artifact_ids') else 'quiet')
    else:
        result['decision']='send' if result.get('ok') else ''
    # Never switch models or retry after tools may already have performed writes.
    result['no_retry']=bool(result.get('material') or result.get('tool_log'))
    result['used_fallback']=False
    return result


def persist(db,sid,result,run_id,stamp,message_id=None):
    for item in result.get('tool_log') or []:
        if not isinstance(item,dict) or item.get('hidden'):continue
        db.execute('INSERT INTO tool_calls(session_id,message_id,run_id,tool,narrate,args,result,source,server,status,duration_ms,error,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
                   (sid,message_id,run_id,item.get('display_tool',item.get('name','tool')),item.get('narrate') or '积温唤醒后的工具行动',
                    json.dumps(item.get('args') or {},ensure_ascii=False),item.get('result',''),item.get('source','builtin'),item.get('server',''),
                    item.get('status','success'),item.get('duration_ms',0),item.get('error',''),item.get('at') or stamp))
    if message_id is not None:
        for aid in result.get('artifact_ids') or []:
            if type(aid) is int and aid>0:
                db.execute('UPDATE message_artifacts SET message_id=? WHERE id=? AND session_id=? AND message_id IS NULL', (message_id,aid,sid))


def attach_version(result,run_id):
    value={'tool_log':result.get('tool_log') or [],'tool_run_id':run_id}
    if result.get('artifact_ids'):value['artifact_ids']=[v for v in result['artifact_ids'] if type(v) is int and v>0]
    return value
