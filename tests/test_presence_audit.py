from contextlib import closing
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import presence_audit
import presence_tone
import presence_wake


class AuditTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = str(Path(self.temp.name) / 'nook.db')
        with closing(sqlite3.connect(self.path)) as db, db:
            db.executescript("CREATE TABLE IF NOT EXISTS presence_events(id INTEGER PRIMARY KEY, at TEXT,kind TEXT,action TEXT,reason TEXT,detail_json TEXT);")

    def tearDown(self):
        self.temp.cleanup()

    def receipt(self):
        with closing(sqlite3.connect(self.path)) as db, db:
            return json.loads(db.execute('SELECT detail_json FROM presence_events ORDER BY id DESC LIMIT 1').fetchone()[0])

    def test_contact_records_exact_handoff_and_delivery_separately(self):
        def tone(database, snapshot=None):
            snapshot.update(at='2026-01-01 12:00:00', values={'connection': .5})
            return 'Synthetic exact hint'
        def executor(**kwargs):
            self.assertEqual(self.receipt()['status'], 'started')
            self.assertEqual(self.receipt()['state_prompt'], kwargs['volatile_extra'])
            self.assertEqual(self.receipt()['event'], kwargs['event'])
            self.assertEqual(self.receipt()['protocol'], kwargs['protocol'])
            return {'ok': True, 'message': 'Synthetic reply'}
        with patch.object(presence_wake.chat_engine, 'DB_PATH', self.path), patch.object(presence_tone, 'read', side_effect=tone), patch.object(presence_wake.alarm_engine, '_wake_attempt', side_effect=executor):
            result = presence_wake.wake(session_id=3)
        self.assertEqual(self.receipt()['status'], 'generated')
        with closing(sqlite3.connect(self.path)) as db, db:
            presence_audit.update(db, result['presence_audit_id'], 'sent', 42)
        self.assertEqual(self.receipt()['message_id'], 42)
        self.assertEqual(self.receipt()['status'], 'sent')

    def test_exception_keeps_receipt_without_private_error(self):
        aid = presence_audit.start(self.path, 3, 'contact', {}, '', '', 'Synthetic event')
        def fail(**kwargs):
            raise RuntimeError('private error details')
        with self.assertRaises(RuntimeError):
            presence_audit.invoke(self.path, aid, fail)
        self.assertEqual(self.receipt()['status'], 'failed')
        self.assertNotIn('private error', json.dumps(self.receipt()))

    def test_activity_does_not_claim_snapshot_was_transmitted(self):
        with patch.object(presence_tone, 'read', return_value='unused hint'):
            result = presence_audit.activity(lambda **kwargs: {'status': 'quiet'}, self.path, audit_run_id=9, session_id=3, wake_prompt='Synthetic room wake')
        d = self.receipt()
        self.assertEqual(d['status'], 'quiet')
        self.assertFalse(d['state_transmitted'])
        self.assertEqual(d['run_id'], 9)
        self.assertEqual(d['event'], 'Synthetic room wake')

    def test_missing_optional_table_does_not_break_execution(self):
        aid = presence_audit.start(':memory:', 1, 'contact', {}, '', '', '')
        self.assertIsNone(aid)
        self.assertEqual(presence_audit.invoke(self.path, aid, lambda: {'ok': True}), {'ok': True})
