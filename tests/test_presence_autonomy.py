import json
import sqlite3
import tempfile
from pathlib import Path
from datetime import datetime,timedelta
import unittest
from unittest.mock import patch
import app,presence_activity,presence_wake


class PresenceWakeTest(unittest.TestCase):
    def test_existing_alarm_executor_has_tools_and_dynamic_tone_no_json_contract(self):
        events=[('tool_result',{'name':'read_note','args':{},'result':'Synthetic note'}),('delta','Synthetic natural reply')]
        with patch('presence_wake.presence_tone.read',return_value='Synthetic tone'),patch('alarm_engine.chat_engine.stream_chat',return_value=iter(events)) as model:
            result=presence_wake.wake(session_id=1,provider_id=7,model='chat-test')
        self.assertTrue(result['ok']);self.assertEqual(result['decision'],'send');self.assertTrue(result['no_retry'])
        self.assertNotEqual(model.call_args.kwargs.get('allow_tools'),False)
        self.assertEqual(model.call_args.kwargs['max_tool_rounds'],8)
        self.assertEqual(model.call_args.kwargs['volatile_extra'],'Synthetic tone')
        self.assertEqual(len(result['tool_log']),1)
    def test_tool_only_quiet_and_partial_failure_do_not_retry_or_fabricate_text(self):
        for ending in ([('delta','[[暂不发送]]')],[('error',{'message':'Synthetic failure'})]):
            with patch('presence_wake.presence_tone.read',return_value=''),patch('alarm_engine.chat_engine.stream_chat',return_value=iter([('tool_result',{'name':'write_note','result':'ok'})]+ending)):
                result=presence_wake.wake(session_id=1)
                self.assertTrue(result['no_retry']);self.assertEqual(len(result['tool_log']),1)
                if ending[0][0]=='delta':self.assertEqual(result['decision'],'quiet');self.assertEqual(result['message'],'')
                else:self.assertFalse(result['ok'])
    def test_hidden_voice_artifact_is_a_real_send_even_without_text(self):
        events=[('tool_result',{'name':'send_voice','hidden':True,'artifact_id':5}),('delta','[[暂不发送]]')]
        with patch('presence_wake.presence_tone.read',return_value=''),patch('alarm_engine.chat_engine.stream_chat',return_value=iter(events)):
            result=presence_wake.wake(session_id=1)
        self.assertEqual(result['decision'],'send');self.assertEqual(result['artifact_ids'],[5]);self.assertEqual(result['message'],'')
    def test_stream_exception_preserves_executed_tools_and_blocks_retry(self):
        def events():
            yield 'tool_result',{'name':'set_alarm','result':'Synthetic saved'}
            raise RuntimeError('Synthetic private detail')
        with patch('presence_wake.presence_tone.read',return_value=''),patch('alarm_engine.chat_engine.stream_chat',return_value=events()):
            result=presence_wake.wake(session_id=1)
        self.assertFalse(result['ok']);self.assertTrue(result['no_retry']);self.assertEqual(len(result['tool_log']),1)
        self.assertNotIn('private detail',result['error'])


class PresenceActivityTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(dir='data/test-tmp');self.root=Path(self.temp.name)
        self.old=app.DB_PATH,app.DATA_DIR,app.UPLOAD_DIR
        app.DB_PATH=str(self.root/'nook.db');app.DATA_DIR=str(self.root);app.UPLOAD_DIR=str(self.root/'uploads');app.init_db()
        self.db=sqlite3.connect(app.DB_PATH);self.db.row_factory=sqlite3.Row
        self.db.executescript("CREATE TABLE presence_state(id INTEGER,state_json TEXT); INSERT INTO presence_state VALUES(1,'{}'); CREATE TABLE presence_events(id INTEGER PRIMARY KEY,at TEXT,kind TEXT,action TEXT,reason TEXT,detail_json TEXT);")
        self.db.execute('INSERT INTO settings VALUES (?,?)',('presence_engine',json.dumps({'enabled':True})))
        self.sid=self.db.execute("INSERT INTO sessions(title) VALUES ('Synthetic activity')").lastrowid;self.db.commit()
        self.now=datetime(2026,11,3,15,0)
    def tearDown(self):
        self.db.close();app.DB_PATH,app.DATA_DIR,app.UPLOAD_DIR=self.old;self.temp.cleanup()
    def create(self):
        return self.db.execute("INSERT INTO night_runs(session_id,origin,status,created_at) VALUES (?,'presence','queued',?)",(self.sid,str(self.now))).lastrowid
    def queue(self,triggers=None):
        return presence_activity.queue(self.db,triggers or [{'action':'find_activity'}],{'target_session_id':self.sid},self.create,lambda *args:None,self.now)
    def test_reuses_room_ledger_and_deduplicates_queued_and_completed(self):
        run=self.queue();self.assertIsNotNone(run);self.assertIsNone(self.queue())
        self.db.execute("UPDATE night_runs SET status='completed' WHERE id=?",(run,));self.db.commit()
        self.assertIsNone(self.queue());self.assertEqual(self.db.execute('SELECT COUNT(*) FROM night_runs').fetchone()[0],1)
    def test_contact_priority_and_recent_chat_prevent_parallel_activity(self):
        self.assertIsNone(self.queue([{'action':'contact'},{'action':'find_activity'}]))
        self.db.execute("INSERT INTO messages(session_id,role,content,created_at) VALUES (?,'user','Synthetic',?)",(self.sid,str(self.now-timedelta(minutes=10))));self.db.commit()
        self.assertIsNone(self.queue())
    def test_only_real_started_activity_changes_focus_and_failure_is_not_completion(self):
        run=self.queue();self.assertEqual(json.loads(self.db.execute('SELECT state_json FROM presence_state').fetchone()[0]),{})
        presence_activity.started(self.db,run);self.db.commit()
        self.assertEqual(json.loads(self.db.execute('SELECT state_json FROM presence_state').fetchone()[0])['immersion'],.4)
        presence_activity.finished(self.db,run,'failed');self.db.commit()
        self.assertEqual(json.loads(self.db.execute('SELECT state_json FROM presence_state').fetchone()[0])['immersion'],0)
        event=self.db.execute("SELECT detail_json FROM presence_events WHERE action='activity_failed'").fetchone()
        self.assertFalse(json.loads(event[0])['executed'])
    def test_pending_recovery_is_not_restarted_as_a_new_autonomous_activity(self):
        self.db.execute("INSERT INTO night_runs(session_id,origin,status,resume_state,created_at) VALUES (?,'manual','failed','pending',?)",(self.sid,str(self.now-timedelta(days=1))));self.db.commit()
        self.assertIsNone(self.queue())
    def test_room_dispatch_uses_chat_route_and_preserves_pending_user_note(self):
        original={'target_session_id':99,'wake_prompt':'Synthetic handbook','user_note':'Keep this manual note'}
        captured={}
        def create(db,room,**kwargs):
            captured.update(room=room,kwargs=kwargs);return self.create()
        with patch('presence_activity.datetime') as clock,patch('app._proactive_settings',return_value={'target_session_id':self.sid}),patch('app._study_settings',return_value=original),patch('presence_chat_route.resolve',return_value={'provider_id':7,'model':'chat-test','context_limit':50}),patch('app._create_study_run_record',side_effect=create),patch('app._alarm_proactive_hold_until',return_value=None),patch('app.threading.Thread') as thread:
            clock.now.return_value=self.now
            run_id=app._presence_start_activity(self.db,[{'action':'find_activity'}]);self.assertIsNotNone(run_id);thread.assert_called_once()
        self.assertEqual(captured['kwargs']['origin'],'presence')
        self.assertEqual(captured['kwargs']['overrides']['model'],'chat-test')
        self.assertEqual(captured['room']['user_note'],'');self.assertEqual(original['user_note'],'Keep this manual note')
        self.assertEqual(original['target_session_id'],99)
