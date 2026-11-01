/* Hold-to-talk. Only an explicitly released recording is eligible for auto-send. */
(()=>{
 function init({api,session,ensureSession,busy,send,notify,avatar,scroll,menu,confirm,reconcile}){
  const input=document.getElementById('input'),entry=document.getElementById('btnVoiceInput'),toggle=document.getElementById('voiceModeBtn'),hold=document.getElementById('voiceHoldBtn'),log=document.getElementById('log');
  const notice=document.createElement('div');notice.className='voice-recording-notice';notice.hidden=true;notice.setAttribute('role','status');document.body.appendChild(notice);
  const micIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>';toggle.innerHTML=micIcon;
  let mode=false,capture=null,serial=0,pumping=false,restoring=false;
  const tasks=new Map(),KEY='sakieVoiceAutoQueueV2';let stored=[];
  try{stored=JSON.parse(sessionStorage.getItem(KEY)||'[]');if(!Array.isArray(stored))stored=[];}catch{}
  function persist(){try{sessionStorage.setItem(KEY,JSON.stringify([...tasks.values()].map(t=>({requestId:t.requestId,owner:t.owner,jobId:t.job?.id||null,auto:t.auto,at:t.at}))));}catch{}}
  function active(t){return Number(session())===Number(t.owner)&&document.body.classList.contains('in-chat');}
  function stopTracks(c){c.stream?.getTracks().forEach(t=>t.stop());clearInterval(c.timer);}
  function finish(cancel=false){const c=capture;if(!c)return;c.held=false;c.cancelled=cancel||c.cancelled;notice.hidden=true;hold.classList.remove('recording','cancel-recording');hold.textContent='按住说话';if(c.recorder?.state==='recording')c.recorder.stop();else{stopTracks(c);capture=null;}}
  function setMode(value){if(capture)finish(true);mode=value;document.body.classList.toggle('voice-input-mode',mode);hold.hidden=!mode;input.hidden=mode;toggle.setAttribute('aria-label',mode?'切换文字输入':'切换语音输入');toggle.setAttribute('aria-pressed',String(mode));toggle.innerHTML=mode?'⌨':micIcon;if(mode)input.blur();else{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,140)+'px';input.focus();}}
  if(entry)entry.onclick=()=>{document.getElementById('plusPop').hidden=true;setMode(true);void restore();};toggle.onclick=()=>{setMode(!mode);if(mode)void restore();};
  for(const type of ['contextmenu','selectstart'])hold.addEventListener(type,e=>e.preventDefault());
  hold.addEventListener('pointerdown',async event=>{
   if(event.button!==0&&event.pointerType==='mouse')return;event.preventDefault();if(capture||busy()){if(busy())notify('请等当前回复结束');return;}
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){notify('当前浏览器不支持录音，请使用新版 Safari');return;}
   for(const t of tasks.values())if(Number(t.owner)===Number(session())&&(t.error||t.confirm))t.auto=false;persist();
   const c={id:++serial,pointer:event.pointerId,startY:event.clientY,held:true,cancelled:false,stream:null,recorder:null,owner:session(),chunks:[]};capture=c;
   try{hold.setPointerCapture?.(event.pointerId);}catch{}
   notice.hidden=false;notice.textContent='正在打开麦克风…';hold.classList.add('recording');
   try{
    c.stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(capture!==c||!c.held||c.cancelled){stopTracks(c);return;}
    if(c.owner&&Number(session())!==Number(c.owner)){c.cancelled=true;stopTracks(c);finish(true);return;}if(!session())await ensureSession();c.owner=session();
    if(capture!==c||!c.held||c.cancelled||!c.owner){stopTracks(c);return;}
    const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));
    c.recorder=mime?new MediaRecorder(c.stream,{mimeType:mime}):new MediaRecorder(c.stream);c.started=Date.now();
    c.recorder.ondataavailable=e=>{if(e.data.size)c.chunks.push(e.data);};
    c.recorder.onerror=()=>{c.cancelled=true;finish(true);notify('录音中断，请重新录制');};
    c.recorder.onstop=()=>{
     stopTracks(c);if(capture===c)capture=null;
     if(c.cancelled||Number(session())!==Number(c.owner))return;
     const blob=new Blob(c.chunks,{type:c.recorder.mimeType});if(blob.size===0){notify('没有录到声音，请重新按住说话');return;}
     const t={requestId:crypto.randomUUID(),owner:c.owner,at:Date.now(),auto:true,blob,url:URL.createObjectURL(blob),job:null,label:'正在上传录音…',duration:(Date.now()-c.started)/1000};tasks.set(t.requestId,t);persist();render(t);scroll?.();void upload(t);
    };
    c.recorder.start(250);
    c.timer=setInterval(()=>{if(capture!==c)return;const seconds=Math.floor((Date.now()-c.started)/1000);notice.textContent=(c.cancelled?'松开取消':'松开发送 · 上滑取消')+' · '+seconds+'秒';if(seconds>=299)finish(false);},150);hold.textContent='松开发送';notice.textContent='松开发送 · 上滑取消';
   }catch{stopTracks(c);if(capture===c){capture=null;notice.hidden=true;hold.classList.remove('recording');hold.textContent='按住说话';notify('无法使用麦克风，请检查 Safari 麦克风权限');}}
  });
  window.addEventListener('pointermove',event=>{const c=capture;if(!c||event.pointerId!==c.pointer)return;c.cancelled=c.startY-event.clientY>65;hold.classList.toggle('cancel-recording',c.cancelled);hold.textContent=c.cancelled?'松开取消':'松开发送';},{passive:true});
  window.addEventListener('pointerup',event=>{if(capture?.pointer===event.pointerId)finish(false);});
  window.addEventListener('pointercancel',event=>{if(capture?.pointer===event.pointerId)finish(true);});
  function forget(t){tasks.delete(t.requestId);t.el?.remove();if(t.blob&&t.url)URL.revokeObjectURL(t.url);persist();}
  function render(t){
   if(t.cancelled||!tasks.has(t.requestId)||!active(t))return;const signature=JSON.stringify([t.label,t.error,t.confirm,t.reviewing,t.cancelling,t.job?.audio_url||t.url,t.job?.text,t.job?.duration]);if(t.el?.isConnected&&t.signature===signature)return;t.signature=signature;t.el?.remove();const root=document.createElement('div');root.className='msg row-user voice-pending';root.dataset.voiceRequest=t.requestId;
   const col=document.createElement('div');col.className='u-col';const media=document.createElement('div');media.className='user-media';
   const voice=window.sakieChatVoice.make({id:'pending-'+t.requestId,audio_url:t.job?.audio_url||t.url,text:t.job?.text||'录音尚在处理，未发送给助手。',duration:t.job?.duration||t.duration,meta:{}},{notify,actions:()=>menu([{label:'核对发送状态',svg:'',fn:()=>inspect(t)},{label:'移除待发送录音',svg:'',danger:true,fn:()=>cancelTask(t)}])});media.appendChild(voice);avatar?.(media);
   const status=document.createElement('div');status.className='voice-pending-status';status.setAttribute('role','status');status.textContent=t.cancelling?'正在核对并移除…':t.error?'未发送 · 处理失败':t.confirm?'请核对转写':t.label==='正在发送…'?'正在确认发送…':'正在处理录音…';
   col.append(media,status);
   if(t.error){const details=document.createElement('details');details.className='voice-pending-details';const summary=document.createElement('summary');summary.textContent='查看原因';const reason=document.createElement('p');reason.textContent=t.label||'处理未完成';details.append(summary,reason);col.appendChild(details);}

   if(t.error||t.confirm){const actions=document.createElement('div');actions.className='voice-pending-actions';const retry=document.createElement('button');retry.type='button';retry.textContent=t.confirm?(t.reviewing?'确认并发送':'核对转写'):'重试';if(t.reviewing){const details=voice.querySelector('.chat-voice-transcript');if(details)details.hidden=false;}retry.onclick=()=>{if(t.confirm){if(!t.reviewing){t.reviewing=true;render(t);return;}t.confirm=false;t.auto=true;t.label='等待发送…';persist();render(t);void pump();}else void retryTask(t);};actions.appendChild(retry);const again=document.createElement('button');again.type='button';again.textContent='重新录制';again.onclick=()=>{t.auto=false;t.label='未发送 · 原录音已保留';persist();render(t);setMode(true);notify('请按住说话，录制新的一条');void pump();};actions.appendChild(again);const remove=document.createElement('button');remove.type='button';remove.textContent='移除';remove.disabled=!!t.cancelling;remove.onclick=()=>cancelTask(t);actions.appendChild(remove);col.appendChild(actions);}
   root.appendChild(col);t.el=root;
   if(log.querySelector('.placeholder-note'))log.replaceChildren();log.appendChild(root);
  }
  async function upload(t){
   if(t.working)return;t.working=true;t.error=false;t.label='正在上传录音…';render(t);
   try{
    const ext=t.blob.type.includes('mp4')?'m4a':t.blob.type.includes('ogg')?'ogg':'webm',form=new FormData();form.append('audio',t.blob,'recording.'+ext);form.append('session_id',t.owner);form.append('request_id',t.requestId);
    const r=await fetch('/api/chat/voice-input',{method:'POST',body:form}),value=await r.json();if(!r.ok)throw Error();t.job=value;persist();if(t.cancelled){forget(t);return;}apply(t,value);
   }catch{t.error=true;t.label='上传未确认，录音保留在当前页面，点重试会先核对保存状态。';render(t);}
   finally{t.working=false;}
   if(t.job&&!t.error)void watch(t);
  }
  function apply(t,value,allowSend=true){
   t.job=value;if(value.message_id||value.status==='cancelled'||t.cancelled){forget(t);return;}
   if(value.status==='failed'){t.error=true;t.label=value.error||'识别失败，录音已保留，可重试或重新录制。';}
   else if(value.status==='ready'){t.error=false;t.confirm=!t.auto||!!value.transcript_uncertain;t.label=t.confirm?'请先展开文字核对，再发送。':'识别完成，等待发送…';}
   else{t.error=false;t.label='正在识别语音和生成声学图…';}
   persist();render(t);if(allowSend&&value.status==='ready'&&!t.confirm&&!t.cancelling)void pump();
  }
  async function watch(t){
   if(t.watching)return;t.watching=true;
   try{
    while(tasks.has(t.requestId)&&t.job&&!t.error&&['queued','analyzing'].includes(t.job.status)){
     await new Promise(r=>setTimeout(r,1500));if(!tasks.has(t.requestId))break;
     if(document.hidden){await new Promise(r=>setTimeout(r,2000));continue;}
     const r=await api('/api/chat/voice-input/'+t.job.id+'?session_id='+t.owner);if(!r.ok)throw Error();apply(t,await r.json());
    }
   }catch{t.error=true;t.label='读取状态失败，录音已保留，点重试继续。';render(t);}
   finally{t.watching=false;}
  }
  async function inspect(t){
   if(!t.job){notify('上传结果尚未确认；可以重试核对，或移除待发录音。');return;}
   try{const r=await api('/api/chat/voice-input/'+t.job.id+'?session_id='+t.owner);if(!r.ok)throw Error();const value=await r.json();apply(t,value,false);if(value.message_id){await reconcile(t.owner);notify('语音已经保存，已恢复正式消息。');}else if(value.status==='cancelled')notify('待发送录音已移除');else notify('已核对：这条录音尚未发送给助手。');}
   catch{notify('暂时无法确认保存状态，请勿重复发送。');}
  }
  async function cancelTask(t){
   if(t.cancelling)return;
   if(!await confirm('只移除未发送的录音。若服务器已保存为消息，将先恢复正式记录，不在这里删除。'))return;
   t.cancelling=true;t.auto=false;persist();render(t);
   try{const r=await api('/api/chat/voice-input/cancel',{method:'POST',body:JSON.stringify({session_id:t.owner,request_id:t.requestId})});const value=await r.json();
    if(r.status===409&&value.message_id){t.cancelled=true;forget(t);await reconcile(t.owner);notify('语音已经保存，请从正式语音的 ⋯ 菜单删除。');return;}
    if(!r.ok||!value.cancelled)throw Error();t.cancelled=true;forget(t);notify('待发送录音已移除');void pump();
   }catch{t.cancelling=false;t.error=true;t.label='移除结果尚未确认，请核对状态或重试。';render(t);}
  }
  async function retryTask(t){
   if(t.working)return;
   if(!t.job){void upload(t);return;}
   t.working=true;t.error=false;
   try{
    const r=await api('/api/chat/voice-input/'+t.job.id+'?session_id='+t.owner);if(!r.ok)throw Error();const value=await r.json();apply(t,value);
    if(value.message_id)return;
    if(value.status!=='ready'){const response=await api('/api/chat/voice-input/'+t.job.id+'/retry',{method:'POST',body:JSON.stringify({session_id:t.owner})});if(!response.ok)throw Error();t.job.status='queued';t.error=false;t.label='正在恢复分析…';render(t);void watch(t);}else void pump();
   }catch{t.error=true;t.label='恢复未完成，录音仍保留，请稍后重试。';render(t);}
   finally{t.working=false;}
  }
  async function pump(){
   if(pumping||busy()||document.hidden)return;
   const t=[...tasks.values()].filter(t=>t.auto&&active(t)).sort((a,b)=>a.at-b.at)[0];
   if(!t||t.error||t.confirm||t.cancelling||!t.auto||t.job?.status!=='ready')return;
   pumping=true;t.label='正在发送…';render(t);
   try{const result=await send(t.job,t.owner,{pendingEl:t.el});if(result?.saved)forget(t);else{t.error=true;t.label='尚未发送，请重试；不会重复保存。';render(t);}}
   catch{t.error=true;t.label='发送保存状态未确认，点重试会先核对，避免重复。';render(t);}
   finally{pumping=false;if(tasks.has(t.requestId)&&active(t))render(t);else void pump();}
  }
  async function restore(){
   if(restoring||!session()||!document.body.classList.contains('in-chat'))return;
   restoring=true;const owner=Number(session());
   try{
    const r=await api('/api/chat/voice-input?session_id='+owner);if(!r.ok)return;const result=await r.json();if(Number(session())!==owner)return;
    for(const value of result.items||[]){
     let t=[...tasks.values()].find(x=>x.job?.id===value.id||x.requestId===value.request_id);const previous=stored.find(x=>x.jobId===value.id||x.requestId===value.request_id);
     if(!t){t={requestId:value.request_id||'restored-'+value.id,owner,at:previous?.at||Date.now(),auto:!!previous?.auto,job:value,url:value.audio_url};tasks.set(t.requestId,t);}
     apply(t,value);if(!t.error&&value.status!=='ready')void watch(t);
    }
    for(const t of [...tasks.values()])if(Number(t.owner)===owner){
     if(t.job&&!(result.items||[]).some(x=>x.id===t.job.id)){const response=await api('/api/chat/voice-input/'+t.job.id+'?session_id='+owner);if(response.ok)apply(t,await response.json());}
     if(tasks.has(t.requestId))render(t);
    }
    stored=[];persist();void pump();
   }catch{/* Chat remains usable; existing task controls retain their own errors. */}
   finally{restoring=false;}
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden){finish(true);for(const t of tasks.values())if(t.el)t.el.querySelectorAll('audio').forEach(a=>a.pause());}else{void restore();void pump();}});
  window.addEventListener('pagehide',()=>finish(true));
  window.sakieVoiceInput.restore=restore;window.sakieVoiceInput.resume=()=>{void pump();};window.sakieVoiceInput.leave=()=>finish(true);
 }
 window.sakieVoiceInput={init};
})();
