"""Offline tests; shell execution is restricted to temporary synthetic fixtures."""
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import time
import unittest

SPEC = importlib.util.spec_from_file_location('vps_admin_server', Path(__file__).resolve().parents[1]/'deploy/vps_admin/server.py')
server = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(server)


class ProtocolTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.runner = server.TaskRunner(Path(self.tmp.name)/'state')
        self.client = server.create_app('synthetic-token-'+'x'*32, self.runner, self.tmp.name).test_client()
        self.headers = {'Authorization':'Bearer '+'synthetic-token-'+'x'*32}

    def tearDown(self):
        self.tmp.cleanup()

    def rpc(self, method, params=None):
        return self.client.post('/mcp',json={'jsonrpc':'2.0','id':1,'method':method,'params':params or {}},headers=self.headers)

    def test_auth_and_origin(self):
        self.assertEqual(self.client.get('/health').status_code,401)
        self.assertEqual(self.client.get('/health',headers=self.headers).status_code,200)
        self.assertEqual(self.client.get('/health',headers={**self.headers,'Origin':'https://example.test'}).status_code,403)

    def test_initialize_and_discovery(self):
        self.assertEqual(self.rpc('initialize').json['result']['protocolVersion'],'2025-03-26')
        tools=self.rpc('tools/list').json['result']['tools']
        self.assertEqual([t['name'] for t in tools],['vps_run_command','vps_task_status','vps_cancel_task'])
        self.assertEqual(self.client.post('/mcp',json={'jsonrpc':'2.0','method':'notifications/initialized'},headers=self.headers).status_code,202)

    def test_invalid_arguments_and_unknown_tool(self):
        self.assertTrue(self.rpc('tools/call',{'name':'unknown'}).json['result']['isError'])
        self.assertTrue(self.rpc('tools/call',{'name':'vps_task_status','arguments':{'task_id':'../../secrets'}}).json['result']['isError'])
        self.assertEqual(self.rpc('unknown').json['error']['code'],-32601)

    def test_input_validation_and_systemd_scope(self):
        with self.assertRaises(ValueError):self.runner.submit('x','pwd',self.tmp.name,True)
        with self.assertRaises(ValueError):self.runner.submit('x','pwd','relative',10)
        with self.assertRaises(ValueError):server.create_app('short',self.runner,self.tmp.name)
        self.runner.systemd=True; self.runner.user='example-user'
        args=self.runner.command_args('a'*32,'sudo -n true',self.tmp.name,30)
        self.assertIn('--property=KillMode=control-group',args)
        self.assertIn('--uid=example-user',args)
        self.assertIn('--property=RuntimeMaxSec=30',args)


@unittest.skipUnless(os.name=='posix','Linux Bash process fixture')
class ExecutionTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.runner=server.TaskRunner(Path(self.tmp.name)/'state')

    def tearDown(self):
        self.tmp.cleanup()

    def wait(self,task):
        for _ in range(200):
            value=self.runner.status(task['task_id'])
            if value['status'] not in ['queued','running']:return value
            time.sleep(.05)
        self.fail('Synthetic task did not terminate')

    def submit(self,key,command,timeout=10):
        return self.runner.submit(key,command,self.tmp.name,timeout)

    def test_success_and_failure(self):
        done=self.wait(self.submit('ok',"printf 'hello'"))
        self.assertEqual(done['status'],'succeeded');self.assertEqual(done['output'],'hello')
        failed=self.wait(self.submit('bad',"printf 'partial'; exit 7"))
        self.assertEqual(failed['status'],'failed');self.assertEqual(failed['exit_code'],7)
        self.assertEqual(failed['output'],'partial')

    def test_lost_ack_idempotency_and_conflict(self):
        cmd="printf x >> counter; cat counter"
        first=self.submit('stable-request',cmd)
        self.wait(first)
        repeated=self.submit('stable-request',cmd)
        self.assertEqual(first['task_id'],repeated['task_id'])
        self.assertEqual((Path(self.tmp.name)/'counter').read_text(),'x')
        with self.assertRaises(ValueError):self.submit('stable-request','pwd')

    def test_cancel_retains_partial_output(self):
        task=self.submit('cancel',"printf 'before'; sleep 20")
        for _ in range(100):
            if 'before' in self.runner.status(task['task_id'])['output']:break
            time.sleep(.02)
        self.runner.cancel(task['task_id'])
        done=self.wait(task)
        self.assertEqual(done['status'],'cancelled');self.assertIn('before',done['output'])

    def test_timeout_and_single_execution_slot(self):
        task=self.submit('timeout','sleep 20',1)
        with self.assertRaises(ValueError):self.submit('concurrent','true')
        self.assertEqual(self.wait(task)['status'],'timed_out')

    def test_restart_retains_history_and_interrupts_unknown_tasks(self):
        first=self.wait(self.submit('persist','printf persisted'))
        with self.runner.connect() as db:
            db.execute("INSERT INTO tasks(id,request_id,status) VALUES(?,?,?)",('a'*32,'incomplete','running'))
        reopened=server.TaskRunner(self.runner.root)
        self.assertEqual(reopened.status(first['task_id'])['output'],'persisted')
        self.assertEqual(reopened.status('a'*32)['status'],'interrupted')

    def test_output_is_bounded(self):
        done=self.wait(self.submit('output','head -c 1100000 /dev/zero'))
        self.assertEqual(done['status'],'succeeded');self.assertTrue(done['truncated'])
        self.assertLessEqual(len(done['output']),16000)
        output=Path(self.tmp.name)/'state'/(done['task_id']+'.output')
        self.assertEqual(output.stat().st_size,server.MAX_OUTPUT)


if __name__=='__main__':unittest.main()
