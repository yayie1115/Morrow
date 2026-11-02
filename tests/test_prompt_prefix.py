import copy
import unittest
from contextlib import ExitStack
from unittest import mock
import chat_engine


class PromptPrefixTest(unittest.TestCase):
    def test_runtime_changes_do_not_change_history_prefix_or_latest_media(self):
        history=[{'role':'user','content':'[2026-01-01 08:00:00] old'},
                 {'role':'assistant','tool_calls':[{'id':'call-one'}],'content':''},
                 {'role':'tool','tool_call_id':'call-one','content':'saved result'},
                 {'role':'assistant','content':'answer'},
                 {'role':'user','content':[{'type':'text','text':'[2026-01-01 09:00:00] latest'},
                                           {'type':'image_url','image_url':{'url':'https://example.test/photo'}}]}]
        original=copy.deepcopy(history)
        first=chat_engine._history_with_runtime_context(history,'memory one')
        second=chat_engine._history_with_runtime_context(history,'memory two')
        self.assertEqual(first[:-2],history[:-1])
        self.assertEqual(first[:-2],second[:-2])
        self.assertEqual(first[-1],history[-1])
        self.assertIn('memory one',first[-2]['content'])
        self.assertEqual(history,original)

    def test_empty_context_and_empty_history(self):
        self.assertEqual(chat_engine._history_with_runtime_context([],''),[])
        self.assertEqual(len(chat_engine._history_with_runtime_context([],'runtime')),1)

    def test_generated_prompt_is_identical_except_runtime_for_both_transports(self):
        for fmt in ('openai','claude'):
            with self.subTest(fmt=fmt), ExitStack() as stack:
                provider={'id':1,'name':'synthetic','base_url':'https://example.test',
                          'api_key':'synthetic-key','format':fmt,'cache_mode':'none'}
                stack.enter_context(mock.patch('chat_engine.get_provider',return_value=provider))
                stack.enter_context(mock.patch('chat_engine.serein_connection.provider',side_effect=lambda p,m:p))
                stack.enter_context(mock.patch('chat_engine.latest_user_text',return_value='latest'))
                stack.enter_context(mock.patch('chat_engine.build_system_sections',side_effect=lambda *a,**k:{'stable':'persona original','volatile':'retrieved original'}))
                stack.enter_context(mock.patch('chat_engine.get_conversation_summary',return_value='summary original'))
                stack.enter_context(mock.patch('chat_engine.get_history',side_effect=lambda *a,**k:[{'role':'user','content':'latest'}]))
                stack.enter_context(mock.patch('chat_engine.model_supports_images',return_value=True))
                stack.enter_context(mock.patch('chat_engine.tools.chat_tool_index_block',return_value='tool directory'))
                stack.enter_context(mock.patch('chat_engine.tools.chat_tool_definitions',return_value=[]))
                target='_run_anthropic_tool_loop' if fmt=='claude' else '_run_openai_tool_loop'
                loop=stack.enter_context(mock.patch('chat_engine.'+target,return_value=iter([])))
                list(chat_engine.stream_chat(1,provider_id=1,model='synthetic',volatile_extra='runtime original'))
                prefix=loop.call_args.args[3]
                if fmt=='claude':
                    self.assertEqual(prefix['volatile'],'')
                    prefix=prefix['stable']
                self.assertLess(prefix.index('tool directory'),prefix.index('summary original'))
                self.assertNotIn('retrieved original',prefix)
                self.assertNotIn('runtime original',prefix)
                history=loop.call_args.args[4]
                self.assertEqual(history[-1],{'role':'user','content':'latest'})
                self.assertIn('retrieved original',history[-2]['content'])
                self.assertIn('runtime original',history[-2]['content'])
                self.assertEqual(loop.call_args.kwargs['tool_history'],history)

    def test_compat_roles_and_existing_ack_are_preserved(self):
        history=chat_engine._history_with_runtime_context([{'role':'user','content':'latest'}],'runtime')
        result=chat_engine._compat_prompt_messages([{'role':'system','content':'persona'}]+history)
        self.assertEqual([m['role'] for m in result],['user','assistant','user','user'])
        self.assertEqual(result[0]['content'],'persona')
        self.assertEqual(result[1]['content'],'明白，我将完全按照上述设定与记忆继续互动。')
