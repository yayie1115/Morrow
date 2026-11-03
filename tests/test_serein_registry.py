import copy
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch
import app
import serein_registry as registry
import sync_serein_registry as worker


class RegistryTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.db = sqlite3.connect(self.root/'nook.db')
        self.db.executescript('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE providers(id INTEGER PRIMARY KEY,name TEXT,format TEXT,api_url TEXT,api_key TEXT,models TEXT);')
        self.add(1,'openai',['chat-test','BAAI/bge-m3'])
        self.add(2,'openai',['BAAI/bge-reranker-v2-m3'])
        self.add(3,'claude',['claude-test'])
        registry.write(self.db,registry.KEY,{'enabled':True,'excluded_provider_ids':[]});self.db.commit()
        self.config = self.root/'gateway.json'
        self.config.write_text(json.dumps({'enabled':True,'instance_id':'synthetic','providers':{'old':{}},'token_file':'private-token','base_url':'http://127.0.0.1:19999/v1'}))
        self.state = {'settings_version':1,'upstreams':[{'id':'existing-memory','name':'Memory','api_key':'synthetic-existing','models':[{'id':'embedding'}]}], 'assignments':{'embedding':'embedding'}}
        self.old_db = app.DB_PATH;app.DB_PATH=str(self.root/'nook.db')
        self.client=app.app.test_client()
        with self.client.session_transaction() as session:session['authed']=True

    def add(self,pid,fmt,models):
        self.db.execute('INSERT INTO providers VALUES (?,?,?,?,?,?)',(pid,'Synthetic '+str(pid),fmt,'https://example.test/v1','synthetic-key',json.dumps([{'id':m} for m in models])))

    def tearDown(self):
        app.DB_PATH=self.old_db;self.db.close();self.temp.cleanup()

    def execute(self,action,payload=None):
        if action=='read':return copy.deepcopy(self.state)
        self.assertEqual(payload['expected_version'],self.state['settings_version'])
        self.state['upstreams']=payload['upstreams'];self.state['settings_version']+=1
        return self.state

    def sync(self):
        # Ownership preservation is exercised on Linux in deployment; Windows has no chown.
        with patch.object(worker.os,'chown',create=True):worker.synchronize(self.db,self.config,self.execute)

    def test_sync_routes_excludes_nonchat_preserves_background_and_is_idempotent(self):
        self.sync();mapping=json.loads(self.config.read_text())['providers']
        self.assertEqual(set(mapping),{'1','3'});self.assertNotIn('BAAI/bge-m3',mapping['1'])
        self.assertEqual(self.state['upstreams'][0]['id'],'existing-memory')
        self.assertEqual(self.state['assignments'],{'embedding':'embedding'})
        version=self.state['settings_version'];self.sync();self.assertEqual(self.state['settings_version'],version)
        self.assertEqual(registry.public_status(self.db)['state'],'ready')
        self.assertNotIn('synthetic-key',json.dumps(registry.public_status(self.db)))

    def test_add_change_rotate_and_remove_sync_without_touching_assignments(self):
        self.sync();self.add(4,'openai',['new-chat']);self.db.commit()
        self.assertEqual(registry.public_status(self.db)['state'],'pending');self.sync()
        self.assertIn('4',json.loads(self.config.read_text())['providers'])
        self.db.execute("UPDATE providers SET api_key='synthetic-rotated' WHERE id=1");self.db.commit()
        self.assertEqual(registry.public_status(self.db)['state'],'pending');self.sync()
        self.assertEqual(next(g for g in self.state['upstreams'] if g['id']=='sakie-managed-provider-1')['api_key'],'synthetic-rotated')
        self.db.execute('DELETE FROM providers WHERE id=4');self.db.commit();self.sync()
        self.assertNotIn('4',json.loads(self.config.read_text())['providers'])

    def test_failure_visible_and_does_not_activate_incomplete_mapping(self):
        original=self.config.read_bytes()
        with patch.object(worker.os,'chown',create=True):
            worker.synchronize(self.db,self.config,lambda *args:(_ for _ in ()).throw(RuntimeError('synthetic secret must not leak')))
        self.assertEqual(self.config.read_bytes(),original)
        status=registry.public_status(self.db);self.assertEqual(status['state'],'error')
        self.assertNotIn('secret',json.dumps(status))

    def test_unsupported_native_requires_explicit_exception(self):
        self.add(4,'gemini',['gemini-test']);self.db.commit();self.sync()
        self.assertEqual(registry.public_status(self.db)['unavailable_provider_ids'],[4])
        registry.write(self.db,registry.KEY,{'enabled':True,'excluded_provider_ids':[4]});self.db.commit();self.sync()
        self.assertEqual(registry.public_status(self.db)['state'],'ready')

    def test_settings_auth_validation_disable_and_exceptions(self):
        self.assertEqual(app.app.test_client().get('/api/serein/registry').status_code,401)
        for body in ({'enabled':'true'},{'enabled':True,'excluded_provider_ids':[True]},{'enabled':True,'excluded_provider_ids':[999]}):
            self.assertIn(self.client.put('/api/serein/registry',json=body).status_code,(400,409))
        response=self.client.put('/api/serein/registry',json={'enabled':False,'excluded_provider_ids':[1]})
        self.assertEqual(response.status_code,200);self.assertEqual(response.json['state'],'disabled')
        self.sync();self.assertFalse(json.loads(self.config.read_text())['enabled'])

    def test_connection_blocks_pending_and_respects_opt_out(self):
        import serein_connection as connection
        original={'id':1,'base_url':'https://example.test/v1','api_key':'synthetic','format':'openai'}
        config=json.loads(self.config.read_text());config['providers']={'1':{'chat-test':'mapped'}};config['token_file']=str(self.root/'token');self.config.write_text(json.dumps(config));(self.root/'token').write_text('synthetic-gateway-token')
        with patch.dict('os.environ',{'MORROW_SEREIN_GATEWAY_CONFIG':str(self.config),'DB_PATH':app.DB_PATH}):
            turn=connection._turn.set((1,1))
            try:
                with self.assertRaises(ValueError):connection.provider(original,'chat-test')
                self.sync();self.assertEqual(connection.provider(original,'chat-test')['base_url'],config['base_url'])
                registry.write(self.db,registry.KEY,{'enabled':True,'excluded_provider_ids':[1]});self.db.commit()
                self.assertEqual(connection.provider(original,'chat-test'),original)
                registry.write(self.db,registry.KEY,{'enabled':False});self.db.commit()
                self.assertEqual(connection.provider(original,'chat-test'),original)
            finally:connection._turn.reset(turn)
