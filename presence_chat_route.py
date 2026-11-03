"""Per-chat runtime metadata; no persona copies, message text or credentials."""
import json


def validate(db, data):
    pid=data.get('provider_id');model=data.get('model')
    if type(pid) is not int or not isinstance(model,str) or not model:
        raise ValueError('请先在目标聊天选择模型')
    provider=db.execute('SELECT models FROM providers WHERE id=?',(pid,)).fetchone()
    if not provider:raise ValueError('目标聊天的模型供应商已不存在')
    models=json.loads(provider[0] or '[]')
    if not any((m.get('id') if isinstance(m,dict) else m)==model for m in models):
        raise ValueError('目标聊天的模型配置已变化，请重新选择')
    result={'provider_id':pid,'model':model,'think':data.get('think') is True,
            'latest_images_only':data.get('latest_images_only') is True,
            'cache_ttl':data.get('cache_ttl') if data.get('cache_ttl') in ('off','5m','1h') else 'off'}
    for field,maximum in (('context_limit',500),('image_limit',20)):
        value=data.get(field)
        if value is not None and (type(value) is not int or not 0<=value<=maximum):raise ValueError('聊天上下文设置无效')
        result[field]=value
    return result


def save(db,sid,data):
    if not db.execute('SELECT 1 FROM sessions WHERE id=? AND archived=0',(sid,)).fetchone():raise ValueError('目标聊天不可用')
    value=validate(db,data)
    db.execute('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
               ('chat_runtime_v1:'+str(sid),json.dumps(value)))
    db.commit();return value


def resolve(db,sid):
    row=db.execute('SELECT value FROM settings WHERE key=?',('chat_runtime_v1:'+str(sid),)).fetchone()
    if row:return validate(db,json.loads(row[0]))
    for row in db.execute("SELECT versions,active FROM messages WHERE session_id=? AND role='assistant' AND hidden=0 AND proactive=0 ORDER BY id DESC LIMIT 30",(sid,)):
        try:
            versions=json.loads(row[0] or '[]');active=versions[int(row[1] or 0)]
        except (ValueError,TypeError,IndexError):continue
        if isinstance(active,dict) and active.get('provider_id') and active.get('model'):
            return validate(db,{'provider_id':active['provider_id'],'model':active['model'],'think':active.get('think',False),
                                'context_limit':None,'image_limit':None})
    raise ValueError('尚无目标聊天的模型设置，请打开该聊天并选择模型后重试')
