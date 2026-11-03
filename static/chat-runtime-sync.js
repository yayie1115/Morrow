/* Persist only the active chat's selected runtime, asynchronously and on change. */
(()=>{
  let last='',busy=false,retryAfter=0,warned=false;
  async function sync(){
    const view=document.getElementById('view-chat');
    if(busy||Date.now()<retryAfter||document.hidden||!view||view.hidden||getComputedStyle(view).display==='none'||!sessionId)return;
    const active=getActive();if(!active?.pid||!active.id)return;
    const body={provider_id:Number(active.pid),model:active.id,think:getThink(),context_limit:getContextLimit(),image_limit:getImageLimit(),latest_images_only:getLatestImagesOnly(),cache_ttl:getChatCacheTtl()};
    const key=JSON.stringify([sessionId,body]);if(key===last)return;busy=true;
    try{const response=await api('/api/chat/sessions/'+sessionId+'/runtime',{method:'PUT',body:JSON.stringify(body)});if(!response.ok)throw new Error();last=key;warned=false;}
    catch{retryAfter=Date.now()+30000;if(!warned){toast('聊天模型设置尚未同步，积温暂不能跟随本次切换');warned=true;}}finally{busy=false;}
  }
  setInterval(sync,2000);window.addEventListener('pagehide',()=>{last='';});
})();
