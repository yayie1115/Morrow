"""Private, loopback MCP shell access for an explicitly authorized VPS owner.

This is an administration capability, not a sandbox. The configured Unix user
may have sudo. Never publish this endpoint or its token to untrusted clients.
"""
from contextlib import contextmanager
import hashlib
import hmac
import json
import os
from pathlib import Path
import signal
import sqlite3
import subprocess
import threading
import time
import uuid

from flask import Flask, jsonify, request

MAX_OUTPUT = 1024 * 1024


class TaskRunner:
    def __init__(self, root, *, systemd=False, user=None):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.database = self.root / 'tasks.sqlite3'
        self.systemd = systemd
        self.user = user
        self.lock = threading.RLock()
        self.slot = threading.BoundedSemaphore(1)
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, request_id TEXT UNIQUE, signature TEXT, command TEXT, cwd TEXT, timeout INTEGER, status TEXT, exit_code INTEGER, cancel INTEGER DEFAULT 0, truncated INTEGER DEFAULT 0, created REAL, finished REAL)')
            unfinished = db.execute("SELECT id FROM tasks WHERE status IN ('queued','running')").fetchall()
            for row in unfinished:
                if systemd:
                    subprocess.run(['sudo', '-n', 'systemctl', 'stop', self.unit(row['id'])], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
            db.execute("UPDATE tasks SET status='interrupted', finished=? WHERE status IN ('queued','running')", (time.time(),))
        self.database.chmod(0o600)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.database, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    @staticmethod
    def unit(task_id):
        return 'morrow-admin-job-' + task_id + '.service'

    def submit(self, request_id, command, cwd, timeout):
        if not isinstance(request_id, str) or not 1 <= len(request_id) <= 200:
            raise ValueError('request_id 必须是 1–200 字符的稳定请求标识')
        if not isinstance(command, str) or not command.strip() or len(command) > 32768:
            raise ValueError('command 不能为空，最长 32768 字符')
        if not isinstance(cwd, str) or not Path(cwd).is_absolute() or not Path(cwd).is_dir():
            raise ValueError('working_directory 必须是实际存在的绝对目录')
        if type(timeout) is not int or not 1 <= timeout <= 900:
            raise ValueError('timeout_seconds 必须在 1–900 之间')
        signature = hashlib.sha256(json.dumps([command, cwd, timeout]).encode()).hexdigest()
        with self.lock, self.connect() as db:
            old = db.execute('SELECT id,signature FROM tasks WHERE request_id=?', (request_id,)).fetchone()
            if old:
                if old['signature'] != signature:
                    raise ValueError('同一 request_id 的命令不同，已拒绝重复执行')
                return self.status(old['id'])
            if not self.slot.acquire(blocking=False):
                raise ValueError('已有命令在执行，请先查询或取消该任务')
            task_id = uuid.uuid4().hex
            try:
                db.execute('INSERT INTO tasks(id,request_id,signature,command,cwd,timeout,status,created) VALUES(?,?,?,?,?,?,?,?)', (task_id, request_id, signature, command, cwd, timeout, 'queued', time.time()))
                db.commit()
                threading.Thread(target=self._work, args=(task_id, command, cwd, timeout), daemon=True).start()
            except Exception:
                self.slot.release()
                raise
        return {'task_id': task_id, 'status': 'queued'}

    def status(self, task_id):
        if not isinstance(task_id, str) or len(task_id) != 32 or any(c not in '0123456789abcdef' for c in task_id):
            raise ValueError('无效 task_id')
        with self.connect() as db:
            row = db.execute('SELECT id,status,exit_code,truncated,created,finished FROM tasks WHERE id=?', (task_id,)).fetchone()
        if row is None:
            raise ValueError('任务不存在')
        result = dict(row)
        result['task_id'] = result.pop('id')
        output = self.root / (task_id + '.output')
        if output.exists():
            with output.open('rb') as stream:
                stream.seek(max(0, output.stat().st_size - 16000))
                result['output'] = stream.read(16000).decode('utf-8', errors='replace')
        else:
            result['output'] = ''
        return result

    def cancel(self, task_id):
        result = self.status(task_id)
        if result['status'] in ('queued', 'running'):
            with self.connect() as db:
                db.execute('UPDATE tasks SET cancel=1 WHERE id=?', (task_id,))
            result['cancel_requested'] = True
        return result

    def command_args(self, task_id, command, cwd, timeout):
        if not self.systemd:
            return ['/bin/bash', '-lc', command]
        return ['sudo', '-n', 'systemd-run', '--quiet', '--wait', '--pipe', '--collect',
                '--unit=' + self.unit(task_id), '--uid=' + self.user, '--gid=' + self.user,
                '--working-directory=' + cwd, '--property=UMask=0077',
                '--property=MemoryMax=512M', '--property=CPUQuota=100%',
                '--property=RuntimeMaxSec=' + str(timeout), '--property=TimeoutStopSec=5s',
                '--property=KillMode=control-group', '/bin/bash', '-lc', command]

    def _stop(self, task_id, process):
        if self.systemd:
            subprocess.run(['sudo', '-n', 'systemctl', 'stop', self.unit(task_id)], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
        elif process.poll() is None:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass

    def _work(self, task_id, command, cwd, timeout):
        process = None
        truncated = [False]
        state, exit_code = 'failed', None
        output_path = self.root / (task_id + '.output')
        try:
            with self.connect() as db:
                db.execute("UPDATE tasks SET status='running' WHERE id=?", (task_id,))
            with output_path.open('xb') as output:
                output_path.chmod(0o600)
                process = subprocess.Popen(self.command_args(task_id, command, cwd, timeout), cwd=cwd,
                    stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                    start_new_session=True, bufsize=0,
                    env={k:v for k,v in os.environ.items() if not k.startswith('VPS_ADMIN_')})
                def capture():
                    stored = 0
                    while True:
                        chunk = process.stdout.read(4096)
                        if not chunk:
                            break
                        remaining = max(0, MAX_OUTPUT - stored)
                        if remaining:
                            output.write(chunk[:remaining]); output.flush(); stored += min(remaining, len(chunk))
                        if len(chunk) > remaining:
                            truncated[0] = True
                reader = threading.Thread(target=capture, daemon=True)
                reader.start()
                deadline = time.monotonic() + timeout + (5 if self.systemd else 0)
                state = 'running'
                while process.poll() is None:
                    with self.connect() as db:
                        cancelled = db.execute('SELECT cancel FROM tasks WHERE id=?', (task_id,)).fetchone()[0]
                    if cancelled:
                        state = 'cancelled'; self._stop(task_id, process)
                    elif time.monotonic() > deadline:
                        state = 'timed_out'; self._stop(task_id, process)
                    time.sleep(0.1)
                exit_code = process.wait()
                reader.join(timeout=10)
                if reader.is_alive():
                    self._stop(task_id, process)
                    raise RuntimeError('输出流未关闭；任务状态未知，请核对后再操作')
                process.stdout.close()
                if state == 'running':
                    state = 'succeeded' if exit_code == 0 else 'failed'
        except Exception as exc:
            if process is not None and process.poll() is None:
                try:
                    self._stop(task_id, process)
                except Exception:
                    pass
            state = 'interrupted'
            with output_path.open('ab') as output:
                output.write(('\n管理任务异常：' + type(exc).__name__).encode())
        finally:
            with self.lock:
                with self.connect() as db:
                    db.execute('UPDATE tasks SET status=?,exit_code=?,truncated=?,finished=? WHERE id=?', (state, exit_code, int(truncated[0]), time.time(), task_id))
                self.slot.release()


TOOLS = [
 {'name':'vps_run_command','description':'执行用户要求的 VPS Bash 命令。使用现有管理员账号，可 sudo -n 管理文件、源码、服务和 Docker；这是实际服务器，不是沙盒。只执行用户要求的操作，不输出密钥或私人聊天正文，不自主修改无关站点。先提交任务再查询结果；同一命令重试必须复用 request_id，不要因超时盲目重发。修改前检查现状和恢复办法。',
  'inputSchema':{'type':'object','properties':{'request_id':{'type':'string','description':'本次操作唯一稳定标识，丢失响应后原样复用'},'command':{'type':'string'},'working_directory':{'type':'string'},'timeout_seconds':{'type':'integer','minimum':1,'maximum':900,'default':120}},'required':['request_id','command']},
  'annotations':{'readOnlyHint':False,'destructiveHint':True,'idempotentHint':False,'openWorldHint':True}},
 {'name':'vps_task_status','description':'读取 VPS 命令任务的真实状态和末尾输出。succeeded 才代表退出码为 0；interrupted 表示中断，不得宣称成功或盲目重复执行。',
  'inputSchema':{'type':'object','properties':{'task_id':{'type':'string'}},'required':['task_id']},'annotations':{'readOnlyHint':True}},
 {'name':'vps_cancel_task','description':'请求停止本工具创建的指定 VPS 任务及其进程组，不撤销已经发生的文件或服务变化；之后查询任务确认。',
  'inputSchema':{'type':'object','properties':{'task_id':{'type':'string'}},'required':['task_id']},'annotations':{'readOnlyHint':False,'destructiveHint':True}}
]


def create_app(token, runner, default_cwd):
    if not isinstance(token, str) or len(token) < 32:
        raise ValueError('A private token of at least 32 characters is required')
    app = Flask(__name__)
    app.config['MAX_CONTENT_LENGTH'] = 65536

    @app.before_request
    def authorize():
        # No browser-origin access; only the private MCP host should call this.
        if request.headers.get('Origin'):
            return jsonify(error='Browser origin is not allowed'), 403
        supplied = request.headers.get('Authorization', '')
        if not hmac.compare_digest(supplied.encode(), ('Bearer '+token).encode()):
            return jsonify(error='Unauthorized'), 401

    @app.get('/health')
    def health():
        return jsonify(status='ok')

    @app.post('/mcp')
    def mcp():
        body = request.get_json(silent=True)
        if not isinstance(body, dict) or body.get('jsonrpc') != '2.0':
            return jsonify(jsonrpc='2.0', id=None, error={'code':-32600,'message':'Invalid request'}), 400
        mid, method = body.get('id'), body.get('method')
        if method == 'notifications/initialized' and mid is None:
            return '', 202
        if method == 'initialize':
            result = {'protocolVersion':'2025-03-26','capabilities':{'tools':{'listChanged':False}},'serverInfo':{'name':'morrow-vps-admin','version':'1.0.0'}}
        elif method == 'ping':
            result = {}
        elif method == 'tools/list':
            result = {'tools':TOOLS}
        elif method == 'tools/call':
            params = body.get('params') or {}
            args, name = params.get('arguments') or {}, params.get('name')
            try:
                if not isinstance(args, dict):
                    raise ValueError('arguments 必须是对象')
                if name == 'vps_run_command':
                    value = runner.submit(args.get('request_id'), args.get('command'), args.get('working_directory', default_cwd), args.get('timeout_seconds', 120))
                elif name == 'vps_task_status':
                    value = runner.status(args.get('task_id'))
                elif name == 'vps_cancel_task':
                    value = runner.cancel(args.get('task_id'))
                else:
                    raise ValueError('未知工具')
                result = {'content':[{'type':'text','text':json.dumps(value, ensure_ascii=False)}]}
            except (ValueError, TypeError) as exc:
                result = {'isError':True,'content':[{'type':'text','text':str(exc)}]}
        else:
            return jsonify(jsonrpc='2.0', id=mid, error={'code':-32601,'message':'Method not found'})
        return jsonify(jsonrpc='2.0', id=mid, result=result)
    return app


def from_environment():
    token = Path(os.environ['VPS_ADMIN_TOKEN_FILE']).read_text().strip()
    runner = TaskRunner(os.environ['VPS_ADMIN_STATE'], systemd=True, user=os.environ['VPS_ADMIN_UNIX_USER'])
    return create_app(token, runner, os.environ['VPS_ADMIN_DEFAULT_CWD'])
