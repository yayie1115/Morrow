import json
from contextlib import closing
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest import mock
import tool_context
import chat_engine


def outcome(text="synthetic read",ok=True):
    return {"ok":ok,"content":text,"error":"" if ok else "synthetic error","duration_ms":5,"source":"builtin","server":""}


class ToolContextTest(unittest.TestCase):
    def setUp(self):
        root=Path("data/test-tmp");root.mkdir(parents=True,exist_ok=True)
        self.folder=tempfile.TemporaryDirectory(dir=root);self.addCleanup(self.folder.cleanup)
        self.db=Path(self.folder.name)/"synthetic.db"
        with closing(sqlite3.connect(self.db)) as c:
            c.execute("CREATE TABLE notes(id INTEGER PRIMARY KEY,content TEXT)")
            c.execute("INSERT INTO notes VALUES(1,'synthetic original')");c.commit()

    def test_identical_local_read_reuses_only_in_same_turn_and_session(self):
        turn=tool_context.TurnTools(str(self.db));execute=mock.Mock(return_value=outcome())
        turn.execute("read_note",{},1,execute);second=turn.execute("read_note",{},1,execute)
        self.assertEqual(execute.call_count,1);self.assertTrue(second["_read_reused"])
        turn.execute("read_note",{},2,execute);self.assertEqual(execute.call_count,2)
        tool_context.TurnTools(str(self.db)).execute("read_note",{},1,execute);self.assertEqual(execute.call_count,3)

    def test_changed_data_and_write_invalidate_read_reuse(self):
        turn=tool_context.TurnTools(str(self.db));execute=mock.Mock(return_value=outcome())
        turn.execute("read_note",{},1,execute)
        with closing(sqlite3.connect(self.db)) as c:
            c.execute("UPDATE notes SET content='synthetic changed'");c.commit()
        turn.execute("read_note",{},1,execute);self.assertEqual(execute.call_count,2)
        turn.execute("write_note",{},1,execute);turn.execute("read_note",{},1,execute)
        self.assertEqual(execute.call_count,4)

    def test_failed_unknown_and_write_calls_are_not_cached(self):
        turn=tool_context.TurnTools(str(self.db));execute=mock.Mock(return_value=outcome(ok=False))
        for name in ["read_note","mcp_unknown_read","write_memory","delete_memory"]:
            turn.execute(name,{},1,execute);turn.execute(name,{},1,execute)
        self.assertEqual(execute.call_count,8)

    def test_read_reuse_can_be_disabled(self):
        with mock.patch.dict(os.environ,{"TOOL_READ_REUSE_SECONDS":"0"}):
            turn=tool_context.TurnTools(str(self.db));execute=mock.Mock(return_value=outcome())
            turn.execute("read_note",{},1,execute);turn.execute("read_note",{},1,execute)
            self.assertEqual(execute.call_count,2)

    def test_json_projection_is_bounded_valid_and_raw_unchanged(self):
        raw=json.dumps({"items":[{"id":i,"body":"x"*20000,"negated":False} for i in range(20)]})
        result=tool_context.compact_result(raw);self.assertLessEqual(len(result),3000)
        self.assertTrue(json.loads(result)["_truncated"]);self.assertEqual(len(json.loads(raw)["items"]),20)

    def test_read_projection_references_identical_result_but_not_writes(self):
        turn=tool_context.TurnTools(str(self.db));raw=outcome("x"*10000)
        a=turn.project("read_note",{},raw,"call-a");b=turn.project("read_note",{},raw,"call-b")
        self.assertIn("call-a",b);self.assertLess(len(b),len(a));self.assertEqual(len(raw["content"]),10000)
        a=turn.project("write_memory",{},raw,"write-a");b=turn.project("write_memory",{},raw,"write-b")
        self.assertEqual(a,b);self.assertNotIn("write-a",b)

    def test_external_read_requires_explicit_read_only_declaration(self):
        turn=tool_context.TurnTools(str(self.db));raw=outcome("x"*10000)
        a=turn.project("mcp_search",{},raw,"m1");b=turn.project("mcp_search",{},raw,"m2")
        self.assertEqual(a,b)
        raw["tool_meta"]={"annotations":{"readOnlyHint":True,"destructiveHint":False}}
        turn=tool_context.TurnTools(str(self.db));turn.project("mcp_search",{},raw,"m3")
        self.assertIn("m3",turn.project("mcp_search",{},raw,"m4"))

    def test_history_projection_stays_fixed_when_new_turn_appended(self):
        def row(i):return {"id":i,"role":"assistant","tool_log":json.dumps([{"name":"read_note","result":"x"*20000,"args":{}}])}
        old=chat_engine._replay_tool_payloads([row(1)],max_rows=50)
        new=chat_engine._replay_tool_payloads([row(1),row(2)],max_rows=50)
        self.assertEqual(old[1],new[1]);self.assertLessEqual(sum(len(c) for v in new.values() for _,_,c in v),8000)
