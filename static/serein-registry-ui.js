/* Household-wide chat routing controls; no credentials or model bodies stored here. */
(()=>{
  let busy=false,timer=null,box=null,dirty=false;
  const labels={ready:'已同步',pending:'等待后台同步（通常 30 秒内）',error:'同步失败，请重试或检查供应商配置',disabled:'自动接入已关闭'};
  async function refresh(){
    if(busy||!box||document.getElementById('prov-list-view')?.hidden)return;
    busy=true;
    try{
      const response=await api('/api/serein/registry'),data=await response.json();if(!response.ok)throw new Error();
      box.replaceChildren();
      const title=document.createElement('label');title.style.cssText='display:flex;align-items:center;gap:10px;font-weight:600';
      const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=data.enabled;checkbox.disabled=!data.available;
      const text=document.createElement('span');text.textContent='聊天自动接入 Serein';title.append(checkbox,text);box.append(title);
      const status=document.createElement('p');status.style.cssText='font-size:13px;line-height:1.6;opacity:.8';status.textContent=data.available?(labels[data.state]||'接入状态未知'):'当前环境未配置 Serein 网关';box.append(status);
      const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='供应商例外';detail.append(summary);box.append(detail);
      const excluded=new Set(data.excluded_provider_ids||[]);const controls=[];
      for(const provider of PROVIDERS){
        const row=document.createElement('label');row.style.cssText='display:flex;align-items:center;gap:8px;padding:8px 0;font-size:14px';
        const input=document.createElement('input');input.type='checkbox';input.checked=!excluded.has(provider.id);input.disabled=!data.available;
        const name=document.createElement('span');name.textContent=provider.name;row.append(input,name);detail.append(row);controls.push({id:provider.id,input});input.onchange=()=>{dirty=true;status.textContent='设置有变更，点击保存后生效';};
      }
      const hint=document.createElement('p');hint.style.cssText='font-size:12px;opacity:.7';hint.textContent='勾选的供应商自动同步聊天模型；向量、重排及常见语音／图像模型自动排除。Gemini 原生协议暂不自动同步，可取消该供应商勾选。';detail.append(hint);
      if(data.unavailable_provider_ids?.length){const warning=document.createElement('p');warning.textContent='存在未支持的协议或缺少地址／密钥的供应商，请补齐配置或设为例外。';warning.style.fontSize='13px';box.append(warning);}
      const save=document.createElement('button');save.type='button';save.textContent=data.state==='error'?'重试同步':'保存接入设置';save.disabled=!data.available;save.style.cssText='padding:9px 14px;border-radius:12px;border:1px solid #cbd9ec;background:transparent;color:inherit;font:inherit';
      save.onclick=async()=>{save.disabled=true;try{const r=await api('/api/serein/registry',{method:'PUT',body:JSON.stringify({enabled:checkbox.checked,excluded_provider_ids:controls.filter(c=>!c.input.checked).map(c=>c.id)})});const result=await r.json();if(!r.ok)throw new Error(result.error||'设置未保存');toast('已保存接入设置');await refreshAfterSave();}catch(error){toast(error.message||'设置未保存');save.disabled=false;}};box.append(save);
      checkbox.onchange=()=>{dirty=true;status.textContent='设置有变更，点击保存后生效';};
    }catch{if(!box.children.length)box.textContent='Serein 接入状态读取失败，请重新打开模型设置。';}
    finally{busy=false;}
  }
  async function refreshAfterSave(){busy=false;dirty=false;return refresh();}
  function mount(){
    const view=document.getElementById('prov-list-view');if(!view)return;
    if(!box){box=document.createElement('section');box.className='glass-card';box.style.cssText='padding:18px;margin-bottom:14px';box.id='sereinRegistryControls';const list=document.getElementById('provList');list.parentElement.before(box);}
    dirty=false;void refresh();clearInterval(timer);timer=setInterval(()=>{if(view.hidden){clearInterval(timer);timer=null;return;}if(!dirty&&!box.contains(document.activeElement)&&!box.querySelector('details[open]'))void refresh();},5000);
  }
  const original=showProvList;showProvList=function(...args){const result=original.apply(this,args);mount();return result;};
})();
