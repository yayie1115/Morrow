"""Small per-turn tool context projections; no provider calls or persistent cache."""
import copy
from contextlib import closing
import hashlib
import json
import os
import sqlite3
import time
from pathlib import Path

_READ_TABLES = {"read_note":"notes", "read_todos":"todos"}
_READ_NAMES = frozenset({"read_note","read_todos","get_weather","get_cycle_status","get_intimacy_log",
    "browse_kept","read_kept","read_kept_by_date","browse_keepsakes","search_keepsakes","read_keepsake",
    "search_music","read_music_lyrics","browse_music_favorites","music_song_notes","read_room_day","search_kept"})


def _limit(name, default, minimum=256):
    try:return max(minimum,min(48000,int(os.environ.get(name,default))))
    except (ValueError,TypeError):return default


def compact_result(value, limit=None):
    text = value if isinstance(value,str) else json.dumps(value,ensure_ascii=False,default=str)
    limit = limit or _limit("TOOL_RESULT_CONTEXT_CHARS",3000)
    if len(text)<=limit:return text
    try:parsed=json.loads(text)
    except (ValueError,TypeError):
        notice="\n[结果已截短，完整原文保留在工具账本；需要细节时请缩小范围读取。]"
        return text[:max(0,limit-len(notice))]+notice
    def trim(item,depth=0):
        if isinstance(item,str):return item if len(item)<=400 else item[:400]+"…[字段已截短]"
        if isinstance(item,list):
            kept=[trim(v,depth+1) for v in item[:6]]
            if len(item)>6:kept.append({"_omitted_items":len(item)-6})
            return kept
        if isinstance(item,dict):
            if depth>=5:return {"_truncated":True,"_field_count":len(item)}
            keys=sorted(item)
            out={k:trim(item[k],depth+1) for k in keys[:24]}
            if len(keys)>24:out["_omitted_fields"]=len(keys)-24
            return out
        return item
    short=json.dumps({"_context_preview":trim(parsed),"_truncated":True,"_original_chars":len(text)},ensure_ascii=False,separators=(",",":"))
    if len(short)<=limit:return short
    return json.dumps({"_truncated":True,"preview":text[:max(0,(limit-160)//2)],"_original_chars":len(text)},ensure_ascii=False,separators=(",",":"))


class TurnTools:
    def __init__(self,db_path):
        self.db_path=db_path;self.reads={};self.projections={}

    def invalidate(self):
        self.reads.clear()

    def _state(self,table):
        try:
            uri=Path(self.db_path).resolve().as_uri()+"?mode=ro"
            with closing(sqlite3.connect(uri,uri=True,timeout=.2)) as conn:
                rows=conn.execute("SELECT * FROM "+table+" ORDER BY id").fetchall()
            return hashlib.sha256(json.dumps(rows,ensure_ascii=False,default=str,separators=(",",":")).encode()).hexdigest()
        except (OSError,sqlite3.Error,ValueError):return None

    def execute(self,name,args,session_id,execute):
        table=_READ_TABLES.get(name)
        if not table:
            self.invalidate();return execute(name,args,session_id)
        key=(session_id,name,json.dumps(args or {},sort_keys=True,ensure_ascii=False,separators=(",",":")))
        state=self._state(table);old=self.reads.get(key)
        ttl=_limit("TOOL_READ_REUSE_SECONDS",30,minimum=0)
        if ttl and state is not None and old and old[0]==state and time.monotonic()-old[1]<=ttl:
            result=copy.deepcopy(old[2]);result["_read_reused"]=True;result["duration_ms"]=0;return result
        result=execute(name,args,session_id)
        after=self._state(table)
        if result.get("ok") and state is not None and state==after:
            self.reads[key]=(after,time.monotonic(),copy.deepcopy(result))
        else:self.reads.pop(key,None)
        return result

    def project(self,name,args,outcome,call_id):
        raw=outcome.get("content","");text=raw if isinstance(raw,str) else json.dumps(raw,ensure_ascii=False,default=str)
        annotations=(outcome.get("tool_meta") or {}).get("annotations") or {}
        readonly=name in _READ_NAMES or (annotations.get("readOnlyHint") is True and annotations.get("destructiveHint") is not True)
        key=(name,json.dumps(args or {},sort_keys=True,ensure_ascii=False,separators=(",",":")),hashlib.sha256(text.encode()).hexdigest())
        if readonly and outcome.get("ok") and key in self.projections:
            previous=self.projections[key]
            return "[本轮相同读取结果未变化，复用工具调用 "+previous+"；不重复展开。]\n"+compact_result(text,limit=320)
        preview=compact_result(text)
        if readonly and outcome.get("ok"):self.projections[key]=str(call_id)
        return preview
