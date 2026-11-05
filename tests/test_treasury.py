from frontend_source import frontend_source, expand_frontend
import sqlite3
import unittest
import treasury
class TreasuryTest(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(':memory:');self.db.execute('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT)');self.addCleanup(self.db.close)
    def action(self,op,action,**kw):
        return treasury.mutate(self.db,dict(operation_id=op,revision=treasury.read(self.db)['revision'],action=action,**kw))
    def test_salary_bonus_request_and_retry(self):
        body=dict(operation_id='one',revision=0,action='salary');a=treasury.mutate(self.db,body)
        self.assertEqual(treasury.mutate(self.db,body),a)
        with self.assertRaises(ValueError):self.action('two','salary')
        self.action('bonus','bonus',cents=50,note='sample')
        r=self.action('req','request',cents=120,item='sample',reason='')
        q=r['requests'][0]['id'];r=self.action('approve','decide',request_id=q,approve=True)
        self.assertEqual(sum(t['cents'] for t in r['transactions']),30)
        with self.assertRaises(ValueError):self.action('again','decide',request_id=q,approve=True)
    def test_conflict_invalid_and_insufficient_are_atomic(self):
        for b in [dict(operation_id='x',revision=4,action='salary'),dict(operation_id='x',revision=0,action='bonus',cents=True)]:
            with self.assertRaises(ValueError):treasury.mutate(self.db,b)
        r=self.action('q','request',cents=100,item='sample');q=r['requests'][0]['id']
        with self.assertRaises(ValueError):self.action('approve','decide',request_id=q,approve=True)
        self.assertEqual(treasury.read(self.db)['requests'][0]['status'],'pending')
        self.assertEqual(treasury.read(self.db)['transactions'],[])
    def test_authenticated_routes(self):
        import app
        from unittest.mock import patch
        with patch.object(app,'AUTH_PASSWORD','synthetic'),patch.object(app,'get_db',return_value=self.db):
            c=app.app.test_client();self.assertEqual(c.get('/api/treasury').status_code,401)
            self.assertEqual(c.post('/api/treasury',json={}).status_code,401)
            with c.session_transaction() as s:s['authed']=True
            self.assertEqual(c.get('/api/treasury').json['revision'],0)
            self.assertEqual(c.post('/api/treasury',json=dict(operation_id='one',revision=0,action='salary')).status_code,200)
    def test_home_summary_uses_real_cents_and_hides_zero_pending(self):
        import shutil,subprocess,json
        from pathlib import Path
        node=shutil.which('node')
        if not node:self.skipTest('Node unavailable')
        page=frontend_source()
        code=page[page.index('let treasurySummaryLoading=false;'):page.index('$("#treasuryEntry").onclick=')]
        script="const assert=require('assert');const nodes={};const $=k=>nodes[k]??={};let state={transactions:[{cents:100},{cents:-25}],requests:[]};let ok=true;const api=async()=>({ok,json:async()=>state});"+code+";(async()=>{await loadTreasurySummary();assert.equal($('#treasuryHomeBalance').textContent,'余额 ¥0.75');assert.equal($('#treasuryHomePending').hidden,true);state.requests=[{status:'pending'}];await loadTreasurySummary();assert.equal($('#treasuryHomePending').textContent,'1 份待审批');assert.equal($('#treasuryHomePending').hidden,false);ok=false;await loadTreasurySummary();assert.equal($('#treasuryHomeBalance').textContent,'余额暂未读取');assert.equal($('#treasuryHomePending').hidden,true);})().catch(e=>{console.error(e);process.exitCode=1});"
        subprocess.run([node,'-e',script],check=True)
