"""Narrow assistant access: read the ledger and submit requests, never approve."""
import hashlib
import json
import uuid
from datetime import datetime, timezone, timedelta
import treasury

def read(db, args):
    if not isinstance(args,dict) or set(args)-{'section','offset','limit'}: raise ValueError('不支持的读取参数')
    section=args.get('section','summary');offset=args.get('offset',0);limit=args.get('limit',5)
    if section not in ('summary','transactions','requests'): raise ValueError('不支持的账本栏目')
    if type(offset)!=int or offset<0 or type(limit)!=int or not 1<=limit<=10: raise ValueError('分页参数无效，每次最多10条')
    state=treasury.read(db);day=datetime.now(timezone(timedelta(hours=8))).date().isoformat()
    result={'balance_cents':sum(t['cents'] for t in state['transactions']),
            'pending_count':sum(q['status']=='pending' for q in state['requests']),
            'salary_paid_today':any(t['type']=='salary' and t.get('day')==day for t in state['transactions']),
            'currency':'CNY','time_zone':'UTC+8'}
    if section!='summary':
        items=state[section];result.update(section=section,items=items[offset:offset+limit],total=len(items),
            next_offset=offset+limit if offset+limit<len(items) else None)
    return result

def submit(db,args,session_id):
    if not isinstance(args,dict) or set(args)-{'item','cents','reason'}: raise ValueError('只能提交消费申请，不能发薪、加钱或审批')
    if type(session_id)!=int or session_id<=0: raise ValueError('没有有效的当前会话')
    source=db.execute("SELECT id FROM messages WHERE session_id=? AND role='user' AND hidden=0 ORDER BY id DESC LIMIT 1",(session_id,)).fetchone()
    if not source: raise ValueError('当前对话没有已保存的用户消息')
    item=args.get('item');cents=args.get('cents');reason=args.get('reason','')
    if not isinstance(item,str) or not item.strip() or len(item)>60: raise ValueError('请填写60字以内的申请物品')
    if not isinstance(reason,str) or len(reason)>160: raise ValueError('申请理由最多160字')
    if type(cents)!=int or not 1<=cents<=100000000: raise ValueError('金额须为正整数分，100分等于1元')
    item=item.strip();reason=reason.strip()
    # Host binds retries to the saved user turn and intent. A changed reason
    # for the same intent is a conflict, not a second application.
    identity=json.dumps([session_id,source[0],item,cents],ensure_ascii=False,separators=(',',':'))
    op='ai-request:'+hashlib.sha256(identity.encode()).hexdigest()
    state=treasury.read(db);existed=op in state['operations']
    saved=treasury.mutate(db,dict(action='request',operation_id=op,revision=state['revision'],item=item,cents=cents,reason=reason))
    rid=str(uuid.uuid5(uuid.NAMESPACE_URL,'treasury:'+op))
    request=next((q for q in saved['requests'] if q['id']==rid),None)
    if not request: raise ValueError('申请回执无法核对，请先读取账本，勿重复提交')
    return {'request':request,'already_submitted':existed,'balance_cents':sum(t['cents'] for t in saved['transactions']),
            'notice':'申请已登记；仅用户可审批，尚未批准的申请不会扣款。'}
