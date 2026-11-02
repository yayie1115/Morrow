import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest import mock
import chat_engine


class FailedHistoryTest(unittest.TestCase):
    def row(self,content,version,role='assistant'):
        return {'content':content,'role':role,'versions':json.dumps([version]),'active':0}

    def test_failed_draft_is_projected_without_changing_stored_row(self):
        row=self.row('failed generated fragment',{'error':'interrupted','partial':True})
        original=dict(row)
        text=chat_engine._history_assistant_text(row)
        self.assertIn('失败正文未作为正常历史重放',text)
        self.assertNotIn('failed generated fragment',text)
        self.assertEqual(row,original)

    def test_valid_correction_and_user_text_are_preserved(self):
        self.assertEqual(chat_engine._history_assistant_text(self.row('corrected content',{})),'corrected content')
        user=self.row(':]。 '*30,{'error':'old'},role='user')
        self.assertEqual(chat_engine._history_assistant_text(user),user['content'])

    def test_only_active_version_controls_projection(self):
        row=self.row('corrected content',{})
        row['versions']=json.dumps([{'error':'old failure'},{'c':'corrected content'}]);row['active']=1
        self.assertEqual(chat_engine._history_assistant_text(row),'corrected content')

    def test_obvious_runaway_without_legacy_error_metadata_is_not_replayed(self):
        self.assertIn('失败正文未作为正常历史重放',chat_engine._history_assistant_text(self.row(':]。 '*30,{})))

    def test_history_retains_user_and_successful_tool_result_without_database_edits(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'history.sqlite'
            conn=sqlite3.connect(path)
            conn.executescript('CREATE TABLE conversation_summaries(session_id INTEGER,covered_through_message_id INTEGER,raw_overlap_count INTEGER);'
                'CREATE TABLE messages(id INTEGER,session_id INTEGER,role TEXT,content TEXT,attachments TEXT,tool_log TEXT,created_at TEXT,proactive INTEGER,versions TEXT,active INTEGER);')
            failed='failed generated draft'
            conn.execute('INSERT INTO messages VALUES (1,1,?,?,?,?,?,0,?,0)',('assistant',failed,'[]','[{"name":"lookup"}]','2026-01-01 09:00:00',json.dumps([{'error':'failed','partial':True}])))
            conn.execute('INSERT INTO messages VALUES (2,1,?,?,?,?,?,0,?,0)',('user','followup','[]','','2026-01-01 09:01:00','[]'))
            conn.commit();conn.close()
            def connect():
                c=sqlite3.connect(path);c.row_factory=sqlite3.Row;return c
            with mock.patch('chat_engine._connect',side_effect=connect),mock.patch('chat_engine._replay_tool_payloads',return_value={1:[('lookup','{}','completed tool result')]}):
                messages=chat_engine.get_history(1,include_images=False)
            self.assertEqual(messages[1]['role'],'tool')
            self.assertEqual(messages[1]['content'],'completed tool result')
            self.assertIn('失败正文未作为正常历史重放',messages[2]['content'])
            self.assertIn('followup',messages[3]['content'])
            c=connect()
            try:self.assertEqual(c.execute('SELECT content FROM messages WHERE id=1').fetchone()[0],failed)
            finally:c.close()
