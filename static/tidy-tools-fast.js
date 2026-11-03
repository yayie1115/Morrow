/* Keep tool ledgers in page memory; fetch full bodies only on expansion. */
(()=>{
  let rows=new Map(),cards=new Map(),cursor=null,busy=false,loaded=false,lastCheck=0;
  const details=new Map(),pending=new Map();
  const pretty=(value,fallback)=>{if(value===null||value===undefined||value==='')return fallback;if(typeof value==='object')return JSON.stringify(value,null,2);try{return JSON.stringify(JSON.parse(value),null,2);}catch{return String(value);}};
  async function detail(id){
    if(details.has(id))return details.get(id);
    if(!pending.has(id))pending.set(id,(async()=>{const r=await api('/api/tidy/'+encodeURIComponent(id));const data=await r.json();if(!r.ok)throw new Error(data.error||'详情暂时读取失败');details.set(id,data);if(details.size>100)details.delete(details.keys().next().value);return data;})().finally(()=>pending.delete(id)));
    return pending.get(id);
  }
  function card(run){
    const node=renderToolRun(run);
    node.querySelectorAll('.tool-entry').forEach((row,index)=>{
      const item=run.items[index],toggle=row.querySelector('.tool-entry-toggle'),panel=row.querySelector('.tool-entry-detail');
      panel.replaceChildren();let filled=false,waiting=false;
      toggle.onclick=async()=>{
        if(waiting)return;
        const open=!row.classList.contains('open');row.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open));
        if(!open){tidySmoothPanel(panel,false,270);return;}
        if(!filled){waiting=true;panel.textContent='正在读取…';panel.hidden=false;
          try{const value=await detail(item.id);panel.replaceChildren();for(const [label,text] of [['INPUT',pretty(value.args,'{}')],[item.status==='error'?'ERROR':'RESULT',pretty(item.status==='error'?(value.error||value.result):value.result,item.status==='error'?'调用失败':'没有返回内容')]]){const heading=document.createElement('div');heading.className='detail-label';heading.textContent=label;const pre=document.createElement('pre');pre.textContent=text;panel.append(heading,pre);}filled=true;}
          catch(error){panel.textContent=(error.message||'详情读取失败')+'，收起后可重试';}
          finally{waiting=false;}
        }
        tidySmoothPanel(panel,true,270);
      };
    });return node;
  }
  function render(){
    const box=document.querySelector('#tidyToolList');
    const groups=new Map();for(const item of rows.values()){const key=item.run_id||('message:'+String(item.message_id??item.id));if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
    const runs=[...groups].map(([key,items])=>{items.sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||''))||a.id-b.id);return {key,items,start:items[0].created_at||'',end:items.at(-1).created_at||'',newestId:Math.max(...items.map(i=>i.id))};}).sort((a,b)=>b.newestId-a.newestId);
    const fragment=document.createDocumentFragment();let day='',timeline;
    for(const run of runs){const nextDay=run.start.slice(0,10)||'日期不详';if(nextDay!==day){day=nextDay;const heading=document.createElement('div');heading.className='tidy-day';heading.textContent=day;timeline=document.createElement('div');timeline.className='tool-day-timeline';fragment.append(heading,timeline);}const signature=JSON.stringify(run.items),cached=cards.get(run.key);const node=cached?.signature===signature?cached.node:card(run);cards.set(run.key,{signature,node});timeline.append(node);}
    if(!runs.length){const empty=document.createElement('div');empty.className='tidy-empty';empty.textContent='还没有动静～'+assistantName()+'帮你读写便签/待办/记忆、查天气的记录会出现在这里。';fragment.append(empty);}
    if(cursor){const more=document.createElement('button');more.type='button';more.className='tidy-load-more';more.textContent=busy?'加载中…':'查看更早的记录';more.disabled=busy;more.style.cssText='display:block;margin:20px auto;padding:10px 18px;border:1px solid #cbd9ec;border-radius:14px;background:transparent;color:inherit;font:inherit';more.onclick=()=>fetchPage(true);fragment.append(more);}
    box.replaceChildren(fragment);
  }
  async function fetchPage(older=false){
    if(busy)return;busy=true;
    const box=document.querySelector('#tidyToolList');if(!loaded)box.textContent='加载中…';
    try{
      const query=new URLSearchParams({view:'compact',limit:'40'});if(older&&cursor)query.set('before',String(cursor));
      const response=await api('/api/tidy?'+query),data=await response.json();if(!response.ok)throw new Error(data.error||'记录读取失败');
      let changed=!loaded;
      for(const item of data.items){const prior=rows.get(item.id);if(JSON.stringify(prior)!==JSON.stringify(item)){rows.set(item.id,item);details.delete(item.id);changed=true;}}
      if(!loaded||older){cursor=data.next_before;changed=true;}
      loaded=true;lastCheck=Date.now();busy=false;if(changed)render();
    }catch(error){busy=false;if(!loaded){box.replaceChildren();const retry=document.createElement('button');retry.type='button';retry.textContent='读取失败，点击重试';retry.onclick=()=>fetchPage();box.append(retry);}else{toast(error.message||'刷新失败，已保留上次记录');}}
  }
  window.sakieTidyTools={load(){if(loaded&&Date.now()-lastCheck<5000)return Promise.resolve();return fetchPage();}};
})();
