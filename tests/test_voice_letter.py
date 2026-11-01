import json
import os
import shutil
import sqlite3
import unittest
import uuid
from unittest import mock

import app
import chat_engine
import tools
import voice_engine


class VoiceLanguagePolicyTest(unittest.TestCase):
    def test_language_is_chosen_by_ai_and_translations_remain_supported(self):
        definition=voice_engine.TOOL_DEFINITION['function']
        self.assertIn('自主选择',definition['description'])
        self.assertNotIn('朗读稿用英文',definition['description'])
        self.assertNotIn('完整英文朗读稿',definition['parameters']['properties']['script']['description'])
        self.assertIn('纯中文',definition['parameters']['properties']['subtitle_zh']['description'])
        for script in ['[softly] 今天过得好吗？我在这里。','[softly] こんにちは。元気ですか？']:
            parsed=voice_engine.parse_script(script)
            self.assertTrue(parsed['text'])
            self.assertNotIn('[softly]',parsed['text'])
        self.assertEqual(voice_engine.clean_subtitles([], '我在这里。'),[])
        self.assertEqual(voice_engine.clean_subtitles(['你好。','还好吗？'],'こんにちは。元気ですか？'),['你好。','还好吗？'])


class InlineVoiceBubbleTest(unittest.TestCase):
    @unittest.skipUnless(shutil.which('node'),'Node unavailable')
    def test_inline_playback_translation_and_exclusivity(self):
        import subprocess
        script=r"""
const assert=require('assert'),fs=require('fs'),vm=require('vm');
class Node{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.listeners={};this.dataset={};this.isConnected=true;this.style={setProperty(k,v){this[k]=v;}};const set=new Set();this.classList={add:x=>set.add(x),remove:x=>set.delete(x),contains:x=>set.has(x)};}
 appendChild(x){this.children.push(x);return x;}append(...x){this.children.push(...x);}setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}fire(k){for(const f of this.listeners[k]||[])f({stopPropagation(){}});}
}
const audios=[];class Audio extends Node{
 constructor(){super('audio');this.paused=true;this.duration=12.4;this.currentTime=0;audios.push(this);}
 set src(v){this.attrs.src=v;}get src(){return this.attrs.src;}load(){}pause(){this.paused=true;this.fire('pause');}play(){this.paused=false;this.fire('playing');return Promise.resolve();}
}
const window={},document={createElement:t=>new Node(t),addEventListener(){},getElementById:()=>null};
vm.runInNewContext(fs.readFileSync('static/chat-voice.js','utf8'),{window,document,Audio,console,setTimeout,clearTimeout});
const artifact={id:1,audio_url:'/synthetic.wav',text:'Synthetic text.',meta:{subtitle_zh:['合成译文。']}};
const first=window.sakieChatVoice.make(artifact,{sentenceCount:1}),row=first.children[0],button=row.children[0],textButton=row.children[1],details=first.children[1];
assert.equal(audios[0].preload,'none');assert.equal(textButton.textContent,'文字');assert.equal(details.hidden,true);assert.equal(details.children[1].textContent,'合成译文。');
textButton.onclick({stopPropagation(){}});assert.equal(details.hidden,false);assert.equal(textButton.textContent,'收起');assert.equal(textButton.attrs['aria-expanded'],'true');assert.equal(audios[0].paused,true);
textButton.onclick({stopPropagation(){}});assert.equal(details.hidden,true);assert.equal(textButton.attrs['aria-expanded'],'false');
button.onclick({stopPropagation(){}});assert.equal(audios[0].paused,false);assert.equal(button.attrs['aria-pressed'],'true');
audios[0].fire('loadedmetadata');assert.equal(button.children[1].textContent,'13″');
button.onclick({stopPropagation(){}});assert.equal(audios[0].paused,true);
const second=window.sakieChatVoice.make({...artifact,id:2},{sentenceCount:1});button.onclick({stopPropagation(){}});second.children[0].children[0].onclick({stopPropagation(){}});assert.equal(audios[0].paused,true);assert.equal(audios[1].paused,false);
window.sakieChatVoice.stop();assert.equal(audios[1].paused,true);
const shortVoice=window.sakieChatVoice.make({...artifact,id:40,audio_url:'/synthetic-short.wav',duration:5});
const longVoice=window.sakieChatVoice.make({...artifact,id:41,audio_url:'/synthetic-long.wav',duration:31});
assert.equal(shortVoice.style['--chat-voice-width'],'103px');assert.equal(longVoice.style['--chat-voice-width'],'142px');
const unknown=window.sakieChatVoice.make({...artifact,id:3,meta:{subtitle_zh:['bad','count']}},{sentenceCount:1});assert.equal(unknown.children[1].children.length,1);
const grouped=window.sakieChatVoice.make({...artifact,id:5,meta:{subtitle_zh:['第一段译文。','第二段译文。']}},{sentenceCount:1});assert.equal(grouped.children[1].children.length,2);assert.ok(grouped.children[1].children[1].textContent.includes('第二段译文'));
let resolvePending,rejectPending;const notices=[];const pendingRoot=window.sakieChatVoice.make({...artifact,id:8},{notify:x=>notices.push(x)}),pendingAudio=audios[audios.length-1],pendingButton=pendingRoot.children[0].children[0];pendingAudio.play=function(){this.paused=false;return new Promise((resolve,reject)=>{resolvePending=resolve;rejectPending=reject;});};
pendingButton.onclick({stopPropagation(){}});assert.equal(pendingButton.attrs['aria-busy'],'true');pendingButton.onclick({stopPropagation(){}});assert.equal(pendingButton.attrs['aria-busy'],'false');resolvePending();Promise.resolve().then(()=>{assert.equal(pendingButton.attrs['aria-pressed'],'false');assert.equal(notices.length,0);});
const plain=window.sakieChatVoice.make({...artifact,id:4,text:'<script>synthetic</script>',meta:{}},{sentenceCount:1});assert.equal(plain.children[1].children[0].textContent,'<script>synthetic</script>');
"""
        subprocess.run([shutil.which('node'),'-e',script],check=True)


class VoiceLetterTest(unittest.TestCase):
    def setUp(self):
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
        self.client = app.app.test_client()
        self.client.post("/api/login", json={"password": app.AUTH_PASSWORD})

    def tearDown(self):
        app.DB_PATH, app.DATA_DIR, app.UPLOAD_DIR = self.old_paths["app"]
        chat_engine.DB_PATH, chat_engine.DATA_DIR, chat_engine.UPLOAD_DIR = self.old_paths["chat"]
        tools.DB_PATH = self.old_paths["tools"]
        shutil.rmtree(self.root, ignore_errors=True)

    def seed_config(self):
        with app.app.app_context():
            app.set_setting(app.TTS_SETTINGS_KEY, json.dumps({
                "api_key": "secret", "api_url": "https://api.elevenlabs.io",
                "model": "eleven_v3", "voice_id": "voice-1",
            }))

    def test_tag_parser_keeps_tone_but_drops_stage_directions_from_transcript(self):
        parsed = voice_engine.parse_script("[flustered] 我才没有……[pause] [sighs]只是有一点想你。")
        self.assertEqual(parsed["text"], "我才没有…… 只是有一点想你。")
        self.assertIn("有些慌张", parsed["tones"])
        self.assertIn("轻轻叹了口气", parsed["tones"])
        fallback = voice_engine.history_record("", parsed["text"], parsed["tags"])
        self.assertIn("语气：flustered, sighs", fallback)
        self.assertNotIn("pause", fallback)
        english = "I missed you. — More than I wanted to admit."
        self.assertEqual(len(voice_engine.split_sentences(english)), 2)
        self.assertEqual(voice_engine.clean_subtitles(["我想你了。", "比我愿意承认的还要想。"], english)[0], "我想你了。")
        self.assertEqual(voice_engine.clean_subtitles(["整段译文"], english), ["整段译文"])

    def test_alignment_becomes_sentence_timings_without_stage_tags(self):
        script = "[quietly] I missed you. [pause] Come here."
        alignment = {
            "characters": list(script),
            "character_start_times_seconds": [index * 0.05 for index in range(len(script))],
            "character_end_times_seconds": [(index + 1) * 0.05 for index in range(len(script))],
        }
        timings = voice_engine.sentence_timings_from_alignment(script, alignment)
        self.assertEqual([item["text"] for item in timings], ["I missed you.", "Come here."])
        self.assertEqual(timings[0]["start"], script.index("I") * 0.05)
        self.assertEqual(timings[1]["start"], script.index("C") * 0.05)
        tagless = voice_engine.parse_script(script)["text"]
        tagless_alignment = {
            "characters": list(tagless),
            "character_start_times_seconds": [index * 0.05 for index in range(len(tagless))],
            "character_end_times_seconds": [(index + 1) * 0.05 for index in range(len(tagless))],
        }
        self.assertEqual(
            len(voice_engine.sentence_timings_from_alignment(script, tagless_alignment)), 2
        )

    @mock.patch("app._generate_tts_audio")
    def test_executor_generates_once_and_is_idempotent(self, generate):
        self.seed_config()
        script = "[quietly] I missed you."
        generate.return_value = (b"mp3", "audio/mpeg", 21, {
            "characters": list(script),
            "character_start_times_seconds": [index * 0.05 for index in range(len(script))],
            "character_end_times_seconds": [(index + 1) * 0.05 for index in range(len(script))],
        })
        conn = sqlite3.connect(app.DB_PATH)
        sid = conn.execute("INSERT INTO sessions(title) VALUES ('voice')").lastrowid
        conn.commit();conn.close()
        executor = app._voice_letter_executor(sid, "run-one")
        first = executor(voice_engine.TOOL_NAME, {
            "script": script, "subtitle_zh": ["我想你了。"]
        }, sid)
        second = executor(voice_engine.TOOL_NAME, {"script": script, "subtitle_zh": ["我想你了。"]}, sid)
        conflict = executor(voice_engine.TOOL_NAME, {"script": "换成中文的新稿。", "subtitle_zh": []}, sid)
        self.assertFalse(conflict["ok"])
        self.assertEqual(conflict["error"], "voice script conflict")
        self.assertTrue(first["ok"] and first["hidden"])
        self.assertFalse(first.get("terminal", False))
        self.assertEqual(first["artifact_id"], second["artifact_id"])
        generate.assert_called_once()
        conn = sqlite3.connect(app.DB_PATH)
        meta = json.loads(conn.execute("SELECT meta FROM message_artifacts WHERE id=?", (first["artifact_id"],)).fetchone()[0])
        conn.close()
        self.assertEqual(meta["subtitle_zh"], ["我想你了。"])
        self.assertEqual(meta["sentence_timings"][0]["text"], "I missed you.")
        self.assertEqual(meta["sentence_timings"][0]["start"], script.index("I") * 0.05)
        self.assertTrue(os.path.isfile(os.path.join(app.UPLOAD_DIR, "voice_letters",
                                                    os.listdir(os.path.join(app.UPLOAD_DIR, "voice_letters"))[0])))

    @mock.patch("app._generate_tts_audio")
    def test_ellipsis_and_pauses_accept_natural_paragraph_translation(self, generate):
        self.seed_config()
        with sqlite3.connect(app.DB_PATH) as db:
            sid=db.execute("INSERT INTO sessions(title) VALUES ('synthetic ellipsis')").lastrowid
        script='[softly] Well... I just… wanted to say—hello. [pause] I missed you.'
        translation=['嗯……我只是想跟你打个招呼。我想你了。']
        self.assertGreater(len(voice_engine.split_sentences(voice_engine.parse_script(script)['text'])),1)
        self.assertEqual(voice_engine.validated_subtitles(translation,voice_engine.parse_script(script)['text']),translation)
        for invalid in [[''],[None],['译文'*251],['译文']*81]:
            with self.assertRaises(ValueError):voice_engine.validated_subtitles(invalid,'Synthetic English.')
        generate.return_value=(b'synthetic-audio','audio/mpeg',10,{})
        result=app._voice_letter_executor(sid,'ellipsis-grouped')(voice_engine.TOOL_NAME,{'script':script,'subtitle_zh':translation},sid)
        self.assertTrue(result['ok'])
        self.assertEqual(generate.call_args[0][1],script)
        with sqlite3.connect(app.DB_PATH) as db:
            row=db.execute('SELECT source_payload,meta FROM message_artifacts WHERE id=?',(result['artifact_id'],)).fetchone()
        self.assertEqual(json.loads(row[0])['script'],script)
        self.assertEqual(json.loads(row[1])['subtitle_zh'],translation)

    @mock.patch("app._generate_tts_audio")
    def test_foreign_voice_without_translation_is_rejected_before_spending(self, generate):
        self.seed_config()
        with sqlite3.connect(app.DB_PATH) as db:
            sid=db.execute("INSERT INTO sessions(title) VALUES ('synthetic')").lastrowid
        executor=app._voice_letter_executor(sid,'subtitle-validation')
        for args in [{'script':'Synthetic English.','subtitle_zh':[]}, {'script':'Synthetic English.','subtitle_zh':['English again.']}, {'script':'Synthetic English.','subtitle_zh':['中文。','']}]:
            outcome=executor(voice_engine.TOOL_NAME,args,sid)
            self.assertFalse(outcome['ok'])
            self.assertEqual(outcome['error'],'invalid voice subtitles')
        generate.assert_not_called()
        with sqlite3.connect(app.DB_PATH) as db:self.assertEqual(db.execute('SELECT count(*) FROM message_artifacts').fetchone()[0],0)

    @mock.patch("app._generate_tts_audio")
    def test_failed_voice_retry_updates_script_and_display_together(self, generate):
        self.seed_config()
        with sqlite3.connect(app.DB_PATH) as db:
            sid=db.execute("INSERT INTO sessions(title) VALUES ('synthetic retry')").lastrowid
        executor=app._voice_letter_executor(sid,'changed-retry')
        generate.side_effect=[RuntimeError('synthetic provider failure'),(b'synthetic-audio','audio/mpeg',5,{})]
        failed=executor(voice_engine.TOOL_NAME,{'script':'Synthetic English.','subtitle_zh':['合成英文。']},sid)
        self.assertFalse(failed['ok'])
        done=executor(voice_engine.TOOL_NAME,{'script':'[softly] 这是一段合成中文。','subtitle_zh':[]},sid)
        self.assertTrue(done['ok'])
        with sqlite3.connect(app.DB_PATH) as db:
            row=db.execute('SELECT visible_text,source_payload,meta,status FROM message_artifacts').fetchone()
            self.assertEqual(db.execute('SELECT count(*) FROM message_artifacts').fetchone()[0],1)
        self.assertEqual(row[0],'这是一段合成中文。')
        self.assertEqual(json.loads(row[1])['script'],'[softly] 这是一段合成中文。')
        self.assertEqual(json.loads(row[2])['subtitle_zh'],[])
        self.assertEqual(row[3],'ready')
        self.assertEqual(generate.call_args[0][1],'[softly] 这是一段合成中文。')

    def test_history_uses_original_script_inside_an_explicit_voice_boundary(self):
        conn = sqlite3.connect(app.DB_PATH)
        sid = conn.execute("INSERT INTO sessions(title) VALUES ('voice history')").lastrowid
        normal_text = "先闭一下眼睛。然后去听听。"
        offset = len("先闭一下眼睛。")
        versions = [{"c": normal_text, "tool_run_id": "run-v"}]
        mid = conn.execute(
            "INSERT INTO messages(session_id,role,content,versions) VALUES (?,'assistant',?,?)",
            (sid, normal_text, json.dumps(versions, ensure_ascii=False)),
        ).lastrowid
        conn.execute(
            "INSERT INTO message_artifacts(type,session_id,message_id,version_run_id,run_id,status,visible_text,source_payload,meta) "
            "VALUES ('voice_letter',?,?,?,'artifact-v','ready',?,?,?)",
            (sid, mid, "run-v", "我才没有……只是想你。",
             json.dumps({"script": "[flustered] 我才没有……[pause]只是想你。"}, ensure_ascii=False),
             json.dumps({"tones": ["有些慌张"], "text_offset": offset}, ensure_ascii=False)),
        )
        conn.commit();conn.close()
        history = json.dumps(chat_engine.get_history(sid), ensure_ascii=False)
        record = "【声音信 · 内容：[flustered] 我才没有……[pause]只是想你。】"
        self.assertIn(record, history)
        self.assertLess(history.index("先闭一下眼睛。"), history.index(record))
        self.assertLess(history.index(record), history.index("然后去听听。"))
        self.assertNotIn("source_payload", history)

    def test_editing_voice_reply_uses_placeholder_and_keeps_recap_at_new_position(self):
        conn = sqlite3.connect(app.DB_PATH)
        sid = conn.execute("INSERT INTO sessions(title) VALUES ('edit voice')").lastrowid
        versions = [{
            "c": "旧的前文。旧的后文。", "r": "", "model": "assistant",
            "tool_run_id": "run-voice", "artifact_ids": [1],
        }]
        mid = conn.execute(
            "INSERT INTO messages(session_id,role,content,versions,active) VALUES (?,'assistant',?,?,0)",
            (sid, versions[0]["c"], json.dumps(versions, ensure_ascii=False)),
        ).lastrowid
        artifact_id = conn.execute(
            "INSERT INTO message_artifacts(type,session_id,message_id,version_run_id,run_id,status,visible_text,source_payload,meta) "
            "VALUES ('voice_letter',?,?,?,'run-voice','ready','I am here.','{}',?)",
            (sid, mid, "run-voice", json.dumps({"tones": ["声音很轻"], "text_offset": 5}, ensure_ascii=False)),
        ).lastrowid
        versions[0]["artifact_ids"] = [artifact_id]
        conn.execute("UPDATE messages SET versions=? WHERE id=?", (json.dumps(versions, ensure_ascii=False), mid))
        conn.commit();conn.close()

        response = self.client.post(
            f"/api/chat/message/{mid}/version",
            json={"content": "新的前文。[[声音信]]新的后文。", "source_index": 0},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["content"], "新的前文。新的后文。")
        self.assertEqual(payload["artifact_ids"], [artifact_id])
        conn = sqlite3.connect(app.DB_PATH)
        saved = json.loads(conn.execute("SELECT versions FROM messages WHERE id=?", (mid,)).fetchone()[0])
        conn.close()
        edited = saved[-1]
        self.assertEqual(edited["tool_run_id"], "run-voice")
        self.assertEqual(edited["artifact_offsets"][str(artifact_id)], len("新的前文。"))
        history = json.dumps(chat_engine.get_history(sid), ensure_ascii=False)
        record = "【声音信 · 内容：I am here.】"
        self.assertLess(history.index("新的前文。"), history.index(record))
        self.assertLess(history.index(record), history.index("新的后文。"))
        self.assertNotIn("[[声音信]]", history)

    def test_capability_is_off_by_default_and_has_round_toggle(self):
        data = self.client.get("/api/chat/tool-visibility").get_json()
        self.assertFalse(data["voice_letter"]["visible"])
        saved = self.client.put("/api/chat/tool-visibility", json={"capability": "voice_letter", "visible": True})
        self.assertTrue(saved.get_json()["visible"])
        response = self.client.get("/")
        page = response.get_data(as_text=True)
        response.close()
        for marker in ("声音信", 'id="voiceViewer"', 'id="tidyArtifactList"', "/api/artifacts",
                       "openVoiceEnvelope", "voice-detail-next", "voice-stack-stage", "defaultVoiceDrawerGroupKey",
                       "voice-stack-shell-back", "voice-stack-shell-front", "renderVoiceDrawerBox", "voiceEnvelopeLift",
                       'd="M316 190 344 174v104q0 6-8 8l-28 16q8-5 8-16Z"', 'const drawerMode=tidyMode===',
                       'finished.propertyName!=="transform"', "voice-curtain", "voiceEnvelopeOpening", "autoplay:false",
                       "attachVoiceLetterActions", "downloadVoiceArtifact", "voice-favorite-clip"):
            self.assertIn(marker, page)

    def test_voice_letter_favorite_is_persistent_and_returned_with_artifact(self):
        conn = sqlite3.connect(app.DB_PATH)
        sid = conn.execute("INSERT INTO sessions(title) VALUES ('favorite voice')").lastrowid
        artifact_id = conn.execute(
            "INSERT INTO message_artifacts(type,session_id,run_id,status,visible_text,file_path,mime) "
            "VALUES ('voice_letter',?,'favorite-run','ready','hello','voice_letters/test.mp3','audio/mpeg')",
            (sid,),
        ).lastrowid
        conn.commit();conn.close()

        saved = self.client.put(
            f"/api/artifacts/{artifact_id}/favorite", json={"favorite": True}
        )
        self.assertEqual(saved.status_code, 200)
        self.assertTrue(saved.get_json()["favorite"])
        listed = self.client.get("/api/artifacts").get_json()
        self.assertTrue(next(item for item in listed if item["id"] == artifact_id)["favorite"])
        conn = sqlite3.connect(app.DB_PATH)
        self.assertEqual(conn.execute(
            "SELECT favorite FROM message_artifacts WHERE id=?", (artifact_id,)
        ).fetchone()[0], 1)
        conn.close()

    @mock.patch("app._generate_tts_audio", return_value=(b"mp3", "audio/mpeg", 12, {}))
    @mock.patch("app.chat_engine.stream_chat")
    def test_chat_stream_persists_voice_without_tool_ledger(self, stream_chat, _generate):
        self.seed_config()
        with app.app.app_context():
            app.set_setting("chat_voice_letter_capability", "1")
        conn = sqlite3.connect(app.DB_PATH)
        sid = conn.execute("INSERT INTO sessions(title) VALUES ('stream voice')").lastrowid
        conn.execute("INSERT INTO messages(session_id,role,content) VALUES (?,'user','说给我听')", (sid,))
        conn.commit();conn.close()

        def fake_stream(*_args, **kwargs):
            definition = kwargs["extra_tools"][0]["function"]
            self.assertEqual(definition["name"], voice_engine.TOOL_NAME)
            self.assertEqual(kwargs["extra_narrations"][voice_engine.TOOL_NAME], "正在录一封给你")
            self.assertIn("【声音信 · …】", kwargs["stable_extra"])
            self.assertNotIn("【表情：…】", kwargs["stable_extra"])
            self.assertNotIn("[[表情:表情名]]", kwargs["stable_extra"])
            self.assertIn("右括号就是声音结束的位置", kwargs["stable_extra"])
            self.assertIn("必须调用 send_voice_letter", kwargs["stable_extra"])
            yield "delta", "我要开始发语音了。"
            outcome = kwargs["extra_executor"](
                voice_engine.TOOL_NAME, {"script": "[quietly] 我在呢。"}, sid
            )
            yield "tool_start", {"tool": voice_engine.TOOL_NAME, "narrate": "正在写信"}
            yield "tool_result", {
                "tool": voice_engine.TOOL_NAME, "display_tool": voice_engine.TOOL_NAME,
                "narrate": "正在写信", "args": {"script": "[quietly] 我在呢。"},
                "result": outcome["content"], **outcome,
            }
            yield "delta", "你去听听。"
        stream_chat.side_effect = fake_stream
        events = "".join(app._stream_reply_impl(sid))
        self.assertIn('"type": "done"', events)
        self.assertIn('"artifacts": [{', events)
        conn = sqlite3.connect(app.DB_PATH)
        self.assertEqual(conn.execute("SELECT count(*) FROM tool_calls").fetchone()[0], 1)
        receipt = conn.execute("SELECT tool,source,args,result,message_id FROM tool_calls").fetchone()
        self.assertEqual(receipt[:4], ("_chat_action_receipt", "receipt", "{}", ""))
        self.assertEqual(receipt[4], conn.execute("SELECT id FROM messages WHERE role='assistant'").fetchone()[0])
        versions = json.loads(conn.execute("SELECT versions FROM messages WHERE role='assistant'").fetchone()[0])
        self.assertEqual(versions[-1]["tool_log"], [])
        message = conn.execute("SELECT content FROM messages WHERE role='assistant'").fetchone()
        artifact = conn.execute("SELECT message_id,status,meta FROM message_artifacts").fetchone()
        conn.close()
        self.assertEqual(message[0], "我要开始发语音了。你去听听。")
        self.assertEqual(artifact[1], "ready")
        self.assertEqual(json.loads(artifact[2])["text_offset"], len("我要开始发语音了。"))

        # A failed hidden action and model error must both survive without a fake reply.
        conn = sqlite3.connect(app.DB_PATH)
        failed_sid = conn.execute("INSERT INTO sessions(title) VALUES ('synthetic failure')").lastrowid
        uid = conn.execute("INSERT INTO messages(session_id,role,content) VALUES (?,'user','synthetic')", (failed_sid,)).lastrowid
        conn.commit();conn.close()
        def failed_stream(*_args, **_kwargs):
            yield "tool_result", {"hidden": True, "ok": False, "tool": voice_engine.TOOL_NAME,
                                  "narrate": "语音调用", "error": "private synthetic provider detail"}
            yield "error", {"message": "timeout", "status": 504}
        stream_chat.side_effect = failed_stream
        list(app._stream_reply_impl(failed_sid, user_msg_id=uid))
        conn = sqlite3.connect(app.DB_PATH)
        rows = conn.execute("SELECT tool,message_id,error FROM tool_calls WHERE session_id=? ORDER BY id", (failed_sid,)).fetchall()
        self.assertEqual([row[0] for row in rows], ["_chat_action_receipt", "_chat_error_receipt"])
        self.assertTrue(all(row[1] == uid for row in rows))
        self.assertNotIn("private synthetic", str(rows))
        self.assertEqual(conn.execute("SELECT count(*) FROM messages WHERE session_id=? AND role='assistant'", (failed_sid,)).fetchone()[0], 0)
        conn.close()


if __name__ == "__main__":
    unittest.main()
