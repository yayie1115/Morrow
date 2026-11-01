/* User voice capture: HTTP task IDs, explicit send, no model/tool polling. */
(()=>{
 function init({api,session,ensureSession,busy,send,notify}){
  const entry=document.getElementById('btnVoiceInput');let stream=null,recorder=null,chunks=[],blob=null,objectURL='',job=null,requestId='',timer=null,started=0,owner=null,polling=false,closed=true,permissionPending=false;
  const dialog=document.createElement('dialog');dialog.className='user-voice-dialog';
  dialog.innerHTML='<h3>发语音</h3><p class="voice-input-status">录音会交给电脑转写并分析语调，保留声学图。</p><audio controls hidden></audio><div class="voice-input-preview" hidden></div><div class="voice-input-actions"><button type="button" data-action="record">开始录音</button><button type="button" data-action="analyze" disabled>分析录音</button><button type="button" data-action="send" disabled>发送</button><button type="button" data-action="close">取消</button></div>';
  document.body.appendChild(dialog);const status=dialog.querySelector('p'),preview=dialog.querySelector('.voice-input-preview'),audio=dialog.querySelector('audio');const button=name=>dialog.querySelector('[data-action="'+name+'"]');
  function releaseMic(){stream?.getTracks().forEach(t=>t.stop());stream=null;clearInterval(timer);timer=null;}
  function setStatus(text){status.textContent=text;}
  function apply(value){job=value;button('send').disabled=value.status!=='ready';button('analyze').disabled=value.status==='ready';button('analyze').textContent=value.status==='failed'?'重试分析':value.status==='ready'?'分析录音':'恢复分析';
   if(audio.getAttribute('src')!==value.audio_url)audio.src=value.audio_url;audio.hidden=false;
   preview.hidden=value.status!=='ready';preview.textContent=value.text||'';
   setStatus(value.status==='ready'?'分析完成，发送后助手才会回复。':value.status==='failed'?value.error:value.message_id?'这条语音已经发送。':'正在电脑上分析，请稍候…');
  }
  async function poll(){if(polling)return;polling=true;try{while(job&&!closed&&['queued','analyzing'].includes(job.status)){
   await new Promise(r=>setTimeout(r,1500));if(closed)break;const expected=job.id,scoped=owner;const r=await api('/api/chat/voice-input/'+expected+'?session_id='+scoped);if(!r.ok)throw Error();const value=await r.json();if(closed||job?.id!==expected||owner!==scoped)continue;apply(value);
  }}catch{setStatus('读取分析状态失败，录音已保留。可点恢复分析或关闭后重新进入查看。');button('analyze').disabled=false;}finally{polling=false;}}
  function close(){closed=true;if(recorder?.state==='recording')recorder.stop();releaseMic();audio.pause();dialog.close();}
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});button('close').onclick=close;
  entry.onclick=async()=>{if(busy()){notify('请等当前回复结束');return;}if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){notify('当前浏览器不支持网页录音，请使用新版 Safari');return;}
   document.getElementById('plusPop').hidden=true;await ensureSession();if(owner!==session()){blob=null;job=null;audio.removeAttribute('src');audio.hidden=true;button('send').disabled=true;button('analyze').disabled=true;preview.hidden=true;}owner=session();if(!owner)return;closed=false;dialog.showModal();setStatus('正在检查待处理录音…');
   try{const r=await api('/api/chat/voice-input?session_id='+owner);if(!r.ok)throw Error();const data=await r.json();
    if(!data.enabled){setStatus('本地语音分析尚未连接。');button('record').disabled=true;return;}
    button('record').disabled=false;if(data.items?.length){apply(data.items[0]);void poll();}else{job=null;setStatus('点击开始录音，录好后可试听，再分析和发送。');}
   }catch{setStatus('暂时无法连接语音服务，请稍后重试。');}
  };
  button('record').onclick=async()=>{
   if(recorder?.state==='recording'){recorder.stop();return;}
   if(permissionPending)return;permissionPending=true;
   try{stream=await navigator.mediaDevices.getUserMedia({audio:true});if(closed){releaseMic();return;}
    const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));
    recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);chunks=[];job=null;blob=null;requestId=crypto.randomUUID();button('send').disabled=true;button('analyze').disabled=true;preview.hidden=true;
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onerror=()=>{releaseMic();setStatus('录音中断，请重新录制。');};
    recorder.onstop=()=>{releaseMic();button('record').textContent='重新录音';if(closed)return;
     blob=new Blob(chunks,{type:recorder.mimeType});if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(blob);audio.src=objectURL;audio.hidden=false;button('analyze').disabled=!blob.size;setStatus('录音已完成，可试听，然后点击分析录音。');};
    recorder.start(500);started=Date.now();button('record').textContent='结束录音';timer=setInterval(()=>{const sec=Math.floor((Date.now()-started)/1000);setStatus('正在录音 '+sec+' 秒 · 最长5分钟');if(sec>=299)recorder.stop();},250);
   }catch{releaseMic();setStatus('无法使用麦克风，请检查 Safari 麦克风权限。');}finally{permissionPending=false;}
  };
  button('analyze').onclick=async()=>{button('analyze').disabled=true;button('record').disabled=true;
   try{
    if(job){const r=await api('/api/chat/voice-input/'+job.id+'/retry',{method:'POST',body:JSON.stringify({session_id:owner})});if(!r.ok)throw Error();job.status='queued';}
    else{if(!blob?.size)throw Error();const ext=blob.type.includes('mp4')?'m4a':blob.type.includes('ogg')?'ogg':'webm';const form=new FormData();form.append('audio',blob,'recording.'+ext);form.append('session_id',owner);form.append('request_id',requestId);
     setStatus('正在保存录音…');const r=await fetch('/api/chat/voice-input',{method:'POST',body:form});const data=await r.json();if(!r.ok)throw Error(data.error||'上传失败');apply(data);}
    setStatus('录音已保存，正在电脑上分析…');void poll();
   }catch(e){setStatus(e.message==='上传失败'?e.message:'处理未完成，录音保留在当前页面，可重试。');button('analyze').disabled=false;}
   finally{button('record').disabled=false;}
  };
  button('send').onclick=async()=>{if(!job||job.status!=='ready'||busy())return;if(owner!==session()){setStatus('会话已变化，请回到原会话发送这条录音。');return;}
   button('send').disabled=true;const pending=job;closed=true;dialog.close();try{await send(pending,owner);}catch{notify('语音发送未完成，请重新打开语音查看保存状态。');}
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&recorder?.state==='recording')recorder.stop();});
 }
 window.sakieVoiceInput={init};
})();
