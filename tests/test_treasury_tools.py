import json
from contextlib import closing
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import treasury
import treasury_tools
import tools
class TreasuryToolsTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.path=str(Path(self.tmp.name)/'test.db')
        self.db=sqlite3.connect(self.path);self.addCleanup(self.db.close)
        self.db.executescript("CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE messages(id INTEGER PRIMARY KEY,session_id INTEGER,role TEXT,hidden INTEGER DEFAULT 0);INSERT INTO messages VALUES(1,1,'user',0);")
    def test_request_retry_restart_and_approval(self):
        args={'item':'测试物品','cents':125,'reason':'合成理由'}
        a=treasury_tools.submit(self.db,args,1);self.assertEqual(a['request']['status'],'pending');self.assertEqual(a['balance_cents'],0)
        with closing(sqlite3.connect(self.path)) as other:
            b=treasury_tools.submit(other,args,1)
        self.assertEqual(a['request']['id'],b['request']['id']);self.assertTrue(b['already_submitted'])
        state=treasury.read(self.db);treasury.mutate(self.db,dict(operation_id='bonus',revision=state['revision'],action='bonus',cents=200))
        state=treasury.read(self.db);treasury.mutate(self.db,dict(operation_id='approve',revision=state['revision'],action='decide',request_id=a['request']['id'],approve=True))
        c=treasury_tools.submit(self.db,args,1);self.assertEqual(c['request']['status'],'approved');self.assertEqual(c['balance_cents'],75)
        self.assertEqual(len(treasury.read(self.db)['requests']),1)
    def test_conflicting_retry_does_not_duplicate(self):
        args={'item':'测试物品','cents':125,'reason':'合成理由'};treasury_tools.submit(self.db,args,1)
        with self.assertRaises(ValueError):treasury_tools.submit(self.db,{**args,'reason':'不同理由'},1)
        self.assertEqual(len(treasury.read(self.db)['requests']),1)
    def test_no_source_or_privileged_action(self):
        for sid,args in [(2,{'item':'测试物品','cents':1}),(True,{'item':'测试物品','cents':1}),(1,{'item':'测试物品','cents':1,'action':'bonus'}),(1,{'item':'测试物品','cents':True})]:
            with self.subTest(args=args,sid=sid),self.assertRaises(ValueError):treasury_tools.submit(self.db,args,sid)
        self.assertEqual(treasury.read(self.db)['revision'],0)
    def test_read_pagination_and_summary(self):
        for n in range(3):treasury_tools.submit(self.db,{'item':'合成物品'+str(n),'cents':10,'reason':''},1)
        a=treasury_tools.read(self.db,{'section':'requests','limit':2});self.assertEqual(len(a['items']),2);self.assertEqual(a['next_offset'],2)
        b=treasury_tools.read(self.db,{'section':'requests','limit':2,'offset':2});self.assertEqual(len(b['items']),1);self.assertIsNone(b['next_offset'])
        self.assertEqual(treasury_tools.read(self.db,{})['pending_count'],3)
        with self.assertRaises(ValueError):treasury_tools.read(self.db,{'limit':11})
    def test_real_tool_registry_and_error_status(self):
        with patch.object(tools,'DB_PATH',self.path):
            r=tools.execute('request_treasury_expense',{'item':'合成物品','cents':10,'reason':''},1);self.assertTrue(r['ok'])
            r=tools.execute('read_treasury',{},1);self.assertTrue(r['ok']);self.assertEqual(json.loads(r['content'])['pending_count'],1)
            r=tools.execute('request_treasury_expense',{'item':'合成物品','cents':10,'action':'decide'},1);self.assertFalse(r['ok'])
        for name in ['read_treasury','request_treasury_expense']:
            self.assertIn(name,tools._REGISTRY);self.assertFalse(tools._REGISTRY[name][2]['parameters']['additionalProperties'])
