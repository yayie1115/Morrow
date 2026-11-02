import json
import os
import sqlite3
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

import app
import tools
import keepsake_selection


@contextmanager
def database(path):
    connection = sqlite3.connect(path)
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


class KeepsakeSelectionTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir='data/test-tmp')
        self.root = Path(self.temp.name)
        self.old = app.DB_PATH, app.DATA_DIR, app.UPLOAD_DIR, tools.DB_PATH
        app.DB_PATH = tools.DB_PATH = str(self.root/'nook.db')
        app.DATA_DIR = str(self.root)
        app.UPLOAD_DIR = str(self.root/'uploads')
        app.init_db()
        self.client = app.app.test_client()
        with self.client.session_transaction() as session:
            session['authed'] = True
        Path(app.UPLOAD_DIR, 'sent.png').write_bytes(b'synthetic-image-bytes')
        with database(app.DB_PATH) as db:
            self.sid = db.execute("INSERT INTO sessions(title) VALUES ('Synthetic selection')").lastrowid
            self.other = db.execute("INSERT INTO sessions(title) VALUES ('Other synthetic')").lastrowid
            attachments = [{'type': 'image', 'name': 'sent.png', 'path': 'sent.png', 'url': '/uploads/sent.png', 'mime': 'image/png'}]
            self.mid = db.execute("INSERT INTO messages(session_id,role,content,attachments) VALUES (?,'user',?,?)",
                                  (self.sid, 'First bubble.\n\nSecond bubble.', json.dumps(attachments))).lastrowid
            self.ai = db.execute("INSERT INTO messages(session_id,role,content) VALUES (?,'assistant','Assistant bubble.')", (self.sid,)).lastrowid

    def tearDown(self):
        app.DB_PATH, app.DATA_DIR, app.UPLOAD_DIR, tools.DB_PATH = self.old
        self.temp.cleanup()

    def candidates(self):
        response = self.client.get('/api/keepsakes/candidates', query_string={'session_id': self.sid})
        self.assertEqual(response.status_code, 200)
        return response.json['items']

    def args(self, indexes=(0, 2)):
        item = self.candidates()[0]
        return {'session_id': self.sid, 'selections': [{'message_id': self.mid, 'item_id': item['parts'][i]['item_id']} for i in indexes],
                'source_tokens': {str(self.mid): item['source_token']}, 'note': 'Synthetic caption'}

    def test_manual_mixed_snapshot_and_independent_photo_survive_source_delete(self):
        result = self.client.post('/api/keepsakes', json=self.args())
        self.assertEqual(result.status_code, 201, result.json)
        snapshots = result.json['snapshot']
        self.assertEqual([s['content'] for s in snapshots], ['First bubble.', ''])
        photo = snapshots[1]['attachments'][0]
        self.assertTrue(photo['path'].startswith('keepsakes/'))
        Path(app.UPLOAD_DIR, 'sent.png').unlink()
        with database(app.DB_PATH) as db:
            db.execute('DELETE FROM messages WHERE id=?', (self.mid,))
        self.assertEqual(Path(app.UPLOAD_DIR, photo['path']).read_bytes(), b'synthetic-image-bytes')
        with self.client.get(photo['url']) as image_response:
            self.assertEqual(image_response.status_code, 200)
        self.assertEqual(self.client.get('/api/keepsakes/'+str(result.json['id'])).json['snapshot'], snapshots)

    def test_assistant_and_manual_share_candidates_and_idempotence(self):
        args = self.args()
        data = json.loads(tools.execute('read_keepsake_candidates', {}, self.sid)['content'])
        self.assertEqual(data['items'][0]['parts'][2]['item_id'], args['selections'][1]['item_id'])
        self.assertNotIn('url', data['items'][0]['parts'][2])
        saved = tools.execute('create_keepsake', dict(args, assistant_reply='Synthetic comment'), self.sid)
        self.assertTrue(saved['ok'], saved)
        kid = json.loads(saved['content'])['keepsake_id']
        again = self.client.post('/api/keepsakes', json=args)
        self.assertEqual(again.status_code, 200, again.json)
        self.assertEqual(again.json['id'], kid)
        self.assertEqual(len(again.json['comments']), 1)
        self.assertEqual(len(list(Path(app.UPLOAD_DIR, 'keepsakes').iterdir())), 1)

    def test_different_bubbles_same_message_can_be_saved_separately(self):
        first = self.client.post('/api/keepsakes', json=self.args((0,)))
        self.assertEqual(first.status_code, 201)
        parts = self.candidates()[0]['parts']
        self.assertTrue(parts[0]['already_kept'])
        self.assertFalse(parts[1]['already_kept'])
        second = self.client.post('/api/keepsakes', json=self.args((1,)))
        self.assertEqual(second.status_code, 201, second.json)
        self.assertEqual(second.json['snapshot'][0]['content'], 'Second bubble.')
        overlap = self.client.post('/api/keepsakes', json=self.args((0, 1)))
        self.assertEqual(overlap.status_code, 409)

    def test_rejects_stale_hidden_cross_session_fabricated_and_oversized(self):
        original = self.args()
        for edit in ('stale', 'hidden', 'other', 'fabricated', 'oversized'):
            args = json.loads(json.dumps(original))
            with database(app.DB_PATH) as db:
                if edit == 'stale': db.execute("UPDATE messages SET content='Changed' WHERE id=?", (self.mid,))
                if edit == 'hidden': db.execute('UPDATE messages SET hidden=1 WHERE id=?', (self.mid,))
            if edit == 'other': args['session_id'] = self.other
            if edit == 'fabricated': args['selections'][0]['item_id'] = 'image:900'
            if edit == 'oversized': args['selections'] *= 6
            self.assertEqual(self.client.post('/api/keepsakes', json=args).status_code, 409, edit)
            with database(app.DB_PATH) as db:
                db.execute("UPDATE messages SET content='First bubble.' || char(10) || char(10) || 'Second bubble.',hidden=0 WHERE id=?", (self.mid,))
        self.assertEqual(self.client.get('/api/keepsakes').json, [])

    def test_missing_or_escaping_photo_rolls_back_whole_selection(self):
        for name in ('missing.png', '../outside.png'):
            (self.root/'outside.png').write_bytes(b'outside')
            with database(app.DB_PATH) as db:
                db.execute('UPDATE messages SET attachments=? WHERE id=?', (json.dumps([{'type': 'image', 'path': name, 'url': '/uploads/'+name}]), self.mid))
            result = self.client.post('/api/keepsakes', json=self.args((0, 2)))
            self.assertEqual(result.status_code, 409)
            self.assertEqual(self.client.get('/api/keepsakes').json, [])

    def test_file_copy_failure_cleans_up_and_rolls_back(self):
        args = self.args()
        def fail_copy(source, target):
            Path(target).write_bytes(b'partial')
            raise OSError('Synthetic storage failure')
        with patch('keepsake_selection.shutil.copyfile', side_effect=fail_copy):
            self.assertEqual(self.client.post('/api/keepsakes', json=args).status_code, 409)
        self.assertEqual(self.client.get('/api/keepsakes').json, [])
        self.assertEqual(list(Path(app.UPLOAD_DIR, 'keepsakes').iterdir()), [])

    def test_legacy_whole_keepsake_covers_its_parts(self):
        result = self.client.post('/api/keepsakes', json={'session_id': self.sid, 'message_ids': [self.mid]})
        self.assertEqual(result.status_code, 201)
        self.assertTrue(all(v['already_kept'] for v in self.candidates()[0]['parts']))
        self.assertEqual(self.client.post('/api/keepsakes', json=self.args((1,))).status_code, 409)

    def test_requires_authentication_and_does_not_offer_unsent_photos(self):
        anonymous = app.app.test_client()
        self.assertEqual(anonymous.get('/api/keepsakes/candidates?session_id='+str(self.sid)).status_code, 401)
        with database(app.DB_PATH) as db:
            db.execute("INSERT INTO messages(session_id,role,content,hidden) VALUES (?,'user','Hidden',1)", (self.sid,))
        self.assertEqual(len(self.candidates()), 2)
        self.assertNotIn('outside.png', json.dumps(self.candidates()))

    def test_fences_dividers_unicode_and_voice_boundaries(self):
        text = '😀 First\r\n\r\n```text\r\nline\r\n\r\nline\r\n```\r\n\r\n---\r\n\r\nLast'
        parts = keepsake_selection.parts({'content': text, 'attachments': [], 'artifacts': []})
        self.assertEqual(len(parts), 3)
        self.assertEqual(parts[0]['text'], '😀 First')
        self.assertIn('\r\n\r\n', parts[1]['text'])
        voice = keepsake_selection.parts({'content': 'BeforeAfter', 'attachments': [], 'artifacts': [{'meta': {'text_offset': 6}}]})
        self.assertEqual([p['text'] for p in voice], ['Before', 'After'])
