import json
import sqlite3
import tempfile
import unittest
from types import SimpleNamespace
from unittest import mock
import request_trace as trace


class RequestTraceTest(unittest.TestCase):
    def setUp(self):
        self.folder=tempfile.TemporaryDirectory();self.addCleanup(self.folder.cleanup)
        self.path=self.folder.name+'/trace.sqlite';self.engine=SimpleNamespace(DB_PATH=self.path)
        with sqlite3.connect(self.path) as c:
            c.execute('CREATE TABLE http_request_logs(id INTEGER PRIMARY KEY,provider_id INTEGER,provider_name TEXT,format TEXT,model TEXT,endpoint TEXT,ok INTEGER,status_code INTEGER,elapsed_ms INTEGER,error_type TEXT,error TEXT,req_bytes INTEGER,msg_count INTEGER)')
        c.close()
        self.meta={'id':7,'format':'gemini','trace_session_id':42,'trace_user_message_id':99}

    def rows(self):
        c=sqlite3.connect(self.path);c.row_factory=sqlite3.Row
        try:return [dict(row) for row in c.execute('SELECT * FROM http_request_logs ORDER BY id')]
        finally:c.close()

    def test_start_before_network_and_private_data_is_excluded(self):
        response=mock.Mock(status_code=200,headers={'x-request-id':'synthetic-request'})
        def send(*a,**k):
            self.assertEqual(self.rows()[0]['error_type'],'in_flight')
            return response
        @trace.traced
        def sample(engine,model,provider_meta):
            trace.post(send,'https://user:secret@example.test/chat?api_key=private-key',
                       headers={'Authorization':'Bearer private-key'},json={'messages':[{'content':'PRIVATE BODY'}]})
            trace.response_id('synthetic-response')
            yield 'delta','ok'
            return 123
        g=sample(self.engine,'model',self.meta);self.assertEqual(next(g),('delta','ok'))
        with self.assertRaises(StopIteration) as ended:next(g)
        self.assertEqual(ended.exception.value,123)
        row=self.rows()[0];self.assertEqual(row['ok'],1)
        self.assertEqual(row['endpoint'],'https://example.test/chat')
        metadata=json.loads(row['error']);self.assertEqual(metadata['upstream_ids']['body_id'],'synthetic-response')
        self.assertEqual(metadata['session_id'],42)
        for secret in ('private-key','PRIVATE BODY','Bearer','user:secret'):self.assertNotIn(secret,json.dumps(row))
        response.close.assert_called()

    def test_error_is_logged_before_consumer_closes_and_late_success_cannot_override(self):
        response=mock.Mock(status_code=200,headers={})
        @trace.traced
        def sample(engine,model,provider_meta):
            trace.post(lambda *a,**k:response,'https://example.test',json={})
            try:yield 'error',{'message':'repeated output'}
            finally:trace.legacy(ok=True)
        gen=sample(self.engine,'model',self.meta);next(gen)
        self.assertEqual(self.rows()[0]['error_type'],'stream_error')
        gen.close();self.assertEqual(self.rows()[0]['ok'],0);response.close.assert_called()
        self.assertIsNone(trace._current.get())

    def test_cancel_and_connection_failure_have_terminal_rows(self):
        response=mock.Mock(status_code=200,headers={})
        @trace.traced
        def sample(engine,model,provider_meta):
            trace.post(lambda *a,**k:response,'https://example.test',json={})
            yield 'delta','first'
            yield 'delta','next'
        gen=sample(self.engine,'model',self.meta);next(gen);gen.close()
        self.assertEqual(self.rows()[0]['error_type'],'cancelled')
        @trace.traced
        def broken(engine,model,provider_meta):
            trace.post(mock.Mock(side_effect=OSError('PRIVATE ERROR')),'https://example.test',json={})
            yield 'delta','never'
        with self.assertRaises(OSError):next(broken(self.engine,'model',self.meta))
        self.assertEqual(self.rows()[1]['error_type'],'connection_error')
        self.assertNotIn('PRIVATE ERROR',self.rows()[1]['error'])

    def test_retry_has_separate_attempts_and_no_legacy_duplicate(self):
        @trace.traced
        def sample(engine,model,provider_meta):
            for status in (400,200):
                trace.post(lambda *a,**k:mock.Mock(status_code=status,headers={}), 'https://example.test',json={})
                self.assertTrue(trace.legacy(ok=status==200))
            yield 'delta','ok'
        list(sample(self.engine,'model',self.meta))
        rows=self.rows();self.assertEqual(len(rows),2)
        self.assertEqual([r['error_type'] for r in rows],['retry',''])
        self.assertNotEqual(json.loads(rows[0]['error'])['trace_id'],json.loads(rows[1]['error'])['trace_id'])
    def test_actual_openai_repetition_abort_is_logged_even_when_caller_breaks(self):
        import chat_engine
        response=mock.Mock(status_code=200,headers={'x-request-id':'synthetic-abort'})
        response.iter_content.return_value=iter([b'data: {"choices":[{"delta":{"content":"synthetic repeated output"}}]}\n\n'])
        with mock.patch('chat_engine.DB_PATH',self.path),mock.patch('chat_engine.requests.post',return_value=response),mock.patch('chat_engine._looks_like_runaway',return_value=True):
            gen=chat_engine._stream_openai_once('https://example.test/v1','synthetic-secret','synthetic-model',
                                               [{'role':'user','content':'PRIVATE BODY'}],False,self.meta,tool_definitions=[])
            for kind,value in gen:
                if kind=='error':break
            self.assertEqual(self.rows()[0]['error_type'],'stream_error')
            gen.close()
        rows=self.rows();self.assertEqual(len(rows),1)
        self.assertEqual(json.loads(rows[0]['error'])['upstream_ids']['x-request-id'],'synthetic-abort')
        self.assertNotIn('PRIVATE BODY',json.dumps(rows));response.close.assert_called()
