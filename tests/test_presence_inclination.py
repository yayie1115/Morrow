import json
import sqlite3
import unittest
from datetime import datetime,timedelta
from unittest.mock import patch
import app
import presence_inclination as inclination
import presence_frequency as frequency
import presence_contact
import test_presence_frequency as frequency_tests


class InclinationTest(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(':memory:')
        self.db.executescript('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE presence_state(id INTEGER,state_json TEXT,last_tick_at TEXT,last_error TEXT);')
        self.now=datetime(2026,1,1,14)
        self.db.execute('INSERT INTO settings VALUES (?,?)',(frequency.KEY,json.dumps(frequency.DEFAULT)))
        self.db.execute("INSERT INTO settings VALUES ('presence_engine',?)",(json.dumps({'enabled':True}),))
        self.db.execute("INSERT INTO presence_state VALUES(1,'{}',?,'')",(str(self.now),))
        self.state()

    def tearDown(self):self.db.close()

    def state(self,**changes):
        state={'connection':.2,'lust':1.,'valence':.05,'pride':-.2,**changes}
        self.db.execute('UPDATE presence_state SET state_json=?,last_tick_at=?,last_error=?',(json.dumps(state),str(self.now),''))

    def run_signal(self,signals=None,**kwargs):
        return inclination.augment(self.db,signals if signals is not None else [{'action':'observation'}],now=self.now,**kwargs)

    def test_high_lust_modestly_lowers_contact_threshold_without_changing_state(self):
        before=self.db.execute('SELECT * FROM presence_state').fetchall();changes=self.db.total_changes
        result=self.run_signal();self.assertEqual(result[-1]['action'],'contact')
        self.assertEqual(result[-1]['contact_basis']['boost'],.08)
        self.assertEqual(before,self.db.execute('SELECT * FROM presence_state').fetchall())
        self.assertEqual(changes,self.db.total_changes)
        self.state(lust=.6);self.assertEqual(len(self.run_signal()),1)
        self.state(connection=.16);self.assertEqual(len(self.run_signal()),1)
        self.state(connection=.2,lust=.8);self.assertEqual(len(self.run_signal()),1)
        self.state(connection=.23,lust=.8);self.assertEqual(len(self.run_signal()),2)

    def test_existing_contact_not_duplicated_and_lust_alone_not_enough(self):
        original=[{'action':'contact'},{'action':'intimate_check'}]
        self.assertEqual(self.run_signal(original),original)
        self.assertEqual(self.run_signal([]),[])
        self.assertEqual(self.run_signal([{'action':'find_activity'}]),[{'action':'find_activity'}])
        self.state(connection=0);self.assertEqual(len(self.run_signal([{'action':'intimate_check'}])),1)

    def test_distress_restraint_stale_disabled_and_invalid_state_do_not_promote(self):
        for values in ({'valence':-.4},{'pride':1},{'lust':float('nan')},{'connection':'injected text'},{'lust':2}):
            self.state(**values);self.assertEqual(len(self.run_signal()),1)
        self.state();self.db.execute('UPDATE presence_state SET last_tick_at=?',(str(self.now-timedelta(hours=1)),));self.assertEqual(len(self.run_signal()),1)
        self.state();self.db.execute("UPDATE presence_state SET last_error='Synthetic failure'");self.assertEqual(len(self.run_signal()),1)
        self.state();self.db.execute("UPDATE settings SET value='{}' WHERE key='presence_engine'");self.assertEqual(len(self.run_signal()),1)

    def test_uses_live_threshold_and_keeps_input_list_unchanged(self):
        original=[{'action':'intimate_check'}]
        self.assertEqual(len(self.run_signal(original,threshold=.35)),1)
        self.assertEqual(len(self.run_signal(original,threshold=.26)),2)
        self.assertEqual(original,[{'action':'intimate_check'}])


class InclinationQueueTest(unittest.TestCase):
    setUp=frequency_tests.FrequencyTest.setUp
    tearDown=frequency_tests.FrequencyTest.tearDown
    user=frequency_tests.FrequencyTest.user
    queue=frequency_tests.FrequencyTest.queue

    def test_augmented_signal_uses_same_day_night_timer_and_records_basis(self):
        self.db.execute('CREATE TABLE presence_state(id INTEGER,state_json TEXT,last_tick_at TEXT,last_error TEXT)')
        self.db.execute('INSERT INTO presence_state VALUES (1,?,?,?)',(json.dumps({'connection':.2,'lust':1.,'valence':0,'pride':0}),str(self.now),''));self.db.commit()
        signals=inclination.augment(self.db,[{'action':'intimate_check'}],now=self.now)
        self.assertEqual(signals[-1]['action'],'contact')
        before=frequency.next_at(self.db,self.sid,self.now)
        kid=presence_contact.queue(self.db,signals,self.config,self.now);self.assertIsNotNone(kid)
        self.assertEqual(before,frequency.next_at(self.db,self.sid,self.now))
        detail=json.loads(self.db.execute("SELECT detail_json FROM presence_events WHERE action='queued'").fetchone()[0])
        self.assertEqual(detail['contact_basis']['source'],'connection_lust')
        for hour in (14,4):
            now=self.now.replace(hour=hour)
            self.user(now-timedelta(minutes=30))
            self.db.execute("UPDATE proactive_message_jobs SET status='quiet' WHERE id=?",(kid,));self.db.commit()
            self.assertIsNone(presence_contact.queue(self.db,signals,self.config,now))

    def test_dispatcher_uses_augmented_signal_and_only_one_delivery_path(self):
        with patch('presence_inclination.augment',return_value=[{'action':'contact'}]) as augment,patch('app.presence_contact.queue',return_value=12) as queue,patch('app._presence_start_activity') as room:
            with app.app.app_context():
                self.assertEqual(app._presence_nudge_proactive(self.db,[{'action':'intimate_check'}]),12)
        augment.assert_called_once();queue.assert_called_once();room.assert_not_called()
