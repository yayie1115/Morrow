import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from datetime import datetime,timedelta
from unittest.mock import patch
import app
import presence_contact as contact


class PresenceContactTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(dir='data/test-tmp');self.root=Path(self.temp.name)
        self.old=(app.DB_PATH,app.DATA_DIR,app.UPLOAD_DIR)
        app.DB_PATH=str(self.root/'nook.db');app.DATA_DIR=str(self.root);app.UPLOAD_DIR=str(self.root/'uploads');app.init_db()
        self.db=sqlite3.connect(app.DB_PATH);self.db.row_factory=sqlite3.Row
        self.db.execute("CREATE TABLE presence_events(id INTEGER PRIMARY KEY,at TEXT NOT NULL,kind TEXT,action TEXT,reason TEXT,detail_json TEXT)")
        self.sid=self.db.execute("INSERT INTO sessions(title) VALUES ('Synthetic contact')").lastrowid
        for key,value in [('presence_engine',{'enabled':True}),('proactive_messages',{'enabled':False,'target_session_id':self.sid})]:
            self.db.execute('INSERT OR REPLACE INTO settings VALUES (?,?)',(key,json.dumps(value)))
        self.db.commit();self.now=datetime(2026,11,3,15,0)
        self.config={'target_session_id':self.sid,'enabled':False}

    def tearDown(self):
        self.db.close();app.DB_PATH,app.DATA_DIR,app.UPLOAD_DIR=self.old;self.temp.cleanup()

    def queue(self,now=None,action='contact'):
        return contact.queue(self.db,[{'action':action}],self.config,now or self.now)

    def test_contact_works_with_old_switch_off_and_no_lottery(self):
        with patch('app.random.SystemRandom',side_effect=AssertionError('Lottery must not run')):
            kid=self.queue();self.assertIsNotNone(kid)
            row=app._ensure_proactive_job(self.db,self.now);self.assertEqual(row['id'],kid)
            self.assertEqual(row['kind'],'presence');self.assertEqual(row['status'],'planned')
        self.assertEqual(self.db.execute("SELECT action FROM presence_events").fetchone()[0],'queued')

    def test_no_signal_or_non_contact_no_job_and_quiet_hours(self):
        self.assertIsNone(self.queue(action='find_activity'))
        self.assertIsNone(self.queue(now=self.now.replace(hour=23)))
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM proactive_message_jobs').fetchone()[0],0)

    def test_repeated_signal_deduplicates_and_failed_quiet_are_not_rearmed(self):
        kid=self.queue();self.assertEqual(self.queue(),kid)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM presence_events').fetchone()[0],1)
        for status in ('failed','quiet','sent','running','skipped'):
            self.db.execute('UPDATE proactive_message_jobs SET status=? WHERE id=?',(status,kid));self.db.commit()
            self.assertIsNone(self.queue())
            self.assertEqual(self.db.execute('SELECT status FROM proactive_message_jobs WHERE id=?',(kid,)).fetchone()[0],status)

    def test_disabled_presence_cancels_without_reenabling_builtin(self):
        kid=self.queue();self.db.execute("UPDATE settings SET value=? WHERE key='presence_engine'",(json.dumps({'enabled':False}),));self.db.commit()
        self.assertIsNone(app._ensure_proactive_job(self.db,self.now));self.db.commit()
        self.assertEqual(self.db.execute('SELECT status FROM proactive_message_jobs WHERE id=?',(kid,)).fetchone()[0],'cancelled')

    def test_scheduler_claims_once_and_preserves_silence_guard(self):
        kid=self.queue()
        self.db.execute("INSERT INTO messages(session_id,role,content,created_at) VALUES (?,'user','Synthetic recent',?)",(self.sid,(self.now-timedelta(minutes=5)).strftime('%Y-%m-%d %H:%M:%S')));self.db.commit()
        with app.app.app_context(),patch('app.threading.Thread') as thread:
            self.assertIsNone(app._proactive_scheduler_tick(self.now));thread.assert_not_called()
        row=self.db.execute('SELECT * FROM proactive_message_jobs WHERE id=?',(kid,)).fetchone()
        later=self.now+timedelta(hours=2)
        with app.app.app_context(),patch('app.threading.Thread') as thread:
            self.assertEqual(app._proactive_scheduler_tick(later),kid);thread.assert_called_once()
            self.assertIsNone(app._proactive_scheduler_tick(later));thread.assert_called_once()

    def test_daily_cap_and_deterministic_postponement(self):
        kid=self.queue();row=self.db.execute('SELECT * FROM proactive_message_jobs WHERE id=?',(kid,)).fetchone()
        self.assertTrue(contact.postpone(self.db,row,self.now+timedelta(minutes=15),self.now));self.db.commit()
        self.assertEqual(self.db.execute('SELECT planned_at FROM proactive_message_jobs WHERE id=?',(kid,)).fetchone()[0],'2026-11-03 15:15:00')
        self.db.execute("INSERT INTO messages(session_id,role,content,proactive,created_at) VALUES (?,'assistant','Synthetic sent',1,?)",(self.sid,self.now.strftime('%Y-%m-%d %H:%M:%S')));self.db.commit()
        self.assertIsNone(self.queue())

    def test_background_delivery_uses_presence_switch_and_existing_chat_push_path(self):
        kid=self.queue();self.db.execute("UPDATE proactive_message_jobs SET status='running' WHERE id=?",(kid,));self.db.commit()
        result={'ok':True,'decision':'send','message':'Synthetic proactive message','usage':[]}
        with patch('presence_chat_route.resolve',return_value={'provider_id':7,'model':'synthetic-chat','context_limit':50}),patch('app.presence_wake.wake',return_value=result) as model,patch('app._background_push_delivery') as push:
            app._background_proactive_job(kid)
            model.assert_called_once();self.assertEqual(model.call_args.kwargs['source'],'presence');self.assertEqual(model.call_args.kwargs['provider_id'],7);self.assertEqual(model.call_args.kwargs['model'],'synthetic-chat');self.assertEqual(model.call_args.kwargs['context_limit'],50);self.assertFalse(model.call_args.kwargs['fallback']['model']);push.assert_called_once()
        row=self.db.execute('SELECT status,message_id FROM proactive_message_jobs WHERE id=?',(kid,)).fetchone()
        self.assertEqual(row['status'],'sent');self.assertIsNotNone(row['message_id'])
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM presence_events WHERE action='sent'").fetchone()[0],1)

    def test_background_quiet_does_not_create_message_or_push(self):
        kid=self.queue();self.db.execute("UPDATE proactive_message_jobs SET status='running' WHERE id=?",(kid,));self.db.commit()
        with patch('presence_chat_route.resolve',return_value={'provider_id':7,'model':'synthetic-chat'}),patch('app.presence_wake.wake',return_value={'ok':True,'decision':'quiet','usage':[]}),patch('app._background_push_delivery') as push:
            app._background_proactive_job(kid);push.assert_not_called()
        self.assertEqual(self.db.execute('SELECT status FROM proactive_message_jobs WHERE id=?',(kid,)).fetchone()[0],'quiet')
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM messages WHERE proactive=1').fetchone()[0],0)
