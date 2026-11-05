import sqlite3
import unittest
from unittest.mock import patch
import app

class TidyLazyTest(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(':memory:')
        self.db.row_factory=sqlite3.Row
        self.db.execute('CREATE TABLE sessions(id INTEGER,title TEXT)')
        self.db.execute("INSERT INTO sessions VALUES(1,'Test')")
        self.db.execute('''CREATE TABLE conversation_summary_versions(id INTEGER,session_id INTEGER,source TEXT,status TEXT,summary TEXT,covered_from_message_id INTEGER,covered_through_message_id INTEGER,message_count INTEGER,estimated_context_tokens INTEGER,observed_context_tokens INTEGER,estimated_candidate_tokens INTEGER,threshold_tokens INTEGER,recent_message_count INTEGER,target_tokens INTEGER,instruction TEXT,model TEXT,error TEXT,created_at TEXT,reverted_at TEXT,rollback_restorable INTEGER)''')
        self.db.execute("INSERT INTO conversation_summary_versions(id,session_id,status,summary,instruction,error) VALUES(1,1,'active',?,?,?)",('body'*10000,'private instruction','error detail'))
        self.client=app.app.test_client()
        with self.client.session_transaction() as session:session['authed']=True
        self.p=patch.object(app,'get_db',return_value=self.db);self.p.start()
    def tearDown(self):
        self.p.stop();self.db.close()
    def test_compact_omits_body_and_detail_preserves_it(self):
        full=self.client.get('/api/tidy/summaries').get_json()[0]
        compact=self.client.get('/api/tidy/summaries?view=compact').get_json()[0]
        self.assertEqual(compact['summary'],'')
        self.assertEqual(compact['instruction'],'')
        self.assertTrue(compact['_detail_pending'])
        self.assertEqual(compact['can_delete'],full['can_delete'])
        detail=self.client.get('/api/tidy/summaries/1').get_json()
        self.assertEqual(detail['summary'],full['summary'])
        self.assertEqual(self.client.get('/api/tidy/summaries/999').status_code,404)
    def test_detail_requires_authentication(self):
        client=app.app.test_client()
        self.assertEqual(client.get('/api/tidy/summaries/1').status_code,401)
        self.assertEqual(client.get('/api/study/runs/1').status_code,401)

    def test_study_compact_and_detail_keep_activity(self):
        fields="id INTEGER,session_id INTEGER,origin TEXT,status TEXT,handbook_name TEXT,user_note TEXT,chain_id TEXT,parent_run_id INTEGER,attempt INTEGER,resume_state TEXT,scheduled_job_id INTEGER,primary_provider_id INTEGER,primary_model TEXT,used_provider_id INTEGER,used_model TEXT,used_fallback INTEGER,think INTEGER,footprint TEXT,handoff TEXT,wants_follow_up INTEGER,follow_up_reason TEXT,tool_log TEXT,activity_log TEXT,self_recap TEXT,context_record TEXT,context_message_id INTEGER,end_reason TEXT,error TEXT,created_at TEXT,started_at TEXT,completed_at TEXT"
        self.db.execute('CREATE TABLE night_runs('+fields+')')
        activity='[{"type":"tool","result":"synthetic result"}]'
        self.db.execute("INSERT INTO night_runs(id,session_id,status,activity_log,footprint) VALUES(1,1,'completed',?,'visible')",(activity,))
        full=self.client.get('/api/study/runs').get_json()[0]
        compact=self.client.get('/api/study/runs?view=compact').get_json()[0]
        self.assertTrue(compact['has_activity'])
        self.assertTrue(compact['_detail_pending'])
        self.assertEqual(compact['activity_log'],[])
        self.assertEqual(compact['footprint'],full['footprint'])
        self.assertEqual(self.client.get('/api/study/runs/1').get_json()['activity_log'],full['activity_log'])
        self.assertEqual(self.client.get('/api/study/runs/999').status_code,404)
