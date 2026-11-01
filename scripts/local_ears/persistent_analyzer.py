"""Bounded JSON-line worker supervisor. Requests are serialized by the server."""
import json, os, queue, subprocess, threading
from pathlib import Path

class PersistentAnalyzer:
    def __init__(self, root, base, timeout=600):
        self.root=Path(root);self.base=Path(base);self.timeout=timeout
        self.process=None;self.messages=None;self.log=None;self.lock=threading.RLock()
    def close(self):
        with self.lock:
            p=self.process;self.process=None
            if p is not None:
                if p.poll() is None:p.kill()
                p.wait(timeout=10)
                p.stdin.close();p.stdout.close()
            if self.log:self.log.close();self.log=None
    @staticmethod
    def _read(process, messages):
        try:
            for line in process.stdout:messages.put(json.loads(line))
        except Exception:pass
        finally:messages.put(None)
    def _receive(self):
        value=self.messages.get(timeout=self.timeout)
        if value is None:raise RuntimeError('analysis worker exited')
        return value
    def start(self):
        with self.lock:
            if self.process is not None and self.process.poll() is None:return
            self.close();self.messages=queue.Queue()
            self.log=(self.base/'worker-runtime.log').open('a',encoding='utf-8')
            try:
                self.process=subprocess.Popen([str(self.root/'.venv/Scripts/python.exe'),str(self.base/'worker.py'),str(self.root),'--persistent'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=self.log,text=True,encoding='utf-8',bufsize=1,env={**os.environ,'PYTHONUTF8':'1','MPLCONFIGDIR':str(self.base/'mpl-cache')},creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
                threading.Thread(target=self._read,args=(self.process,self.messages),daemon=True).start()
                if self._receive()!= {'ready':True}:raise RuntimeError('invalid worker readiness')
            except Exception:self.close();raise
    def analyze(self,job):
        with self.lock:
            try:
                self.start();ident=Path(job).name
                self.process.stdin.write(json.dumps({'id':ident,'job':str(job)})+'\n');self.process.stdin.flush()
                value=self._receive()
                if not value or value.get('id')!=ident:raise RuntimeError('worker response mismatch')
                if not value.get('ok'):raise ValueError('analysis failed; see worker-runtime.log')
                return value
            except Exception:self.close();raise
