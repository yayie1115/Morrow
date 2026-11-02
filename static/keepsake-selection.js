/* Shared persisted sources for manual and assistant keepsakes. */
(()=>{
  let state=null;
  const style=document.createElement('style');
  style.textContent=`
  .ks-picker-mask{position:fixed;inset:0;z-index:2200;background:#30466066;display:flex;align-items:center;justify-content:center;padding:16px}
  .ks-picker{background:var(--bg,#edf3fc);color:var(--text,#34465f);border:1px solid #cbd9ec;border-radius:24px;width:min(100%,540px);max-height:calc(100dvh - 32px);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 50px #30466026}
  .ks-picker header,.ks-picker footer{padding:14px 18px;display:flex;align-items:center;gap:12px;flex-shrink:0}
  .ks-picker h2{font:inherit;font-size:19px;margin:0;flex:1}.ks-picker button{font:inherit;color:inherit;border:1px solid #cbd9ec;background:#ffffffa6;border-radius:14px;padding:9px 13px;cursor:pointer}.ks-picker button:disabled{opacity:.5;cursor:default}
  .ks-picker-list{padding:0 16px;overflow:auto;overscroll-behavior:contain;min-height:0;flex:1}.ks-picker-group{margin:12px 0 18px}.ks-picker-meta{font-size:12px;opacity:.65;margin:0 4px 7px}.ks-picker-item{display:flex;gap:10px;align-items:center;background:#ffffffbd;border:1px solid #d6e1f0;border-radius:17px;padding:12px;margin:8px 0;cursor:pointer}.ks-picker-item:has(input:checked){background:#dce9fa;border-color:#8ca9ce}.ks-picker-item:has(input:disabled){opacity:.55}.ks-picker-item input{flex-shrink:0;width:18px;height:18px;accent-color:#7595c0}.ks-picker-item span{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6;min-width:0}.ks-picker-item img{width:96px;height:96px;object-fit:cover;border-radius:10px}.ks-picker-empty{padding:14px;font-size:14px;opacity:.7}.ks-picker textarea{box-sizing:border-box;width:calc(100% - 32px);margin:10px 16px 0;border:1px solid #cbd9ec;border-radius:14px;padding:10px 12px;font:inherit;font-size:16px;resize:vertical;min-height:60px;max-height:120px;background:#ffffffbd;color:inherit}.ks-picker footer{padding-bottom:max(14px,env(safe-area-inset-bottom));justify-content:space-between}.ks-picker-status{font-size:13px;flex:1}.ks-picker-error{color:#9a4b51}
  @media(max-width:600px){.ks-picker-mask{padding:env(safe-area-inset-top,12px) 8px max(8px,env(safe-area-inset-bottom));align-items:flex-end}.ks-picker{max-height:calc(100dvh - env(safe-area-inset-top) - 24px)}}`;
  document.head.appendChild(style);
  const key=(mid,pid)=>`${mid}/${pid}`;
  function close(){if(state?.saving)return;state?.mask.remove();state=null;}
  function status(message,error=false){if(!state)return;state.status.textContent=message||`已选 ${state.selected.size}/10`;state.status.classList.toggle('ks-picker-error',error);state.save.disabled=state.saving||!state.selected.size;}
  function render(){
    const s=state;if(!s)return;s.list.replaceChildren();
    for(const item of [...s.items.values()].sort((a,b)=>a.message_id-b.message_id)){
      if(!item.parts.length)continue;
      const group=document.createElement('section');group.className='ks-picker-group';
      const meta=document.createElement('div');meta.className='ks-picker-meta';meta.textContent=`${item.role==='user'?userName():assistantName()} · ${item.created_at?fmtClock(item.created_at):''}`;group.append(meta);
      for(const part of item.parts){
        const label=document.createElement('label');label.className='ks-picker-item';
        const check=document.createElement('input');check.type='checkbox';check.disabled=part.already_kept;check.checked=s.selected.has(key(item.message_id,part.item_id));check.setAttribute('aria-label',part.kind==='image'?'选择这张已发送照片':'选择这个文字气泡');
        check.onchange=()=>{const k=key(item.message_id,part.item_id);if(check.checked&&s.selected.size>=10){check.checked=false;status('一张留影最多选 10 个片段',true);return;}if(check.checked)s.selected.set(k,{message_id:item.message_id,item_id:part.item_id});else s.selected.delete(k);status();};label.append(check);
        if(part.kind==='image'){const image=document.createElement('img');image.src=part.url;image.alt=part.name||'已发送照片';image.loading='lazy';label.append(image);}else{const text=document.createElement('span');text.textContent=part.text;label.append(text);}
        if(part.already_kept){const hint=document.createElement('small');hint.textContent='已留影';label.append(hint);}group.append(label);
      }s.list.append(group);
    }
    if(!s.list.children.length){const empty=document.createElement('div');empty.className='ks-picker-empty';empty.textContent='这段对话暂时没有可选的文字气泡或已发送照片';s.list.append(empty);}
    s.more.disabled=!s.moreBefore||s.loading;s.more.textContent=s.moreBefore?'查看更早的消息':'已到最早';status();
  }
  async function fetchPage(s,before,updateCursor=true){
    const query=new URLSearchParams({session_id:s.sid,count:'10'});if(before)query.set('before_message_id',String(before));
    const response=await api('/api/keepsakes/candidates?'+query),data=await response.json();
    if(!response.ok)throw new Error(data.error||'暂时读不到这段对话');if(state!==s)return;
    for(const item of data.items||[])s.items.set(item.message_id,item);
    if(updateCursor)s.moreBefore=data.next_before_message_id;
  }
  async function open(wrap,range){
    if(streaming||!wrap?._id||!sessionId){toast('等消息保存好后再留影');return;}
    if(state?.saving)return;close();if(typeof closeSheet==='function')closeSheet();
    const mask=document.createElement('div');mask.className='ks-picker-mask';
    mask.innerHTML='<section class="ks-picker" role="dialog" aria-modal="true" aria-label="选择留影片段"><header><h2>把这一刻留下</h2><button type="button" class="ks-picker-close">取消</button></header><div class="ks-picker-list"></div><textarea maxlength="1000" placeholder="给这一刻留句话…（可不填）" aria-label="留影题注"></textarea><footer><span class="ks-picker-status">正在读取…</span><button type="button" class="ks-picker-more">更早</button><button type="button" class="ks-picker-save" disabled>保存留影</button></footer></section>';
    document.body.append(mask);
    const s=state={mask,sid:sessionId,items:new Map(),selected:new Map(),saving:false,loading:true,moreBefore:null,list:mask.querySelector('.ks-picker-list'),status:mask.querySelector('.ks-picker-status'),save:mask.querySelector('.ks-picker-save'),more:mask.querySelector('.ks-picker-more')};
    mask.querySelector('.ks-picker-close').onclick=close;mask.onclick=e=>{if(e.target===mask)close();};
    s.more.onclick=async()=>{if(s.loading||!s.moreBefore)return;s.loading=true;s.more.disabled=true;try{await fetchPage(s,s.moreBefore);if(state===s)render();}catch(e){status(e.message,true);}finally{s.loading=false;if(state===s)s.more.disabled=!s.moreBefore;}};
    s.save.onclick=async()=>{
      if(s.saving||!s.selected.size)return;
      if(sessionId!==s.sid){status('对话已切换，请重新选择',true);return;}
      s.saving=true;status('正在保存…');mask.querySelector('.ks-picker-close').disabled=true;s.more.disabled=true;
      const source_tokens={};for(const item of s.selected.values())source_tokens[String(item.message_id)]=s.items.get(item.message_id).source_token;
      try{
        const response=await api('/api/keepsakes',{method:'POST',body:JSON.stringify({session_id:s.sid,selections:[...s.selected.values()],source_tokens,note:mask.querySelector('textarea').value})});
        const data=await response.json();if(!response.ok)throw new Error(data.error||'留影未保存，请重试');
        s.saving=false;close();toast('这一刻已经留下来了');
      }catch(error){s.saving=false;mask.querySelector('.ks-picker-close').disabled=false;status(error.message||'未收到保存回执，可重试核对',true);s.more.disabled=!s.moreBefore;}
    };
    try{
      await fetchPage(s);if(state!==s)return;
      if(!s.items.has(Number(wrap._id)))await fetchPage(s,Number(wrap._id)+1,false);if(state!==s)return;
      if(range){
        const item=s.items.get(Number(wrap._id));
        const start=Array.from(String(range.sourceText||singleTextSource(wrap)).slice(0,range.start)).length;
        const match=item?.parts.find(part=>part.kind==='text'&&part.item_id.startsWith(`text:${start}:`)&&part.text.trim()===range.text.trim());
        if(match&&!match.already_kept)s.selected.set(key(item.message_id,match.item_id),{message_id:item.message_id,item_id:match.item_id});
      }
      s.loading=false;render();
      const clicked=s.list.querySelector('input:checked');if(clicked)clicked.scrollIntoView({block:'center'});
    }catch(error){if(state!==s)return;s.loading=false;status(error.message,true);}
  }
  // Preserve the existing menus; only replace their keepsake action.
  function extendMenu(original,fn){return function(...args){const old=openSheet;openSheet=function(items,...rest){return old(fn(items,args),...rest);};try{return original.apply(this,args);}finally{openSheet=old;}};}
  startKeepsakeSelection=wrap=>open(wrap);
  openSingleTextSheet=extendMenu(openSingleTextSheet,(items,[wrap,range])=>{const copy=[...items];copy.splice(1,0,{label:'留影此气泡',svg:SVG_KEEPSAKE,disabled:streaming||!wrap._id,fn:()=>open(wrap,range)});return copy;});
  for(const name of ['openUserSheet','openAISheet']){
    const replacement=extendMenu(window[name],(items,[wrap])=>items.map(item=>['留影','已留影'].includes(item.label)?{...item,label:'选择片段留影',disabled:streaming||!wrap._id,fn:()=>open(wrap)}:item));window[name]=replacement;
  }
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
  window.addEventListener('popstate',close);
})();
