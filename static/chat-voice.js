/* Inline chat voice playback; persisted voice artifacts remain unchanged. */
(()=>{
  let playing=null;
  const durationCache=new Map(),probeQueue=[],waiting=new Set();let probing=false;
  const clock=value=>Number.isFinite(value)&&value>=0?Math.floor(value/60)+':'+String(Math.floor(value%60)).padStart(2,'0'):'—';
  function stop(){if(playing){playing.audio.pause();playing=null;}}
  function pump(){
    if(probing)return;
    let job;while((job=probeQueue.shift())&&!job.root.isConnected){}
    if(!job)return;
    probing=true;const probe=new Audio();let finished=false;
    const done=()=>{if(finished)return;finished=true;clearTimeout(timer);probe.pause();probe.removeAttribute('src');probe.load();probing=false;pump();};
    const timer=setTimeout(done,6000);
    probe.onloadedmetadata=()=>{if(Number.isFinite(probe.duration)&&probe.duration>0){durationCache.set(job.url,probe.duration);job.update(probe.duration);}done();};
    probe.onerror=done;probe.preload='metadata';probe.src=job.url;probe.load();
  }
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);waiting.delete(entry.target);const job=entry.target._voiceProbe;if(job){probeQueue.push(job);pump();}}},{rootMargin:'0px'}):null;
  function make(artifact,{notify=()=>{},sentenceCount=0}={}){
    const root=document.createElement('div');root.className='ai-part chat-voice-message';root.dataset.artifactId=String(artifact.id);
    const play=document.createElement('button');play.type='button';play.className='chat-voice-play';play.setAttribute('aria-label','播放语音');play.setAttribute('aria-pressed','false');
    const icon=document.createElement('span');icon.className='chat-voice-icon';icon.textContent='▶';
    const wave=document.createElement('span');wave.className='chat-voice-wave';wave.setAttribute('aria-hidden','true');
    for(let n=0;n<9;n++){const bar=document.createElement('i');bar.style.setProperty('--bar-height',[9,16,23,13,27,18,11,21,14][n]+'px');bar.style.setProperty('--bar-delay',n*-.09+'s');wave.appendChild(bar);}
    const time=document.createElement('span');time.className='chat-voice-duration';time.textContent=clock(durationCache.get(artifact.audio_url));
    play.append(icon,wave,time);root.appendChild(play);
    const audio=new Audio();audio.preload='none';let failed=false;
    const reset=()=>{root.classList.remove('playing');icon.textContent='▶';play.setAttribute('aria-label','播放语音');play.setAttribute('aria-pressed','false');if(playing?.root===root)playing=null;};
    const updateDuration=value=>{if(root.isConnected&&Number.isFinite(value)&&value>0){durationCache.set(artifact.audio_url,value);time.textContent=clock(value);}};
    audio.addEventListener('loadedmetadata',()=>updateDuration(audio.duration));
    audio.addEventListener('durationchange',()=>updateDuration(audio.duration));
    audio.addEventListener('timeupdate',()=>{if(Number.isFinite(audio.duration))time.textContent=clock(audio.currentTime)+' / '+clock(audio.duration);});
    audio.addEventListener('play',()=>{root.classList.add('playing');icon.textContent='Ⅱ';play.setAttribute('aria-label','暂停语音');play.setAttribute('aria-pressed','true');});
    audio.addEventListener('pause',reset);
    audio.addEventListener('ended',()=>{reset();updateDuration(audio.duration);});
    audio.addEventListener('error',()=>{failed=true;reset();notify('语音暂时无法播放，请稍后重试。');});
    play.onclick=event=>{
      event.stopPropagation();if(!audio.paused){audio.pause();return;}
      stop();document.getElementById('voiceAudio')?.pause();
      if(!audio.getAttribute('src')||failed){failed=false;audio.src=artifact.audio_url;audio.load();}
      if(audio.ended)audio.currentTime=0;
      playing={audio,root};
      const result=audio.play();if(result?.catch)result.catch(()=>{reset();if(!failed)notify('未能开始播放，请再点一次语音。');});
    };
    const transcript=document.createElement('details');transcript.className='chat-voice-transcript';
    const summary=document.createElement('summary');summary.textContent='查看文字';transcript.appendChild(summary);
    const original=document.createElement('div');original.className='chat-voice-original';original.textContent=artifact.text||'这条语音没有保存文字稿。';transcript.appendChild(original);
    const rawTranslations=artifact.meta?.subtitle_zh;
    const translations=Array.isArray(rawTranslations)&&rawTranslations.length===sentenceCount&&rawTranslations.every(x=>typeof x==='string'&&x.trim())?rawTranslations:[];
    if(translations.length){const translation=document.createElement('div');translation.className='chat-voice-translation';translation.textContent='中文翻译\n'+translations.join('\n');transcript.appendChild(translation);}
    transcript.addEventListener('toggle',()=>{summary.textContent=transcript.open?'收起文字':'查看文字';});
    root.appendChild(transcript);
    for(const type of ['pointerdown','touchstart','click'])root.addEventListener(type,e=>e.stopPropagation());
    if(!durationCache.has(artifact.audio_url)&&artifact.audio_url){root._voiceProbe={root,url:artifact.audio_url,update:updateDuration};if(observer){waiting.add(root);observer.observe(root);}}
    return root;
  }
  document.addEventListener('play',event=>{if(event.target?.id==='voiceAudio')stop();},true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  const log=document.getElementById('log');if(log&&typeof MutationObserver==='function')new MutationObserver(()=>{if(playing&&!playing.root.isConnected)stop();for(const root of waiting)if(!root.isConnected){observer.unobserve(root);waiting.delete(root);}}).observe(log,{childList:true,subtree:true});
  window.sakieChatVoice={make,stop};
})();
