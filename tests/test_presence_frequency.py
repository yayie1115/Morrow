from contextlib import closing
from datetime import datetime, timedelta
import json
import sqlite3
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch
import app
import presence_contact
import presence_frequency as frequency
import presence_timing
from scripts.patch_presence_cadence import transform


class FrequencyTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.old=app.DB_PATH,app.DATA_DIR,app.UPLOAD_DIR
        app.DB_PATH=str(Path(self.temp.name)/'nook.db');app.DATA_DIR=self.temp.name;app.UPLOAD_DIR=str(Path(self.temp.name)/'uploads')
        app.init_db()
        self.db=sqlite3.connect(app.DB_PATH);self.db.row_factory=sqlite3.Row
        self.db.execute('CREATE TABLE IF NOT EXISTS presence_events(id INTEGER PRIMARY KEY,at TEXT,kind TEXT,action TEXT,reason TEXT,detail_json TEXT)')
        self.sid=self.db.execute("INSERT INTO sessions(title) VALUES ('Synthetic contact')").lastrowid
        self.config={'enabled':False,'target_session_id':self.sid}
        for key,value in [('presence_engine',{'enabled':True}),('proactive_messages',self.config),(frequency.KEY,frequency.DEFAULT)]:
            self.db.execute('INSERT OR REPLACE INTO settings VALUES (?,?)',(key,json.dumps(value)))
        self.now=datetime(2026,11,3,14,0)
        self.user(self.now-timedelta(hours=3))

    def tearDown(self):
        self.db.close();app.DB_PATH,app.DATA_DIR,app.UPLOAD_DIR=self.old;self.temp.cleanup()

    def user(self,at):
        self.db.execute("INSERT INTO messages(session_id,role,content,created_at) VALUES (?,'user','Synthetic user',?)",(self.sid,str(at)));self.db.commit()

    def queue(self,now=None):
        return presence_contact.queue(self.db,[{'action':'contact'}],self.config,now or self.now)

    def test_day_and_night_bounds_and_stable_polling(self):
        anchor=self.now-timedelta(hours=3)
        due=frequency.next_at(self.db,self.sid,self.now)
        self.assertTrue(anchor+timedelta(hours=1)<=due<=anchor+timedelta(hours=2))
        self.assertEqual(due,frequency.next_at(self.db,self.sid,self.now+timedelta(minutes=5)))
        night=self.now.replace(hour=4)
        due=frequency.next_at(self.db,self.sid,night)
        self.assertTrue(anchor+timedelta(hours=3)<=due<=anchor+timedelta(hours=4))
        self.assertEqual(frequency.period(night.replace(hour=1)),'night')
        self.assertEqual(frequency.period(night.replace(hour=10)),'day')
        self.assertEqual(frequency.period(night.replace(hour=0)),'day')

    def test_user_return_resets_interval_and_pending_job_is_deferred(self):
        kid=self.queue();self.user(self.now)
        due=frequency.next_at(self.db,self.sid,self.now)
        self.assertGreaterEqual(due,self.now+timedelta(hours=1))
        with app.app.app_context(),patch('app.threading.Thread') as thread:
            self.assertIsNone(app._proactive_scheduler_tick(self.now));thread.assert_not_called()
        self.assertGreater(self.db.execute('SELECT planned_at FROM proactive_message_jobs WHERE id=?',(kid,)).fetchone()[0],str(self.now))

    def test_more_than_one_contact_daily_and_no_eight_hour_cooldown(self):
        kid=self.queue();job=self.db.execute('SELECT * FROM proactive_message_jobs WHERE id=?',(kid,)).fetchone()
        frequency.attempted(self.db,job,self.now)
        self.db.execute("INSERT INTO messages(session_id,role,content,proactive,created_at) VALUES (?,'assistant','Synthetic proactive',1,?)",(self.sid,str(self.now)))
        self.db.execute("UPDATE proactive_message_jobs SET status='sent' WHERE id=?",(kid,));self.db.commit()
        self.assertIsNone(self.queue(self.now+timedelta(minutes=30)))
        self.assertEqual(self.queue(self.now+timedelta(hours=2,minutes=1)),kid)
        with app.app.app_context(),patch('app.threading.Thread') as thread:
            self.assertEqual(app._proactive_scheduler_tick(self.now+timedelta(hours=2,minutes=1)),kid)
            thread.assert_called_once()

    def test_quiet_failure_wait_a_full_interval_before_rearming(self):
        kid=self.queue();job=self.db.execute('SELECT * FROM proactive_message_jobs WHERE id=?',(kid,)).fetchone()
        for status in ('quiet','failed'):
            frequency.attempted(self.db,job,self.now)
            self.db.execute('UPDATE proactive_message_jobs SET status=? WHERE id=?',(status,kid));self.db.commit()
            self.assertIsNone(self.queue(self.now+timedelta(minutes=5)))
            self.assertEqual(self.queue(self.now+timedelta(hours=2,minutes=1)),kid)

    def test_midnight_pending_and_unanswered_night_contact(self):
        evening=self.now.replace(hour=23)
        kid=self.queue(evening)
        self.assertEqual(presence_contact.pending(self.db,evening+timedelta(hours=1))['id'],kid)
        self.assertEqual(self.queue(evening+timedelta(hours=2)),kid)
        job=self.db.execute('SELECT * FROM proactive_message_jobs WHERE id=?',(kid,)).fetchone()
        frequency.attempted(self.db,job,evening)
        self.db.execute("UPDATE proactive_message_jobs SET status='quiet' WHERE id=?",(kid,));self.db.commit()
        self.assertIsNone(self.queue(evening+timedelta(hours=2)))
        self.assertIsNotNone(self.queue(evening+timedelta(hours=4,minutes=1)))

    def test_busy_chat_defers_without_model_and_single_claim(self):
        kid=self.queue()
        with app.app.app_context(),patch('app._presence_chat_busy',return_value=True),patch('app.threading.Thread') as thread:
            self.assertIsNone(app._proactive_scheduler_tick(self.now));thread.assert_not_called()
        with app.app.app_context(),patch('app.threading.Thread') as thread:
            self.assertEqual(app._proactive_scheduler_tick(self.now+timedelta(minutes=6)),kid)
            self.assertIsNone(app._proactive_scheduler_tick(self.now+timedelta(minutes=6)))
            thread.assert_called_once()

    def test_claim_invalidated_by_user_or_time_band_change(self):
        kid=self.queue();job=self.db.execute('SELECT * FROM proactive_message_jobs WHERE id=?',(kid,)).fetchone()
        frequency.attempted(self.db,job,self.now);self.db.commit()
        self.assertTrue(frequency.claim_current(self.db,self.sid,self.now))
        self.assertFalse(frequency.claim_current(self.db,self.sid,self.now.replace(hour=2)))
        self.user(self.now)
        self.assertFalse(frequency.claim_current(self.db,self.sid,self.now))

    def test_background_sends_second_message_but_cancels_if_user_returns(self):
        kid=self.queue();job=self.db.execute('SELECT * FROM proactive_message_jobs WHERE id=?',(kid,)).fetchone()
        frequency.attempted(self.db,job,datetime.now());self.db.commit()
        self.db.execute("INSERT INTO messages(session_id,role,content,proactive,created_at) VALUES (?,'assistant','Earlier proactive',1,?)",(self.sid,str(datetime.now()-timedelta(hours=3))))
        self.db.execute("UPDATE proactive_message_jobs SET status='running' WHERE id=?",(kid,));self.db.commit()
        result={'ok':True,'decision':'send','message':'Synthetic second proactive','usage':[]}
        with patch('presence_chat_route.resolve',return_value={'provider_id':7,'model':'synthetic'}),patch('app.presence_wake.wake',return_value=result),patch('app._background_push_delivery'):
            app._background_proactive_job(kid)
        self.assertEqual(self.db.execute('SELECT status FROM proactive_message_jobs WHERE id=?',(kid,)).fetchone()[0],'sent')
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM messages WHERE proactive=1').fetchone()[0],2)


    def test_new_user_during_generation_cancels_stale_proactive_text(self):
        kid=self.queue();job=self.db.execute('SELECT * FROM proactive_message_jobs WHERE id=?',(kid,)).fetchone()
        frequency.attempted(self.db,job,datetime.now())
        self.db.execute("UPDATE proactive_message_jobs SET status='running' WHERE id=?",(kid,));self.db.commit()
        def wake(**kwargs):
            self.user(datetime.now())
            return {'ok':True,'decision':'send','message':'Stale synthetic proactive','usage':[]}
        with patch('presence_chat_route.resolve',return_value={'provider_id':7,'model':'synthetic'}),patch('app.presence_wake.wake',side_effect=wake),patch('app._background_push_delivery') as push:
            app._background_proactive_job(kid);push.assert_not_called()
        self.assertEqual(self.db.execute('SELECT status FROM proactive_message_jobs WHERE id=?',(kid,)).fetchone()[0],'cancelled')
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM messages WHERE proactive=1').fetchone()[0],0)


class TimingTest(unittest.TestCase):
    def test_configured_five_minute_cadence_and_catchup(self):
        for elapsed in (0,.5,1,4.99):self.assertFalse(presence_timing.due(elapsed,5))
        for elapsed in (5,10,120):self.assertTrue(presence_timing.due(elapsed,5))
        self.assertTrue(presence_timing.due(0,5,True))
        original='import json\nif minutes < 1 and not force:\n    pass\n'
        changed=transform(original)
        self.assertIn('presence_timing.due',changed)
        self.assertEqual(transform(changed),changed)
        with self.assertRaises(ValueError):transform('unexpected adapter')
