"""Household virtual ledger; amounts are integer cents, stored in settings."""
import json
import uuid
from datetime import datetime, timezone, timedelta
KEY = "treasury_v1"
def read(db):
    row = db.execute("SELECT value FROM settings WHERE key=?", (KEY,)).fetchone()
    return json.loads(row[0]) if row else {"revision":0,"transactions":[],"requests":[],"operations":{}}
def public(state):
    return {k:v for k,v in state.items() if k != "operations"}
def mutate(db, body):
    if not isinstance(body,dict): raise ValueError("无效请求")
    op=body.get("operation_id")
    if not isinstance(op,str) or len(op)>80 or not op: raise ValueError("缺少操作编号")
    db.execute("BEGIN IMMEDIATE")
    try:
        state=read(db)
        signature=json.dumps({k:v for k,v in body.items() if k!='revision'},sort_keys=True,ensure_ascii=False)
        if op in state["operations"]:
            if state["operations"][op]!=signature: raise ValueError("操作编号冲突")
            db.rollback(); return public(state)
        if body.get("revision")!=state["revision"]: raise ValueError("账本已更新，请刷新后重试")
        action=body.get("action"); now=datetime.now(timezone(timedelta(hours=8))); day=now.date().isoformat()
        def amount():
            n=body.get("cents")
            if type(n)!=int or not 1<=n<=100000000: raise ValueError("金额须为有效的分，且不超过一百万元")
            return n
        def text(key,limit,required=False):
            s=body.get(key,"")
            if not isinstance(s,str) or len(s)>limit or (required and not s.strip()): raise ValueError("请填写有效内容")
            return s.strip()
        def tx(kind,n,note,**extra):
            state['transactions'].insert(0,dict(id=str(uuid.uuid4()),type=kind,cents=n,note=note,time=now.isoformat(),**extra))
        if action=='salary':
            if any(t['type']=='salary' and t.get('day')==day for t in state['transactions']): raise ValueError("今日已经发薪")
            tx('salary',100,'今日工资',day=day)
        elif action=='bonus': tx('bonus',amount(),text('note',50) or '额外赏金')
        elif action=='request':
            state['requests'].insert(0,dict(id=str(uuid.uuid5(uuid.NAMESPACE_URL,'treasury:'+op)),item=text('item',60,True),cents=amount(),reason=text('reason',160),status='pending',time=now.isoformat()))
        elif action=='decide':
            q=next((q for q in state['requests'] if q['id']==body.get('request_id')),None)
            if not q or q['status']!='pending' or type(body.get('approve'))!=bool: raise ValueError("申请不存在或已经处理")
            if body['approve'] and sum(t['cents'] for t in state['transactions'])<q['cents']: raise ValueError("余额不足")
            q['status']='approved' if body['approve'] else 'rejected'; q['decidedAt']=now.isoformat()
            if body['approve']: tx('expense',-q['cents'],q['item'],requestId=q['id'])
        else: raise ValueError("不支持的操作")
        state['revision']+=1; state['operations'][op]=signature
        db.execute("INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",(KEY,json.dumps(state,ensure_ascii=False)))
        db.commit(); return public(state)
    except Exception:
        db.rollback(); raise
