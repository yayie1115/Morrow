"""Offline coverage for shared postcard preferences and safe UI rendering."""
import json
from pathlib import Path
import shutil
import sqlite3
import subprocess
import unittest
from unittest import mock

import app
import postcard_settings as settings


class PostcardTest(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.execute('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT)')

    def tearDown(self):
        self.db.close()

    def test_defaults_roundtrip_and_hide(self):
        self.assertEqual(settings.read(self.db), settings.defaults())
        for design in settings.DESIGNS:
            values = {'enabled': False, 'design': design, 'quotes': {'light': ' 留灯 ', 'leaf': '<script>fictional</script>', 'tomorrow': ''}}
            saved = settings.save(self.db, values)
            self.assertEqual(saved['quotes']['light'], '留灯')
            self.assertEqual(settings.read(self.db), saved)
        self.assertEqual(settings.save(self.db, settings.defaults()), settings.defaults())

    def test_invalid_settings_preserve_previous_values(self):
        good = settings.save(self.db, settings.defaults())
        invalid = [None, [], {}, {**good, 'enabled': 1}, {**good, 'design': []},
                   {**good, 'design': 'other'}, {**good, 'quotes': None},
                   {**good, 'quotes': {}}, {**good, 'extra': True}]
        for value in [None, 1, 'x'*201, 'bad\ntext', 'bad\x00text', 'bad\x7f']:
            invalid.append({**good, 'quotes': {**good['quotes'], 'light': value}})
        for value in invalid:
            with self.subTest(value=value), self.assertRaises(ValueError):
                settings.save(self.db, value)
            self.assertEqual(settings.read(self.db), good)

    def test_corrupt_rows_fall_back_without_migration(self):
        for value in ['not-json', 'null', json.dumps({'enabled': True}), json.dumps({**settings.defaults(), 'design': []})]:
            self.db.execute('INSERT OR REPLACE INTO settings VALUES (?,?)', (settings.KEY, value))
            self.assertEqual(settings.read(self.db), settings.defaults())

    def test_authenticated_api(self):
        client = app.app.test_client()
        with mock.patch.object(app, 'AUTH_PASSWORD', 'synthetic-password'), mock.patch.object(app, 'get_db', return_value=self.db):
            self.assertEqual(client.get('/api/home-postcard').status_code, 401)
            self.assertEqual(client.put('/api/home-postcard', json=settings.defaults()).status_code, 401)
            with client.session_transaction() as session:
                session['authed'] = True
            self.assertEqual(client.get('/api/home-postcard').json, settings.defaults())
            values = {**settings.defaults(), 'enabled': False, 'design': 'leaf'}
            self.assertEqual(client.put('/api/home-postcard', json=values).json, values)
            self.assertEqual(client.get('/api/home-postcard').json, values)
            self.assertEqual(client.put('/api/home-postcard', json={'design': 'light'}).status_code, 400)
            self.assertEqual(client.get('/api/home-postcard').json, values)

    def test_retired_postcard_ui_and_preserved_storage(self):
        source=Path('static/index.html').read_text(encoding='utf-8')
        self.assertNotIn('id="homePostcard"',source)
        self.assertNotIn('id="wePostcard"',source)
        self.assertNotIn('loadPostcardSettings()',source)
        self.assertIn('id="treasuryEntry"',source)
        self.assertIn('get user(){return commentAuthorName("user");}',source)
