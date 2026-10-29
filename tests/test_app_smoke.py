import json
import os
import shutil
import unittest
import uuid
from unittest import mock

import app
import chat_engine
import tools


class AppSmokeTest(unittest.TestCase):
    def setUp(self):
        # Push delivery has its own suite; do not leave delayed workers using a deleted fixture DB.
        delivery = mock.patch("app._background_push_delivery")
        delivery.start()
        self.addCleanup(delivery.stop)
        self.root = os.path.join(os.getcwd(), "data", "test-tmp", uuid.uuid4().hex)
        os.makedirs(self.root)
        self.old_paths = {
            "app": (app.DB_PATH, app.DATA_DIR, app.UPLOAD_DIR),
            "chat": (chat_engine.DB_PATH, chat_engine.DATA_DIR, chat_engine.UPLOAD_DIR),
            "tools": tools.DB_PATH,
        }
        db_path = os.path.join(self.root, "nook.db")
        uploads = os.path.join(self.root, "uploads")
        app.DB_PATH, app.DATA_DIR, app.UPLOAD_DIR = db_path, self.root, uploads
        chat_engine.DB_PATH, chat_engine.DATA_DIR, chat_engine.UPLOAD_DIR = db_path, self.root, uploads
        tools.DB_PATH = db_path
        app.init_db()

    def tearDown(self):
        app.DB_PATH, app.DATA_DIR, app.UPLOAD_DIR = self.old_paths["app"]
        chat_engine.DB_PATH, chat_engine.DATA_DIR, chat_engine.UPLOAD_DIR = self.old_paths["chat"]
        tools.DB_PATH = self.old_paths["tools"]
        shutil.rmtree(self.root, ignore_errors=True)

    def test_chat_history_pages_preserve_order_scope_and_legacy_response(self):
        client = app.app.test_client()
        self.assertEqual(client.get("/api/chat/messages/1?limit=2").status_code, 401)
        client.post("/api/login", json={"password": app.AUTH_PASSWORD})
        with app.app.app_context():
            db = app.get_db()
            first = db.execute("INSERT INTO sessions(title) VALUES ('Synthetic A')").lastrowid
            second = db.execute("INSERT INTO sessions(title) VALUES ('Synthetic B')").lastrowid
            ids = []
            for i in range(7):
                ids.append(db.execute("INSERT INTO messages(session_id,role,content) VALUES (?,?,?)", (first, "user", str(i))).lastrowid)
                db.execute("INSERT INTO messages(session_id,role,content) VALUES (?,?,?)", (second, "user", "other"))
            db.execute("UPDATE messages SET hidden=1 WHERE id=?", (ids[3],))
            db.commit()
        path = f"/api/chat/messages/{first}"
        all_rows = client.get(path).get_json()
        self.assertEqual([r["id"] for r in all_rows], ids[:3] + ids[4:])
        recent = client.get(path + "?limit=2").get_json()
        self.assertEqual([r["id"] for r in recent], ids[-2:])
        older = client.get(path + f"?limit=2&before={recent[0]['id']}").get_json()
        self.assertEqual([r["id"] for r in older], [ids[2], ids[4]])
        self.assertEqual(client.get(path + f"?limit=2&before={ids[0]}").get_json(), [])
        for query in ("limit=0", "limit=201", "limit=x", "before=-1", "before=x"):
            self.assertEqual(client.get(path + "?" + query).status_code, 400)

    def test_chat_history_omits_internal_tool_transcripts_from_display_versions(self):
        client = app.app.test_client()
        client.post("/api/login", json={"password": app.AUTH_PASSWORD})
        versions = [
            {"c": "Synthetic first reply", "r": "Synthetic reasoning", "at": "2026-01-01T12:00:00", "a": [],
             "model": "synthetic", "tool_run_id": "run-one", "artifact_ids": [7],
             "tool_log": [{"name": "synthetic_lookup", "result": "x" * 1800000}]},
            {"c": "Synthetic revised reply", "tool_log": [{"name": "synthetic_lookup", "result": "y" * 1800000}]},
        ]
        stored = json.dumps(versions)
        with app.app.app_context():
            db = app.get_db()
            sid = db.execute("INSERT INTO sessions(title) VALUES ('Synthetic payload')").lastrowid
            mid = db.execute("INSERT INTO messages(session_id,role,content,versions,active,tool_log) VALUES (?,?,?,?,?,?)",
                             (sid, "assistant", versions[1]["c"], stored, 1, json.dumps(versions[1]["tool_log"]))).lastrowid
            db.commit()
        for suffix in ("", "?limit=80"):
            response = client.get(f"/api/chat/messages/{sid}" + suffix)
            self.assertLess(len(response.data), 4096)
            message = response.get_json()[0]
            self.assertEqual(message["active"], 1)
            self.assertEqual(message["versions"], [{k:v for k,v in item.items() if k != "tool_log"} for item in versions])
        with app.app.app_context():
            row = app.get_db().execute("SELECT versions,tool_log FROM messages WHERE id=?", (mid,)).fetchone()
            self.assertEqual(row["versions"], stored)
            self.assertEqual(len(json.loads(row["tool_log"])[0]["result"]),1800000)

    def test_usage_pricing_reuses_reply_transaction_even_under_exclusive_lock(self):
        with app.app.app_context():
            db = app.get_db()
            pid = db.execute("INSERT INTO providers(name,models) VALUES (?,?)",
                             ("Synthetic", json.dumps([{"id":"synthetic", "price_input":2, "price_output":4}]))).lastrowid
            db.commit()
            db.execute("BEGIN EXCLUSIVE")
            try:
                sid = db.execute("INSERT INTO sessions(title) VALUES ('Synthetic locked transaction')").lastrowid
                mid = db.execute("INSERT INTO messages(session_id,role,content) VALUES (?,?,?)", (sid,"assistant","Synthetic saved reply")).lastrowid
                with mock.patch("app.sqlite3.connect", side_effect=AssertionError("must reuse transaction connection")):
                    app._insert_usage(db,sid,mid,{"provider":{"id":pid},"model":"synthetic","usage":{"input_tokens":10,"output_tokens":5}})
                row = db.execute("SELECT cost_usd FROM api_usage WHERE message_id=?",(mid,)).fetchone()
                self.assertAlmostEqual(row[0], .00004)
                db.commit()
            except Exception:
                db.rollback()
                raise

    def test_chat_receipts_are_lazy_scoped_and_exclude_raw_outputs(self):
        client = app.app.test_client()
        self.assertEqual(client.get("/api/chat/message/1/receipts?session_id=1").status_code,401)
        client.post("/api/login",json={"password":app.AUTH_PASSWORD})
        with app.app.app_context():
            db=app.get_db()
            sid=db.execute("INSERT INTO sessions(title) VALUES ('Synthetic receipts')").lastrowid
            versions=json.dumps([{"c":"old","tool_run_id":"old"},{"c":"current","tool_run_id":"current"}])
            mid=db.execute("INSERT INTO messages(session_id,role,content,versions,active) VALUES (?,?,?,?,?)",(sid,"assistant","current",versions,1)).lastrowid
            for run in ("old","current"):
                db.execute("INSERT INTO tool_calls(session_id,message_id,run_id,tool,narrate,args,result,status,duration_ms) VALUES (?,?,?,?,?,?,?,?,?)",(sid,mid,run,"synthetic_lookup","读取记忆",'{"token":"synthetic-private"}',"synthetic-private-raw"*10000,"success",123))
            db.commit()
        path=f"/api/chat/message/{mid}/receipts?session_id={sid}"
        response=client.get(path);self.assertEqual(response.status_code,200)
        items=response.get_json()["items"];self.assertEqual(len(items),1)
        self.assertEqual(items[0]["duration_ms"],123)
        self.assertNotIn("synthetic-private",response.get_data(as_text=True))
        history=client.get(f"/api/chat/messages/{sid}?limit=80").get_json()
        self.assertEqual(history[0]["receipt_count"],1)
        self.assertEqual(client.get(f"/api/chat/message/{mid}/receipts?session_id={sid+1}").status_code,404)
        with app.app.app_context():
            db=app.get_db();db.execute("UPDATE messages SET hidden=1 WHERE id=?",(mid,));db.commit()
        self.assertEqual(client.get(path).status_code,404)

    def test_failed_model_reply_has_persistent_error_receipt_without_fake_message(self):
        client=app.app.test_client();client.post("/api/login",json={"password":app.AUTH_PASSWORD})
        with mock.patch("chat_engine.stream_chat",return_value=iter([("error",{"status":429,"message":"Bearer synthetic-secret-token"})])):
            response=client.post("/api/chat/send",json={"message":"Synthetic request"})
            events=[json.loads(line[5:]) for line in response.get_data(as_text=True).splitlines() if line.startswith("data:")]
        error=next(e for e in events if e["type"]=="error")
        self.assertIn("HTTP 429",error["detail"])
        self.assertNotIn("synthetic-secret-token",error["detail"])
        session_event=next(e for e in events if e["type"]=="session")
        sid=session_event["session_id"];mid=session_event["user_message_id"]
        history=client.get(f"/api/chat/messages/{sid}").get_json()
        self.assertEqual([m["role"] for m in history],["user"])
        self.assertEqual(history[0]["receipt_count"],1)
        receipt=client.get(f"/api/chat/message/{mid}/receipts?session_id={sid}").get_json()["items"][0]
        self.assertEqual(receipt["kind"],"error")
        self.assertIn("限流",receipt["error"])

    def test_partial_reply_receipt_is_saved_and_not_replayed_as_model_tool(self):
        client=app.app.test_client();client.post("/api/login",json={"password":app.AUTH_PASSWORD})
        stream=iter([("delta","Synthetic partial"),("error",{"message":"connection interrupted"})])
        with mock.patch("chat_engine.stream_chat",return_value=stream):
            response=client.post("/api/chat/send",json={"message":"Synthetic partial request"})
            events=[json.loads(line[5:]) for line in response.get_data(as_text=True).splitlines() if line.startswith("data:")]
        done=next(e for e in events if e["type"]=="done");self.assertTrue(done["partial"])
        self.assertTrue(done["receipt"]["id"])
        with app.app.app_context():
            db=app.get_db();version=json.loads(db.execute("SELECT versions FROM messages WHERE id=?",(done["message_id"],)).fetchone()[0])[0]
            version.pop("tool_log",None)
            self.assertEqual(app._version_tool_log(db,done["message_id"],version),[])

    @staticmethod
    def _local_model_stream(session_id, **_kwargs):
        args = {"text": "冒烟测试待办"}
        narrate = tools.narrate("add_todo")
        yield "tool_start", {"tool": "add_todo", "narrate": narrate, "args": args}
        outcome = tools.execute("add_todo", args, session_id)
        yield "tool_result", {
            "tool": "add_todo",
            "display_tool": outcome.get("tool", "add_todo"),
            "narrate": narrate,
            "args": args,
            "result": outcome["content"],
            "ok": outcome["ok"],
            "error": outcome["error"],
            "duration_ms": outcome["duration_ms"],
            "source": outcome["source"],
            "server": outcome["server"],
        }
        yield "delta", "已经帮你记下来了。"
        yield "usage", {
            "provider": {"id": None, "name": "local-smoke", "format": "openai"},
            "model": "local-smoke-model",
            "format": "openai",
            "usage": {"input_tokens": 12, "output_tokens": 8, "total_tokens": 20},
        }

    def test_app_shell_and_service_worker_are_never_served_stale(self):
        client = app.app.test_client()
        for path in ("/", "/static/sw.js"):
            response = client.get(path)
            self.assertEqual(response.status_code, 200)
            self.assertIn("no-store", response.headers.get("Cache-Control", ""))
            self.assertEqual(response.headers.get("Pragma"), "no-cache")
            response.close()

        response = client.get("/")
        page = response.get_data(as_text=True)
        response.close()
        self.assertIn('id="chatLiveStatus"', page)
        self.assertIn("chatLiveStatus.replaceChildren(pill)", page)
        self.assertIn("chatLiveStatus.replaceChildren(toolEl)", page)
        self.assertIn('overlay:"note-wall"', page)
        self.assertIn("closeNoteWall(true)", page)
        self.assertEqual(tools.narrate("get_weather"), "在看窗外")

    def test_release_identity_is_authenticated_and_available_in_data_settings(self):
        client = app.app.test_client()
        self.assertEqual(client.get("/api/version").status_code, 401)
        client.post("/api/login", json={"password": app.AUTH_PASSWORD})
        with mock.patch.dict(os.environ, {
            "NOOK_RELEASE_VERSION": "2026.09.27.88",
            "NOOK_RELEASE_SHA": "ba16f43abcdef1234567890",
        }):
            payload = client.get("/api/version").get_json()
        self.assertEqual(payload["version"], "v0.1.0")
        self.assertEqual(payload["commit_short"], "ba16f43")
        response = client.get("/")
        page = response.get_data(as_text=True)
        response.close()
        self.assertIn('id="nookVersion"', page)
        self.assertIn('api("/api/version")', page)

    def test_home_note_can_be_fixed_and_returns_to_latest(self):
        client = app.app.test_client()
        self.assertEqual(
            client.post("/api/login", json={"password": app.AUTH_PASSWORD}).status_code,
            200,
        )
        client.put("/api/notes", json={"content": "第一张测试便签"})
        first = client.get("/api/notes/all").get_json()[0]
        client.put("/api/notes", json={"content": "第二张测试便签"})

        fixed = client.put("/api/notes/display", json={"note_id": first["id"]})
        self.assertEqual(fixed.status_code, 200)
        shown = client.get("/api/notes").get_json()
        self.assertEqual(shown["id"], first["id"])
        self.assertTrue(shown["fixed"])

        released = client.put("/api/notes/display", json={"note_id": None})
        self.assertEqual(released.status_code, 200)
        latest = client.get("/api/notes").get_json()
        self.assertEqual(latest["content"], "第二张测试便签")
        self.assertFalse(latest["fixed"])

    def test_deleting_fixed_home_note_releases_selection(self):
        client = app.app.test_client()
        client.post("/api/login", json={"password": app.AUTH_PASSWORD})
        client.put("/api/notes", json={"content": "准备删除的便签"})
        note = client.get("/api/notes/all").get_json()[0]
        client.put("/api/notes/display", json={"note_id": note["id"]})
        self.assertEqual(client.delete(f"/api/notes/{note['id']}").status_code, 200)
        shown = client.get("/api/notes").get_json()
        self.assertNotEqual(shown.get("id"), note["id"])
        self.assertFalse(shown["fixed"])

    @mock.patch("chat_engine.stream_chat", side_effect=_local_model_stream.__func__)
    @mock.patch("compression_engine.summarize", return_value="用户让Morrow记下一条冒烟测试待办，Morrow已经完成。")
    def test_login_chat_tool_refresh_and_compress(self, _summarize, _stream):
        client = app.app.test_client()
        login = client.post("/api/login", json={"password": app.AUTH_PASSWORD})
        self.assertEqual(login.status_code, 200)

        sent = client.post("/api/chat/send", json={"message": "帮我记一个测试待办"})
        self.assertEqual(sent.status_code, 200)
        payload = sent.get_data(as_text=True)
        events = [
            json.loads(line.removeprefix("data: "))
            for line in payload.splitlines()
            if line.startswith("data: ")
        ]
        session_id = next(e["session_id"] for e in events if e.get("type") == "session")
        self.assertTrue(any(e.get("type") == "done" for e in events))

        todos = client.get("/api/todos").get_json()
        self.assertEqual(todos[0]["text"], "冒烟测试待办")
        tidy = client.get("/api/tidy").get_json()
        self.assertEqual(tidy[0]["tool"], "add_todo")
        self.assertEqual(tidy[0]["status"], "success")
        self.assertTrue(tidy[0]["run_id"])
        self.assertTrue(tidy[0]["run_complete"])

        fresh_client = app.app.test_client()
        fresh_client.post("/api/login", json={"password": app.AUTH_PASSWORD})
        messages = fresh_client.get(f"/api/chat/messages/{session_id}").get_json()
        self.assertEqual([m["role"] for m in messages], ["user", "assistant"])
        self.assertEqual(messages[-1]["content"], "已经帮你记下来了。")

        compressed = fresh_client.post(
            f"/api/chat/compression/{session_id}",
            json={"recent_message_count": 0, "target_tokens": 500},
        )
        self.assertEqual(compressed.status_code, 200)
        self.assertEqual(compressed.get_json()["newly_compressed_count"], 2)
        status = fresh_client.get(f"/api/chat/compression/{session_id}").get_json()
        self.assertTrue(status["has_summary"])
        self.assertEqual(status["covered_message_count"], 2)


if __name__ == "__main__":
    unittest.main()
