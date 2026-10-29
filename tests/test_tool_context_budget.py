import copy
import os
import unittest
from unittest import mock
import chat_engine


class ToolContextBudgetTest(unittest.TestCase):
    def test_large_historical_results_are_bounded_without_changing_saved_input(self):
        messages=[{"role":"user","content":"Synthetic question"},
                  {"role":"tool","tool_call_id":"old","content":"甲"*150000},
                  {"role":"tool","tool_call_id":"new","content":"乙"*1800000}]
        original=copy.deepcopy(messages)
        with mock.patch.dict(os.environ,{"TOOL_CONTEXT_RESULT_CHARS":"12000","TOOL_CONTEXT_TOTAL_CHARS":"48000"}):
            result=chat_engine._bounded_tool_context(messages)
        self.assertEqual(messages,original)
        self.assertEqual(result[0],messages[0])
        for item in result[1:]:
            self.assertLessEqual(len(item["content"]),12000)
            self.assertIn("已截断",item["content"])
        self.assertEqual([m.get("tool_call_id") for m in result],[None,"old","new"])

    def test_total_budget_applies_to_many_results(self):
        messages=[{"role":"tool","content":"x"*10000} for _ in range(20)]
        with mock.patch.dict(os.environ,{"TOOL_CONTEXT_RESULT_CHARS":"12000","TOOL_CONTEXT_TOTAL_CHARS":"48000"}):
            result=chat_engine._bounded_tool_context(messages)
        self.assertLessEqual(sum(len(m["content"]) for m in result),48000)
        self.assertEqual(result[-1]["content"],messages[-1]["content"])

    def test_anthropic_blocks_and_small_results_keep_protocol(self):
        messages=[{"role":"user","content":[{"type":"tool_result","tool_use_id":"one","content":"y"*50000},
                   {"type":"tool_result","tool_use_id":"two","content":[{"type":"text","text":"z"*50000}]}]},
                   {"role":"tool","content":"small"}]
        result=chat_engine._bounded_tool_context(messages)
        self.assertEqual(result[0]["content"][0]["tool_use_id"],"one")
        self.assertLessEqual(len(result[0]["content"][1]["content"][0]["text"]),12000)
        self.assertEqual(result[-1],messages[-1])

    def test_openai_transport_caps_current_tool_results(self):
        messages=[{"role":"tool","tool_call_id":"one","content":"x"*1800000}]
        with mock.patch("chat_engine.requests.post",side_effect=chat_engine.requests.ConnectionError("synthetic offline")) as post:
            list(chat_engine._stream_openai_once("https://example.test/v1","synthetic-key","synthetic-model",messages,False,{"id":None,"name":"synthetic","format":"openai"},tool_definitions=[]))
        sent=post.call_args.kwargs["json"]["messages"]
        self.assertLessEqual(len(sent[0]["content"]),12000)
        self.assertEqual(len(messages[0]["content"]),1800000)
