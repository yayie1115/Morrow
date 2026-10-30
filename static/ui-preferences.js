/* Shared appearance only. Provider credentials and chat controls stay separate. */
(()=>{
  const keys=new Set("prefTheme prefNight prefFont prefNav prefNook prefDailyChat prefDailyAvatars dailyUserAvatar dailyAssistantAvatar appBgImage appBgOpacity chatBgImage chatBgOpacity".split(" "));
  let ready=false,busy=false,timer=0,refreshing=null,notify=()=>{},dirty={};
  const pendingKey="sakieUiPendingV1";
  try{const stored=JSON.parse(localStorage.getItem(pendingKey)||"{}");for(const k of Object.keys(stored))if(keys.has(k))dirty[k]=stored[k];}catch(_){}
  function persist(){try{localStorage.setItem(pendingKey,JSON.stringify(dirty));}catch(_){}}
  function queue(key,value){if(!keys.has(key))return;dirty[key]=value;persist();clearTimeout(timer);if(ready)timer=setTimeout(flush,450);}
  window.saveLocalPreference=(key,value)=>{localStorage.setItem(key,value);queue(key,String(value));};
  window.removeLocalPreference=key=>{localStorage.removeItem(key);queue(key,null);};
  async function request(method,body){const r=await fetch("/api/ui-preferences",{method,credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw new Error("preference sync failed");return(await r.json()).values;}
  function apply(values){for(const [k,v]of Object.entries(values||{})){if(!keys.has(k)||Object.hasOwn(dirty,k))continue;if(v===null)localStorage.removeItem(k);else if(typeof v==="string")localStorage.setItem(k,v);}notify();}
  async function flush(){if(!ready||busy||!Object.keys(dirty).length)return;busy=true;const sent={...dirty};try{const values=await request("PUT",{values:sent});for(const k of Object.keys(sent))if(dirty[k]===sent[k])delete dirty[k];persist();apply(values);}catch(_){/* Keep durable pending changes; retry on next focus/online/edit. */}finally{busy=false;if(Object.keys(dirty).length&&Object.keys(sent).some(k=>dirty[k]!==sent[k]))timer=setTimeout(flush,450);}}
  async function refresh(){if(refreshing)return refreshing;refreshing=(async()=>{try{let values=await request("GET");const seed={};for(const k of keys){const v=localStorage.getItem(k);if(v!==null&&!Object.hasOwn(values,k)&&!Object.hasOwn(dirty,k))seed[k]=v;}if(Object.keys(seed).length)values=await request("PUT",{values:seed,fill_only:true});ready=true;apply(values);await flush();}catch(_){ready=false;}})();try{await refreshing;}finally{refreshing=null;}}
  window.sakieUiPreferences={start(callback){notify=callback;return refresh();}};
  addEventListener("online",()=>refresh());
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh();else flush();});
})();
