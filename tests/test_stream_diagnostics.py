import json
import unittest
from unittest.mock import Mock
import stream_diagnostics
import request_trace
import test_request_trace as trace_tests


class DiagnosticsTest(unittest.TestCase):
    def test_structure_and_finish_reason_without_private_content(self):
        c=stream_diagnostics.Collector({'Content-Type':'text/event-stream; charset=utf-8'})
        c.observe('data: '+json.dumps({'choices':[{'delta':{'content':'PRIVATE_TEXT','tool_calls':[{'function':{'name':'PRIVATE_TOOL','arguments':'PRIVATE_ARGS'}}]},'finish_reason':'stop'}],'PRIVATE_KEY':'PRIVATE_VALUE'}))
        c.observe('data: [DONE]')
        self.assertEqual(c.data['finish_reasons'],['stop']);self.assertTrue(c.data['done'])
        self.assertIn('content',c.data['fields'])
        for secret in ('PRIVATE_TEXT','PRIVATE_TOOL','PRIVATE_ARGS','PRIVATE_KEY','PRIVATE_VALUE'):
            self.assertNotIn(secret,json.dumps(c.data))

    def test_json_html_invalid_and_unknown_reasons(self):
        c=stream_diagnostics.Collector({'Content-Type':'text/html'})
        c.observe('<html>PRIVATE</html>');c.observe('{"error":{"message":"PRIVATE","code":123}}')
        c.observe('data: broken PRIVATE');c.observe('data: {"choices":[{"finish_reason":"PRIVATE"}]}')
        self.assertTrue(c.data['html_seen']);self.assertEqual(c.data['non_sse_json'],1)
        self.assertEqual(c.data['invalid_json'],1);self.assertEqual(c.data['finish_reasons'],['other'])
        self.assertNotIn('PRIVATE',json.dumps(c.data))


class TraceDiagnosticsTest(unittest.TestCase):
    setUp=trace_tests.RequestTraceTest.setUp
    rows=trace_tests.RequestTraceTest.rows

    def test_metadata_survives_final_trace_and_events_remain_identical(self):
        response=Mock(status_code=200,headers={'Content-Type':'text/event-stream','x-request-id':'synthetic-id'})
        lines=['data: {"choices":[{"delta":{},"finish_reason":"content_filter"}]}','data: [DONE]']
        @request_trace.traced
        def sample(engine,model,provider_meta):
            request_trace.post(lambda *a,**k:response,'https://example.test',json={})
            self.assertEqual(list(request_trace.observe_lines(iter(lines))),lines)
            request_trace.legacy(error_type='EmptyStream')
            yield 'error',{'message':'Synthetic empty reply'}
        list(sample(self.engine,'synthetic',self.meta))
        meta=json.loads(self.rows()[0]['error'])
        self.assertEqual(meta['transport_error_type'],'EmptyStream')
        self.assertEqual(meta['stream_diagnostics']['finish_reasons'],['content_filter'])
        self.assertEqual(meta['upstream_ids']['x-request-id'],'synthetic-id')

    def test_diagnostic_exception_does_not_break_stream(self):
        from unittest.mock import patch
        response=Mock(status_code=200,headers={})
        @request_trace.traced
        def sample(engine,model,provider_meta):
            request_trace.post(lambda *a,**k:response,'https://example.test',json={})
            with patch.object(stream_diagnostics.Collector,'observe',side_effect=ValueError):
                self.assertEqual(list(request_trace.observe_lines(['data: x'])),['data: x'])
            yield 'delta','synthetic'
        self.assertEqual(list(sample(self.engine,'synthetic',self.meta)),[('delta','synthetic')])
