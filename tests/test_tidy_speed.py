import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
import app


class TidySpeedTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.old = app.DB_PATH
        app.DB_PATH = str(Path(self.temp.name)/'test.db')
        db = sqlite3.connect(app.DB_PATH)
        db.executescript('CREATE TABLE messages(id INTEGER, versions TEXT); CREATE TABLE tool_calls(id INTEGER PRIMARY KEY, session_id INTEGER, message_id INTEGER, run_id TEXT, tool TEXT, narrate TEXT, args TEXT, result TEXT, source TEXT, server TEXT, status TEXT, duration_ms INTEGER, error TEXT, created_at TEXT);')
        db.execute('INSERT INTO messages VALUES (1,?)', (json.dumps([{'tool_run_id':'synthetic','partial':True}]),))
        for number in range(105):
            db.execute('INSERT INTO tool_calls VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', (number+1,1,1,'synthetic','read_note','Reading',json.dumps({'text':'x'*10000}), 'y'*20000,'builtin','','ok',10,'','2026-11-03 10:00:00'))
        db.commit();db.close()
        self.client = app.app.test_client()
        with self.client.session_transaction() as session: session['authed'] = True

    def tearDown(self):
        app.DB_PATH = self.old
        self.temp.cleanup()

    def test_compact_pagination_no_bodies_and_preserved_partial_state(self):
        first = self.client.get('/api/tidy?view=compact&limit=40')
        self.assertEqual(first.status_code,200)
        self.assertEqual(len(first.json['items']),40)
        self.assertEqual(first.json['next_before'],66)
        self.assertFalse(first.json['items'][0]['run_complete'])
        self.assertNotIn('args',first.json['items'][0]);self.assertNotIn('result',first.json['items'][0])
        second = self.client.get('/api/tidy?view=compact&limit=40&before=66').json
        third = self.client.get('/api/tidy?view=compact&limit=40&before='+str(second['next_before'])).json
        ids = [r['id'] for page in (first.json,second,third) for r in page['items']]
        self.assertEqual(ids,list(range(105,0,-1)));self.assertIsNone(third['next_before'])
        legacy = self.client.get('/api/tidy')
        self.assertIsInstance(legacy.json,list)
        self.assertLess(len(first.data)*30,len(legacy.data))

    def test_detail_auth_missing_and_full_content(self):
        detail = self.client.get('/api/tidy/1')
        self.assertEqual(len(detail.json['result']),20000)
        self.assertEqual(self.client.get('/api/tidy/9999').status_code,404)
        anonymous=app.app.test_client()
        self.assertEqual(anonymous.get('/api/tidy/1').status_code,401)
        self.assertEqual(anonymous.get('/api/tidy?view=compact').status_code,401)

    def test_invalid_pagination(self):
        for query in ('limit=0','limit=101','limit=no','before=0','before=-2','before=no'):
            self.assertEqual(self.client.get('/api/tidy?view=compact&'+query).status_code,400,query)
