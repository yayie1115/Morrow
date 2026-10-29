import json
import shutil
import subprocess
import unittest
from pathlib import Path


class ChatStabilityTest(unittest.TestCase):
    def test_stream_respects_reader_position_and_coalesces_updates(self):
        if not shutil.which("node"):
            self.skipTest("Node.js unavailable")
        page = Path("static/index.html").read_text(encoding="utf-8")
        start = page.index("let _bodyRAF=0")
        end = page.index("const PHOTO_CARD_W", start)
        code = page[start:end]
        harness = r"""
const assert=require('node:assert/strict');
let pending=[],renders=0,follows=0;
const log={scrollHeight:1000,scrollTop:100,clientHeight:300};
const $=()=>log;
const setTimeout=(callback)=>{pending.push(callback);return pending.length;};
const setAIBody=()=>renders++;
const scrollDown=()=>follows++;
"""
        checks = r"""
const wrap={isConnected:true};
scheduleAIBody(wrap);scheduleAIBody(wrap);
assert.equal(pending.length,1);pending.shift()();
assert.equal(renders,1);assert.equal(follows,0);
log.scrollTop=700;scheduleAIBody(wrap);pending.shift()();
assert.equal(follows,1);
scheduleAIBody({isConnected:false});pending.shift()();
assert.equal(renders,2);
"""
        subprocess.run(["node", "-e", harness + code + checks], check=True)

    def test_typing_and_reply_completion_do_not_force_focus_or_scroll(self):
        page=Path("static/index.html").read_text(encoding="utf-8")
        focus=page.split('input.addEventListener("focus",',1)[1].split('input.addEventListener("blur",',1)[0]
        self.assertNotIn("scrollDown",focus)
        send=page.split("async function send(){",1)[1].split("async function regenerate",1)[0]
        self.assertNotIn("input.focus()",send)
        self.assertIn('const visibleMessages=scrollToId?msgs:msgs.slice(-CHAT_RENDER_PAGE)',page)
        self.assertIn('log.scrollTop+=anchor.getBoundingClientRect().top-top',page)
