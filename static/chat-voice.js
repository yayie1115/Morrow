/* Inline chat voice playback; persisted voice artifacts remain unchanged. */
(()=>{
  let playing=null;
  const durationCache=new Map(),probeQueue=[],waiting=new Set();let probing=false;
  let serial=0;
  const clock=value=>Number.isFinite(value)&&value>0?Math.ceil(value)+'″':'—';
  function stop(){if(playing){const previous=playing;playing=null;previous.cancel();}}
  function pump(){
    if(probing)return;
    let job;while((job=probeQueue.shift())&&!job.root.isConnected){}
    if(!job)return;
    probing=true;const probe=job.audio;let finished=false;
    const done=()=>{if(finished)return;finished=true;clearTimeout(timer);probe.removeEventListener('loadedmetadata',metadata);probe.removeEventListener('error',done);probing=false;pump();};
    const metadata=()=>{if(Number.isFinite(probe.duration)&&probe.duration>0){durationCache.set(job.url,probe.duration);job.update(probe.duration);}done();};
    const timer=setTimeout(done,6000);
    probe.addEventListener('loadedmetadata',metadata);probe.addEventListener('error',done);
    if(probe.readyState>=1){metadata();return;}
    if(!probe.getAttribute('src')){probe.preload='metadata';probe.src=job.url;probe.load();}
  }
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);waiting.delete(entry.target);const job=entry.target._voiceProbe;if(job){probeQueue.push(job);pump();}}},{rootMargin:'0px'}):null;
  function make(artifact,{notify=()=>{}}={}){
    const root=document.createElement('div');root.className='ai-part chat-voice-message';root.dataset.artifactId=String(artifact.id);
    const play=document.createElement('button');play.type='button';play.className='chat-voice-play';play.setAttribute('aria-label','播放语音');play.setAttribute('aria-pressed','false');play.setAttribute('aria-busy','false');
    const icon=document.createElement('span');icon.className='chat-voice-icon';icon.setAttribute('aria-hidden','true');
    for(let n=0;n<3;n++){const arc=document.createElement('i');arc.style.setProperty('--arc-index',String(n));icon.appendChild(arc);}
    const time=document.createElement('span');time.className='chat-voice-duration';time.textContent=clock(durationCache.get(artifact.audio_url));
    play.append(icon,time);
    const row=document.createElement('div');row.className='chat-voice-row';
    const textButton=document.createElement('button');textButton.type='button';textButton.className='chat-voice-text-toggle';textButton.textContent='文字';textButton.setAttribute('aria-expanded','false');
    row.append(play,textButton);root.appendChild(row);
    const audio=new Audio();audio.preload='none';audio.hidden=true;let failed=false,pending=false,attempt=0;
    const reset=()=>{pending=false;root.classList.remove('playing');root.classList.remove('loading');play.setAttribute('aria-busy','false');play.setAttribute('aria-label','播放语音');play.setAttribute('aria-pressed','false');if(playing?.root===root)playing=null;};
    const updateDuration=value=>{if(Number.isFinite(value)&&value>0){durationCache.set(artifact.audio_url,value);root.style.setProperty('--chat-voice-width',Math.round(100+Math.min(80,Math.max(0,value-3)*1.5))+'px');if(time.textContent!==clock(value))time.textContent=clock(value);}};
    const started=()=>{if(audio.paused)return;pending=false;root.classList.remove('loading');root.classList.add('playing');play.setAttribute('aria-busy','false');play.setAttribute('aria-label','暂停语音');play.setAttribute('aria-pressed','true');};
    const buffering=()=>{if(!audio.paused){root.classList.add('loading');play.setAttribute('aria-busy','true');play.setAttribute('aria-label','语音加载中，点击可暂停');}};
    const cancel=()=>{attempt++;pending=false;audio.pause();reset();};
    audio.addEventListener('loadedmetadata',()=>updateDuration(audio.duration));
    audio.addEventListener('durationchange',()=>updateDuration(audio.duration));
    audio.addEventListener('timeupdate',()=>updateDuration(audio.duration));
    audio.addEventListener('playing',started);audio.addEventListener('waiting',buffering);
    audio.addEventListener('pause',reset);
    audio.addEventListener('ended',()=>{reset();updateDuration(audio.duration);});
    audio.addEventListener('error',()=>{const requested=pending||playing?.root===root;attempt++;failed=true;reset();if(requested)notify('语音暂时无法播放，请稍后重试。');});
    updateDuration(durationCache.get(artifact.audio_url)||artifact.duration||artifact.meta?.duration);
    play.onclick=event=>{
      event.stopPropagation();if(pending||!audio.paused){cancel();return;}
      stop();document.getElementById('voiceAudio')?.pause();
      if(!audio.getAttribute('src')||failed){failed=false;audio.preload='metadata';audio.src=artifact.audio_url;audio.load();}
      if(audio.ended)audio.currentTime=0;
      const token=++attempt;pending=true;playing={audio,root,cancel};root.classList.add('loading');play.setAttribute('aria-busy','true');play.setAttribute('aria-label','语音加载中，点击可取消');
      const rejected=error=>{if(token!==attempt)return;reset();if(!failed&&error?.name!=='AbortError')notify('未能开始播放，请再点一次语音。');};
      try{const result=audio.play();if(result?.then)result.then(()=>{if(token===attempt)started();},rejected);}catch(error){rejected(error);}
    };
    const transcript=document.createElement('div');transcript.className='chat-voice-transcript';transcript.hidden=true;transcript.id='chat-voice-text-'+(++serial);textButton.setAttribute('aria-controls',transcript.id);
    const original=document.createElement('div');original.className='chat-voice-original';original.textContent=artifact.text||'这条语音没有保存文字稿。';transcript.appendChild(original);
    const rawTranslations=artifact.meta?.subtitle_zh;
    const translations=Array.isArray(rawTranslations)&&rawTranslations.length>0&&rawTranslations.length<=80&&rawTranslations.every(x=>typeof x==='string'&&x.trim()&&x.length<=500)&&/[\u3400-\u9fff]/u.test(rawTranslations.join(''))?rawTranslations:[];
    if(translations.length){const translation=document.createElement('div');translation.className='chat-voice-translation';translation.textContent=translations.join('\n');transcript.appendChild(translation);}
    textButton.onclick=event=>{event.stopPropagation();transcript.hidden=!transcript.hidden;textButton.textContent=transcript.hidden?'文字':'收起';textButton.setAttribute('aria-expanded',String(!transcript.hidden));};
    root.appendChild(transcript);root.appendChild(audio);
    for(const type of ['pointerdown','touchstart','click'])root.addEventListener(type,e=>e.stopPropagation());
    if(!durationCache.has(artifact.audio_url)&&artifact.audio_url){root._voiceProbe={root,audio,url:artifact.audio_url,update:updateDuration};if(observer){waiting.add(root);observer.observe(root);}}
    return root;
  }
  document.addEventListener('play',event=>{if(event.target?.id==='voiceAudio')stop();},true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  const log=document.getElementById('log');if(log&&typeof MutationObserver==='function')new MutationObserver(()=>{if(playing&&!playing.root.isConnected)stop();for(const root of waiting)if(!root.isConnected){observer.unobserve(root);waiting.delete(root);}}).observe(log,{childList:true,subtree:true});
  window.sakieChatVoice={make,stop};
})();
