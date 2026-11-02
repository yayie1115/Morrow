import copy
import json
import unittest
from unittest import mock
import chat_engine
import gemini_native as native
import compression_engine


def drain(gen):
    events=[]
    try:
        while True: events.append(next(gen))
    except StopIteration as done: return events,done.value


class GeminiNativeTest(unittest.TestCase):
    def response(self,frames):
        r=mock.Mock(status_code=200)
        r.iter_content.return_value=iter(('data: '+json.dumps(f)+'\n\n').encode() for f in frames)
        return r

    def run_stream(self,frames,**kwargs):
        response=self.response(frames)
        with mock.patch('gemini_native.requests.post',return_value=response) as post, mock.patch('chat_engine._log_http_request'):
            events,result=drain(native.stream(chat_engine,'https://example.test/gemini','synthetic-key','google/gemini-test',
                                             [{'role':'user','content':'hello'}],False,{'format':'gemini'},tool_definitions=[],**kwargs))
        self.assertTrue(response.close.called)
        return events,result,post

    def test_endpoint_versions_and_model_path(self):
        self.assertEqual(native.endpoint('https://example.test/gemini','google/gemini-test'),
                         'https://example.test/gemini/v1beta/models/google/gemini-test:streamGenerateContent?alt=sse')
        self.assertEqual(native.api_root('https://example.test/v1beta'),'https://example.test/v1beta')

    def test_payload_preserves_prompt_media_and_has_native_settings(self):
        msgs=[{'role':'system','content':'original persona'}, {'role':'user','content':[
            {'type':'text','text':'[2026-01-01] hello'}, {'type':'image_url','image_url':{'url':'data:image/png;base64,YQ=='}}]}]
        saved=copy.deepcopy(msgs)
        body=native.payload(chat_engine,'google/gemini-4-test',msgs,True,[{'type':'function','function':{
            'name':'lookup','parameters':{'type':'object','properties':{'kind':{'type':['string','null']}}}}}])
        self.assertEqual(msgs,saved)
        self.assertEqual(body['contents'][0]['parts'][0]['text'],'original persona')
        self.assertEqual(body['contents'][-1]['parts'][-1]['inlineData']['data'],'YQ==')
        self.assertTrue(body['generationConfig']['thinkingConfig']['includeThoughts'])
        self.assertEqual(len(body['safetySettings']),4)
        self.assertEqual(body['tools'][0]['functionDeclarations'][0]['parametersJsonSchema']['properties']['kind']['type'],['string','null'])
        self.assertNotIn('chat_template_kwargs',body)

    def test_thoughts_text_and_usage_accounting(self):
        frames=[{'candidates':[{'content':{'parts':[{'text':'short summary','thought':True},{'text':'Hello.'}]}}]},
                {'candidates':[{'finishReason':'STOP'}],'usageMetadata':{'promptTokenCount':100,'cachedContentTokenCount':80,
                 'candidatesTokenCount':4,'thoughtsTokenCount':6,'totalTokenCount':110}}]
        events,result,post=self.run_stream(frames)
        self.assertIn(('reasoning','short summary'),events)
        self.assertEqual(result[0],'Hello.')
        self.assertEqual(result[2]['completion_tokens'],10)
        self.assertEqual(result[2]['prompt_tokens_details']['cached_tokens'],80)
        self.assertEqual(post.call_args.kwargs['headers']['x-goog-api-key'],'synthetic-key')

    def test_signed_parallel_tools_survive_next_round(self):
        parts=[{'functionCall':{'name':'lookup','args':{'i':1},'id':'a'},'thoughtSignature':'signature-a'},
               {'functionCall':{'name':'lookup','args':{'i':2},'id':'b'}}]
        _,result,_=self.run_stream([{'candidates':[{'content':{'parts':parts},'finishReason':'STOP'}]}])
        calls=result[1]
        msgs=[{'role':'assistant','content':'','_gemini_parts':calls[0]['_gemini_parts'],
               'tool_calls':[{'id':c['id'],'function':{'name':c['name'],'arguments':c['arguments']}} for c in calls]},
              {'role':'tool','tool_call_id':'a','content':'one'},{'role':'tool','tool_call_id':'b','content':'two'}]
        converted=native.contents(msgs)
        self.assertEqual(converted[0]['parts'],parts)
        self.assertEqual([p['functionResponse']['id'] for p in converted[1]['parts']],['a','b'])

    def test_legacy_tool_history_never_forges_signature_or_native_call(self):
        msgs=[{'role':'assistant','content':'','tool_calls':[{'id':'old','function':{'name':'lookup','arguments':'{}'}}]},
              {'role':'tool','tool_call_id':'old','content':'old result'}]
        converted=native.contents(msgs)
        self.assertTrue(all('text' in p for m in converted for p in m['parts']))
        self.assertIn('old result',converted[-1]['parts'][0]['text'])

    def test_truncated_or_disconnected_stream_cannot_execute_tools(self):
        for finish in ('MAX_TOKENS',None,'SAFETY'):
            candidate={'content':{'parts':[{'text':'partial'},{'functionCall':{'name':'write','args':{}}}]}}
            if finish: candidate['finishReason']=finish
            events,result,_=self.run_stream([{'candidates':[candidate]}])
            self.assertTrue(any(k=='error' for k,v in events))
            self.assertEqual(result[1],[])

    def test_native_dispatch_uses_shared_loop(self):
        with mock.patch('gemini_native.stream',return_value=iter([('delta','native')])) as transport:
            events=list(chat_engine._stream_openai_once('https://example.test','key','model',[],False,{'format':'gemini'},[]))
        self.assertEqual(events,[('delta','native')]);transport.assert_called_once()

    def test_incomplete_native_summary_does_not_commit(self):
        def failed(*a,**k):
            yield 'delta','partial'
            yield 'error',{'message':'interrupted'}
            return 'partial',[],{'prompt_tokens':10}
        with mock.patch('compression_engine._provider',return_value={'format':'gemini','api_key':'synthetic','base_url':'https://example.test'}),mock.patch('gemini_native.stream',side_effect=failed):
            with self.assertRaises(compression_engine.CompressionError):
                compression_engine.summarize('',[{'id':1,'role':'user','content':'hello'}],provider_id=1,model='gemini-test')

    def test_sampling_values_zero_and_default_are_preserved(self):
        import app
        models=app._clean_models([{'id':'gemini-test','temperature':0,'top_p':0.85},
                                  {'id':'gemini-other','temperature':'','top_p':'NaN'}])
        self.assertEqual(models[0]['temperature'],0)
        self.assertEqual(models[0]['top_p'],0.85)
        self.assertNotIn('temperature',models[1]);self.assertNotIn('top_p',models[1])
        r=self.response([{'candidates':[{'content':{'parts':[{'text':'ok'}]},'finishReason':'STOP'}]}])
        with mock.patch('gemini_native.requests.post',return_value=r) as post, mock.patch('chat_engine._log_http_request'):
            drain(native.stream(chat_engine,'https://example.test/gemini','key','gemini-test',[],False,
                                {'format':'gemini','generation':{'temperature':0,'top_p':0.85}},tool_definitions=[]))
        config=post.call_args.kwargs['json']['generationConfig']
        self.assertEqual(config['temperature'],0);self.assertEqual(config['topP'],0.85)

    def test_full_shared_tool_loop_keeps_signed_native_round(self):
        first=self.response([{'candidates':[{'content':{'parts':[{'functionCall':{'name':'lookup','args':{}},'thoughtSignature':'signed'}]},'finishReason':'STOP'}]}])
        second=self.response([{'candidates':[{'content':{'parts':[{'text':'done'}]},'finishReason':'STOP'}]}])
        outcome={'content':'result','ok':True,'error':'','duration_ms':0,'source':'builtin','server':''}
        with mock.patch('gemini_native.requests.post',side_effect=[first,second]) as post,mock.patch('chat_engine._log_http_request'),mock.patch('chat_engine.tools.execute',return_value=outcome):
            events=list(chat_engine._run_openai_tool_loop('https://example.test/gemini','key','gemini-test','persona',
                [{'role':'user','content':'lookup'}],False,1,{'format':'gemini'},base_tool_definitions=[]))
        self.assertTrue(any(k=='tool_result' for k,v in events))
        self.assertEqual(post.call_count,2)
        body=post.call_args.kwargs['json']
        signed=[p for m in body['contents'] for p in m['parts'] if p.get('thoughtSignature')]
        self.assertEqual(signed[0]['thoughtSignature'],'signed')
        self.assertTrue(any('functionResponse' in p for m in body['contents'] for p in m['parts']))
    def test_short_symbol_cycles_stop_but_brief_faces_and_prose_do_not(self):
        self.assertTrue(chat_engine._looks_like_runaway('prefix '+':]。 '*16))
        self.assertFalse(chat_engine._looks_like_runaway('hello :] see you :]'))
        self.assertFalse(chat_engine._looks_like_runaway('A normal sentence.\n'+'-'*24))
        self.assertFalse(chat_engine._looks_like_runaway('普通中文内容，包含正常标点。'))

    def test_raw_native_repetition_is_not_shown_or_executed(self):
        frames=[{'candidates':[{'content':{'parts':[{'text':'normal beginning.'}]}}]},
                {'candidates':[{'content':{'parts':[{'text':':]。 '*16},
                    {'functionCall':{'name':'write_something','args':{}}}]},'finishReason':'STOP'}]}]
        events,result,_=self.run_stream(frames)
        error=next(value for kind,value in events if kind=='error')
        self.assertEqual(error['code'],'REPETITION_ABORT')
        self.assertNotIn(':]', ''.join(value for kind,value in events if kind=='delta'))
        self.assertEqual(result[1],[])
