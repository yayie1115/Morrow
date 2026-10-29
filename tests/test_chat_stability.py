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

    def test_mobile_editors_prevent_focus_zoom_and_use_fixed_viewport(self):
        page=Path("static/index.html").read_text(encoding="utf-8")
        self.assertIn('textarea,select,[contenteditable="true"]{font-size:max(16px,1em)!important;}',page)
        self.assertIn('font-size:max(16px,var(--chat-fs,16px))!important;',page)
        viewport=page.split('name="viewport"',1)[1].split('>',1)[0]
        self.assertIn("minimum-scale=1",viewport)
        self.assertIn("maximum-scale=1",viewport)
        self.assertIn("user-scalable=no",viewport)

    def test_initial_chat_warmup_deduplicates_requests(self):
        if not shutil.which("node"):
            self.skipTest("Node.js unavailable")
        page=Path("static/index.html").read_text(encoding="utf-8")
        code=page.split("let initialSessionList=null",1)[1].split("const EMPTY_LINES",1)[0]
        code="let initialSessionList=null"+code
        harness=r"""
const assert=require('node:assert/strict');
let sessionId=null,loads=0,calls=[];const CHAT_RENDER_PAGE=80;
const title={};const $=()=>title;
const api=async(path)=>{calls.push(path);return {ok:true,json:async()=>[{id:7,title:'Synthetic'}]};};
const loadMessages=async()=>{loads++;};const showEmpty=()=>{};
"""
        checks=r"""
(async()=>{
 warmInitialChat();warmInitialChat();
 await Promise.all([ensureSession(),ensureSession()]);
 assert.equal(calls.filter(p=>p==='/api/chat/sessions').length,1);
 assert.equal(calls.filter(p=>p.includes('/messages/7')).length,1);
 assert.equal(calls.filter(p=>p.includes('/window/7')).length,1);
 assert.equal(loads,1);assert.equal(sessionId,7);
})().catch(e=>{console.error(e);process.exitCode=1;});
"""
        subprocess.run(["node","-e",harness+code+checks],check=True)

    def test_home_data_does_not_block_app_reveal(self):
        page=Path("static/index.html").read_text(encoding="utf-8")
        enter=page.split("async function enterApp(",1)[1].split("async function checkAuth",1)[0]
        self.assertNotIn("settleCore(homeReady)",enter)
        self.assertIn("warmInitialChat()",enter)

    def test_stream_failure_preserves_received_text_without_faking_saved_version(self):
        if not shutil.which("node"):
            self.skipTest("Node.js unavailable")
        page=Path("static/index.html").read_text(encoding="utf-8")
        code="const rollbackFailedAI=()=>{"+page.split("const rollbackFailedAI=()=>{",1)[1].split('  const rb=aiEl.querySelector',1)[0]
        harness=r"""
const assert=require('node:assert/strict');let failed=true,savedState=null,opts={},removed=false,extra=[];
const make=(text)=>({_versions:[text],_reasonings:[''],_vi:0,appendChild(n){this.warning=n.textContent;},remove(){removed=true;}});
let aiEl=make('Received partial text');const document={createElement:()=>({append(...children){this.textContent=children.map(n=>n.textContent).join(" ");}})};
const setAIBody=()=>{},renderReasoning=()=>{},renderAIActions=()=>{},isLastAI=()=>true;
const addAI=(text)=>{const w=make(text);extra.push(w);return w;};
"""
        checks=r"""
rollbackFailedAI();assert.equal(removed,false);assert.equal(aiEl._versions[0],'Received partial text');
assert.equal(aiEl._deliveryUnconfirmed,true);assert.match(aiEl.warning,/未收到保存确认/);
savedState={versions:['Saved original'],reasonings:[''],models:[''],ats:[''],thinkTimes:[null],attachmentVersions:[[]],artifactVersions:[[]],vi:0};
aiEl=make('Failed regenerated text');rollbackFailedAI();
assert.deepEqual(aiEl._versions,['Saved original']);assert.equal(extra[0]._versions[0],'Failed regenerated text');
assert.equal(extra[0]._deliveryUnconfirmed,true);
"""
        subprocess.run(["node","-e",harness+code+checks],check=True)

    def test_chat_receipts_are_collapsed_and_loaded_only_on_open(self):
        page=Path("static/index.html").read_text(encoding="utf-8")
        ensure=page.split("function ensureChatReceipt(",1)[1].split("function addChatErrorReceipt",1)[0]
        self.assertIn('document.createElement("details")',ensure)
        self.assertNotIn(".open=true",ensure)
        self.assertIn('if(details.open&&!details._loaded&&wrap._id)',ensure)
        render=page.split("function renderChatReceiptItems(",1)[1].split("async function loadChatReceipt",1)[0]
        self.assertNotIn("innerHTML",render)
        self.assertIn("textContent",render)
