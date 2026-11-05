"""Jiwen wakes the existing tool-capable executor; no synthetic alarm is created."""
import json
from datetime import datetime
import alarm_engine
import chat_engine
import presence_tone
import presence_audit

QUIET = '[[暂不发送]]'

PROTOCOL = (
    "【积温主动唤醒】\n"
    "积温状态提供了一次主动联系的机会，这不是对方发来的新消息，也不是到点的闹钟。\n"
    "沿用原有人设、记忆与当前对话。你可以使用当前已开放的工具，查资料或处理确有依据的事情。\n"
    "工具是否成功以真实回执为准。\n"
    "这一次必须开口：直接输出要发给她的话作为正文，不需要 JSON，不要输出内部唤醒说明，"
    "也不要输出 [[暂不发送]]。哪怕只一句，也要说。"
)

RETRY_EVENT = "（刚才你没有开口。这一次必须说一句，不能再沉默。直接写要发给她的话。）"


def wake(*, session_id, source='presence', provider_id=None, model='', think=False,
         context_limit=None, image_limit=None, latest_images_only=False, cache_ttl='off',
         fallback=None, now=None):
    snapshot = {}
    hint = presence_tone.read(chat_engine.DB_PATH, snapshot=snapshot)
    event = '积温提示：此刻想主动联系对方。请结合当前对话自行决定表达。'
    audit_id = presence_audit.start(chat_engine.DB_PATH, session_id, 'contact', snapshot, hint,
                                    PROTOCOL, event)

    def attempt(event_text):
        return presence_audit.invoke(
            chat_engine.DB_PATH, audit_id, alarm_engine._wake_attempt,
            session_id=session_id, event=event_text,
            provider_id=provider_id, model=model, think=think, context_limit=context_limit,
            image_limit=image_limit, latest_images_only=latest_images_only, cache_ttl=cache_ttl,
            protocol=PROTOCOL, volatile_extra=hint,
            max_tool_rounds=8, max_elapsed_seconds=180)

    result = attempt(event)
    text = str(result.get('message') or '').strip()
    quiet = text == QUIET or (not text and result.get('error') == 'Morrow醒来后没有留下话')

    # 强制开口：模型滑过去就再推一次；只在没写库、没调工具时重试，避免重复写入
    if quiet and not result.get('material') and not result.get('tool_log'):
        retry = attempt(RETRY_EVENT)
        retry_text = str(retry.get('message') or '').strip()
        retry_quiet = retry_text == QUIET or (not retry_text
                                              and retry.get('error') == 'Morrow醒来后没有留下话')
        if not retry_quiet:
            result = retry
            text = retry_text
            quiet = False

    if quiet:
        result.update(ok=True, message='', error='',
                      decision='send' if result.get('artifact_ids') else 'quiet')
    else:
        result['decision'] = 'send' if result.get('ok') else ''
    result['no_retry'] = bool(result.get('material') or result.get('tool_log'))
    result['used_fallback'] = False
    result['presence_audit_id'] = audit_id
    return result


def persist(db, sid, result, run_id, stamp, message_id=None):
    for item in result.get('tool_log') or []:
        if not isinstance(item, dict) or item.get('hidden'):
            continue
        db.execute(
            'INSERT INTO tool_calls(session_id,message_id,run_id,tool,narrate,args,result,source,server,status,duration_ms,error,created_at)'
            ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
            (sid, message_id, run_id, item.get('display_tool', item.get('name', 'tool')),
             item.get('narrate') or '积温唤醒后的工具行动',
             json.dumps(item.get('args') or {}, ensure_ascii=False), item.get('result', ''),
             item.get('source', 'builtin'), item.get('server', ''), item.get('status', 'success'),
             item.get('duration_ms', 0), item.get('error', ''), item.get('at') or stamp))
    if message_id is not None:
        for aid in result.get('artifact_ids') or []:
            if type(aid) is int and aid > 0:
                db.execute('UPDATE message_artifacts SET message_id=? WHERE id=? AND session_id=? AND message_id IS NULL',
                           (message_id, aid, sid))


def attach_version(result, run_id):
    value = {'tool_log': result.get('tool_log') or [], 'tool_run_id': run_id}
    if result.get('artifact_ids'):
        value['artifact_ids'] = [v for v in result['artifact_ids'] if type(v) is int and v > 0]
    return value
