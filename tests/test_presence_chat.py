from contextlib import closing, ExitStack
from datetime import datetime, timedelta
from pathlib import Path
import json
import sqlite3
import tempfile
import unittest
from unittest.mock import patch
import app
import presence_chat
import chat_engine


class PresenceChatTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = str(Path(self.temp.name)/'nook.db')
        self.stack = ExitStack()
        self.stack.enter_context(patch.object(app, 'DB_PATH', self.path))
        self.stack.enter_context(patch.object(app, 'DATA_DIR', self.temp.name))
        self.stack.enter_context(patch.object(app, 'UPLOAD_DIR', str(Path(self.temp.name)/'uploads')))
        self.stack.enter_context(patch.object(chat_engine, 'DB_PATH', self.path))
        self.stack.enter_context(patch('app.threading.Thread'))
        app.init_db()
        with closing(sqlite3.connect(self.path)) as db, db:
            db.executescript("CREATE TABLE IF NOT EXISTS presence_state(id INTEGER PRIMARY KEY,state_json TEXT,last_tick_at TEXT,last_error TEXT); CREATE TABLE IF NOT EXISTS presence_events(id INTEGER PRIMARY KEY,at TEXT,kind TEXT,action TEXT,reason TEXT,detail_json TEXT);")
            self.sid=db.execute("INSERT INTO sessions(title) VALUES ('Synthetic chat')").lastrowid
            self.uid=db.execute("INSERT INTO messages(session_id,role,content) VALUES (?,'user','Synthetic user message')",(self.sid,)).lastrowid
            db.execute("INSERT INTO settings VALUES ('presence_engine',?)", (json.dumps({'enabled':True}),))
            db.execute('INSERT OR REPLACE INTO presence_state(id,state_json,last_tick_at,last_error) VALUES (1,?,?,?)',(json.dumps({'connection':.4,'pride':.4,'valence':.5}),str(datetime.now()),''))

    def tearDown(self):
        self.stack.close()
        self.temp.cleanup()

    def receipt(self):
        with closing(sqlite3.connect(self.path)) as db:
            row=db.execute("SELECT detail_json FROM presence_events WHERE kind='handoff' ORDER BY id DESC LIMIT 1").fetchone()
            return json.loads(row[0]) if row else None

    def test_normal_chat_uses_exact_hint_and_links_saved_reply(self):
        with patch('chat_engine.stream_chat',return_value=iter([('delta','Synthetic reply')])) as model:
            events=[json.loads(line.removeprefix('data: ')) for line in app._stream_reply_impl(self.sid,user_msg_id=self.uid,music_prompt='Synthetic music context')]
        receipt=self.receipt()
        self.assertEqual(model.call_count,1)
        self.assertIn(receipt['state_prompt'],model.call_args.kwargs['volatile_extra'])
        self.assertTrue(model.call_args.kwargs['volatile_extra'].startswith('Synthetic music context\n\n'))
        self.assertNotIn(receipt['state_prompt'],model.call_args.kwargs['stable_extra'])
        self.assertIn('本轮对话',receipt['state_prompt'])
        self.assertNotIn('暂不发送',receipt['state_prompt'])
        self.assertEqual(receipt['purpose'],'chat')
        self.assertEqual(receipt['status'],'sent')
        done=next(e for e in events if e.get('type')=='done')
        self.assertEqual(receipt['message_id'],done['message_id'])
        self.assertEqual(receipt['user_message_id'],self.uid)

    def test_disabled_stale_error_and_wrong_session_skip_without_records(self):
        for update,params in [("UPDATE settings SET value=? WHERE key='presence_engine'",(json.dumps({'enabled':False}),)),('UPDATE presence_state SET last_tick_at=?',(str(datetime.now()-timedelta(hours=1)),)),("UPDATE presence_state SET last_error='Synthetic failure'",())]:
            with closing(sqlite3.connect(self.path)) as db,db:
                db.execute("UPDATE settings SET value=? WHERE key='presence_engine'",(json.dumps({'enabled':True}),))
                db.execute("UPDATE presence_state SET last_tick_at=?,last_error=''",(str(datetime.now()),))
                db.execute(update,params)
            self.assertEqual(presence_chat.prepare(self.path,self.sid,self.uid,'synthetic'),('',None))
        self.assertEqual(presence_chat.prepare(self.path,self.sid+99,self.uid,'synthetic'),('',None))
        self.assertEqual(presence_chat.prepare(self.path,self.sid,None,'synthetic'),('',None))
        self.assertIsNone(self.receipt())

    def test_error_and_partial_status_do_not_claim_success(self):
        for chunks,expected in [([('error',{'message':'Synthetic upstream failure'})],'failed'),([('delta','Partial'),('error',{'message':'Synthetic interruption'})],'partial')]:
            with patch('chat_engine.stream_chat',return_value=iter(chunks)):
                list(app._stream_reply_impl(self.sid,user_msg_id=self.uid))
            self.assertEqual(self.receipt()['status'],expected)

    def test_disconnect_records_interruption(self):
        with patch('chat_engine.stream_chat',return_value=iter([('delta','Partial')])):
            stream=app._stream_reply_impl(self.sid,user_msg_id=self.uid)
            next(stream);next(stream);stream.close()
        self.assertEqual(self.receipt()['status'],'interrupted')

    def test_regeneration_gets_separate_receipt_and_same_user_source(self):
        with patch('chat_engine.stream_chat',side_effect=lambda *a,**k: iter([('delta','Synthetic reply')])):
            list(app._stream_reply_impl(self.sid,user_msg_id=self.uid))
            first=self.receipt()
            list(app._stream_reply_impl(self.sid,regen_id=first['message_id']))
        second=self.receipt()
        self.assertNotEqual(first['run_id'],second['run_id'])
        self.assertEqual(second['user_message_id'],self.uid)
        self.assertEqual(second['message_id'],first['message_id'])

    def test_prepare_does_not_advance_or_mutate_engine_state(self):
        with closing(sqlite3.connect(self.path)) as db:
            before=db.execute('SELECT * FROM presence_state').fetchall()
        hint,aid=presence_chat.prepare(self.path,self.sid,self.uid,'synthetic')
        self.assertTrue(hint)
        self.assertIsNotNone(aid)
        with closing(sqlite3.connect(self.path)) as db:
            self.assertEqual(before,db.execute('SELECT * FROM presence_state').fetchall())
