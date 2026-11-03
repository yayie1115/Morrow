import json
import sqlite3
import unittest
import presence_chat_route as route


class PresenceChatRouteTest(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(':memory:')
        self.db.executescript('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE sessions(id INTEGER,archived INTEGER); CREATE TABLE providers(id INTEGER,models TEXT); CREATE TABLE messages(session_id INTEGER,role TEXT,hidden INTEGER,proactive INTEGER,versions TEXT,active INTEGER,id INTEGER); INSERT INTO sessions VALUES (1,0);')
        self.db.execute('INSERT INTO providers VALUES (7,?)',(json.dumps([{'id':'chat-model'}]),))
        self.db.execute('INSERT INTO settings VALUES (?,?)',('proactive_messages',json.dumps({'provider_id':5,'model':'old-proactive'})))
    def tearDown(self):self.db.close()
    def test_exact_chat_runtime_is_saved_without_old_proactive_settings(self):
        value={'provider_id':7,'model':'chat-model','think':True,'context_limit':50,'image_limit':4,'cache_ttl':'5m'}
        route.save(self.db,1,value);resolved=route.resolve(self.db,1)
        self.assertEqual(resolved['provider_id'],7);self.assertEqual(resolved['model'],'chat-model');self.assertEqual(resolved['context_limit'],50)
        self.assertNotIn('old-proactive',json.dumps(resolved));self.assertTrue(resolved['think'])
    def test_legacy_session_uses_active_real_chat_version_not_old_proactive(self):
        versions=[{'provider_id':5,'model':'obsolete'},{'provider_id':7,'model':'chat-model'}]
        self.db.execute("INSERT INTO messages VALUES (1,'assistant',0,0,?,1,1)",(json.dumps(versions),))
        self.db.execute("INSERT INTO messages VALUES (1,'assistant',0,1,?,0,2)",(json.dumps([{'provider_id':5,'model':'old-proactive'}]),))
        self.assertEqual(route.resolve(self.db,1)['model'],'chat-model')
    def test_removed_route_fails_instead_of_using_another_model(self):
        route.save(self.db,1,{'provider_id':7,'model':'chat-model'});self.db.execute('DELETE FROM providers')
        with self.assertRaises(ValueError):route.resolve(self.db,1)
    def test_new_empty_session_never_uses_global_proactive_model(self):
        with self.assertRaises(ValueError):route.resolve(self.db,1)
    def test_legacy_missing_version_metadata_uses_real_chat_usage(self):
        self.db.execute("INSERT INTO messages VALUES (1,'assistant',0,0,'[]',0,1)")
        self.db.execute('CREATE TABLE api_usage(id INTEGER,session_id INTEGER,message_id INTEGER,provider_id INTEGER,model TEXT)')
        self.db.execute("INSERT INTO api_usage VALUES (1,1,1,7,'chat-model')")
        self.assertEqual(route.resolve(self.db,1)['provider_id'],7)
