import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import serein_connection as connection


class OfficialConnectionTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        root=Path(self.temp.name);key=root/'key';key.write_text('synthetic-gateway-key')
        self.path=root/'private.json'
        self.cfg={'enabled':True,'base_url':'http://127.0.0.1:18217/v1','token_file':str(key),
                  'instance_id':'synthetic','providers':{'1':{'chat-model':'upstream/chat-model'}}}
        self.path.write_text(json.dumps(self.cfg))
        self.env=patch.dict(os.environ,{'MORROW_SEREIN_GATEWAY_CONFIG':str(self.path)})
        self.env.start();self.addCleanup(self.env.stop)
        self.original={'id':1,'base_url':'https://provider.example/v1','api_key':'synthetic-provider-key','format':'claude','cache_mode':'none'}

    def invoke(self,mid=7):
        @connection.chat_scope
        def chat(session_id,**kwargs):
            yield connection.provider(self.original,'chat-model')
            yield connection.payload('http://127.0.0.1:18217/v1',{'id':1},{'model':'chat-model','messages':[{'role':'user','content':'synthetic'}]})
        return chat(3,current_user_message_id=mid)

    def test_selected_chat_uses_official_gateway_without_changing_saved_provider(self):
        items=list(self.invoke());self.assertEqual(items[0]['api_key'],'synthetic-gateway-key')
        self.assertEqual(items[0]['format'],'openai');self.assertEqual(self.original['format'],'claude')
        self.assertEqual(self.original['api_key'],'synthetic-provider-key')

    def test_only_transport_model_alias_changes_and_window_is_stable(self):
        payload,headers=list(self.invoke())[1]
        self.assertEqual(payload['model'],'upstream/chat-model')
        self.assertEqual(payload['messages'],[{'role':'user','content':'synthetic'}])
        self.assertEqual(headers,{'X-Serein-Window-ID':'morrow:synthetic:3'})

    def test_non_chat_calls_are_not_redirected_or_archived(self):
        self.assertEqual(connection.provider(self.original,'chat-model'),self.original)
        self.assertEqual(list(self.invoke(None))[0],self.original)

    def test_closing_stream_restores_context(self):
        stream=self.invoke();next(stream);stream.close()
        self.assertEqual(connection.provider(self.original,'chat-model'),self.original)

    def test_disabled_configuration_keeps_original_route(self):
        self.cfg['enabled']=False;self.path.write_text(json.dumps(self.cfg))
        self.assertEqual(list(self.invoke())[0],self.original)

    def test_non_loopback_gateway_is_rejected(self):
        self.cfg['base_url']='https://outside.example/v1';self.path.write_text(json.dumps(self.cfg))
        self.assertIsNone(connection.configuration())

    def test_unknown_provider_or_model_keeps_direct_connection(self):
        @connection.chat_scope
        def chat(session_id,**kwargs):yield connection.provider(self.original,'another-model')
        self.assertEqual(list(chat(3,current_user_message_id=7))[0],self.original)

    def test_missing_private_configuration_is_harmless(self):
        self.path.unlink();self.assertIsNone(connection.configuration())


if __name__=='__main__':unittest.main()
