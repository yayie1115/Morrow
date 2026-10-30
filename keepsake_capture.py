"""Current-session, persisted-message selection for assistant keepsakes."""
import hashlib
import json

def _id(value):
    if isinstance(value,bool) or not isinstance(value,(int,str)):
        raise ValueError("消息 ID 需要是正整数。")
    if isinstance(value,str) and not value.strip().isdigit():raise ValueError("消息 ID 无效。")
    value=int(value)
    if value<=0:raise ValueError("消息 ID 无效。")
    return value

def _token(row,snapshot):
    data={"snapshot":snapshot,"active_version":int(row["active"] or 0)}
    return hashlib.sha256(json.dumps(data,ensure_ascii=False,sort_keys=True,separators=(",",":"),default=str).encode()).hexdigest()

def _kept(conn):
    result={}
    for row in conn.execute("SELECT id,message_ids FROM keepsakes"):
        try:
            for mid in json.loads(row["message_ids"] or "[]"):result[int(mid)]=row["id"]
        except (ValueError,TypeError):continue
    return result

def candidates(conn,args,session_id,snapshot_message):
    if session_id is None:raise ValueError("需要当前对话，不能读取其他对话。")
    if not conn.execute("SELECT 1 FROM sessions WHERE id=?",(session_id,)).fetchone():raise ValueError("当前对话不存在。")
    count=args.get("count",5)
    if isinstance(count,bool) or not isinstance(count,int) or not 1<=count<=10:raise ValueError("count 需要是 1 到 10 的整数。")
    before=args.get("before_message_id");params=[session_id]
    query="SELECT id,role,content,attachments,versions,active,created_at FROM messages WHERE session_id=? AND hidden=0 AND role IN ('user','assistant')"
    if before is not None:query+=" AND id<?";params.append(_id(before))
    query+=" ORDER BY id DESC LIMIT ?";params.append(count+1)
    # A read transaction gives the list, source tokens and kept flags one snapshot.
    conn.execute("BEGIN")
    try:
        rows=conn.execute(query,params).fetchall();more=len(rows)>count;rows=rows[:count];kept=_kept(conn);items=[]
        for row in reversed(rows):
            snap=snapshot_message(conn,row)
            items.append({"message_id":row["id"],"role":row["role"],"created_at":row["created_at"],
                "active_version":int(row["active"] or 0),"preview":str(snap["content"])[:240],
                "has_media":bool(snap["attachments"] or snap["artifacts"]),"already_kept":row["id"] in kept,
                "keepsake_id":kept.get(row["id"]),"source_token":_token(row,snap)})
        return {"ok":True,"items":items,"has_more":more,"next_before_message_id":rows[-1]["id"] if more else None,
            "notice":"仅列出当前对话已保存的可见消息。正在生成的回复尚无可收录 ID；需要保存成功后再读取。用真实 message_id 和 source_token 创建留影，不要猜测 ID。"}
    finally:conn.rollback()

def create(conn,args,session_id,snapshot_message):
    if session_id is None:raise ValueError("需要先有当前对话。")
    raw=args.get("message_ids")
    if not isinstance(raw,list) or not 1<=len(raw)<=10:raise ValueError("需要 1 到 10 条消息 ID。")
    ids=list(dict.fromkeys(_id(v) for v in raw));tokens=args.get("source_tokens")
    if not isinstance(tokens,dict) or any(not isinstance(tokens.get(str(mid)),str) for mid in ids):
        raise ValueError("需要先调用 read_keepsake_candidates 获取消息 ID 和 source_token，再传入 source_tokens。")
    caption=str(args.get("caption") or "").strip()[:1000];reply=str(args.get("assistant_reply") or "").strip()[:2000];pinned=args.get("pinned") is True
    conn.execute("BEGIN IMMEDIATE")
    try:
        session=conn.execute("SELECT id,title FROM sessions WHERE id=?",(session_id,)).fetchone()
        if not session:raise ValueError("当前对话不存在。")
        rows=conn.execute("SELECT id,role,content,attachments,versions,active,created_at FROM messages WHERE session_id=? AND hidden=0 AND role IN ('user','assistant') AND id IN ("+",".join("?" for _ in ids)+") ORDER BY id",(session_id,*ids)).fetchall()
        if len(rows)!=len(ids):raise ValueError("消息不可用，可能已删除、隐藏或不属于当前对话；需要重新读取。")
        snapshots=[]
        for row in rows:
            snap=snapshot_message(conn,row);token=_token(row,snap)
            if tokens[str(row["id"])]!=token:raise ValueError("来源版本或内容已变化，需要重新读取后再选择，未保存留影。")
            snap["source_version"]=int(row["active"] or 0);snap["source_token"]=token;snapshots.append(snap)
        for kept in conn.execute("SELECT id,session_id,message_ids FROM keepsakes"):
            try:existing={int(v) for v in json.loads(kept["message_ids"] or "[]")}
            except (TypeError,ValueError):continue
            if set(ids)==existing and kept["session_id"]==session_id:
                conn.rollback();return {"ok":True,"keepsake_id":kept["id"],"already_saved":True,"unchanged":True,"notice":"留影已经存在，未重复创建，也未修改原有题注或留言。"}
            if set(ids)&existing:raise ValueError("选中的部分消息已有留影，不能重复收录；需要重新选择。")
        cursor=conn.execute("INSERT INTO keepsakes(session_id,session_title,message_ids,snapshot,note,favorite) VALUES (?,?,?,?,?,?)",(session_id,session["title"] or "对话",json.dumps([r["id"] for r in rows]),json.dumps(snapshots,ensure_ascii=False),caption,int(pinned)))
        kid=cursor.lastrowid;comment_id=None
        if reply:comment_id=conn.execute("INSERT INTO keepsake_comments(keepsake_id,author,content) VALUES (?,'assistant',?)",(kid,reply)).lastrowid
        conn.commit();return {"ok":True,"keepsake_id":kid,"message_ids":[r["id"] for r in rows],"caption":caption,"pinned":pinned,"comment_id":comment_id}
    except Exception:conn.rollback();raise
