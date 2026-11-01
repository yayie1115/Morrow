"""Authenticated local audio analysis bridge; no model or MCP calls."""
import json, os, sqlite3, threading, time, uuid
from pathlib import Path
import requests

MAX_BYTES=25*1024*1024
EXTENSIONS={'.wav':'audio/wav','.m4a':'audio/mp4','.mp4':'audio/mp4','.mp3':'audio/mpeg','.webm':'audio/webm','.ogg':'audio/ogg'}
_lock=threading.Lock();_running=set();_slots=threading.BoundedSemaphore(3)

def key_path():
    return Path(os.environ.get('EARS_KEY_FILE','/etc/morrow/ears-access-key'))

def configured():
    return key_path().is_file()

def connection():
    # Deliberately loopback only: the operator supplies an SSH reverse tunnel.
    port=int(os.environ.get('EARS_LOCAL_PORT','18765'))
    if not 1024<=port<=65535:raise ValueError('invalid local port')
    key=key_path().read_text(encoding='utf-8').strip()
    if not key:raise ValueError('missing local audio credential')
    session=requests.Session();session.trust_env=False
    session.headers['Authorization']='Bearer '+key
    return session,'http://127.0.0.1:'+str(port)

def public(row):
    meta=json.loads(row['meta'] or '{}')
    return {'id':row['id'],'session_id':row['session_id'],'status':row['status'],
            'message_id':row['message_id'],'text':row['visible_text'],
            'audio_url':'/uploads/'+row['file_path'],'duration':meta.get('duration'),
            'error':row['error'],'created_at':row['created_at']}

def schedule(db_path,uploads,artifact_id):
    with _lock:
        if artifact_id in _running:return True
        if not _slots.acquire(False):return False
        _running.add(artifact_id)
    def run():
        db=sqlite3.connect(db_path);db.row_factory=sqlite3.Row
        try:
            row=db.execute("SELECT * FROM message_artifacts WHERE id=? AND type='user_voice'",(artifact_id,)).fetchone()
            if not row or row['message_id'] or row['status']=='ready':return
            db.execute("UPDATE message_artifacts SET status='analyzing',error='' WHERE id=?",(artifact_id,));db.commit()
            meta=json.loads(row['meta'] or '{}')
            http,url=connection()
            with http:
                remote=meta.get('remote_id')
                if not remote:
                    with open(Path(uploads)/row['file_path'],'rb') as audio:
                        r=http.post(url+'/api/upload?ext='+Path(row['file_path']).suffix.lstrip('.'),data=audio,timeout=(5,45));r.raise_for_status();remote=r.json()['id']
                    if len(remote)!=32 or any(c not in '0123456789abcdef' for c in remote):raise ValueError('invalid task id')
                    meta['remote_id']=remote
                    db.execute('UPDATE message_artifacts SET meta=? WHERE id=?',(json.dumps(meta),artifact_id));db.commit()
                deadline=time.monotonic()+610
                while time.monotonic()<deadline:
                    r=http.get(url+'/api/jobs/'+remote,timeout=(5,15));r.raise_for_status();result=r.json()
                    if result.get('id')!=remote:raise ValueError('task mismatch')
                    if result['status']=='complete':break
                    if result['status']=='failed':
                        meta.pop('remote_id',None)
                        db.execute('UPDATE message_artifacts SET meta=? WHERE id=?',(json.dumps(meta),artifact_id));db.commit()
                        raise ValueError('analysis failed')
                    time.sleep(1)
                else:raise TimeoutError()
                transcript=result.get('transcript',{});summary=result.get('summary',{})
                text=transcript.get('text','').strip();duration=float(summary.get('duration_sec',0))
                if not text or len(text)>30000 or not 0<duration<=300:raise ValueError('no usable transcript')
                if len(json.dumps(summary))>100000:raise ValueError('summary too large')
                chart=http.get(url+'/api/jobs/'+remote+'/listen.png',timeout=(5,20));chart.raise_for_status()
                if not chart.content.startswith(b'\x89PNG\r\n\x1a\n') or len(chart.content)>4*1024*1024:raise ValueError('invalid chart')
                name=uuid.uuid4().hex+'.png';target=Path(uploads)/name
                target.write_bytes(chart.content)
                meta.update({'summary':summary,'duration':duration,'chart_path':name})
                db.execute("UPDATE message_artifacts SET status='ready',visible_text=?,meta=?,error='',updated_at=datetime('now','+8 hours') WHERE id=? AND message_id IS NULL",(text,json.dumps(meta,ensure_ascii=False),artifact_id));db.commit()
        except Exception:
            # Never return provider/local paths, keys or audio contents in errors.
            db.execute("UPDATE message_artifacts SET status='failed',error='电脑分析暂时不可用、录音无法识别或任务已中断。录音已保留，可重试。',updated_at=datetime('now','+8 hours') WHERE id=? AND message_id IS NULL",(artifact_id,));db.commit()
        finally:
            db.close()
            with _lock:_running.discard(artifact_id)
            _slots.release()
    threading.Thread(target=run,daemon=True).start();return True

def bind(db,sid,artifact_id):
    row=db.execute("SELECT * FROM message_artifacts WHERE id=? AND session_id=? AND type='user_voice'",(artifact_id,sid)).fetchone()
    if not row:raise ValueError('语音不属于当前会话')
    if row['message_id']:return row,None
    if row['status']!='ready':raise ValueError('语音分析尚未成功，不能让助手假装听懂')
    meta=json.loads(row['meta']);attachment={'type':'voice_input','id':row['id'],'path':row['file_path'],
        'url':'/uploads/'+row['file_path'],'mime':row['mime'],'text':row['visible_text'],
        'summary':meta['summary'],'chart_path':meta['chart_path'],'duration':meta['duration']}
    return row,attachment
