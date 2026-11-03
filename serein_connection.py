"""Transport-only connection to the upstream Serein chat gateway.

No memory extraction, ranking, source certification or persona rules live here.
Non-chat background/model calls retain their original provider connection.
"""
from contextvars import ContextVar
from functools import wraps
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

_turn=ContextVar('official_serein_chat_turn',default=None)


def configuration():
    filename=os.environ.get('MORROW_SEREIN_GATEWAY_CONFIG','')
    if not filename:return None
    try:
        value=json.loads(Path(filename).read_text(encoding='utf-8'))
        if not value.get('enabled'):return None
        url=urlsplit(value['base_url'])
        if (url.scheme!='http' or url.hostname not in ('127.0.0.1','localhost','::1')
                or url.username or url.password or url.query or url.fragment or url.path!='/v1'):
            return None
        if not isinstance(value['instance_id'],str) or not value['instance_id']:return None
        if not isinstance(value['providers'],dict):return None
        return value
    except (OSError,ValueError,KeyError,TypeError):return None


def chat_scope(function):
    @wraps(function)
    def run(session_id,*args,**kwargs):
        mid=kwargs.get('current_user_message_id')
        token=_turn.set((session_id,mid) if mid is not None else None)
        try:yield from function(session_id,*args,**kwargs)
        finally:_turn.reset(token)
    return run


def provider(original,model):
    """Only the selected chat route changes; saved provider rows never do."""
    cfg=configuration()
    if original and _turn.get() is not None and os.environ.get('MORROW_SEREIN_GATEWAY_CONFIG') and os.path.isfile(os.environ.get('DB_PATH', 'data/nook.db')):
        import sqlite3
        import serein_registry
        from contextlib import closing
        with closing(sqlite3.connect(os.environ.get('DB_PATH', 'data/nook.db'))) as conn:
            policy = serein_registry.read(conn)
            if policy and policy.get('enabled') is not True:
                return original
            if policy.get('enabled') is True and original['id'] not in policy.get('excluded_provider_ids', []):
                if serein_registry.eligible(model):
                    status = serein_registry.public_status(conn)
                    if status['state'] != 'ready':
                        raise ValueError('Serein 自动接入正在同步或同步失败，请在模型设置核对接入状态后重试。')
                    if not cfg or model not in cfg.get('providers', {}).get(str(original['id']), {}):
                        raise ValueError('当前聊天模型尚未完成 Serein 自动接入，请检查模型设置。')
            elif policy.get('enabled') is True:
                return original
    if not original or _turn.get() is None or not cfg:return original
    models=cfg['providers'].get(str(original['id']),{})
    if model not in models:return original
    try:key=Path(cfg['token_file']).read_text(encoding='utf-8').strip()
    except OSError:return original
    if not key:return original
    return {**original,'base_url':cfg['base_url'],'api_key':key,'format':'openai','cache_mode':'none'}


def payload(base_url,provider_meta,body):
    cfg=configuration();turn=_turn.get()
    if not cfg or turn is None or base_url.rstrip('/')!=cfg['base_url'].rstrip('/'):return body,{}
    alias=cfg['providers'].get(str(provider_meta.get('id')),{}).get(body['model'])
    if not alias:raise ValueError('The selected gateway model mapping is unavailable')
    return {**body,'model':alias},{'X-Serein-Window-ID':f"morrow:{cfg['instance_id']}:{turn[0]}"}
