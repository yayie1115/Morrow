/* Page-memory cache and lightweight disclosure rendering for the tidy views. */
(()=>{
  const reads=new Map(),loads=new Map();let epoch=0,artifactTarget='',artifactChain=Promise.resolve();
  const originalApi=window.api;
  const paths=new Set(['/api/tidy/summaries','/api/study/settings','/api/study/runs','/api/keepsakes','/api/alarms','/api/presence/state','/api/presence/events','/api/music/listening']);
  window.api=async function(path,options={}){
    const method=String(options.method||'GET').toUpperCase();
    const pathname=String(path).split('?')[0];
    if(method!=='GET'){
      if(/^\/api\/(keepsakes|alarms|study|tidy|presence|music|chat\/send|chat\/regenerate|logout)(\/|$)/.test(pathname)){epoch++;reads.clear();}
      return originalApi.call(this,path,options);
    }
    if(!paths.has(pathname)||options.signal)return originalApi.call(this,path,options);
    const key=String(path),now=Date.now(),prior=reads.get(key);
    const ttl=pathname==='/api/study/runs'?2000:10000;
    if(prior&&prior.epoch===epoch&&(prior.pending||now-prior.at<ttl))return (await prior.promise).clone();
    const entry={epoch,at:now,pending:true};
    entry.promise=Promise.resolve(originalApi.call(this,path,options)).then(response=>{
      entry.pending=false;entry.at=Date.now();
      if((!response.ok||typeof response.clone!=='function'||entry.epoch!==epoch)&&reads.get(key)===entry)reads.delete(key);
      return response;
    }).catch(error=>{if(reads.get(key)===entry)reads.delete(key);throw error;});
    reads.set(key,entry);if(reads.size>24)reads.delete(reads.keys().next().value);
    const response=await entry.promise;
    return typeof response.clone==='function'?response.clone():response;
  };
  function retain(name,mode,panelSelector,guard=()=>true){
    const original=window[name];if(typeof original!=='function')return;
    window[name]=function(...args){
      const panel=document.querySelector(panelSelector),prior=loads.get(name),now=Date.now();
      const shared=panelSelector==='#tidyArtifactPanel';if(shared)artifactTarget=mode;
      if(prior?.pending)return prior.promise;
      if(prior&&prior.epoch===epoch&&now-prior.at<10000&&panel?.dataset.tidyRetained===mode&&guard())return Promise.resolve();
      const entry={epoch,pending:true,at:now};
      let executed=false;
      const run=()=>{if(shared&&artifactTarget!==mode)return;executed=true;return original.apply(this,args);};
      entry.promise=(shared?artifactChain.then(run):Promise.resolve().then(run)).then(value=>{
        entry.pending=false;entry.at=Date.now();
        if(executed&&panel)panel.dataset.tidyRetained=mode;
        if(!executed)loads.delete(name);
        return value;
      }).catch(error=>{loads.delete(name);throw error;});
      if(shared)artifactChain=entry.promise.catch(()=>{});
      loads.set(name,entry);return entry.promise;
    };
  }
  retain('loadSummaryLogs','summary','#tidySummaryPanel');
  retain('loadPresence','presence','#tidyPresencePanel');
  retain('loadStudyData','footprint','#tidyFootprintPanel',()=>typeof FOOTPRINT_RUNS==='undefined'||!FOOTPRINT_RUNS.some(run=>['queued','running'].includes(run.status)));
  retain('loadKeepsakeDrawer','keepsake','#tidyArtifactPanel',()=>typeof CURRENT_KEEPSAKE==='undefined'||!CURRENT_KEEPSAKE);
  retain('loadAlarmDrawer','alarm','#tidyArtifactPanel');
  retain('loadMusicListeningArchive','together','#tidyArtifactPanel');
  // Other artifact renderers share this panel; invalidate its retained identity.
  const voice=window.loadVoiceDrawer;
  if(typeof voice==='function')window.loadVoiceDrawer=function(...args){
    artifactTarget='voice';
    const panel=document.querySelector('#tidyArtifactPanel');if(panel)delete panel.dataset.tidyRetained;
    const task=artifactChain.then(()=>{if(artifactTarget==='voice')return voice.apply(this,args);});
    artifactChain=task.catch(()=>{});return task;
  };
  function cancel(element){
    element.getAnimations?.().forEach(a=>a.cancel());
    for(const key of ['height','opacity','overflow'])element.style.removeProperty(key);
    element.classList.remove('tidy-smooth-panel');
  }
  window.tidySmoothPanel=function(panel,open){if(!panel)return;cancel(panel);panel.hidden=!open;};
  window.tidySmoothDetails=function(details,open){if(!details)return;cancel(details);details.dataset.tidyOpen=String(open);details.open=open;};
  const markup=window.keepsakeNookMarkup;
  if(typeof markup==='function')window.keepsakeNookMarkup=function(item,detail=false){
    const bubble=markup(item,detail);
    bubble.querySelectorAll('img.keepsake-media-thumb').forEach(img=>{
      img.loading='lazy';img.decoding='async';
      if(!detail&&typeof window.chatImageUrl==='function')img.src=window.chatImageUrl(img.getAttribute('src'),'thumb');
    });
    return bubble;
  };
  const style=document.createElement('style');
  style.textContent='@supports(content-visibility:auto){#view-night .summary-log,#view-night .footprint-entry,#view-night .tool-run-card,#view-night .alarm-note,#view-night .listening-archive-card{content-visibility:auto;contain-intrinsic-size:auto 140px}}';
  document.head.appendChild(style);
})();
