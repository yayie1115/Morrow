/* Real voice archive: saved audio, metadata-only titles and existing favorites. */
(()=>{
 let generation=0,current=null,playing=null;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const time=n=>Number.isFinite(n)&&n>=0?Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0'):'—';
 const stop=()=>{if(playing){playing.pause();playing=null;}};
 function dispose(){generation++;stop();if(current){for(const audio of current.audios.values()){audio.pause();audio.removeAttribute('src');audio.load();}current=null;}}
 async function mount(host,{api,notify,assistantName}){
  dispose();const token=generation;
  const state={items:[],tab:'all',query:'',open:new Set(),audios:new Map(),durations:new Map(),hasMore:false,loading:false};current=state;
  host.replaceChildren();host.hidden=false;
  const root=el('section','voice-archive'),intro=el('div','va-intro'),stats=el('p','va-stats','正在读取语音…');intro.append(el('h2','','把声音留在这里。'),stats);
  const tabs=el('div','va-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','语音分类');
  const all=el('button','active','全部'),saved=el('button','','已收藏');for(const b of [all,saved]){b.type='button';b.setAttribute('role','tab');}tabs.append(all,saved);
  const search=el('label','va-search'),input=el('input');input.type='search';input.placeholder='找一段声音…';input.setAttribute('aria-label','搜索已加载的语音标题和文字');search.append(el('span','','⌕'),input);
  const list=el('div','va-list'),more=el('button','va-more','加载更早的语音');more.type='button';more.hidden=true;
  root.append(intro,tabs,search,list,more);host.append(root);
  function valid(){return current===state&&token===generation&&host.isConnected;}
  function audioFor(item){
   if(state.audios.has(item.id))return state.audios.get(item.id);
   const a=new Audio();a.preload='none';a.src=item.audio_url;state.audios.set(item.id,a);return a;
  }
  function render(){
   if(!valid())return;const total=state.items.length,count=state.items.filter(x=>x.favorite).length;
   stats.textContent=(state.hasMore?'已加载 ':'')+total+' 条语音 · '+count+' 条已收藏';
   all.textContent='全部 '+total;saved.textContent='已收藏 '+count;
   for(const b of [all,saved]){const active=(state.tab==='all'?all:saved)===b;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));}
   list.replaceChildren();let date='';const query=state.query.toLocaleLowerCase();
   const items=state.items.filter(x=>(state.tab!=='saved'||x.favorite)&&(!query||[x.title,x.text,...(x.meta?.subtitle_zh||[])].join(' ').toLocaleLowerCase().includes(query)));
   for(const item of items){
    const day=String(item.created_at||'').slice(0,10)||'日期未记录';
    if(day!==date){date=day;list.append(el('div','va-date',day.replaceAll('-','.')));}
    const card=el('article','va-card'),row=el('div','va-row'),play=el('button','va-play'),main=el('div','va-main'),titleRow=el('div','va-title-row'),title=el('strong','',item.title||'未命名语音'),rename=el('button','va-rename','✎');
    play.type='button';play.setAttribute('aria-label','播放语音');play.textContent='▶';rename.type='button';rename.setAttribute('aria-label','修改这条语音标题');titleRow.append(title,rename);
    const meta=el('div','va-meta',assistantName()+' · '+(String(item.created_at||'').slice(11,16)||'—')),excerpt=el('p','va-excerpt',item.text||'这条语音没有保存文字稿。');main.append(titleRow,meta,excerpt);
    const side=el('div','va-side'),star=el('button','va-star'+(item.favorite?' on':''),item.favorite?'★':'☆'),duration=el('span','va-duration',state.durations.has(item.id)?Math.ceil(state.durations.get(item.id))+'″':'—');
    star.type='button';star.setAttribute('aria-label',item.favorite?'取消收藏':'收藏语音');star.setAttribute('aria-pressed',String(!!item.favorite));side.append(star,duration);row.append(play,main,side);
    const footer=el('div','va-footer'),stamp=el('span','','已保存'),expand=el('button','va-expand',state.open.has(item.id)?'收起文字 ⌃':'查看文字 ⌄');expand.type='button';expand.setAttribute('aria-expanded',String(state.open.has(item.id)));footer.append(stamp,expand);
    const detail=el('div','va-detail');detail.hidden=!state.open.has(item.id);detail.append(el('p','va-transcript',item.text||'这条语音没有保存文字稿。'));
    const translations=item.meta?.subtitle_zh;if(Array.isArray(translations)&&translations.every(x=>typeof x==='string')&&translations.length)detail.append(el('div','va-translation',translations.join('\n')));
    const progress=el('input','va-progress');progress.type='range';progress.min='0';progress.max='1000';progress.value='0';progress.disabled=true;progress.setAttribute('aria-label','语音播放进度');
    const times=el('div','va-times'),elapsed=el('span','','0:00'),end=el('span','',time(state.durations.get(item.id)));times.append(elapsed,end);
    const params=el('details','va-params');params.append(el('summary','','生成信息'));const information={生成时间:item.created_at,状态:item.status==='ready'?'语音已生成':item.status,模型:item.meta?.model,音色:item.meta?.voice_name,语速:item.meta?.speed};
    for(const [key,value] of Object.entries(information))if(value!==undefined&&value!==null&&value!=='')params.append(el('p','',key+'：'+value));
    detail.append(progress,times,params);card.append(row,footer,detail);list.append(card);
    let a=state.audios.get(item.id);
    function sync(){if(!a||!card.isConnected)return;const active=playing===a&&!a.paused;play.textContent=active?'Ⅱ':'▶';play.setAttribute('aria-label',active?'暂停语音':'播放语音');play.setAttribute('aria-pressed',String(active));card.classList.toggle('playing',active);if(Number.isFinite(a.duration)&&a.duration>0){state.durations.set(item.id,a.duration);duration.textContent=Math.ceil(a.duration)+'″';end.textContent=time(a.duration);progress.disabled=false;progress.value=String(Math.round(a.currentTime/a.duration*1000));}elapsed.textContent=time(a.currentTime);}
    function bindAudio(){a=audioFor(item);a.onloadedmetadata=sync;a.ontimeupdate=sync;a.onplaying=sync;a.onpause=sync;a.onended=()=>{if(playing===a)playing=null;sync();};a.onerror=()=>{const requested=playing===a;play.disabled=false;play.removeAttribute('aria-busy');if(requested){playing=null;notify('语音暂时无法播放，请稍后重试。');}sync();};sync();}if(a)bindAudio();
    play.onclick=()=>{if(!a)bindAudio();if(!a.paused){a.pause();if(playing===a)playing=null;sync();return;}stop();window.sakieChatVoice?.stop();document.getElementById('voiceAudio')?.pause();playing=a;play.disabled=true;play.setAttribute('aria-busy','true');
     try{const promise=a.play();Promise.resolve(promise).then(()=>{if(!valid()){a.pause();return;}play.disabled=false;play.removeAttribute('aria-busy');sync();},()=>{play.disabled=false;play.removeAttribute('aria-busy');if(playing===a)playing=null;sync();notify('播放未能开始，请再点一次。');});}catch{playing=null;play.disabled=false;play.removeAttribute('aria-busy');notify('播放未能开始，请再点一次。');}
    };
    progress.oninput=()=>{if(a&&Number.isFinite(a.duration)&&a.duration>0)a.currentTime=Number(progress.value)/1000*a.duration;};
    expand.onclick=()=>{state.open.has(item.id)?state.open.delete(item.id):state.open.add(item.id);detail.hidden=!state.open.has(item.id);expand.textContent=detail.hidden?'查看文字 ⌄':'收起文字 ⌃';expand.setAttribute('aria-expanded',String(!detail.hidden));};
    star.onclick=async()=>{star.disabled=true;try{const r=await api('/api/artifacts/'+item.id+'/favorite',{method:'PUT',body:JSON.stringify({favorite:!item.favorite})});const value=await r.json();if(!r.ok)throw Error();item.favorite=!!value.favorite;if(valid()){star.disabled=false;star.textContent=item.favorite?'★':'☆';star.classList.toggle('on',item.favorite);star.setAttribute('aria-pressed',String(item.favorite));star.setAttribute('aria-label',item.favorite?'取消收藏':'收藏语音');const count=state.items.filter(x=>x.favorite).length;saved.textContent='已收藏 '+count;stats.textContent=state.items.length+' 条语音 · '+count+' 条已收藏';if(state.tab==='saved'&&!item.favorite)render();}notify(item.favorite?'已收藏':'已取消收藏');}catch{star.disabled=false;notify('收藏未保存，请重试。');}};
    rename.onclick=()=>{
     const form=el('form','va-title-editor'),field=el('input'),save=el('button','','保存'),cancel=el('button','','取消');field.value=item.title||'';field.placeholder='给这段语音起个名字';field.maxLength=40;field.setAttribute('aria-label','语音标题');save.type='submit';cancel.type='button';form.append(field,save,cancel);titleRow.replaceWith(form);field.focus();field.select();cancel.onclick=()=>form.replaceWith(titleRow);field.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();form.replaceWith(titleRow);}};
     form.onsubmit=async e=>{e.preventDefault();const value=field.value.trim();if(!value){notify('请填写语音标题');field.focus();return;}save.disabled=true;try{const r=await api('/api/artifacts/'+item.id+'/title',{method:'PUT',body:JSON.stringify({title:value,source_title:item.title||''})});const data=await r.json();if(!r.ok){notify(r.status===409?'标题已在别处修改，请重新读取后再改。':'标题未保存，请重试。');save.disabled=false;return;}item.title=data.title;if(valid()){title.textContent=item.title;form.replaceWith(titleRow);}notify('标题已保存');}catch{save.disabled=false;notify('标题未保存，请重试。');}};
    };
   }
   if(!items.length)list.append(el('div','va-empty',state.query?'没有找到匹配的已加载语音':state.tab==='saved'?'还没有收藏的语音':'还没有保存的语音'));
   more.hidden=!state.hasMore;more.disabled=state.loading;
  }
  async function load(append=false){
   if(state.loading)return;state.loading=true;more.disabled=true;
   try{const last=append&&state.items.length?state.items[state.items.length-1].id:null;const r=await api('/api/artifacts?type=voice_letter&limit=100'+(last?'&before='+last:''));if(!r.ok)throw Error();const values=await r.json();if(!Array.isArray(values))throw Error();if(!valid())return;
    const incoming=values.filter(x=>x.type==='voice_letter');state.items=append?[...state.items,...incoming.filter(x=>!state.items.some(old=>old.id===x.id))]:incoming;state.hasMore=values.length===100;state.loading=false;render();
   }catch{if(valid()){list.replaceChildren(el('div','va-empty','语音记录暂时没读到，请重试。'));more.textContent='重新读取';more.hidden=false;more.disabled=false;more.onclick=()=>load(false);stats.textContent='读取未完成';}}finally{state.loading=false;}
  }
  all.onclick=()=>{state.tab='all';render();};saved.onclick=()=>{state.tab='saved';render();};let searchTimer;input.oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{if(valid()){state.query=input.value.trim();render();}},180);};more.onclick=()=>load(true);
  await load();
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 window.sakieVoiceArchive={mount,dispose};
})();
