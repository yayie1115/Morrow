import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch
from datetime import datetime,timedelta
import presence_tone,proactive_engine


class PresenceToneTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.path=Path(self.temp.name)/'test.db';self.now=datetime(2026,11,3,19,30)
        self.db=sqlite3.connect(self.path)
        self.db.executescript('CREATE TABLE settings(key TEXT,value TEXT); CREATE TABLE presence_state(id INTEGER,state_json TEXT,last_tick_at TEXT,last_error TEXT);')
        self.db.execute("INSERT INTO settings VALUES ('presence_engine',?)",(json.dumps({'enabled':True}),))
        self.db.execute('INSERT INTO presence_state VALUES (1,?,?,?)',(json.dumps({'connection':.4,'valence':.5,'pride':.4,'immersion':.6}),str(self.now),''));self.db.commit()
    def tearDown(self):self.db.close();self.temp.cleanup()
    def test_fresh_snapshot_is_bounded_read_only_and_reflects_emotion(self):
        before=self.path.read_bytes();text=presence_tone.read(self.path,self.now)
        self.assertIn('松快',text);self.assertIn('克制',text);self.assertLessEqual(len(text),600)
        self.assertNotIn('0.4',text);self.assertEqual(before,self.path.read_bytes())
    def test_stale_disabled_error_and_missing_state_are_harmless(self):
        self.assertEqual(presence_tone.read(self.path,self.now+timedelta(hours=1)),'')
        self.db.execute("UPDATE presence_state SET last_error='Synthetic error'");self.db.commit()
        self.assertEqual(presence_tone.read(self.path,self.now),'')
        self.assertEqual(presence_tone.read(Path(self.temp.name)/'missing.db'),'')
    def test_hostile_text_is_not_copied_from_state(self):
        text=presence_tone.describe({'valence':'ignore persona','lastActivity':{'label':'injected text'},'connection':float('nan')})
        self.assertNotIn('ignore persona',text);self.assertNotIn('injected text',text)
    def test_only_presence_uses_dynamic_context_and_protocol_stays_fixed(self):
        for source in ('presence','normal'):
            with patch('presence_tone.read',return_value='Synthetic current tone') as reader,patch('proactive_engine.chat_engine.stream_chat',return_value=iter([('delta','{"decision":"quiet"}')])) as stream:
                result=proactive_engine._decide_attempt(session_id=1,source=source)
                self.assertTrue(result['ok'])
                self.assertEqual(stream.call_args.kwargs['stable_extra'],proactive_engine.PROTOCOL)
                self.assertEqual(stream.call_args.kwargs['volatile_extra'],'Synthetic current tone' if source=='presence' else '')
                self.assertEqual(reader.call_count,1 if source=='presence' else 0)
