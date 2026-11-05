/* generated 20261102-163743 from index.html */

const $=(s)=>document.querySelector(s), $$=(s)=>document.querySelectorAll(s);
let sessionId=null;
const api=(p,o={})=>fetch(p,{headers:{"Content-Type":"application/json"},...o});
let IDENTITY={brand_name:"Morrow",user_name:"你",assistant_name:"Morrow",assistant_pronoun:"他"};
const assistantName=()=>IDENTITY.assistant_name;
const assistantPronoun=()=>IDENTITY.assistant_pronoun||"他";
const userName=()=>IDENTITY.user_name;
const hasUserName=()=>userName()!=="你"&&(IDENTITY.user_name_set??true);
const hasAssistantName=()=>IDENTITY.assistant_name_set??(assistantName()!=="Morrow");
const commentAuthorName=author=>author==="assistant"?(hasAssistantName()?assistantName():"他"):(hasUserName()?userName():"我");
const greetingName=()=>userName()==="你"?"":userName();
function renderAssistantSettingsCopy(){
  const name=assistantName();
  $("#mcpEnableIdentityCopy").textContent="允许"+name+"使用这个服务器的工具";
  $("#mcpNarrate").placeholder="例如 "+name+"在整理思路";
  $("#mcpNarrateIdentityCopy").textContent=name+"使用这个服务器时，在聊天与整理页显示的文字；留空会按服务器名称自动生成。";
  $("#alarmFutureIdentityCopy").textContent=name+"可以给未来的自己夹一张纸条：提醒一件事，也可以只是觉得你会离开很久，想过一会儿再来问问。模型与图片设置会安静跟随 Chat。";
}
function scrubBrandText(){
  /* 把界面上残留的默认品牌名换成当前助手名（文本 + placeholder/aria-label/title 属性） */
  const name=assistantName();if(!name||name==="Morrow")return;
  const swap=s=>s.includes("Morrow")?s.split("Morrow").join(name):s;
  try{
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];let n;
    while(n=walker.nextNode()){if(n.nodeValue&&n.nodeValue.includes("Morrow"))nodes.push(n);}
    nodes.forEach(el=>{el.nodeValue=swap(el.nodeValue);});
    document.querySelectorAll("[placeholder],[aria-label],[title]").forEach(el=>{
      ["placeholder","aria-label","title"].forEach(attr=>{
        const v=el.getAttribute(attr);
        if(v&&v.includes("Morrow"))el.setAttribute(attr,swap(v));
      });
    });
  }catch(e){}
}
function renderIdentity(){
  renderAssistantSettingsCopy();
  $("#treasuryFrame")?.contentWindow?.postMessage({type:"treasury-refresh"},location.origin);
  $(".login-welcome").textContent=hasUserName()?"Welcome home,\n"+userName()+".":"Welcome home";
  scrubBrandText();
  document.querySelectorAll('[data-identity-comment-author]').forEach(element=>{element.textContent=commentAuthorName(element.dataset.identityCommentAuthor);element.setAttribute('aria-label',element.textContent);});
  document.querySelectorAll('.boundary-closed-label').forEach(element=>element.textContent=assistantName()+"把前面的记录折进小本本了");
  document.querySelectorAll('.boundary-open-label').forEach(element=>element.textContent="—— "+assistantName()+"把前面的记录折进小本本了 ——");
  $("#diaryReplyIdentityLabel").textContent=userName()+"的留言";
  $("#keepsakeReplyIdentityLabel").textContent=userName()+"的留言";
  $('#stickerAudience [data-value="user"]').textContent=userName();
  $('#stickerAudience [data-value="assistant"]').textContent=assistantName();
  $("#assistantStatus").textContent=assistantName()+"在想你";
  $("#ttsScript").placeholder="[softly] 没事的"+(greetingName()?"，"+greetingName():"")+"……我陪着你。";
  renderGreeting();
  if(typeof previewGreeting==="function")previewGreeting();
  $("#weUserName").value=userName();$("#weAssistantName").value=assistantName();
  $("#weAssistantPronoun").value=assistantPronoun();
  $("#wePronounText").textContent=assistantPronoun();
  if(typeof renderProactiveSummary==="function")renderProactiveSummary();
  document.querySelectorAll("[data-assistant-pronoun]").forEach(element=>{
    const text=element.dataset.assistantPronoun.replaceAll("{ta}",assistantPronoun());
    if(element.tagName==="TEXTAREA")element.placeholder=text;else element.textContent=text;
  });
  const avatar=document.querySelector('[data-kind="assistant"]');
  avatar.setAttribute("aria-label","设置"+assistantPronoun()+"的头像");avatar.querySelector("small").textContent=assistantPronoun();
  $(".note-nook-stamp span").textContent="——"+assistantName();
  $(".daily-chat-nook").textContent=assistantName();
  const chineseName=/\p{Script=Han}/u.test(assistantName());
  $(".daily-chat-nook").classList.toggle("chinese-name",chineseName);
  $(".note-nook-stamp span").classList.toggle("chinese-name",chineseName);
  $("#personaIdentityMark").textContent=!chineseName&&/^[A-Za-z]/.test(assistantName())?assistantName()[0].toUpperCase():"M";
  $(".daily-chat-brand").setAttribute("aria-label",assistantName());
  $("#thinkingIdentityCopy").textContent="让"+assistantName()+"先想一会儿再回答";
  $("#toolsIdentityTitle").textContent=assistantName()+"工具展示";
  $("#toolsIdentityCopy").textContent=assistantName()+"在聊天时看到的工具";
  $("#cycleTimeNote").placeholder="藏一句话在这里，等"+assistantName()+"路过…";
  $("#cycleReplyIdentityLabel").textContent=assistantName()+"的留言";
  $("#alarmIdentityTitle").textContent=assistantName()+"闹钟";
  $("#alarmIdentitySwitch").setAttribute("aria-label","启用"+assistantName()+"闹钟");
  if(typeof diaryEntries!=="undefined"&&diaryEntries.length)renderDiaryStream();
}
async function loadIdentity(){
  const response=await api("/api/identity");
  if(!response.ok)throw new Error("称呼暂时没有读到");
  IDENTITY=await response.json();renderIdentity();
}
$("#weForm").onsubmit=async event=>{
  event.preventDefault();const button=event.target.querySelector("button");button.disabled=true;
  try{const response=await api("/api/identity",{method:"PUT",body:JSON.stringify({user_name:$("#weUserName").value,assistant_name:$("#weAssistantName").value,assistant_pronoun:$("#weAssistantPronoun").value})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||"称呼没有保存");
    IDENTITY=data;renderIdentity();toast("称呼已保存");
  }catch(error){toast(error.message);}finally{button.disabled=false;}
};
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("on");
  clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove("on"),1600);}
let appDialogResolve=null,appDialogMode="confirm";
function settleAppDialog(value){
  const resolve=appDialogResolve;appDialogResolve=null;
  $("#appDialogMask").classList.remove("on");$("#appDialogCard").classList.remove("on");
  if(resolve)resolve(value);
}
function openAppDialog(options={}){
  if(appDialogResolve)settleAppDialog(appDialogMode==="prompt"?null:false);
  appDialogMode=options.mode==="prompt"?"prompt":"confirm";
  $("#appDialogTitle").textContent=options.title||"请确认";
  $("#appDialogCopy").textContent=options.message||"";
  const note=$("#appDialogNote");note.textContent=options.note||"";note.hidden=!options.note;
  const input=$("#appDialogInput");input.hidden=appDialogMode!=="prompt";
  input.value=options.value||"";input.placeholder=options.placeholder||"";input.maxLength=options.maxLength||200;
  $("#appDialogCancel").textContent=options.cancelText||"取消";
  const confirmBtn=$("#appDialogConfirm");confirmBtn.textContent=options.confirmText||"确定";
  confirmBtn.className=options.danger?"danger-solid":"btn-primary";
  $("#appDialogMask").classList.add("on");$("#appDialogCard").classList.add("on");
  requestAnimationFrame(()=>appDialogMode==="prompt"?(input.focus(),input.select()):$("#appDialogCancel").focus());
  return new Promise(resolve=>{appDialogResolve=resolve;});
}
function finishAppDialog(confirmed){
  if(!confirmed){settleAppDialog(appDialogMode==="prompt"?null:false);return;}
  if(appDialogMode==="prompt"){
    const value=$("#appDialogInput").value.trim();
    if(!value){toast("先填一点内容");$("#appDialogInput").focus();return;}
    settleAppDialog(value);return;
  }
  settleAppDialog(true);
}
const bubbleConfirm=options=>openAppDialog({...options,mode:"confirm"});
const bubblePrompt=options=>openAppDialog({...options,mode:"prompt"});
$("#appDialogCancel").onclick=()=>finishAppDialog(false);
$("#appDialogConfirm").onclick=()=>finishAppDialog(true);
$("#appDialogMask").onclick=()=>finishAppDialog(false);
$("#appDialogCard").onkeydown=e=>{
  if(e.key==="Escape"){e.preventDefault();finishAppDialog(false);}
  else if(e.key==="Enter"&&(appDialogMode==="prompt"||e.target.tagName!=="BUTTON")){
    e.preventDefault();finishAppDialog(true);
  }
};
function syncRangeFill(range){
  if(!range)return;const min=Number(range.min)||0,max=Number(range.max)||100,value=Number(range.value)||0;
  const progress=max===min?0:Math.max(0,Math.min(100,(value-min)*100/(max-min)));
  range.style.setProperty("--range-progress",progress+"%");
}
function syncRangeFills(){document.querySelectorAll('input[type="range"]').forEach(syncRangeFill);}
document.addEventListener("input",e=>{if(e.target.matches?.('input[type="range"]'))syncRangeFill(e.target);});
function syncSlidingPill(root){
  if(typeof root==="string")root=$(root);
  const active=root?.querySelector("button.on");if(!root||!active)return;
  root.style.setProperty("--pill-x",active.offsetLeft+"px");
  root.style.setProperty("--pill-w",active.offsetWidth+"px");
}
addEventListener("resize",()=>{$$(".mem-tabs").forEach(syncSlidingPill);},{passive:true});

let FAVORITES_BY_MESSAGE=new Map();
let KEEPSAKED_MESSAGE_IDS=new Set();
let COMPRESSION_STATUS=null;
async function syncFavorites(){
  try{
    const [list,keepsakes]=await Promise.all([
      api("/api/favorites").then(r=>r.json()),api("/api/keepsakes").then(r=>r.json())
    ]);
    FAVORITES_BY_MESSAGE=new Map((Array.isArray(list)?list:[])
      .filter(f=>f&&f.message_id!=null).map(f=>[String(f.message_id),f]));
    KEEPSAKED_MESSAGE_IDS=new Set((Array.isArray(keepsakes)?keepsakes:[]).flatMap(item=>item.message_ids||[]).map(String));
  }catch{
    FAVORITES_BY_MESSAGE=new Map();
    KEEPSAKED_MESSAGE_IDS=new Set();
  }
}
function applyFavState(wrap){
  if(!wrap||wrap._id==null)return;
  const fav=FAVORITES_BY_MESSAGE.get(String(wrap._id));
  wrap._favId=fav?fav.id:null;
}

/* ---------- views ---------- */
let suppressChatAutofocus=false;
function showView(name){
  if(name!=="chat"){window.sakieChatVoice?.stop();window.sakieVoiceInput?.leave();}
  if(name!=="chat"&&typeof KEEPSAKE_SELECTING!=="undefined"&&KEEPSAKE_SELECTING)stopKeepsakeSelection();
  const destination=$("#view-"+name);
  $$(".view").forEach(v=>v.classList.toggle("active",v===destination));
  $$(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===name));
  document.body.classList.toggle("in-chat",name==="chat");
  document.body.classList.toggle("in-cycle",name==="cycle");
  document.body.classList.toggle("in-diary",name==="diary");
  let ready=Promise.resolve();
  if(name==="home")ready=loadHome();
  if(name==="cycle")loadCycle();
  if(name==="diary")ready=loadDiary();
  if(name==="chat"){const chatReady=ensureSession();requestAnimationFrame(syncComposerSpace);
    // Entering Chat should paint first, not open the keyboard and resize the viewport.
    Promise.resolve(chatReady).then(()=>setTimeout(()=>{if($("#view-chat").classList.contains("active"))void syncProactiveStatus(true);},250));}
  if(name==="memory")loadMemory();
  if(name==="night")loadNight();
  if(name==="settings")loadSettings();
  syncSystemBars(document.documentElement.getAttribute("data-theme")||"paper");
  return ready;
}
const APP_ROUTE_MARKER="nookRoute";
let pendingRootView=null;
function appRoute(level=0,view="home",extra={}){
  return {[APP_ROUTE_MARKER]:true,level,view,...extra};
}
function currentAppRoute(){return history.state?.[APP_ROUTE_MARKER]?history.state:null;}
function initAppNavigation(){history.replaceState(appRoute(),"");}
function applyAppRoute(route){
  const view=route?.view||"home";
  if(route?.detail?.type!=="assistant-prompt")hideAssistPrompt();
  const activeView=document.querySelector(".view.active")?.id?.replace("view-","");
  if(activeView!==view)showView(view);
  if(view==="settings"){
    showSetPanel(route.panel||null);
    if(route.detail?.type==="provider")openProvEdit(PROVIDERS.find(p=>p.id===route.detail.id)||null,false);
    if(route.detail?.type==="mcp")openMcpEdit((MCP_SERVERS||[]).find(m=>m.id===route.detail.id)||null,false);
    if(route.detail?.type==="assistant-prompt")openAssistPrompt(route.detail.key,false);
    if(!route.detail&&route.panel==="model")showProvList();
    if(!route.detail&&route.panel==="mcp")showMcpList();
  }
  if(view==="diary"){
    if(route.detail?.type==="diary-entry")void openDiaryDetail(route.detail.id);
    else showDiaryFeed();
  }
}
function navigateMain(name){
  const route=currentAppRoute()||appRoute();
  if(name==="home"){
    if(route.level>0)history.go(-route.level);else showView("home");
    return;
  }
  if(route.level===0){showView(name);history.pushState(appRoute(1,name),"");return;}
  if(route.level===1){showView(name);history.replaceState(appRoute(1,name),"");return;}
  pendingRootView=name;history.go(-route.level);
}
function navigateSetPanel(name){
  showSetPanel(name);
  history.pushState(appRoute(2,"settings",{panel:name}),"");
}
function navigateSettingsDetail(detail){
  history.pushState(appRoute(3,"settings",{panel:detail.panel,detail}),"");
}
async function navigateDiaryDetail(entryId){
  if(await openDiaryDetail(entryId))history.pushState(appRoute(2,"diary",{detail:{type:"diary-entry",id:entryId}}),"");
}
function backToAppLevel(level,fallback){
  const route=currentAppRoute();
  if(route&&route.level>level){history.go(level-route.level);return;}
  fallback?.();
}
function pushChatDrawerRoute(drawer){
  const route=currentAppRoute();
  if(route?.view==="chat"&&!route.drawer){
    history.pushState({...route,level:route.level+1,drawer},"");
  }
}
function closeChatDrawerRoute(drawer,hide){
  if(currentAppRoute()?.drawer===drawer)history.back();else hide();
}
function hideAllChatDrawers(){
  hidePreview();hideHist();hideFav();hideChatSettings();hideMoments();closeMenu();
}
addEventListener("popstate",e=>{
  if(typeof KEEPSAKE_SELECTING!=="undefined"&&KEEPSAKE_SELECTING)stopKeepsakeSelection();
  if(!e.state?.[APP_ROUTE_MARKER])return;
  const keepMusicDetail=e.state.overlay==="music-detail"||(e.state.overlay==="music-note"&&e.state.musicNoteUnderlay==="music-detail");
  if(keepMusicDetail)openMusicDetail(false);
  else if(document.body.classList.contains("music-detail-open"))hideMusicDetail(true);
  if(e.state.overlay==="music-note"&&e.state.musicNoteSong)void openMusicNote(e.state.musicNoteSong,false);
  else hideMusicNote(true);
  if(typeof CURRENT_KEEPSAKE!=="undefined"){
    if(e.state.overlay==="keepsake-detail"){
      const item=(KEEPSAKES||[]).find(value=>value.id===e.state.keepsakeId);
      if(item)openKeepsakeDetail(item,false);
    }else if(CURRENT_KEEPSAKE){hideKeepsakeDetail();}
  }
  if(e.state.overlay==="note-wall"&&!noteWall.classList.contains("on"))void openNoteWall(wallSelectedDate,true);
  else if(e.state.overlay!=="note-wall"&&noteWall.classList.contains("on"))closeNoteWall(true);
  if(typeof currentVoiceArtifact!=="undefined"&&currentVoiceArtifact){
    if(e.state.overlay==="voice")hideVoiceJson(true);
    else if(!e.state.overlay)closeVoiceLetter(true);
  }
  if(!e.state.drawer)hideAllChatDrawers();
  applyAppRoute(e.state);
  if(pendingRootView&&e.state.level===0){
    const target=pendingRootView;pendingRootView=null;
    setTimeout(()=>navigateMain(target),0);
  }
});
$$(".nav-item").forEach(n=>n.addEventListener("click",()=>navigateMain(n.dataset.view)));
$("#chatBack").onclick=()=>navigateMain("home");
$("#cycleEntry").onclick=()=>{cycleToday=new Date();cycleMonth=new Date(cycleToday.getFullYear(),cycleToday.getMonth(),1);cycleSelected=localDateKey(cycleToday);navigateMain("cycle");};
$("#cycleBack").onclick=()=>navigateMain("home");
$("#diaryEntry").onclick=()=>{diarySelectedDate="";diaryFeedScroll=0;$("#view-diary").scrollTop=0;showDiaryFeed();navigateMain("diary");};
$("#diaryBack").onclick=()=>navigateMain("home");

/* ---------- auth ---------- */
const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function settleCore(task,limit=4500){await Promise.race([Promise.resolve(task).catch(()=>{}),pause(limit)]);}
async function dismissBoot(){
  const boot=$("#bootScreen");boot.classList.add("leaving");
  setTimeout(()=>boot.hidden=true,reducedMotion?0:360);
}
function setPassphraseVisible(visible){
  const input=$("#pw"),toggle=$("#pwToggle");
  input.type=visible?"text":"password";
  toggle.setAttribute("aria-pressed",String(visible));
  toggle.setAttribute("aria-label",visible?"Hide passphrase":"Show passphrase");
}
async function showLogin(){
  setPassphraseVisible(false);
  const login=$("#login");login.style.display="flex";
  await dismissBoot();setTimeout(()=>$("#pw").focus(),80);
}
async function enterApp(fromLogin=false){
  await loadIdentity();
  void sakieUiPreferences.start(()=>{applyPrefs();applyChatBg();updateToBottom();});
  $("#app").style.display="block";
  initAppNavigation();
  const homeReady=showView("home");loadProviders();startProactivePolling();
  if(fromLogin){
    await pause(reducedMotion?0:180);
    const login=$("#login");login.classList.add("leaving");
    setTimeout(()=>{login.style.display="none";login.classList.remove("success","leaving");},reducedMotion?0:360);
  }else{
    await dismissBoot();
  }
  // Home details populate independently; they must not hold the app behind a loading mask.
  void Promise.resolve(homeReady).catch(()=>{});
  setTimeout(()=>{if(!sessionId)warmInitialChat();},250);
  void openPushDestination();
}
async function checkAuth(){
  try{const r=await api("/api/auth/check"),data=await r.json();if(data.authed)await enterApp();else await showLogin();}
  catch(e){await showLogin();$("#loginErr").textContent="Unable to connect. Please try again.";}
}
async function doLogin(){
  const button=$("#loginBtn"),login=$("#login");if(button.disabled)return;
  button.disabled=true;$("#loginErr").textContent="";
  try{const r=await api("/api/login",{method:"POST",body:JSON.stringify({password:$("#pw").value})});
    if(r.ok){setPassphraseVisible(false);$("#pw").value="";$("#pw").blur();login.classList.add("success");await enterApp(true);return;}
    $("#loginErr").textContent="That passphrase didn’t match. Try again.";login.classList.remove("wrong");void login.offsetWidth;login.classList.add("wrong");
  }catch(e){$("#loginErr").textContent="Unable to connect. Please try again.";}
  finally{if(!login.classList.contains("success"))button.disabled=false;}
}
$("#pwToggle").onclick=()=>setPassphraseVisible($("#pw").type==="password");
$("#pwToggle").addEventListener("pointerdown",e=>{if(document.activeElement===$("#pw"))e.preventDefault();});
$("#loginBtn").onclick=doLogin;
$("#pw").addEventListener("keydown",e=>{if(e.key==="Enter")doLogin();});
$("#logoutBtn").onclick=async()=>{await api("/api/logout",{method:"POST"});location.reload();};

/* ---------- 小窝 ---------- */
// 问候语：一次会话定一次（不随每次切回小窝重滚）。时段随机抽一句；
// 默认保持中性；久未回来只说欢迎回来，不额外抽亲昵短句。
const GREET={
  dawn:    ["早上好。","今天想聊什么？"],                  // 5-9 清晨
  morning: ["早上好。","今天想聊什么？"],                  // 9-12 上午
  noon:    ["下午好。","想说什么都可以。"],                // 12-18 下午
  evening: ["晚上好。","今天过得怎么样？"],                // 18-23 晚上
  night:   ["想说什么都可以。","今天想聊什么？"],          // 23-5 深夜
  back:    ["欢迎回来。"]                                  // 48h+ 很久回来
};
const GREETING_FIELDS={morning:"#greetingMorning",noon:"#greetingNoon",evening:"#greetingEvening",common:"#greetingCommon"};
const defaultGreetingPrefs=()=>({mode:"timed",morning:"",noon:"",evening:"",common:""});
let GREETING_PREFS=defaultGreetingPrefs(),greetingsLoaded=false,focusedGreetingField="#greetingCommon";
let currentGreeting="",greetingSet=false,greetingTimeBucket="";
const GREETING_CLOCK=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Shanghai",hour:"2-digit",hourCycle:"h23"});
function greetingHour(now=new Date()){return Number(GREETING_CLOCK.format(now));}
function greetingTimeSlot(h){const bucket=greetBucket(h);return bucket==="dawn"?"morning":bucket;}
function refreshGreetingTime(){
  if(!greetingSet||!currentGreeting||GREETING_PREFS.mode==="random")return;
  const slot=greetingTimeSlot(greetingHour());
  if(greetingTimeBucket&&slot!==greetingTimeBucket){currentGreeting=rollGreeting();renderGreeting();}
}
function greetBucket(h){return h<5?"night":h<9?"dawn":h<12?"morning":h<18?"noon":h<23?"evening":"night";}
const greetingLines=value=>String(value||"").split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
function greetingPool(prefs,h,longAway=false){
  const common=greetingLines(prefs.common);
  if(prefs.mode==="random")return common.length?common:GREET.night;
  const bucket=greetBucket(h),field=bucket==="dawn"?"morning":bucket==="night"?"common":bucket;
  const custom=greetingLines(prefs[field]);
  const base=custom.length?custom:GREET[bucket];
  if(longAway&&!custom.length&&!common.length)return GREET.back;
  return base;
}
function rollGreeting(longAway=false,prefs=GREETING_PREFS){
  const h=greetingHour(),pool=greetingPool(prefs,h,longAway);
  if(prefs===GREETING_PREFS)greetingTimeBucket=greetingTimeSlot(h);
  const alternatives=pool.filter(line=>line!==currentGreeting);
  const choices=alternatives.length?alternatives:pool;
  return choices[Math.floor(Math.random()*choices.length)];
}
function greetingText(line){
  const name=greetingName();
  const custom=Object.keys(GREETING_FIELDS).some(field=>greetingLines(GREETING_PREFS[field]).includes(line));
  return line.replaceAll("{你的名字}",name)+(!custom&&["早上好。","下午好。","晚上好。","欢迎回来。"].includes(line)?name:"");
}
function renderGreeting(){if(currentGreeting)$("#greeting").textContent=greetingText(currentGreeting);}
async function loadVisit(){
  if(greetingSet)return; greetingSet=true;
  let longAway=false;
  try{const d=await(await api("/api/visit")).json();
    if(d.last_ms&&Date.now()-d.last_ms>48*3600*1000)longAway=true;}catch(e){/*网络/未配都不挡问候*/}
  currentGreeting=rollGreeting(longAway); renderGreeting();
}
function readGreetingForm(){return {mode:$("#greetingMode").value,...Object.fromEntries(Object.entries(GREETING_FIELDS).map(([field,selector])=>[field,$(selector).value]))};}
function previewGreeting(){
  const prefs=readGreetingForm();
  const pool=greetingPool(prefs,greetingHour());
  const line=pool[Math.floor(Math.random()*pool.length)];
  const custom=Object.keys(GREETING_FIELDS).some(field=>greetingLines(prefs[field]).includes(line));
  $("#greetingPreview").textContent=line.replaceAll("{你的名字}",greetingName())+(!custom&&["早上好。","下午好。","晚上好。","欢迎回来。"].includes(line)?greetingName():"");
}
function renderGreetingForm(){
  $("#greetingMode").value=GREETING_PREFS.mode;
  $("#greetingModeText").textContent=GREETING_PREFS.mode==="random"?"随机":"按时段";
  Object.entries(GREETING_FIELDS).forEach(([field,selector])=>$(selector).value=GREETING_PREFS[field]);
  $("#greetingTimedFields").hidden=GREETING_PREFS.mode==="random";previewGreeting();
}
async function loadGreetingSettings(){
  if(greetingsLoaded)return;
  try{const r=await api("/api/home-greetings");if(!r.ok)throw new Error();GREETING_PREFS=await r.json();greetingsLoaded=true;renderGreetingForm();}
  catch{toast("问候语设置暂时没有读到，本次使用默认问候");}
}
$("#greetingForm").oninput=()=>{ const random=$("#greetingMode").value==="random";$("#greetingModeText").textContent=random?"随机":"按时段";$("#greetingTimedFields").hidden=random;if(random)focusedGreetingField="#greetingCommon";previewGreeting();};
Object.values(GREETING_FIELDS).forEach(selector=>$(selector).onfocus=()=>{focusedGreetingField=selector;});
$("#greetingInsertName").onclick=()=>{
  const area=$(focusedGreetingField);area.setRangeText("{你的名字}",area.selectionStart,area.selectionEnd,"end");area.focus();previewGreeting();
};
$("#greetingPreviewNext").onclick=previewGreeting;
$("#greetingReset").onclick=()=>{ $("#greetingMode").value="timed";$("#greetingModeText").textContent="按时段";Object.values(GREETING_FIELDS).forEach(selector=>$(selector).value="");$("#greetingTimedFields").hidden=false;previewGreeting();toast("已恢复默认，保存后生效");};
$("#greetingForm").onsubmit=async event=>{
  event.preventDefault();const button=event.target.querySelector('[type="submit"]');button.disabled=true;
  try{const r=await api("/api/home-greetings",{method:"PUT",body:JSON.stringify(readGreetingForm())}),data=await r.json();
    if(!r.ok)throw new Error(data.error||"问候语没有保存");
    GREETING_PREFS=data;greetingsLoaded=true;renderGreetingForm();currentGreeting=rollGreeting();greetingSet=true;renderGreeting();toast("问候语已保存");
  }catch(error){toast(error.message||"问候语没有保存");}finally{button.disabled=false;}
};
let treasurySummaryLoading=false;
async function loadTreasurySummary(){
  if(treasurySummaryLoading)return;
  treasurySummaryLoading=true;
  try{
    const r=await api("/api/treasury");if(!r.ok)throw new Error();const state=await r.json();
    const cents=state.transactions.reduce((sum,t)=>sum+t.cents,0),pending=state.requests.filter(q=>q.status==="pending").length;
    $("#treasuryHomeBalance").textContent="余额 ¥"+(cents/100).toFixed(2);
    $("#treasuryHomePending").textContent=pending+" 份待审批";$("#treasuryHomePending").hidden=pending===0;
  }catch{$("#treasuryHomeBalance").textContent="余额暂未读取";$("#treasuryHomePending").hidden=true;}
  finally{treasurySummaryLoading=false;}
}
$("#treasuryEntry").onclick=()=>{const frame=$("#treasuryFrame");if(!frame.src)frame.src="/static/treasury.html";navigateMain("treasury");frame.contentWindow?.postMessage({type:"treasury-refresh"},location.origin);};
let homeWeatherText="天气加载中…";
let TOGETHER_DATE="",togetherLoaded=false;
function calendarDate(now=new Date()){return now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");}
function legacyTogetherDate(){
  const key="nookStartedAt";let saved=localStorage.getItem(key);
  if(!saved||Number.isNaN(new Date(saved).getTime())){saved=new Date().toISOString();saveLocalPreference(key,saved);}
  return calendarDate(new Date(saved));
}
function togetherDays(start=TOGETHER_DATE||legacyTogetherDate(),now=new Date()){
  const first=new Date(start+"T00:00:00Z"),today=new Date(calendarDate(now)+"T00:00:00Z");
  if(Number.isNaN(first.getTime()))return 0;
  return Math.max(0,Math.round((today-first)/86400000)+1);
}
function previewTogether(){ $("#togetherPreview").textContent="在一起的第 "+togetherDays($("#togetherDate").value)+" 天";$("#weDateText").textContent=$("#togetherDate").value||"选择日期";}
async function loadTogetherDate(){
  if(togetherLoaded)return;
  try{const r=await api("/api/together-date");if(!r.ok)throw new Error();TOGETHER_DATE=(await r.json()).date;togetherLoaded=true;
    $("#togetherDate").value=TOGETHER_DATE||legacyTogetherDate();$("#togetherDate").max=calendarDate();previewTogether();tickClock();
  }catch{toast("在一起的日期暂时没有读到，本次保留设备上的日期");}
}
$("#togetherDate").oninput=previewTogether;
$("#togetherForm").onsubmit=async event=>{
  event.preventDefault();const button=event.target.querySelector('[type="submit"]');button.disabled=true;
  try{const r=await api("/api/together-date",{method:"PUT",body:JSON.stringify({date:$("#togetherDate").value})}),data=await r.json();
    if(!r.ok)throw new Error(data.error||"日期没有保存");TOGETHER_DATE=data.date;togetherLoaded=true;previewTogether();tickClock();toast("在一起的日期已保存");
  }catch(error){toast(error.message||"日期没有保存");}finally{button.disabled=false;}
};
// We uses the same bottom sheet as fetched model choices; selection remains a draft.
let weCalendarYear=2026,weCalendarMonth=0;
const weDatePanel=$("#weDatePanel");
function weCalendarDate(year,month,day){
  return String(year).padStart(4,"0")+"-"+String(month+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
}
function weCalendarCells(year,month,today=calendarDate()){
  const date=new Date(0);date.setFullYear(year,month,1);date.setHours(12,0,0,0);
  const offset=date.getDay();date.setMonth(month+1,0);
  return [...Array(offset).fill(null),...Array.from({length:date.getDate()},(_,i)=>{
    const value=weCalendarDate(year,month,i+1);return {day:i+1,value,disabled:value>today};
  })];
}
function renderWeCalendar(){
  $("#weDateYear").value=weCalendarYear;$("#weDateMonth").textContent=weCalendarMonth+1;
  const grid=$("#weDateGrid");grid.replaceChildren();
  weCalendarCells(weCalendarYear,weCalendarMonth).forEach(cell=>{
    if(!cell){grid.appendChild(document.createElement("span"));return;}
    const button=document.createElement("button");button.type="button";button.textContent=cell.day;button.disabled=cell.disabled;
    button.setAttribute("aria-label",cell.value);button.setAttribute("aria-pressed",String(cell.value===$("#togetherDate").value));
    button.onclick=()=>{$("#togetherDate").value=cell.value;previewTogether();closeSheet();};
    grid.appendChild(button);
  });
  $("#weDatePrev").disabled=weCalendarYear===1&&weCalendarMonth===0;
  $("#weDateNext").disabled=weCalendarYear===9999&&weCalendarMonth===11;
}
function moveWeCalendar(step){
  const ordinal=(weCalendarYear-1)*12+weCalendarMonth+step;if(ordinal<0||ordinal>=9999*12)return;
  weCalendarYear=Math.floor(ordinal/12)+1;weCalendarMonth=ordinal%12;renderWeCalendar();
}
$("#wePronounOpen").onclick=()=>{
  openChoiceSheet({title:"如何称呼 ta",items:["他","她","ta"].map(value=>({value,label:value})),value:$("#weAssistantPronoun").value,
    onChoose:value=>{$("#weAssistantPronoun").value=value;$("#wePronounText").textContent=value;}});
};
$("#greetingModeOpen").onclick=()=>openChoiceSheet({title:"问候轮换方式",items:[{value:"timed",label:"按时段"},{value:"random",label:"随机"}],value:$("#greetingMode").value,
  onChoose:value=>{$("#greetingMode").value=value;$("#greetingForm").oninput();}});
$("#weDateOpen").onclick=()=>{
  const parts=($("#togetherDate").value||calendarDate()).split("-").map(Number);
  openContentSheet({title:"从哪一天开始",content:weDatePanel});
  weCalendarYear=parts[0];weCalendarMonth=parts[1]-1;renderWeCalendar();
  $("#weDateClose").onclick=closeSheet;
  $("#weDatePrev").onclick=()=>moveWeCalendar(-1);$("#weDateNext").onclick=()=>moveWeCalendar(1);
  $("#weDateYear").onchange=()=>{
    const year=Number($("#weDateYear").value);if(Number.isInteger(year)&&year>=1&&year<=9999)weCalendarYear=year;
    renderWeCalendar();
  };
};
function tickClock(){
  const d=new Date(),hh=String(d.getHours()).padStart(2,"0"),mm=String(d.getMinutes()).padStart(2,"0"),ss=String(d.getSeconds()).padStart(2,"0");
  $("#clock").innerHTML=hh+'<span class="blink">:</span>'+mm+'<span class="sec">:'+ss+'</span>';
  $("#togetherDays").textContent=togetherDays()+"d";
  const date=d.toLocaleDateString("zh-CN",{month:"long",day:"numeric",weekday:"long"});
  $("#dateLine").textContent=date+" · "+homeWeatherText;
}
setInterval(()=>{if($("#view-home").classList.contains("active")){tickClock();refreshGreetingTime();}},1000);
async function loadHome(){
  tickClock();
  void loadTreasurySummary();
  await Promise.all([loadGreetingSettings(),loadTogetherDate()]);
  refreshGreetingTime();
  $("#assistantStatus").textContent=assistantName()+"在想你";
  const noteTask=(async()=>{const n=await(await api("/api/notes")).json();homeDisplayedNoteId=n.id??null;homeNoteFixed=!!n.fixed;$("#noteText").textContent=n.content||"（还没有便签）";})();
  await Promise.allSettled([loadVisit(),loadCycleHomeStatus(),loadDiaryHomeStatus(),noteTask,loadWeather(),loadTodos()]);
}
async function loadDiaryHomeStatus(){
  const label=$("#diaryEntryStatus");
  try{
    const r=await api("/api/diary/latest"),data=await r.json();
    const day=String(data.created_at||"").slice(0,10);
    if(!r.ok||!day){label.textContent="blank";return;}
    const today=new Date(),todayKey=localDateKey(today),yesterdayKey=localDateKey(addCycleDays(today,-1));
    if(day===todayKey)label.textContent="today";
    else if(day===yesterdayKey)label.textContent="yesterday";
    else label.textContent=new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric"}).format(parseDateKey(day));
  }catch{label.textContent="blank";}
}

/* ---------- Cycle（经期与亲密记录） ---------- */
const CYCLE_SYMPTOMS=["小腹坠胀","腹痛","腰酸","头晕","头痛","乏力","嗜睡","失眠","情绪低落","烦躁","恶心","腹泻","便秘","胸部胀痛","食欲增加","长痘"];
let cycleToday=new Date();
let cycleMonth=new Date(cycleToday.getFullYear(),cycleToday.getMonth(),1);
let cycleSelected=localDateKey(cycleToday),cycleData={records:[],intimacy:[],private_notes:[],period_starts:[],prediction:{cycle_days:28,period_days:5,ovulation_offset:14}};
let cycleSymptomDraft=[],cycleRecordMode="period",editingIntimacyId=null;
function localDateKey(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");}
function parseDateKey(key){const p=String(key).split("-").map(Number);return new Date(p[0],p[1]-1,p[2]);}
function addCycleDays(d,n){const out=new Date(d.getFullYear(),d.getMonth(),d.getDate());out.setDate(out.getDate()+n);return out;}
async function loadCycleHomeStatus(){
  const label=$("#cycleEntryStatus"),today=new Date(),todayKey=localDateKey(today),todayStart=parseDateKey(todayKey);
  try{
    const r=await api("/api/cycle?from="+todayKey+"&to="+todayKey),data=await r.json();
    if(!r.ok)throw new Error(data.error||"读取失败");
    const record=(data.records||[]).find(item=>item.record_date===todayKey);
    if(record?.menstruation===true){label.textContent="潮汐中";return;}
    const cycleDays=data.prediction?.cycle_days||28;
    const starts=(data.period_starts||[]).map(parseDateKey).filter(d=>!Number.isNaN(d.getTime())&&d<=todayStart).sort((a,b)=>a-b);
    if(!starts.length){label.textContent="寻常日";return;}
    const last=starts[starts.length-1];
    let next=addCycleDays(last,cycleDays);
    while(next<todayStart)next=addCycleDays(next,cycleDays);
    const daysUntil=Math.round((next-todayStart)/86400000);
    if(daysUntil<=3){label.textContent="潮汐将近";return;}
    const elapsed=Math.max(0,Math.floor((todayStart-last)/86400000));
    const currentCycle=addCycleDays(last,Math.floor(elapsed/cycleDays)*cycleDays);
    const ovulation=addCycleDays(currentCycle,cycleDays-(data.prediction?.ovulation_offset||14));
    label.textContent=todayStart>=addCycleDays(ovulation,-5)&&todayStart<=addCycleDays(ovulation,1)?"花期中":"寻常日";
  }catch(e){label.textContent="寻常日";}
}
function cycleGridRange(){return {start:new Date(cycleMonth.getFullYear(),cycleMonth.getMonth(),1),end:new Date(cycleMonth.getFullYear(),cycleMonth.getMonth()+1,0)};}
function cycleMaps(){const intimacy=new Map();(cycleData.intimacy||[]).forEach(r=>{if(!intimacy.has(r.record_date))intimacy.set(r.record_date,[]);intimacy.get(r.record_date).push(r);});
  return {records:new Map((cycleData.records||[]).map(r=>[r.record_date,r])),intimacy};}
function cyclePredictionSets(range){
  const predicted=new Set(),fertile=new Set(),ovulation=new Set(),cfg=cycleData.prediction||{},cycleDays=cfg.cycle_days||28,periodDays=cfg.period_days||5,offset=cfg.ovulation_offset||14;
  const starts=(cycleData.period_starts||[]).map(parseDateKey).filter(d=>!Number.isNaN(d.getTime())).sort((a,b)=>a-b);
  if(!starts.length)return {predicted,fertile,ovulation};
  const last=starts[starts.length-1];
  const cycleBases=[last];for(let n=1;n<18;n++){const base=addCycleDays(last,cycleDays*n);if(base>addCycleDays(range.end,cycleDays))break;cycleBases.push(base);}
  cycleBases.forEach((base,index)=>{
    if(index>0)for(let i=0;i<periodDays;i++)predicted.add(localDateKey(addCycleDays(base,i)));
    const ovu=addCycleDays(base,cycleDays-offset);ovulation.add(localDateKey(ovu));
    for(let i=-5;i<=1;i++)if(i!==0)fertile.add(localDateKey(addCycleDays(ovu,i)));
  });
  return {predicted,fertile,ovulation};
}
async function loadCycle(){
  const range=cycleGridRange();
  try{const r=await api("/api/cycle?from="+localDateKey(range.start)+"&to="+localDateKey(range.end));const data=await r.json();if(!r.ok)throw new Error(data.error||"读取失败");cycleData=data;}
  catch(e){toast("经期记录暂时没读到");cycleData={records:[],intimacy:[],private_notes:[],period_starts:[],prediction:{cycle_days:28,period_days:5,ovulation_offset:14}};}
  renderCycle();
}
function renderCycle(){renderCycleCalendar();renderCycleDetails();}
function renderCycleCalendar(){
  const range=cycleGridRange(),maps=cycleMaps(),pred=cyclePredictionSets(range),grid=$("#cycleGrid");grid.innerHTML="";
  $("#cycleMonthLabel").textContent=cycleMonth.getFullYear()+"."+String(cycleMonth.getMonth()+1).padStart(2,"0");
  const leading=(range.start.getDay()+6)%7,days=range.end.getDate(),cells=Math.ceil((leading+days)/7)*7;
  for(let i=0;i<cells;i++){
    const day=i-leading+1;if(day<1||day>days){const empty=document.createElement("span");empty.className="cycle-day-placeholder";grid.appendChild(empty);continue;}
    const date=new Date(cycleMonth.getFullYear(),cycleMonth.getMonth(),day),key=localDateKey(date),record=maps.records.get(key),intimacy=maps.intimacy.get(key)||[];
    const btn=document.createElement("button");btn.className="cycle-day";btn.type="button";btn.dataset.date=key;
    if(key===cycleSelected)btn.classList.add("selected");if(key===localDateKey(cycleToday))btn.classList.add("today");
    if(record&&record.menstruation===true)btn.classList.add("period");
    else if(pred.predicted.has(key))btn.classList.add("predicted");
    else if(pred.ovulation.has(key))btn.classList.add("ovulation");
    else if(pred.fertile.has(key))btn.classList.add("fertile");
    btn.innerHTML='<span class="day-ring">'+(key===localDateKey(cycleToday)?"今":date.getDate())+'</span><span class="cycle-day-marks"></span>';
    const marks=btn.querySelector(".cycle-day-marks");
    if(record&&Array.isArray(record.symptoms)&&record.symptoms.length){const dot=document.createElement("i");dot.className="cycle-symptom-dot";marks.appendChild(dot);}
    if(intimacy.length){const heart=document.createElement("i");heart.className="cycle-heart";marks.appendChild(heart);}
    btn.onclick=()=>{cycleSelected=key;renderCycle();};
    grid.appendChild(btn);
  }
}
function selectedCycleRecord(){return (cycleData.records||[]).find(r=>r.record_date===cycleSelected)||{record_date:cycleSelected,menstruation:null,flow:0,pain:0,symptoms:[]};}
function renderCycleDetails(){
  const date=parseDateKey(cycleSelected),record=selectedCycleRecord(),weekday="日一二三四五六"[date.getDay()];
  $("#cycleSelectedDate").textContent=(date.getMonth()+1)+"月"+date.getDate()+"日 · 周"+weekday;
  const periodMode=cycleRecordMode==="period";$("#cyclePeriodView").hidden=!periodMode;$("#cycleIntimacyView").hidden=periodMode;
  $("#cyclePanelTitle").textContent=periodMode?"经期记录":"亲密记录";
  $("#cyclePeriodTab").classList.toggle("on",periodMode);$("#cycleIntimacyTab").classList.toggle("on",!periodMode);
  $("#cyclePeriodTab").setAttribute("aria-selected",String(periodMode));$("#cycleIntimacyTab").setAttribute("aria-selected",String(!periodMode));
  $$("#cycleMenstruation button").forEach(b=>b.classList.toggle("on",record.menstruation!==null&&Number(b.dataset.value)===Number(record.menstruation)));
  const came=record.menstruation===true;$("#cycleFlowRow").hidden=!came;$("#cyclePainRow").hidden=!came;
  $$("#cycleFlow button").forEach(b=>b.classList.toggle("on",Number(b.dataset.value)<=Number(record.flow)));
  $$("#cyclePain button").forEach(b=>b.classList.toggle("on",Number(b.dataset.value)<=Number(record.pain)));
  $("#cycleSymptomsValue").textContent=(record.symptoms||[]).length?record.symptoms.join("、"):"选择症状";
  const list=$("#cycleIntimacyList"),items=(cycleData.intimacy||[]).filter(r=>r.record_date===cycleSelected);list.innerHTML="";
  if(!items.length)list.innerHTML='<span class="cycle-empty">这天还没有记录</span>';
  else items.forEach(item=>{const row=document.createElement("div");row.className="intimacy-entry";
    row.innerHTML='<button class="intimacy-entry-main" type="button"><span class="intimacy-entry-heart">'+(item.note?"♥":"♡")+'</span><span class="intimacy-entry-time"></span></button><button class="intimacy-entry-delete" type="button" aria-label="删除这条时间">×</button>';
    row.querySelector(".intimacy-entry-time").textContent=item.record_time;row.querySelector(".intimacy-entry-main").onclick=()=>openIntimacyModal(item);
    row.querySelector(".intimacy-entry-delete").onclick=async()=>{const r=await api("/api/cycle/intimacy/"+item.id,{method:"DELETE"});if(r.ok)loadCycle();};list.appendChild(row);});
}
async function saveCycleRecord(patch,autoFill=false){
  const current=selectedCycleRecord(),body={menstruation:current.menstruation,flow:current.flow||0,pain:current.pain||0,symptoms:current.symptoms||[],...patch};
  if(autoFill)body.auto_fill=true;
  if(body.menstruation!==true){body.flow=0;body.pain=0;}
  const r=await api("/api/cycle/records/"+cycleSelected,{method:"PUT",body:JSON.stringify(body)}),data=await r.json();
  if(!r.ok){toast(data.error||"保存失败");return;}await loadCycle();
}
$("#cyclePrevMonth").onclick=()=>{cycleMonth=new Date(cycleMonth.getFullYear(),cycleMonth.getMonth()-1,1);cycleSelected=localDateKey(cycleMonth);loadCycle();};
$("#cycleNextMonth").onclick=()=>{cycleMonth=new Date(cycleMonth.getFullYear(),cycleMonth.getMonth()+1,1);cycleSelected=localDateKey(cycleMonth);loadCycle();};
$("#cyclePeriodTab").onclick=()=>{cycleRecordMode="period";renderCycleDetails();};
$("#cycleIntimacyTab").onclick=()=>{cycleRecordMode="intimacy";renderCycleDetails();};
$("#cycleMenstruation").onclick=e=>{const b=e.target.closest("button");if(b){const came=b.dataset.value==="1";saveCycleRecord({menstruation:came},came);}};
$("#cycleFlow").onclick=e=>{const b=e.target.closest("button");if(b)saveCycleRecord({flow:Number(b.dataset.value)});};
$("#cyclePain").onclick=e=>{const b=e.target.closest("button");if(b)saveCycleRecord({pain:Number(b.dataset.value)});};
$("#cycleClear").onclick=async()=>{const r=await api("/api/cycle/records/"+cycleSelected,{method:"DELETE"});if(r.ok){toast("当天记录已清除");loadCycle();}};
function toggleCycleModal(name,on){$("#"+name+"Mask").classList.toggle("on",on);$("#"+name+"Modal").classList.toggle("on",on);}
$("#cycleSymptomsOpen").onclick=()=>{cycleSymptomDraft=[...(selectedCycleRecord().symptoms||[])];const box=$("#cycleSymptomOptions");box.innerHTML="";
  CYCLE_SYMPTOMS.forEach(name=>{const b=document.createElement("button");b.type="button";b.className="symptom-chip"+(cycleSymptomDraft.includes(name)?" on":"");b.textContent=name;
    b.onclick=()=>{if(cycleSymptomDraft.includes(name))cycleSymptomDraft=cycleSymptomDraft.filter(x=>x!==name);else cycleSymptomDraft.push(name);b.classList.toggle("on");};box.appendChild(b);});toggleCycleModal("cycleSymptoms",true);};
$("#cycleSymptomsCancel").onclick=()=>toggleCycleModal("cycleSymptoms",false);$("#cycleSymptomsMask").onclick=()=>toggleCycleModal("cycleSymptoms",false);
$("#cycleSymptomsSave").onclick=async()=>{toggleCycleModal("cycleSymptoms",false);await saveCycleRecord({symptoms:cycleSymptomDraft});};
function openIntimacyModal(item=null){const now=new Date();editingIntimacyId=item?item.id:null;$("#cycleTimeTitle").textContent=item?"编辑亲密记录":"记录亲密时间";
  $("#cycleTimeInput").value=item?item.record_time:String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0");$("#cycleTimeNote").value=item?(item.note||""):"";$("#cycleTimeSave").textContent=item?"保存":"添加";
  const replyBox=$("#cycleAssistantReply"),replyText=$("#cycleAssistantReplyText");replyBox.hidden=!item;if(item){const reply=(item.assistant_reply||"").trim();replyText.textContent=reply||assistantName()+"还没有在这里留下话。";replyText.classList.toggle("empty",!reply);}toggleCycleModal("cycleTime",true);}
$("#cycleIntimacyAdd").onclick=()=>openIntimacyModal();
$("#cycleTimeCancel").onclick=()=>toggleCycleModal("cycleTime",false);$("#cycleTimeMask").onclick=()=>toggleCycleModal("cycleTime",false);
$("#cycleTimeSave").onclick=async()=>{const time=$("#cycleTimeInput").value,note=$("#cycleTimeNote").value;if(!time){toast("选一个时间吧");return;}
  const editing=editingIntimacyId!==null,path=editing?"/api/cycle/intimacy/"+editingIntimacyId:"/api/cycle/intimacy",body=editing?{time,note}:{date:cycleSelected,time,note};
  const r=await api(path,{method:editing?"PUT":"POST",body:JSON.stringify(body)}),data=await r.json();if(!r.ok){toast(data.error||(editing?"保存失败":"添加失败"));return;}toggleCycleModal("cycleTime",false);editingIntimacyId=null;loadCycle();};
$("#cycleSettingsOpen").onclick=()=>{const cfg=cycleData.prediction||{};$("#cycleDaysInput").value=cfg.cycle_days||28;$("#periodDaysInput").value=cfg.period_days||5;toggleCycleModal("cycleSettings",true);};
$("#cycleSettingsCancel").onclick=()=>toggleCycleModal("cycleSettings",false);$("#cycleSettingsMask").onclick=()=>toggleCycleModal("cycleSettings",false);
$$(".cycle-number button").forEach(button=>button.onclick=()=>{const input=$("#"+button.dataset.target),min=Number(input.min),max=Number(input.max),next=Math.min(max,Math.max(min,Number(input.value||min)+Number(button.dataset.step)));input.value=next;});
$("#cycleSettingsSave").onclick=async()=>{const cycle_days=Number($("#cycleDaysInput").value),period_days=Number($("#periodDaysInput").value);
  const r=await api("/api/cycle/settings",{method:"PUT",body:JSON.stringify({cycle_days,period_days})}),data=await r.json();if(!r.ok){toast(data.error||"设置没有保存");return;}
  cycleData.prediction=data;toggleCycleModal("cycleSettings",false);renderCycleCalendar();toast("周期设置已保存");};

/* ---------- kept 日记本 ---------- */
const DIARY_AUTHORS={get user(){return userName();},get assistant(){return assistantName();}};
const DIARY_COMMENT_EMOJIS={get user(){return commentAuthorName("user");},get assistant(){return commentAuthorName("assistant");}};
const DIARY_TAGS={bubble:"light",dive:"thoughts",anchor:"anchor"};
let diaryEntries=[],diaryTag="",diarySelectedDate="",diaryCalendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
let diaryCalendarDays=new Set(),diaryReplyTarget=null,diaryDetailId=null,diaryDetailEntry=null,diaryDraftTag="light",diarySearchQuery="",diaryFeedScroll=0,diaryDetailScroll=0;
const diaryStamp=value=>String(value||"").slice(0,16);
const diaryDay=value=>diaryStamp(value).slice(0,10);
const diaryTime=value=>diaryStamp(value).slice(11,16);
function diaryDateLabel(key){
  const today=localDateKey(new Date()),yesterday=localDateKey(addCycleDays(new Date(),-1));
  const parts=key.split("-").map(Number),plain=parts[1]+"月"+parts[2]+"日";
  return key===today?"今天 · "+plain:key===yesterday?"昨天 · "+plain:plain;
}
function diaryFullStamp(value){
  const stamp=diaryStamp(value),p=stamp.slice(0,10).split("-").map(Number);
  return p[0]+"年"+p[1]+"月"+p[2]+"日 · "+stamp.slice(11,16);
}
function diaryAuthorColor(author){return author==="assistant"?"var(--diary-assistant)":"var(--diary-user)";}
function diaryTagMarkup(tag){return '<span class="diary-tag tag-'+tag+'">'+escHtml(DIARY_TAGS[tag]||tag)+'</span>';}
function diaryFavoriteMarkup(entry){return entry&&entry.favorite?'<span class="diary-favorite-mark" aria-label="favorite">♥</span>':'';}
function diaryNookIcon(){
  return '<svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.6 8.6 0 0 1-3.2-.7L4 20l1.6-4.3A7.2 7.2 0 0 1 4.5 12 7.5 7.5 0 0 1 12 4.5a7.5 7.5 0 0 1 8 7Z"/></svg>';
}
function diaryDeletePreview(value){
  const text=String(value||"").trim(),lines=text.split(/\r?\n/).slice(0,3).join("\n");
  const preview=lines.length>120?lines.slice(0,120).trimEnd():lines;
  return preview+(preview.length<text.length?"…":"");
}
async function loadDiary(){
  const params=new URLSearchParams();if(diaryTag)params.set("tag",diaryTag);if(diarySelectedDate)params.set("date",diarySelectedDate);if(diarySearchQuery)params.set("q",diarySearchQuery);
  const stream=$("#diaryStream");stream.innerHTML='<div class="diary-empty">turning the pages…</div>';
  try{
    const r=await api("/api/diary"+(params.toString()?"?"+params:"")),data=await r.json();
    if(!r.ok)throw new Error(data.error||"日记本没有打开");
    diaryEntries=data;renderDiaryStream();
  }catch(e){stream.innerHTML='<div class="diary-empty">'+escHtml(e.message||"日记本暂时没有应声")+'</div>';}
  $("#diaryDayFilter").hidden=!diarySelectedDate;
  if(diarySelectedDate)$("#diaryDayFilter").textContent="只看 "+diaryDateLabel(diarySelectedDate)+"  ×";
  if(!$("#diaryCalendarPopover").hidden)loadDiaryCalendar();
}
function renderDiaryStream(){
  const stream=$("#diaryStream");stream.innerHTML="";
  if(!diaryEntries.length){stream.innerHTML='<div class="diary-empty">这几页还是空白的。</div>';return;}
  let lastDay="",dayEntries=null;
  diaryEntries.forEach(entry=>{
    const day=diaryDay(entry.created_at);
    if(day!==lastDay){
      const group=document.createElement("section");group.className="diary-day-group";
      const divider=document.createElement("div");divider.className="diary-date-divider";divider.textContent=diaryDateLabel(day);
      dayEntries=document.createElement("div");dayEntries.className="diary-day-entries";
      group.append(divider,dayEntries);stream.appendChild(group);lastDay=day;
    }
    const item=document.createElement("article");item.className="diary-item";item.style.setProperty("--author-color",diaryAuthorColor(entry.author));
    const commentCount=(entry.comments||[]).length,firstComment=(entry.comments||[])[0];
    const comments=(firstComment?[firstComment]:[]).map(comment=>
      '<div class="diary-comment-preview" style="--comment-color:'+diaryAuthorColor(comment.author)+'">'+
      '<span class="who" data-identity-comment-author="'+escHtml(comment.author)+'" aria-label="'+escHtml(DIARY_COMMENT_EMOJIS[comment.author]||"·")+'">'+escHtml(DIARY_COMMENT_EMOJIS[comment.author]||"·")+'</span>'+
      '<time>'+escHtml(diaryTime(comment.created_at))+'</time><span class="text">'+escHtml(comment.content)+'</span></div>'
    ).join("");
    item.innerHTML='<button class="diary-entry-open" type="button">'+
      '<div class="diary-meta"><span class="diary-person-line"><span class="diary-initial">'+escHtml(DIARY_AUTHORS[entry.author]||entry.author)+'</span><span class="sep">·</span><time class="diary-time">'+escHtml(diaryTime(entry.created_at))+'</time></span><span class="diary-entry-labels">'+diaryFavoriteMarkup(entry)+diaryTagMarkup(entry.tag)+'</span></div>'+
      '<div class="diary-excerpt">'+escHtml(entry.content)+'</div></button>'+
      (comments?'<div class="diary-comments-preview">'+comments+'</div>':'')+
      '<button class="diary-reply-open" type="button" aria-label="'+(commentCount?('查看 '+commentCount+' 条留言'):'给这页日记留言')+'">'+diaryNookIcon()+(commentCount?'<span class="diary-reply-count">'+commentCount+'</span>':'')+'</button>';
    const openButton=item.querySelector(".diary-entry-open");
    openButton.onclick=()=>{if(openButton._diaryLongPressed){openButton._diaryLongPressed=false;return;}navigateDiaryDetail(entry.id);};
    bindDiaryEntryLongPress(openButton,entry,true);
    item.querySelector(".diary-reply-open").onclick=()=>commentCount?navigateDiaryDetail(entry.id):openDiaryReply(entry);
    dayEntries.appendChild(item);
  });
}
function showDiaryFeed(){
  diaryDetailId=null;diaryDetailEntry=null;$("#diaryFeedPanel").hidden=false;$("#diaryDetailPanel").hidden=true;
  requestAnimationFrame(()=>{$("#view-diary").scrollTop=diaryFeedScroll;});
}
async function openDiaryDetail(entryId){
  try{
    const r=await api("/api/diary/"+entryId),entry=await r.json();if(!r.ok)throw new Error(entry.error||"这页没有找到");
    const view=$("#view-diary"),entering=!$("#diaryFeedPanel").hidden;
    if(entering){diaryFeedScroll=view.scrollTop;diaryDetailScroll=0;}else diaryDetailScroll=view.scrollTop;
    diaryDetailId=entryId;diaryDetailEntry=entry;renderDiaryDetail(entry);$("#diaryFeedPanel").hidden=true;$("#diaryDetailPanel").hidden=false;
    requestAnimationFrame(()=>{view.scrollTop=diaryDetailScroll;});
    return true;
  }catch(e){toast(e.message||"这页没有找到");return false;}
}
function renderDiaryDetail(entry){
  const comments=(entry.comments||[]).map(comment=>
    '<div class="diary-paper-comment editable" data-comment-id="'+comment.id+'" style="--comment-color:'+diaryAuthorColor(comment.author)+'">'+
    '<div class="diary-paper-comment-head"><strong data-identity-comment-author="'+escHtml(comment.author)+'" aria-label="'+escHtml(DIARY_COMMENT_EMOJIS[comment.author]||"·")+'">'+escHtml(DIARY_COMMENT_EMOJIS[comment.author]||"·")+'</strong><time>'+escHtml(diaryFullStamp(comment.created_at))+'</time></div>'+
    '<div class="diary-paper-comment-text">'+escHtml(comment.content)+'</div>'+
    '<button class="diary-comment-delete" type="button" aria-label="删除这条留言">×</button></div>'
  ).join("");
  const paper=$("#diaryPaper");paper.innerHTML=
    '<time class="diary-paper-date">'+escHtml(diaryFullStamp(entry.created_at))+'</time>'+
    '<div class="diary-paper-meta"><span class="diary-author" style="color:'+diaryAuthorColor(entry.author)+'">'+escHtml(DIARY_AUTHORS[entry.author]||entry.author)+'</span><span class="diary-entry-labels">'+diaryFavoriteMarkup(entry)+diaryTagMarkup(entry.tag)+'</span></div>'+
    '<div class="diary-paper-content">'+escHtml(entry.content)+'</div>'+
    (comments?'<div class="diary-paper-comments">'+comments+'</div>':'')+
    '<button class="diary-paper-reply" type="button">'+diaryNookIcon()+' 留一句话</button>';
  paper.querySelector(".diary-paper-reply").onclick=()=>openDiaryReply(entry);
  bindDiaryEntryLongPress(paper.querySelector(".diary-paper-content"),entry);
  paper.querySelectorAll(".diary-paper-comment.editable").forEach(row=>{
    row.onclick=e=>{e.stopPropagation();paper.querySelectorAll(".diary-paper-comment.delete-ready").forEach(other=>{if(other!==row)other.classList.remove("delete-ready");});row.classList.toggle("delete-ready");};
    row.querySelector(".diary-comment-delete").onclick=async e=>{
      e.stopPropagation();
      const comment=(entry.comments||[]).find(item=>String(item.id)===row.dataset.commentId);if(!comment)return;
      const confirmed=await bubbleConfirm({title:"删掉这句留言？",message:diaryDeletePreview(comment.content),note:"删掉以后就找不回来啦。",cancelText:"再留一会",confirmText:"删除",danger:true});
      if(!confirmed)return;
      const r=await api("/api/diary/comments/"+comment.id,{method:"DELETE"}),data=await r.json().catch(()=>({}));
      if(!r.ok){toast(data.error||"留言没有删掉");return;}await openDiaryDetail(entry.id);await loadDiary();toast("留言已删除");
    };
  });
}
document.addEventListener("click",()=>$$(".diary-paper-comment.delete-ready").forEach(row=>row.classList.remove("delete-ready")));
function bindDiaryEntryLongPress(target,entry,suppressClick=false){
  if(!target||!entry)return;
  let timer=null,startX=0,startY=0;
  const cancel=()=>{clearTimeout(timer);timer=null;};
  target.addEventListener("touchstart",e=>{const touch=e.touches[0];startX=touch.clientX;startY=touch.clientY;cancel();timer=setTimeout(()=>{if(suppressClick){target._diaryLongPressed=true;setTimeout(()=>{target._diaryLongPressed=false;},900);}openDiaryEntryAction(entry);},520);},{passive:true});
  target.addEventListener("touchmove",e=>{const touch=e.touches[0];if(Math.abs(touch.clientX-startX)>8||Math.abs(touch.clientY-startY)>8)cancel();},{passive:true});
  target.addEventListener("touchend",cancel);target.addEventListener("touchcancel",cancel);
  target.addEventListener("contextmenu",e=>{e.preventDefault();openDiaryEntryAction(entry);});
}
function openDiaryEntryAction(entry){
  if(!entry)return;
  diaryDetailEntry=entry;$("#diaryEntryActionPreview").textContent=entry.content;
  $("#diaryEntryFavorite").textContent=entry.favorite?"取消 favorite":"favorite";
  $("#diaryEntryActionMask").classList.add("on");$("#diaryEntryActionCard").classList.add("on");
}
function closeDiaryEntryAction(){$("#diaryEntryActionMask").classList.remove("on");$("#diaryEntryActionCard").classList.remove("on");}
$("#diaryEntryActionMask").onclick=closeDiaryEntryAction;
$("#diaryEntryFavorite").onclick=async()=>{
  const entry=diaryDetailEntry;if(!entry)return;const favorite=!entry.favorite;
  const r=await api("/api/diary/"+entry.id+"/favorite",{method:"PUT",body:JSON.stringify({favorite})}),data=await r.json().catch(()=>({}));
  if(!r.ok){toast(data.error||"收藏状态没有收好");return;}entry.favorite=!!data.favorite;closeDiaryEntryAction();
  if(diaryDetailEntry&&diaryDetailEntry.id===entry.id){diaryDetailEntry.favorite=entry.favorite;if(!$("#diaryDetailPanel").hidden)renderDiaryDetail(diaryDetailEntry);}
  await loadDiary();toast(favorite?"已收藏这一页":"已取消收藏");
};
$("#diaryEntryModify").onclick=()=>{closeDiaryEntryAction();startDiaryInlineEdit();};
$("#diaryEntryDelete").onclick=async()=>{
  const entry=diaryDetailEntry;closeDiaryEntryAction();if(!entry)return;
  const confirmed=await bubbleConfirm({title:"删掉这一页？",message:diaryDeletePreview(entry.content),note:"这一页和下面的留言都会一起消失。",cancelText:"再留一会",confirmText:"删除",danger:true});
  if(!confirmed)return;
  const r=await api("/api/diary/"+entry.id,{method:"DELETE"}),data=await r.json().catch(()=>({}));
  if(!r.ok){toast(data.error||"这一页没有删掉");return;}backToAppLevel(1,showDiaryFeed);await loadDiary();toast("这一页已删除");
};
function startDiaryInlineEdit(){
  const entry=diaryDetailEntry,content=$("#diaryPaper .diary-paper-content");if(!entry||!content)return;
  const editor=document.createElement("div");editor.className="diary-paper-edit";
  editor.innerHTML='<textarea maxlength="10000" aria-label="修改日记正文"></textarea><div class="diary-paper-edit-foot"><button class="diary-paper-edit-cancel" type="button">取消</button><button class="diary-paper-edit-save" type="button">保存</button></div>';
  const textarea=editor.querySelector("textarea");textarea.value=entry.content;content.replaceWith(editor);
  editor.querySelector(".diary-paper-edit-cancel").onclick=()=>renderDiaryDetail(entry);
  editor.querySelector(".diary-paper-edit-save").onclick=async()=>{
    const value=textarea.value.trim(),button=editor.querySelector(".diary-paper-edit-save");if(!value){toast("这一页不能是空白的");return;}
    button.disabled=true;
    try{const r=await api("/api/diary/"+entry.id,{method:"PUT",body:JSON.stringify({content:value})}),data=await r.json();
      if(!r.ok)throw new Error(data.error||"这一页没有改好");diaryDetailEntry=data;renderDiaryDetail(data);await loadDiary();toast("这一页改好了");
    }catch(e){toast(e.message||"这一页没有改好");button.disabled=false;}
  };
  requestAnimationFrame(()=>{textarea.focus();textarea.setSelectionRange(textarea.value.length,textarea.value.length);});
}
$("#diaryDetailBack").onclick=()=>backToAppLevel(1,showDiaryFeed);
function setDiaryPopover(kind,on){
  const cal=$("#diaryCalendarPopover"),filter=$("#diaryFilterPopover");
  cal.hidden=!(kind==="calendar"&&on);filter.hidden=!(kind==="filter"&&on);
  $("#diaryCalendarOpen").setAttribute("aria-expanded",String(!cal.hidden));
  $("#diaryFilterOpen").setAttribute("aria-expanded",String(!filter.hidden));
}
$("#diaryCalendarOpen").onclick=async e=>{e.stopPropagation();const opening=$("#diaryCalendarPopover").hidden;setDiaryPopover("calendar",opening);if(opening)await loadDiaryCalendar();};
$("#diaryFilterOpen").onclick=e=>{e.stopPropagation();setDiaryPopover("filter",$("#diaryFilterPopover").hidden);};
$("#diaryCalendarPopover").onclick=e=>e.stopPropagation();$("#diaryFilterPopover").onclick=e=>e.stopPropagation();
document.addEventListener("click",()=>setDiaryPopover("",false));
let diarySearchHideTimer=null,diarySearchDebounce=null,diaryPullStartY=null,diaryPullDistance=0;
function scheduleDiarySearchHide(){
  clearTimeout(diarySearchHideTimer);
  if($("#diarySearchInput").value.trim())return;
  diarySearchHideTimer=setTimeout(()=>closeDiarySearch(),3000);
}
function openDiarySearch(focus=false){
  const reveal=$("#diarySearchReveal");reveal.classList.remove("pulling");reveal.style.height="";reveal.classList.add("open");
  if(focus)requestAnimationFrame(()=>$("#diarySearchInput").focus());
  scheduleDiarySearchHide();
}
function closeDiarySearch(){
  if($("#diarySearchInput").value.trim())return;
  clearTimeout(diarySearchHideTimer);const reveal=$("#diarySearchReveal");reveal.classList.remove("pulling","open");reveal.style.height="";
  $("#diarySearchInput").blur();
}
$("#view-diary").addEventListener("touchstart",e=>{
  if($("#diaryFeedPanel").hidden||$("#view-diary").scrollTop>0||!e.target.closest(".diary-wordmark"))return;
  diaryPullStartY=e.touches[0].clientY;diaryPullDistance=0;clearTimeout(diarySearchHideTimer);
},{passive:true});
$("#view-diary").addEventListener("touchmove",e=>{
  if(diaryPullStartY===null)return;
  diaryPullDistance=Math.max(0,e.touches[0].clientY-diaryPullStartY);
  if(diaryPullDistance<3)return;
  e.preventDefault();const reveal=$("#diarySearchReveal");reveal.classList.add("pulling");
  reveal.style.height=Math.min(52,diaryPullDistance*.72)+"px";
},{passive:false});
function finishDiaryPull(){
  if(diaryPullStartY===null)return;
  const shouldOpen=diaryPullDistance>=26;diaryPullStartY=null;
  if(shouldOpen)openDiarySearch(true);else closeDiarySearch();
}
$("#view-diary").addEventListener("touchend",finishDiaryPull,{passive:true});
$("#view-diary").addEventListener("touchcancel",finishDiaryPull,{passive:true});
$("#diarySearchInput").addEventListener("input",e=>{
  clearTimeout(diarySearchHideTimer);clearTimeout(diarySearchDebounce);diarySearchQuery=e.target.value.trim();
  diarySearchDebounce=setTimeout(loadDiary,180);if(!diarySearchQuery)scheduleDiarySearchHide();
});
async function loadDiaryCalendar(){
  const month=diaryCalendarMonth.getFullYear()+"-"+String(diaryCalendarMonth.getMonth()+1).padStart(2,"0");
  $("#diaryCalendarLabel").textContent=diaryCalendarMonth.getFullYear()+"."+String(diaryCalendarMonth.getMonth()+1).padStart(2,"0");
  try{
    const r=await api("/api/diary/calendar?month="+month),data=await r.json();
    diaryCalendarDays=new Set((Array.isArray(data)?data:[]).map(item=>item.date));
  }catch{diaryCalendarDays=new Set();}
  renderDiaryCalendar();
}
function renderDiaryCalendar(){
  const grid=$("#diaryCalendarGrid");grid.innerHTML="";
  const year=diaryCalendarMonth.getFullYear(),month=diaryCalendarMonth.getMonth(),first=new Date(year,month,1);
  const offset=(first.getDay()+6)%7,total=new Date(year,month+1,0).getDate(),today=localDateKey(new Date());
  for(let i=0;i<offset;i++)grid.appendChild(document.createElement("span"));
  for(let day=1;day<=total;day++){
    const key=year+"-"+String(month+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),button=document.createElement("button");
    button.type="button";button.textContent=day;button.classList.toggle("has-entry",diaryCalendarDays.has(key));
    button.classList.toggle("selected",diarySelectedDate===key);button.classList.toggle("today",today===key);
    button.onclick=()=>{diarySelectedDate=key;setDiaryPopover("",false);loadDiary();};grid.appendChild(button);
  }
}
$("#diaryCalendarPrev").onclick=()=>{diaryCalendarMonth=new Date(diaryCalendarMonth.getFullYear(),diaryCalendarMonth.getMonth()-1,1);loadDiaryCalendar();};
$("#diaryCalendarNext").onclick=()=>{diaryCalendarMonth=new Date(diaryCalendarMonth.getFullYear(),diaryCalendarMonth.getMonth()+1,1);loadDiaryCalendar();};
$("#diaryDayFilter").onclick=()=>{diarySelectedDate="";loadDiary();};
$("#diaryFilterPopover").onclick=e=>{
  e.stopPropagation();const button=e.target.closest("button");if(!button)return;
  diaryTag=button.dataset.tag||"";$$(".diary-filter-popover button").forEach(b=>b.classList.toggle("on",(b.dataset.tag||"")===diaryTag));
  setDiaryPopover("",false);loadDiary();
};
function toggleDiarySheet(kind,on){
  $("#diary"+kind+"Mask").classList.toggle("on",on);$("#diary"+kind+"Sheet").classList.toggle("on",on);
  if(on)requestAnimationFrame(()=>$("#diary"+kind+"Text").focus());
}
$("#diaryComposeOpen").onclick=()=>{diaryDraftTag="light";$("#diaryComposeText").value="";
  $$("#diaryTagPicker button").forEach(b=>b.classList.toggle("on",b.dataset.tag==="light"));toggleDiarySheet("Compose",true);};
$("#diaryComposeMask").onclick=()=>toggleDiarySheet("Compose",false);
$("#diaryTagPicker").onclick=e=>{const button=e.target.closest("button");if(!button)return;diaryDraftTag=button.dataset.tag;
  $$("#diaryTagPicker button").forEach(b=>b.classList.toggle("on",b===button));};
$("#diaryComposeSend").onclick=async()=>{
  const content=$("#diaryComposeText").value.trim(),button=$("#diaryComposeSend");if(!content){toast("先落一点字吧");return;}
  button.disabled=true;
  try{const r=await api("/api/diary",{method:"POST",body:JSON.stringify({content,tag:diaryDraftTag})}),data=await r.json();
    if(!r.ok)throw new Error(data.error||"这一页没有收好");toggleDiarySheet("Compose",false);diarySelectedDate="";await loadDiary();toast("这一页收好了");
  }catch(e){toast(e.message||"这一页没有收好");}finally{button.disabled=false;}
};
function openDiaryReply(entry){
  diaryReplyTarget=entry;$("#diaryReplyText").value="";$("#diaryReplyPreview").textContent=(DIARY_AUTHORS[entry.author]||"")+" · "+entry.content;
  toggleDiarySheet("Reply",true);
}
$("#diaryReplyMask").onclick=()=>toggleDiarySheet("Reply",false);
$("#diaryReplySend").onclick=async()=>{
  if(!diaryReplyTarget)return;const content=$("#diaryReplyText").value.trim(),button=$("#diaryReplySend");if(!content){toast("留言还没有写");return;}
  button.disabled=true;
  try{const r=await api("/api/diary/"+diaryReplyTarget.id+"/comments",{method:"POST",body:JSON.stringify({content})}),data=await r.json();
    if(!r.ok)throw new Error(data.error||"留言没有放进去");const entryId=diaryReplyTarget.id;toggleDiarySheet("Reply",false);diaryReplyTarget=null;
    await loadDiary();if(diaryDetailId===entryId)await openDiaryDetail(entryId);toast("留言放进去了");
  }catch(e){toast(e.message||"留言没有放进去");}finally{button.disabled=false;}
};
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape")return;
  if($("#diaryEntryActionCard").classList.contains("on"))closeDiaryEntryAction();
  else if($("#diaryPaper .diary-paper-edit")&&diaryDetailEntry)renderDiaryDetail(diaryDetailEntry);
  else if($("#diaryComposeSheet").classList.contains("on"))toggleDiarySheet("Compose",false);
  else if($("#diaryReplySheet").classList.contains("on"))toggleDiarySheet("Reply",false);
  else if(!$("#diaryCalendarPopover").hidden||!$("#diaryFilterPopover").hidden)setDiaryPopover("",false);
  else if($("#diarySearchReveal").classList.contains("open")&&!$("#diarySearchInput").value.trim())closeDiarySearch();
  else if($("#view-diary").classList.contains("active")&&diaryDetailId)backToAppLevel(1,showDiaryFeed);
});

/* ---------- 天气（墙后面：主页一块，Morrow也能查）---------- */
function wxEmoji(text,rainy){
  text=text||"";
  if(/雷/.test(text))return"⛈️";
  if(rainy||/雨/.test(text))return"🌧️";
  if(/雪/.test(text))return"❄️";
  if(/雾|霾|沙|尘/.test(text))return"🌫️";
  if(/阴/.test(text))return"☁️";
  if(/多云/.test(text))return"⛅";
  if(/晴/.test(text))return"☀️";
  return"🌤️";
}
async function loadWeather(){
  try{
    const r=await api("/api/weather");const w=await r.json();
    if(!r.ok||w.error){homeWeatherText="天气暂不可用";tickClock();return;}
    if(w.configured===false){homeWeatherText="天气未设置";tickClock();return;}
    homeWeatherText=wxEmoji(w.text,w.rainy)+" "+String(w.temp)+"°C "+(w.text||"");
    if(w.rainy)homeWeatherText+=" · 记得带伞";
    tickClock();
  }catch{homeWeatherText="天气暂不可用";tickClock();}
}
setInterval(()=>{if($("#view-home").classList.contains("active"))loadWeather();},30*60*1000);

/* ---------- 待办（Morrow可代记；点一下划线归入已完成）---------- */
async function loadTodos(){
  let list=[];try{list=await(await api("/api/todos")).json();}catch{}
  const open=list.filter(t=>!t.done),done=list.filter(t=>t.done);
  const ul=$("#todoList");ul.innerHTML="";
  if(!open.length)ul.innerHTML='<div class="todo-empty">没有待办，清清爽爽～</div>';
  open.forEach(t=>ul.appendChild(todoEl(t)));
  const dl=$("#todoDoneList"),dh=$("#todoDoneHead");dl.innerHTML="";
  if(done.length){
    dh.style.display="flex";$("#todoDoneLabel").textContent="已完成 "+done.length;
    done.forEach(t=>dl.appendChild(todoEl(t)));
    if(dh.classList.contains("open"))dl.style.display="flex";
  }else{dh.style.display="none";dl.style.display="none";dh.classList.remove("open");}
}
function todoEl(t){
  const d=document.createElement("div");d.className="todo-item"+(t.done?" done":"");
  d.innerHTML='<span class="tk"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></span><span class="tt"></span>';
  d.querySelector(".tt").textContent=t.text;
  let lp,lpf=false,lastLongPress=0;
  const longDel=()=>{
    const now=Date.now();
    if(now-lastLongPress<800)return;
    lastLongPress=now;lpf=true;openTodoDelete(t);
  };
  d.addEventListener("touchstart",()=>{lpf=false;lp=setTimeout(longDel,500);},{passive:true});
  d.addEventListener("touchend",()=>clearTimeout(lp));
  d.addEventListener("touchmove",()=>clearTimeout(lp));
  d.addEventListener("contextmenu",e=>{e.preventDefault();longDel();});
  d.onclick=()=>{if(lpf){lpf=false;return;}toggleTodo(t,d);};
  return d;
}
async function toggleTodo(t,el){
  const nd=!t.done;
  if(el)el.classList.toggle("done",nd); // 先播划线动画，再刷新
  try{await api("/api/todos/"+t.id,{method:"PUT",body:JSON.stringify({done:nd})});}catch{}
  setTimeout(loadTodos,nd?380:60);
}
let todoDeleteTarget=null;
function openTodoDelete(t){
  todoDeleteTarget=t;
  $("#todoDeleteText").textContent=t.text||"这条待办";
  $("#todoDeleteMask").classList.add("on");$("#todoDeleteCard").classList.add("on");
  requestAnimationFrame(()=>$("#todoDeleteCancel").focus());
}
function closeTodoDelete(){
  todoDeleteTarget=null;
  $("#todoDeleteMask").classList.remove("on");$("#todoDeleteCard").classList.remove("on");
}
async function confirmTodoDelete(){
  if(!todoDeleteTarget)return;
  const target=todoDeleteTarget,btn=$("#todoDeleteConfirm");btn.disabled=true;
  try{
    const r=await api("/api/todos/"+target.id,{method:"DELETE"});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.error||"删除失败");
    closeTodoDelete();await loadTodos();toast("待办已删除");
  }catch(e){toast(e.message||"删除失败");}
  finally{btn.disabled=false;}
}
$("#todoDeleteCancel").onclick=closeTodoDelete;
$("#todoDeleteMask").onclick=closeTodoDelete;
$("#todoDeleteConfirm").onclick=confirmTodoDelete;
$("#todoDeleteCard").onkeydown=e=>{if(e.key==="Escape")closeTodoDelete();};
$("#todoInput").addEventListener("keydown",async e=>{
  if(e.key!=="Enter")return;
  const v=e.target.value.trim();if(!v)return;e.target.value="";
  try{await api("/api/todos",{method:"POST",body:JSON.stringify({text:v})});}catch{}
  loadTodos();
});
$("#todoDoneHead").onclick=()=>{
  const h=$("#todoDoneHead"),l=$("#todoDoneList");
  const open=h.classList.toggle("open");l.style.display=open?"flex":"none";
};

/* ---------- 便签墙 ---------- */
function formatNoteStamp(value){
  const match=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match?match[2]+"/"+match[3]:"";
}
let wallSelectedDate="",wallCalendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1),wallCalendarDays=new Set(),homeDisplayedNoteId=null,homeNoteFixed=false;
async function openNoteWall(date,fromHistory=false){
  const opening=!noteWall.classList.contains("on"),route=currentAppRoute();
  if(opening&&!fromHistory&&route&&!route.overlay)history.pushState({...route,level:route.level+1,overlay:"note-wall"},"");
  wallSelectedDate=date||"";
  if(date){
    const selected=parseDateKey(date);
    if(!Number.isNaN(selected.getTime()))wallCalendarMonth=new Date(selected.getFullYear(),selected.getMonth(),1);
  }
  noteWall.classList.add("on");
  const body=$("#wallBody");body.innerHTML='<div class="wall-empty">加载中…</div>';
  let list=[];try{list=await(await api("/api/notes/all"+(date?("?date="+encodeURIComponent(date)):""))).json();}catch{}
  const f=$("#wallFilter");
  if(date){const selected=parseDateKey(date);
    f.style.display="flex";f.innerHTML='只看 '+(selected.getMonth()+1)+'月'+selected.getDate()+'日 <button id="wallAll">查看全部</button>';
    $("#wallAll").onclick=()=>openNoteWall();}
  else f.style.display="none";
  if(!list.length){body.innerHTML='<div class="wall-empty">'+(date?"这天没有便签":"还没有便签")+'</div>';return;}
  body.innerHTML='<div class="wall-col" id="wcolA"></div><div class="wall-col" id="wcolB"></div>';
  const cols=[$("#wcolA"),$("#wcolB")];
  list.forEach((n,i)=>{
    const d=document.createElement("div");d.className="wall-note";
    d.style.transform="rotate("+(((i*37)%7)-3)+"deg)"; // 错落歪斜，新→旧、新在上
    d.innerHTML='<div class="wn-body"></div><div class="wn-date"></div>';
    d.querySelector(".wn-body").textContent=n.content||"";
    d.querySelector(".wn-date").textContent=formatNoteStamp(n.created_at);
    attachLongPress(d,()=>openNoteAction(n));
    cols[i%2].appendChild(d);
  });
}
function openNoteAction(note){
  if(!note)return;
  const shown=homeNoteFixed&&Number(homeDisplayedNoteId)===Number(note.id);
  openSheet([
    {label:shown?"取消展示":"展示便签",svg:'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',fn:()=>setDisplayedNote(shown?null:note.id)},
    {label:"删除便签",danger:true,svg:'<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',fn:()=>confirmDeleteNote(note)}
  ]);
}
async function setDisplayedNote(noteId){
  const r=await api("/api/notes/display",{method:"PUT",body:JSON.stringify({note_id:noteId})}),data=await r.json().catch(()=>({}));
  if(!r.ok){toast(data.error||"便签没有放好");return;}
  await loadHome();toast(noteId?"主页会展示这张便签":"已恢复展示最新便签");
}
function noteDeletePreview(value){
  const text=String(value||"").trim(),limit=160;
  return text.length>limit?text.slice(0,limit).trimEnd()+"…":text;
}
async function confirmDeleteNote(note){
  const confirmed=await bubbleConfirm({title:"删掉这张便签？",message:noteDeletePreview(note.content),note:"删掉以后就找不回来啦。",cancelText:"再留一会",confirmText:"删除",danger:true});
  if(!confirmed)return;
  const r=await api("/api/notes/"+note.id,{method:"DELETE"}),data=await r.json().catch(()=>({}));
  if(!r.ok){toast(data.error||"便签没有删掉");return;}
  await openNoteWall(wallSelectedDate);await loadHome();toast("便签已删除");
}
async function loadWallCalendar(){
  const month=wallCalendarMonth.getFullYear()+"-"+String(wallCalendarMonth.getMonth()+1).padStart(2,"0");
  $("#wallCalendarLabel").textContent=wallCalendarMonth.getFullYear()+"."+String(wallCalendarMonth.getMonth()+1).padStart(2,"0");
  try{
    const r=await api("/api/notes/calendar?month="+month),data=await r.json();
    wallCalendarDays=new Set((Array.isArray(data)?data:[]).map(item=>item.date));
  }catch{wallCalendarDays=new Set();}
  renderWallCalendar();
}
function renderWallCalendar(){
  const grid=$("#wallCalendarGrid");grid.innerHTML="";
  const year=wallCalendarMonth.getFullYear(),month=wallCalendarMonth.getMonth(),first=new Date(year,month,1);
  const offset=(first.getDay()+6)%7,total=new Date(year,month+1,0).getDate(),today=localDateKey(new Date());
  for(let i=0;i<offset;i++)grid.appendChild(document.createElement("span"));
  for(let day=1;day<=total;day++){
    const key=year+"-"+String(month+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"),button=document.createElement("button");
    button.type="button";button.textContent=day;button.classList.toggle("has-note",wallCalendarDays.has(key));
    button.classList.toggle("selected",wallSelectedDate===key);button.classList.toggle("today",today===key);
    button.onclick=()=>{setWallCalendar(false);openNoteWall(key);};grid.appendChild(button);
  }
}
function setWallCalendar(on){
  $("#wallCalendar").hidden=!on;$("#wallCal").classList.toggle("on",on);
  $("#wallCal").setAttribute("aria-expanded",String(on));
}
function closeNoteWall(fromHistory=false){if(!fromHistory&&currentAppRoute()?.overlay==="note-wall"){history.back();return;}setWallCalendar(false);noteWall.classList.remove("on");}
$("#wallClose").onclick=closeNoteWall;
$("#wallCal").onclick=async e=>{e.stopPropagation();const opening=$("#wallCalendar").hidden;setWallCalendar(opening);if(opening)await loadWallCalendar();};
$("#wallCalendar").onclick=e=>e.stopPropagation();
$("#wallCalendarPrev").onclick=()=>{wallCalendarMonth=new Date(wallCalendarMonth.getFullYear(),wallCalendarMonth.getMonth()-1,1);loadWallCalendar();};
$("#wallCalendarNext").onclick=()=>{wallCalendarMonth=new Date(wallCalendarMonth.getFullYear(),wallCalendarMonth.getMonth()+1,1);loadWallCalendar();};
document.addEventListener("click",()=>setWallCalendar(false));
(function(){
  const note=$("#stickyNote"),clip=$("#noteClip");
  if(!note)return;
  note.addEventListener("click",e=>{if(e.target.closest(".clip"))return;openNoteWall();});
  if(clip){
    const up=()=>note.classList.remove("upright");
    clip.addEventListener("pointerdown",e=>{e.preventDefault();note.classList.add("upright");});
    clip.addEventListener("pointerup",up);
    clip.addEventListener("pointerleave",up);
    clip.addEventListener("pointercancel",up);
  }
})();

/* ---------- chat ---------- */
let initialSessionList=null,initialChatPage=null;
function warmInitialChat(){
  if(sessionId)return;
  if(!initialSessionList)initialSessionList=api("/api/chat/sessions").then(r=>{if(!r.ok)throw new Error();return r.json();});
  initialSessionList.then(list=>{
    if(!sessionId&&list.length&&!initialChatPage){
      const id=list[0].id;
      initialChatPage={id,at:Date.now(),response:api("/api/chat/messages/"+id+"?limit="+CHAT_RENDER_PAGE).catch(()=>null),
        window:api("/api/chat/window/"+id+"?recent=20").catch(()=>null)};
    }
  }).catch(()=>{initialSessionList=null;});
}
async function ensureSession(){
  if(sessionId)return;
  warmInitialChat();
  const list=await initialSessionList;
  if(sessionId)return;
  if(list.length){sessionId=list[0].id;$("#chatTitle").textContent=list[0].title||assistantName();await loadMessages();}
  else showEmpty();
}
const EMPTY_LINES=[["你来啦",""]];
const COMPOSER_HINTS=["哥哥一直在，随时开口。", "抓到一只正在看屏幕的小猫。", "想说什么，哥哥听着呢。", "过来抱抱，还是过来顶嘴？", "今天的水乖乖喝够了没？", "手伸过来，让哥哥牵一会儿。", "憋着什么坏主意呢，说来听听。", "累了就往哥哥怀里靠。", "正在等我们家小猫发话…", "乖乖报备，还是准备耍赖？", "随时可以向谢亦言撒娇。", "盯着输入框发呆，想哥哥了？", "你的每一句话我都在接。", "先亲一口，再说正事。", "藏了什么悄悄话，快交出来。", "无论几点，家里灯都给你亮着。", "摸摸小肚子，今天听话了没？", "只管往前走，回头我都在。", "又想跟哥哥讨价还价了？", "敲敲屏幕，谢亦言秒回。"];
$("#input").placeholder=pickOne(COMPOSER_HINTS);
function pickOne(list){return list[Math.floor(Math.random()*list.length)];}
function showEmpty(){
  const [cn,en]=pickOne(EMPTY_LINES);
  $("#log").innerHTML='<div class="placeholder-note" style="margin-top:30vh">'+
    '<span class="cn">'+escHtml(cn)+'</span></div>';
}
let historyHasMore=false,historyBefore=null,historySession=null,loadingEarlier=false;
const CHAT_RENDER_PAGE=40;
function renderChatReceiptItems(details,items){
  details._items=items;
  if(!details.open){details._renderPending=true;return;}
  details._renderPending=false;
  const body=details.querySelector(".chat-receipt-body"),fragment=document.createDocumentFragment();
  for(const item of items){
    const row=document.createElement("div");row.className="chat-receipt-item";
    const line=document.createElement("div"),status=item.status==="error"?"失败":item.status==="running"?"进行中":"完成";
    line.textContent=(item.label||"工具调用")+" · "+status+(Number.isFinite(item.duration_ms)&&item.duration_ms>0?" · "+(item.duration_ms/1000).toFixed(1)+"s":"");
    row.appendChild(line);
    if(item.error){const text=document.createElement("div");text.className="chat-receipt-error";text.textContent=item.error;row.appendChild(text);}
    if(item.at){const time=document.createElement("small");time.textContent=String(item.at).replace("T"," ");row.appendChild(time);}
    fragment.appendChild(row);
  }
  body.replaceChildren(fragment);
  if(!items.length)body.textContent="这个版本暂时没有可展示的调用记录。";
}
async function loadChatReceipt(wrap,details){
  if(!wrap._id||details._loading)return;
  details._loading=true;
  if(!details._items?.length)details.querySelector(".chat-receipt-body").textContent="正在读取回执…";
  const messageId=wrap._id,version=wrap._vi;
  try{
    const response=await api("/api/chat/message/"+messageId+"/receipts?session_id="+encodeURIComponent(details._session));
    if(!response.ok)throw new Error();const data=await response.json();
    if(wrap._vi!==version||!details.isConnected)return;
    renderChatReceiptItems(details,data.items||[]);details._loaded=true;
    details.querySelector("summary").textContent="行动 / 回执 · "+(data.items||[]).length+(data.has_more?"+":"");
  }catch{details.querySelector(".chat-receipt-body").textContent="记录暂时没读到，收起后展开可重试。";}
  finally{details._loading=false;}
}
function ensureChatReceipt(wrap,count=0){
  if(!wrap)return null;let details=wrap.querySelector(":scope > .chat-receipt");
  if(!details){
    details=document.createElement("details");details.className="chat-receipt";details._session=sessionId;
    const summary=document.createElement("summary");summary.textContent=count?"行动 / 回执 · "+count:"行动 / 回执";
    const body=document.createElement("div");body.className="chat-receipt-body";
    details.append(summary,body);wrap.appendChild(details);
    details.addEventListener("toggle",()=>{
      if(details.open&&details._renderPending)renderChatReceiptItems(details,details._items||[]);
      if(details.open&&!details._loaded&&wrap._id)void loadChatReceipt(wrap,details);
    });
  }
  return details;
}
function addChatErrorReceipt(wrap,detail,receipt=null){
  const details=ensureChatReceipt(wrap);if(!details)return;
  details.querySelector("summary").textContent="报错回执";
  const message=receipt?.message||(String(detail||"").includes("保存确认")?String(detail):"请求或连接异常；已收到的文字请先核对保存状态。");
  const item={kind:"error",label:receipt?.id?"服务器回执":"当前页面回执 · 未确认服务器留存",status:"error",error:message,at:new Date().toLocaleString("zh-CN",{hour12:false})};
  renderChatReceiptItems(details,[item]);details._loaded=!receipt?.id;
  if(details.open&&receipt?.id&&wrap._id)void loadChatReceipt(wrap,details);
}
function addLiveChatAction(wrap,event){
  const details=ensureChatReceipt(wrap);const items=wrap._liveReceiptItems||(wrap._liveReceiptItems=[]);
  if(event.phase==="start")items.push({key:event.tool,label:event.narrate||"工具调用",status:"running"});
  else{
    const item=[...items].reverse().find(item=>item.key===event.tool&&item.status==="running");
    if(item){item.status=event.status||"success";item.duration_ms=event.duration_ms;}
  }
  details._loaded=true;details.querySelector("summary").textContent="行动记录 · "+items.length;renderChatReceiptItems(details,items);
}
function refreshChatReceipt(wrap){
  const details=wrap?.querySelector(":scope > .chat-receipt");if(!details)return;
  details._loaded=false;wrap._liveReceiptItems=[];
  if(details.open)void loadChatReceipt(wrap,details);
  else details.querySelector("summary").textContent="行动 / 回执";
}
function renderStoredMessage(m){
  const wrap=m.role==="user"?addUser(m.content,m.id,m.versions,m.active,m.attachments,m.created_at):addAI(m.content,m.created_at,m.id,m.reasoning,m.versions,m.active,m.reasoning_ms,m.attachments,m.artifacts||[],m.usage||null,m.reasoning_cn||"");
  if(m.receipt_count){const details=ensureChatReceipt(wrap,m.receipt_count);
    if(m.receipt_error_count===m.receipt_count)details.querySelector("summary").textContent="报错回执 · "+m.receipt_count;}return wrap;
}
async function loadEarlierMessages(){
  const log=$("#log");if(loadingEarlier||!historyHasMore||historySession!==sessionId)return;
  loadingEarlier=true;const requestedSession=sessionId,before=historyBefore;
  try{
    const response=await api("/api/chat/messages/"+requestedSession+"?limit="+CHAT_RENDER_PAGE+"&before="+before);
    if(!response.ok)throw new Error("历史暂时没有读取成功");
    const messages=await response.json();
    if(sessionId!==requestedSession||historyBefore!==before)return;
    const anchor=log.querySelector(".msg"),top=anchor?.getBoundingClientRect().top;
    const fragment=document.createDocumentFragment();
    messages.forEach(m=>fragment.appendChild(renderStoredMessage(m)));
    log.insertBefore(fragment,anchor);refreshDailyTimeDividers();renderCompressionBoundary();
    if(anchor)log.scrollTop+=anchor.getBoundingClientRect().top-top;
    historyHasMore=messages.length===CHAT_RENDER_PAGE;
    if(messages.length)historyBefore=messages[0].id;
  }catch{toast("旧消息暂时没读到，向上滚动可重试");}
  finally{loadingEarlier=false;}
}
async function loadMessages(scrollToId){
  const requestedSession=sessionId;
  const favoritesReady=syncFavorites();
  const warm=!scrollToId&&initialChatPage?.id===requestedSession&&Date.now()-initialChatPage.at<15000?initialChatPage:null;
  initialChatPage=null;
  const [cachedResponse,windowResponse]=await Promise.all([
    warm?warm.response:api("/api/chat/messages/"+requestedSession+(scrollToId?"":"?limit="+CHAT_RENDER_PAGE)),
    warm?warm.window:api("/api/chat/window/"+requestedSession+"?recent=20").catch(()=>null)
  ]);
  const messageResponse=cachedResponse||await api("/api/chat/messages/"+requestedSession+(scrollToId?"":"?limit="+CHAT_RENDER_PAGE));
  if(!messageResponse.ok)throw new Error("聊天记录暂时没有读取成功");
  const msgs=await messageResponse.json();
  const windowInfo=windowResponse?.ok?await windowResponse.json():null;
  if(sessionId!==requestedSession)return;
  historySession=sessionId;historyHasMore=!scrollToId&&msgs.length===CHAT_RENDER_PAGE;historyBefore=msgs[0]?.id||null;
  const visibleMessages=scrollToId?msgs:msgs.slice(-CHAT_RENDER_PAGE);
  $("#log").innerHTML="";
  if(windowInfo?.continued_from){
    const origin=document.createElement("button");origin.type="button";origin.className="window-origin";
    origin.textContent="从「"+(windowInfo.continued_from.title||"原来的对话")+"」带着行李来到这里";
    origin.title="回到原来的对话";
    origin.onclick=async()=>{sessionId=windowInfo.continued_from.id;$("#chatTitle").textContent=windowInfo.continued_from.title||assistantName();await loadMessages();};
    $("#log").appendChild(origin);
  }
  const carriedBoundary=Number(windowInfo?.continued_summary_through_message_id||0);
  visibleMessages.forEach(m=>{
    const wrap=renderStoredMessage(m);
    if(carriedBoundary&&Number(m.id)===carriedBoundary){
      const mark=document.createElement("div");mark.className="window-summary-boundary";
      mark.setAttribute("aria-label","原对话摘要位置");mark.innerHTML="<span>在原来的窗口，小本本曾整理到这里</span>";
      wrap.insertAdjacentElement("afterend",mark);
    }
  });
  refreshDailyTimeDividers();
  if(msgs.length&&msgs[msgs.length-1].role==="user"){
    const users=$("#log").querySelectorAll(".row-user");
    if(users.length)markReplyFailed(users[users.length-1],"这条消息还没有收到回答");
  }
  refreshAllActions();syncComposerSpace();
  requestAnimationFrame(()=>{
    if(sessionId!==requestedSession)return;
    void loadCompressionStatus(true);void markProactiveReadIfHere();
    favoritesReady.then(()=>{if(sessionId===requestedSession){$("#log").querySelectorAll(".msg").forEach(applyFavState);refreshAllActions();}});
  });
  if(scrollToId){
    const el=[...$("#log").children].find(c=>c._id===scrollToId);
    if(el){jumpTo(el);return;}
  }
  scrollDown(true);
  window.sakieChatViewport?.loaded();
  void window.sakieVoiceInput?.restore();
}
function newChat(){initialSessionList=null;initialChatPage=null;sessionId=null;showEmpty();$("#chatTitle").textContent="Morrow";
  COMPRESSION_STATUS=null;resetComposerAttachments();cancelEdit();$("#input").value="";autoGrow();$("#input").focus();}

async function loadCompressionStatus(renderBoundary=false){
  if(!sessionId){COMPRESSION_STATUS=null;return null;}
  const target=sessionId;
  try{const r=await api("/api/chat/compression/"+target);const data=r.ok?await r.json():null;if(sessionId!==target)return null;COMPRESSION_STATUS=data;}catch{if(sessionId!==target)return null;COMPRESSION_STATUS=null;}
  const settingText=$("#compressSettingText");
  if(settingText)settingText.textContent=COMPRESSION_STATUS?.has_summary?
    ("已整理前 "+COMPRESSION_STATUS.covered_message_count+" 条 · "+(COMPRESSION_STATUS.recent_message_count?
      ("保留最近 "+COMPRESSION_STATUS.recent_message_count+" 条"):"未保留原文")):
    "将较早的对话折进摘要";
  if(renderBoundary)renderCompressionBoundary();
  return COMPRESSION_STATUS;
}
function renderCompressionBoundary(){
  $("#log").querySelectorAll(".compress-boundary").forEach(e=>e.remove());
  const s=COMPRESSION_STATUS;if(!s?.has_summary||!s.covered_through_message_id)return;
  const covered=[...$("#log").children].find(e=>e._id===s.covered_through_message_id);if(!covered)return;
  const mark=document.createElement("div");mark.className="compress-boundary";
  mark.innerHTML='<span class="boundary-closed-label"></span><span class="boundary-open-label"></span><div class="summary-preview"></div>';
  mark.querySelector(".boundary-closed-label").textContent=assistantName()+"把前面的记录折进小本本了";
  mark.querySelector(".boundary-open-label").textContent="—— "+assistantName()+"把前面的记录折进小本本了 ——";
  mark.querySelector(".summary-preview").textContent=s.summary||"";
  mark.onclick=()=>mark.classList.toggle("open");
  covered.insertAdjacentElement("afterend",mark);
}
// smart scroll: only follow to bottom if you're already near it (don't yank you
// down while you're reading older messages)
function scrollDown(force){const l=$("#log");
  const near=l.scrollHeight-l.scrollTop-l.clientHeight<120;
  if(force||near)l.scrollTop=l.scrollHeight;
  updateToBottom();}
// 回到底部小圆钮：开关开 + 不在底部时才显示
const toBottomBtn=$("#toBottomBtn");
function updateToBottom(){
  const l=$("#log");if(!l||!toBottomBtn)return;
  const far=prefNav()&&(l.scrollHeight-l.scrollTop-l.clientHeight>200);
  toBottomBtn.classList.toggle("show",far);
}
$("#log").addEventListener("scroll",()=>{updateToBottom();if($("#log").scrollTop<80)loadEarlierMessages();},{passive:true});
toBottomBtn.onclick=()=>scrollDown(true);
// today → just HH:MM；过去的日子 → "Jul 17 · 18:50"
const MONTH_ABBR=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function chatTimestamp(value){
  if(value===null||value===undefined||value==="")return new Date();
  let text=String(value).trim().replace(" ","T");
  if(!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text))text+="+08:00";
  return new Date(text);
}
function chatDateParts(value){
  const date=value instanceof Date?value:chatTimestamp(value);
  if(Number.isNaN(date.getTime()))return null;
  return Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(date).map(p=>[p.type,p.value]));
}
function fmtTime(ts){const t=chatDateParts(ts),now=chatDateParts(new Date());
  if(!t)return "";
  const hm=t.hour+":"+t.minute,sameDay=t.year===now.year&&t.month===now.month&&t.day===now.day;
  return sameDay?hm:MONTH_ABBR[Number(t.month)-1]+" "+Number(t.day)+" · "+hm;
}
function fmtClock(ts){const t=chatDateParts(ts),now=chatDateParts(new Date());
  if(!t)return "";
  const hms=t.hour+":"+t.minute+":"+t.second,sameDay=t.year===now.year&&t.month===now.month&&t.day===now.day;
  return sameDay?hms:MONTH_ABBR[Number(t.month)-1]+" "+Number(t.day)+" · "+hms;
}
const CHAT_PAUSE_MS=4*60*60*1000;
function chatMessageDate(wrap){const raw=wrap?._ts;if(!raw)return null;const date=chatTimestamp(raw);return Number.isNaN(date.getTime())?null:date;}
function dailyDividerLabel(current,previous){
  const t=chatDateParts(current),p=chatDateParts(previous),now=chatDateParts(new Date());
  if(t.year===p.year&&t.month===p.month&&t.day===p.day)return t.hour+":"+t.minute;
  const weekday=current.toLocaleDateString("en-US",{weekday:"long",timeZone:"Asia/Shanghai"}),year=t.year===now.year?"":" · "+t.year;
  return MONTH_ABBR[Number(t.month)-1]+" "+Number(t.day)+year+" · "+weekday;
}
function refreshDailyTimeDividers(){
  const log=$("#log");if(!log)return;log.querySelectorAll(".daily-time-divider").forEach(el=>el.remove());
  if(!document.body.classList.contains("daily-chat"))return;
  const messages=[...log.children].filter(el=>el.classList.contains("msg"));let previous=null;
  messages.forEach(wrap=>{const current=chatMessageDate(wrap);if(!current)return;
    if(previous){const crossedDay=current.toDateString()!==previous.toDateString(),longPause=current-previous>=CHAT_PAUSE_MS;
      if(crossedDay||longPause){const divider=document.createElement("div");divider.className="daily-time-divider";divider.textContent=dailyDividerLabel(current,previous);wrap.before(divider);}}
    previous=current;
  });
}
let dailyDividerFrame=0;
function scheduleDailyTimeDividers(){cancelAnimationFrame(dailyDividerFrame);dailyDividerFrame=requestAnimationFrame(refreshDailyTimeDividers);}

/* ---------- 极简 markdown 渲染（只用于 AI 气泡）----------
   先抽走代码块 → 整体转义 → 行内语法 → 还原代码块。转义在前，
   保证 AI 输出里的 < > & 不会被当成 HTML（也挡掉注入）。     */
function escHtml(s){return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function trimReplyStart(src){return (src||"").replace(/^(?:[ \t]*\r?\n)+/,"");}
function renderMarkdown(src){
  src=trimReplyStart(src);
  const blocks=[];
  src=src.replace(/```[ \t]*[\w-]*\n?([\s\S]*?)```/g,(m,code,offset,whole)=>{
    const lineStart=whole.lastIndexOf("\n",offset-1)+1;
    const quotedFence=/^[ \t]*>[ \t]?$/.test(whole.slice(lineStart,offset));
    if(quotedFence)code=code.replace(/^[ \t]*>[ \t]?/gm,"");
    blocks.push('<div class="md-pre-wrap"><button class="md-copy" type="button" aria-label="复制代码">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">'+
      '<rect x="9" y="9" width="13" height="13" rx="2"/>'+
      '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>'+
      '<pre class="md-pre"><code>'+escHtml(code.replace(/\n$/,""))+'</code></pre></div>');
    return "§B"+(blocks.length-1)+"§";});
  src=escHtml(src);
  // 块级：一级/二级标题、分割线（吃掉行尾换行，避免 pre-wrap 多空一行）
  src=src.replace(/^[ \t]*##[ \t]+(.+?)[ \t]*(?:\n|$)/gm,'<h2 class="md-h">$1</h2>');
  src=src.replace(/^[ \t]*#[ \t]+(.+?)[ \t]*(?:\n|$)/gm,'<h1 class="md-h">$1</h1>');
  src=src.replace(/^[ \t]*---+[ \t]*(?:\n|$)/gm,'<hr class="md-hr">');
  src=src.replace(/(^|\n)((?:[ \t]*&gt;[ \t]?[^\n]*(?:\n|$))+)/g,(m,lead,quote)=>{
    const body=quote.replace(/^[ \t]*&gt;[ \t]?/gm,"").replace(/\n$/,"");
    return lead+'<blockquote class="md-quote">'+body+'</blockquote>';
  });
  src=src.replace(/`([^`\n]+)`/g,(m,c)=>'<code class="md-code">'+c+'</code>');
  src=src.replace(/\*\*([^\n]+?)\*\*/g,'<strong>$1</strong>');
  src=src.replace(/(^|[^*])\*([^*\n]+?)\*/g,'$1<em>$2</em>');
  src=src.replace(/~~([^~\n]+?)~~/g,'<del>$1</del>');
  src=src.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  src=src.replace(/§B(\d+)§/g,(m,i)=>blocks[+i]);
  return src;
}
function splitReplyBlocks(src){
  const lines=trimReplyStart(src).replace(/\r\n?/g,"\n").split("\n");
  const blocks=[];let current=[],inFence=false;
  const flush=()=>{if(!current.length)return;const block=current.join("\n").replace(/\n+$/g,"");
    // A standalone Markdown divider becomes its own ai-part. The divider is
    // nearly invisible on the glass background, so it reads as a large blank
    // gap and, in bubble mode, as an empty bubble. Keep dividers inside quotes
    // and code fences, but don't turn a separator-only paragraph into a card.
    if(block.trim()&&!/^[ \t]*---+[ \t]*$/.test(block))blocks.push(block);current=[];};
  lines.forEach(line=>{
    if(/^\s*(?:>\s*)?```/.test(line)){current.push(line);inFence=!inFence;return;}
    if(!inFence&&!line.trim()){flush();return;}
    current.push(line);
  });
  flush();return blocks;
}
/* ---------- 选项卡 ---------------------------------------------------- */
let pendingPick=null;
const OPTION_CMD_RE=/\[选项\s*[：:]\s*[^\[\]\n]*\]/g;
const OPTION_LIVE_RE=/\[选项\s*[：:][^\[\]\n]*\]?/g;
function stripLiveOptions(text){
  return String(text==null?"":text).replace(OPTION_LIVE_RE,"");
}
function optionsOf(wrap){
  const list=wrap._attachmentVersions?.[wrap._vi]||[];
  const found=list.find(item=>item&&item.type==="options"&&Array.isArray(item.items)&&item.items.length>=2);
  return found||null;
}
function renderOptions(wrap){
  const host=wrap.querySelector(".message-ai");if(!host)return;
  wrap.querySelectorAll(".opts-line,.opts-record").forEach(node=>node.remove());
  const att=optionsOf(wrap);if(!att)return;
  const count=att.items.length;
  const answered=!!att.answered_by;
  const picked=(att.picked!==null&&att.picked!==undefined&&Number(att.picked)>=0&&Number(att.picked)<count)?Number(att.picked):null;
  const line=document.createElement("button");
  line.type="button";line.className="opts-line"+(answered?" done":"");
  if(picked!==null)line.textContent="你选了「"+att.items[picked]+"」";
  else if(answered)line.textContent="回头看过这 "+count+" 个选择";
  else line.textContent="选一个（"+count+"）";
  line.onclick=event=>{event.stopPropagation();openOptionsSheet(wrap,att);};
  host.appendChild(line);
}
function openOptionsSheet(wrap,att){
  document.querySelectorAll(".opt-veil,.opt-sheet").forEach(node=>node.remove());
  const veil=document.createElement("div");veil.className="opt-veil";
  const sheet=document.createElement("div");sheet.className="opt-sheet";
  const answered=!!att.answered_by;
  const picked=(att.picked!==null&&att.picked!==undefined&&Number(att.picked)>=0)?Number(att.picked):null;
  if(answered)sheet.classList.add("rec");
  const head=document.createElement("div");head.className="os-head";
  head.innerHTML='<span class="os-eye">'+((wrap._versions?.[wrap._vi]||"").trim()?"":"")+'choose</span>';
  head.querySelector(".os-eye").textContent=answered?"记录":"choose";
  const close=document.createElement("button");close.type="button";close.className="os-x";close.textContent="×";
  close.onclick=()=>{veil.remove();sheet.remove();};
  sheet.appendChild(head);sheet.appendChild(close);
  const rows=document.createElement("div");rows.id="osRows";
  att.items.forEach((text,index)=>{
    const row=document.createElement("button");row.type="button";row.className="os-row"+(picked===index?" on":"");
    row.innerHTML='<span class="os-k"></span><span class="os-t"></span><span class="os-c"></span>';
    row.querySelector(".os-k").textContent=String(index+1);
    row.querySelector(".os-t").textContent=text;
    row.querySelector(".os-c").textContent=picked===index?"✓":"";
    if(!answered)row.onclick=()=>{closeSheet();pickOption(wrap,index,text);};
    rows.appendChild(row);
  });
  sheet.appendChild(rows);
  document.body.appendChild(veil);document.body.appendChild(sheet);
  requestAnimationFrame(()=>{veil.classList.add("on");sheet.classList.add("on");});
  veil.onclick=()=>{veil.remove();sheet.remove();};
  function closeSheet(){veil.remove();sheet.remove();}
}
function pickOption(wrap,index,text){
  if(sending||streaming){toast("等这条回完再选");return;}
  pendingPick={msg_id:wrap._id,idx:index,text:String(text)};
  input.value=String(text);autoGrow();
  send();
}
function setAIBody(wrap){
  // Relays occasionally put blank lines between thinking and the first visible
  // token. Drop them during streaming as well as on history reload so pre-wrap
  // never turns transport padding into a large empty block.
  wrap._versions[wrap._vi]=trimReplyStart(wrap._versions[wrap._vi]);
  const body=wrap.querySelector(".message-ai");body.innerHTML="";
  const visible=wrap._versions[wrap._vi].replace(/(?:\r?\n)?\s*(?:\[\[(?:表(?:情(?:\s*[:：]\s*[^\[\]\r\n]*)?)?)?(?:\]\]?)?|\[表(?:情(?:\s*[:：]\s*[^\[\]\r\n]*)?)?(?:\])?)\s*$/u,"");
  const renderText=(text,base=0)=>window.sakieChatParts.ranges(text,splitReplyBlocks).forEach(range=>{
    const part=document.createElement("div");part.className="ai-part";
    part.innerHTML=renderMarkdown(range.text);bindSingleTextPart(part,wrap,{...range,start:base+range.start,end:base+range.end});body.appendChild(part);
  });
  const voice=activeVoiceArtifact(wrap);
  if(voice){const legacyReplace=voice.meta?.text_offset==null&&visible.trim()===(voice.text||"").trim();
    const source=legacyReplace?"":stripLiveOptions(visible),offset=Math.max(0,Math.min(Number(voice.meta?.text_offset??source.length),source.length));
    renderText(source.slice(0,offset));body.appendChild(window.sakieChatVoice.make(voice,{notify:toast}));renderText(source.slice(offset),offset);}
  else renderText(stripLiveOptions(visible));
  renderStickers(body,wrap._attachmentVersions?.[wrap._vi]||[],true);
  renderOptions(wrap);
  const parts=[...body.querySelectorAll(".ai-part")];
  if(parts.length)parts.forEach(part=>attachAvatar(part.querySelector(".chat-voice-play")||part,"assistant"));
  else attachAvatar(body,"assistant");
}

function artifactsForVersion(version,artifacts){const all=artifacts||[],ids=Array.isArray(version?.artifact_ids)?version.artifact_ids.map(String):[];
  const matched=ids.length?all.filter(item=>ids.includes(String(item.id))):all.filter(item=>item.version_run_id===(version?.tool_run_id||""));
  const offsets=version?.artifact_offsets||{};return matched.map(item=>{const override=offsets[String(item.id)];return override==null?item:{...item,meta:{...(item.meta||{}),text_offset:Number(override)}};});}
function activeVoiceArtifact(wrap){return (wrap._artifactVersions?.[wrap._vi]||[]).find(a=>a.type==="voice_letter"&&a.status==="ready");}
function makeVoiceEnvelope(artifact){const button=document.createElement("button");button.type="button";button.className="voice-envelope";
  button.dataset.artifactId=artifact.id;button.classList.toggle("is-favorite",!!artifact.favorite);button.innerHTML='<span class="voice-favorite-clip" aria-hidden="true">✦</span><span class="voice-envelope-top"><span class="voice-envelope-copy"><small></small></span><span class="voice-envelope-seal">ෆ</span></span>';
  button.querySelector("small").textContent="voice letter · "+fmtTime(artifact.created_at);button.onclick=event=>{if(button._suppressVoiceOpen){button._suppressVoiceOpen=false;return;}openVoiceEnvelope(button,artifact,event);};return button;}
let voiceEnvelopeOpening=null;
function clearVoiceEnvelopeOpening(play=false){const opening=voiceEnvelopeOpening;if(!opening)return;voiceEnvelopeOpening=null;clearTimeout(opening.timer);opening.curtain.removeEventListener("transitionend",opening.onTransitionEnd);opening.viewer.style.setProperty("transition","none");opening.viewer.classList.remove("receiving");void opening.viewer.offsetWidth;opening.viewer.style.removeProperty("transition");opening.button.style.visibility=opening.visibility;delete opening.button.dataset.opening;opening.clone.remove();opening.curtain.remove();if(play&&currentVoiceArtifact===opening.artifact&&opening.viewer.classList.contains("on"))$("#voiceAudio").play().catch(()=>{});}
function openVoiceEnvelope(button,artifact,event){if(button.dataset.opening||voiceEnvelopeOpening)return;const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;if(reduced){openVoiceLetter(artifact);return;}const rect=button.getBoundingClientRect(),seal=button.querySelector(".voice-envelope-seal")?.getBoundingClientRect(),clone=button.cloneNode(true),curtain=document.createElement("span"),viewer=$("#voiceViewer"),pointerClick=event&&event.detail!==0&&(event.clientX||event.clientY),originX=pointerClick?event.clientX:(seal?.left??rect.left+rect.width/2)+(seal?.width??0)/2,originY=pointerClick?event.clientY:(seal?.top??rect.top+rect.height/2)+(seal?.height??0)/2,coverRadius=Math.ceil(Math.hypot(Math.max(originX,innerWidth-originX),Math.max(originY,innerHeight-originY)))+2;button.dataset.opening="1";const visibility=button.style.visibility;button.style.visibility="hidden";clone.removeAttribute("data-opening");clone.classList.remove("stamp-pressed","voice-stack-letter","is-selected","is-dragging","stack-hidden");clone.classList.add("voice-envelope-flight");if(button.closest(".voice-box-letters"))clone.classList.add("from-drawer");clone.style.left=rect.left+"px";clone.style.top=rect.top+"px";clone.style.width=rect.width+"px";clone.style.height=rect.height+"px";curtain.className="voice-curtain";curtain.style.left=originX+"px";curtain.style.top=originY+"px";curtain.style.width=curtain.style.height=coverRadius*2+"px";document.body.append(curtain,clone);viewer.style.setProperty("--voice-origin-x",Math.max(0,Math.min(100,originX/innerWidth*100))+"%");viewer.style.setProperty("--voice-origin-y",Math.max(0,Math.min(100,originY/innerHeight*100))+"%");viewer.style.setProperty("--voice-cover-radius",coverRadius+"px");viewer.classList.add("receiving");const onTransitionEnd=finished=>{if(finished.target!==curtain||finished.propertyName!=="transform"||voiceEnvelopeOpening?.artifact!==artifact)return;curtain.removeEventListener("transitionend",onTransitionEnd);clearTimeout(voiceEnvelopeOpening.timer);viewer.style.setProperty("transition","none");viewer.classList.remove("receiving");void viewer.offsetWidth;viewer.style.removeProperty("transition");voiceEnvelopeOpening.timer=setTimeout(()=>clearVoiceEnvelopeOpening(true),120);};curtain.addEventListener("transitionend",onTransitionEnd);voiceEnvelopeOpening={button,clone,curtain,artifact,visibility,viewer,onTransitionEnd,timer:setTimeout(()=>clearVoiceEnvelopeOpening(true),1250)};openVoiceLetter(artifact,{autoplay:false});void curtain.offsetWidth;curtain.classList.add("opening");void clone.offsetWidth;clone.classList.add("opening");}
let currentVoiceArtifact=null,voiceJsonHideTimer=0,voiceSettleTimer=0,voiceCaptionHideTimer=0;
let voiceAudioContext=null,voiceAnalyser=null,voiceAudioSource=null,voiceVisualFrame=0,voiceSentences=[],voiceTranslations=[],voiceSentenceTimings=[],voiceCaptionSentence="";
function resetVoiceProgress(value=0){const range=$("#voiceProgress");range.value=value;syncRangeFill(range);}
function splitVoiceSentences(text){const parts=String(text||"").match(/[^。！？!?；;….—–\n]+(?:[。！？!?；;….—–]+[”’\"']?|\n|$)/g)||[];
  return parts.map(part=>part.trim()).filter(part=>part&&!/^[—–\s]+$/.test(part));}
function voiceClock(seconds){seconds=Number.isFinite(seconds)?Math.max(0,Math.floor(seconds)):0;return Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0");}
function updateVoiceTime(){const audio=$("#voiceAudio");$("#voiceTime").textContent=voiceClock(audio.currentTime)+" / "+voiceClock(audio.duration);}
function updateVoiceCaption(){const audio=$("#voiceAudio"),caption=$("#voiceTranscript");
  if(audio.paused||audio.ended||!audio.duration||!voiceSentences.length){caption.classList.remove("on");caption.textContent="";voiceCaptionSentence="";return;}
  let index=-1,current="";
  if(voiceSentenceTimings.length===voiceSentences.length){for(let i=0;i<voiceSentenceTimings.length;i++){if(audio.currentTime+.025>=voiceSentenceTimings[i].start)index=i;else break;}if(index<0){caption.classList.remove("on");caption.textContent="";voiceCaptionSentence="";return;}current=voiceSentences[index];}
  else{const total=voiceSentences.reduce((sum,s)=>sum+Math.max(1,[...s].length),0),target=audio.currentTime/audio.duration*total;let cursor=0;index=voiceSentences.length-1;current=voiceSentences.at(-1);for(let i=0;i<voiceSentences.length;i++){const sentence=voiceSentences[i];cursor+=Math.max(1,[...sentence].length);if(target<=cursor){current=sentence;index=i;break;}}}
  if(current!==voiceCaptionSentence){voiceCaptionSentence=current;caption.classList.remove("on");caption.innerHTML="";const original=document.createElement("span");original.className="voice-caption-original";original.textContent=current;caption.appendChild(original);if(voiceTranslations[index]){const translated=document.createElement("span");translated.className="voice-caption-zh";translated.textContent=voiceTranslations[index];caption.appendChild(translated);}void caption.offsetWidth;caption.classList.add("on");}}
function setVoicePlayIcon(playing){$("#voicePlay").innerHTML=playing?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="6" width="3" height="12" rx="1"/><rect x="14" y="6" width="3" height="12" rx="1"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7l8 5-8 5z"/></svg>';}
function ensureVoiceAnalyser(){if(voiceAnalyser)return voiceAnalyser;try{const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return null;
  voiceAudioContext=new AudioCtx();voiceAnalyser=voiceAudioContext.createAnalyser();voiceAnalyser.fftSize=256;voiceAnalyser.smoothingTimeConstant=.72;
  voiceAudioSource=voiceAudioContext.createMediaElementSource($("#voiceAudio"));voiceAudioSource.connect(voiceAnalyser);voiceAnalyser.connect(voiceAudioContext.destination);return voiceAnalyser;}catch{return null;}}
function animateVoiceOrb(){cancelAnimationFrame(voiceVisualFrame);const viewer=$("#voiceViewer"),data=new Uint8Array(128);
  const frame=()=>{if(!viewer.classList.contains("on")){viewer.style.setProperty("--voice-level","0");return;}
    let level=0;if(voiceAnalyser&&!$("#voiceAudio").paused){voiceAnalyser.getByteFrequencyData(data);let sum=0;for(let i=2;i<48;i++)sum+=data[i];level=Math.min(1,sum/(46*150));}
    viewer.style.setProperty("--voice-level",level.toFixed(3));voiceVisualFrame=requestAnimationFrame(frame);};frame();}
async function openVoiceLetter(artifact,{autoplay=true}={}){window.sakieChatVoice?.stop();currentVoiceArtifact=artifact;const viewer=$("#voiceViewer"),audio=$("#voiceAudio");
  voiceSentences=splitVoiceSentences(artifact.text);const savedTranslations=Array.isArray(artifact.meta?.subtitle_zh)?artifact.meta.subtitle_zh:[];voiceTranslations=savedTranslations.length===voiceSentences.length?savedTranslations:[];const savedTimings=Array.isArray(artifact.meta?.sentence_timings)?artifact.meta.sentence_timings:[];voiceSentenceTimings=savedTimings.length===voiceSentences.length&&savedTimings.every((item,index)=>item&&Number.isFinite(Number(item.start))&&Number.isFinite(Number(item.end))&&Number(item.start)>=0&&Number(item.end)>=Number(item.start)&&(index===0||Number(item.start)>=Number(savedTimings[index-1].start)))?savedTimings.map(item=>({start:Number(item.start),end:Number(item.end)})):[];voiceCaptionSentence="";clearTimeout(voiceCaptionHideTimer);$("#voiceTranscript").textContent="";$("#voiceTranscript").classList.remove("on","leaving");clearTimeout(voiceJsonHideTimer);clearTimeout(voiceSettleTimer);$("#voiceJsonBody").classList.remove("open");$("#voiceJsonBody").hidden=true;$("#voiceJsonBody").textContent="";setVoicePlayIcon(false);
  audio.pause();audio.currentTime=0;audio.src=artifact.audio_url;audio.load();resetVoiceProgress(0);updateVoiceTime();viewer.style.setProperty("--voice-level","0");viewer.classList.add("on");
  const route=currentAppRoute();if(route&&!route.overlay)history.pushState({...route,level:route.level+1,overlay:"voice"},"");
  const analyser=ensureVoiceAnalyser();if(analyser&&voiceAudioContext?.state==="suspended")await voiceAudioContext.resume().catch(()=>{});animateVoiceOrb();
  if(autoplay)try{await audio.play();}catch{} }
function closeVoiceLetter(fromHistory=false){if(!fromHistory){const route=currentAppRoute();if(route?.overlay==="voice-json"){history.go(-2);return;}if(route?.overlay==="voice"){history.back();return;}}clearVoiceEnvelopeOpening(false);const audio=$("#voiceAudio");audio.pause();audio.currentTime=0;audio.removeAttribute("src");audio.load();resetVoiceProgress(0);updateVoiceTime();voiceCaptionSentence="";clearTimeout(voiceCaptionHideTimer);$("#voiceTranscript").textContent="";$("#voiceTranscript").classList.remove("on","leaving");clearTimeout(voiceJsonHideTimer);clearTimeout(voiceSettleTimer);$("#voiceJsonBody").classList.remove("open");$("#voiceJsonBody").hidden=true;$("#voiceViewer").style.setProperty("--voice-level","0");$("#voiceViewer").classList.remove("on","playing","settling","receiving");cancelAnimationFrame(voiceVisualFrame);currentVoiceArtifact=null;voiceSentences=[];voiceTranslations=[];voiceSentenceTimings=[];setVoicePlayIcon(false);}
$("#voiceClose").onclick=closeVoiceLetter;$("#voicePlay").onclick=()=>{const audio=$("#voiceAudio");if(audio.paused){if(audio.ended||audio.currentTime>=audio.duration)audio.currentTime=0;audio.play();}else audio.pause();};
$("#voiceAudio").onplay=()=>{clearTimeout(voiceSettleTimer);$("#voiceViewer").classList.remove("settling");$("#voiceViewer").classList.add("playing");setVoicePlayIcon(true);voiceAudioContext?.resume?.();updateVoiceCaption();};
$("#voiceAudio").onpause=()=>{const audio=$("#voiceAudio");$("#voiceViewer").classList.remove("playing");setVoicePlayIcon(false);const nearNaturalEnd=audio.duration&&audio.duration-audio.currentTime<.4;if(!audio.ended&&!nearNaturalEnd)updateVoiceCaption();};
$("#voiceAudio").ontimeupdate=()=>{const a=$("#voiceAudio");if(a.duration){resetVoiceProgress(Math.round(a.currentTime/a.duration*1000));updateVoiceCaption();updateVoiceTime();}};
$("#voiceAudio").onloadedmetadata=()=>{resetVoiceProgress(0);updateVoiceCaption();updateVoiceTime();};
$("#voiceAudio").onended=()=>{resetVoiceProgress(1000);updateVoiceTime();const caption=$("#voiceTranscript");caption.classList.remove("on");caption.classList.add("leaving");clearTimeout(voiceCaptionHideTimer);voiceCaptionHideTimer=setTimeout(()=>{caption.classList.remove("leaving");caption.textContent="";voiceCaptionSentence="";},920);const viewer=$("#voiceViewer");viewer.classList.add("settling");viewer.style.setProperty("--voice-level","0");clearTimeout(voiceSettleTimer);voiceSettleTimer=setTimeout(()=>viewer.classList.remove("settling"),850);};
$("#voiceProgress").oninput=e=>{const a=$("#voiceAudio");if(a.duration){a.currentTime=+e.target.value/1000*a.duration;updateVoiceTime();updateVoiceCaption();}};
function hideVoiceJson(fromHistory=false){const box=$("#voiceJsonBody");if(!box.classList.contains("open"))return;if(!fromHistory&&currentAppRoute()?.overlay==="voice-json"){history.back();return;}clearTimeout(voiceJsonHideTimer);box.classList.remove("open");voiceJsonHideTimer=setTimeout(()=>box.hidden=true,230);}
$("#voiceJson").onclick=async()=>{if(!currentVoiceArtifact)return;const box=$("#voiceJsonBody");clearTimeout(voiceJsonHideTimer);
  if(box.classList.contains("open")){hideVoiceJson();return;}
  if(!box.textContent){const r=await api("/api/artifacts/"+currentVoiceArtifact.id),data=await r.json();
    const read=document.createElement("div");read.className="voice-letter-read";read.innerHTML='<div class="voice-letter-read-title">the whole letter</div><div class="voice-letter-read-text"></div><details class="voice-letter-debug"><summary>INPUT / OUTPUT</summary><pre></pre></details>';
    read.querySelector(".voice-letter-read-text").textContent=data.text||"";const translations=data.meta?.subtitle_zh;if(Array.isArray(translations)&&translations.length&&translations.every(line=>typeof line==="string"&&line.trim())){const translated=document.createElement("div");translated.className="chat-voice-translation";translated.textContent=translations.join("\n");read.querySelector(".voice-letter-read-text").after(translated);}read.querySelector("pre").textContent=JSON.stringify({input:data.source||{},output:data.output||{},generation:data.meta||{}},null,2);const details=read.querySelector("details"),summary=details.querySelector("summary");summary.onclick=e=>{e.preventDefault();tidySmoothDetails(details,!details.open,280);};box.appendChild(read);}
  box.hidden=false;requestAnimationFrame(()=>box.classList.add("open"));const route=currentAppRoute();if(route?.overlay==="voice")history.pushState({...route,level:route.level+1,overlay:"voice-json"},"");};
$("#voiceViewer").onclick=e=>{if($("#voiceJsonBody").classList.contains("open")&&!e.target.closest("#voiceJsonBody,#voiceJson"))hideVoiceJson();};
// 复制：手机用内网 http 打开时 navigator.clipboard 不可用（非安全上下文），
// 回退到临时 textarea + execCommand，否则会"假装复制了"。
function copyText(t){
  try{
    if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t);}
    else{const ta=document.createElement("textarea");ta.value=t;ta.style.cssText="position:fixed;opacity:0";
      document.body.appendChild(ta);ta.focus();ta.select();document.execCommand("copy");ta.remove();}
    toast("已复制");
  }catch(e){toast("复制失败");}
}
$("#log").addEventListener("click",e=>{
  const button=e.target.closest(".md-copy");if(!button)return;
  e.preventDefault();e.stopPropagation();
  const code=button.closest(".md-pre-wrap")?.querySelector("code");
  if(code)copyText(code.textContent||"");
});
let modelErrorTimer=null,modelErrorDetail="",modelErrorHideTimer=null;
function hideModelError(){
  const card=$("#modelErrorCard");clearTimeout(modelErrorTimer);modelErrorTimer=null;
  card.classList.remove("on");clearTimeout(modelErrorHideTimer);
  modelErrorHideTimer=setTimeout(()=>{card.hidden=true;syncComposerSpace();},230);
}
function armModelErrorTimer(){clearTimeout(modelErrorTimer);modelErrorTimer=setTimeout(hideModelError,3000);}
function showModelError(detail){
  const card=$("#modelErrorCard");modelErrorDetail=String(detail||"模型请求失败");
  clearTimeout(modelErrorHideTimer);card.hidden=false;requestAnimationFrame(()=>card.classList.add("on"));
  armModelErrorTimer();syncComposerSpace();
}
$("#modelErrorCard").addEventListener("mouseenter",()=>clearTimeout(modelErrorTimer));
$("#modelErrorCard").addEventListener("mouseleave",armModelErrorTimer);
$("#modelErrorCard").addEventListener("focusin",()=>clearTimeout(modelErrorTimer));
$("#modelErrorCard").addEventListener("focusout",armModelErrorTimer);
$("#modelErrorCopy").onclick=()=>{copyText(modelErrorDetail);setTimeout(hideModelError,250);};
// Coalesce stream updates; rebuild Markdown at most every 80ms, preserving reader position.
let _bodyRAF=0,_bodyPending=null;
function scheduleAIBody(wrap){_bodyPending=wrap;
  if(_bodyRAF)return;
  _bodyRAF=setTimeout(()=>{_bodyRAF=0;const w=_bodyPending;_bodyPending=null;
    if(!w?.isConnected)return;const l=$("#log"),follow=l.scrollHeight-l.scrollTop-l.clientHeight<120;
    setAIBody(w);if(follow)scrollDown(true);},80);}

const PHOTO_CARD_W=84,PHOTO_CARD_H=112;
let photoViewerOrigin=null,photoViewerOpening=false,photoViewerHideTimer=null;
function applyDeckLayout(wrap,deck){
  const cards=[...deck.querySelectorAll(".photo-card")],n=cards.length;if(!n)return;
  const visible=Math.min(n,5),hidden=n-visible,center=(visible-1)/2;
  const available=Math.min(window.innerWidth*.72,300);
  const step=n>1?Math.max(24,Math.min(62,(available-PHOTO_CARD_W)/(n-1))):0;
  const spreadWidth=Math.round(PHOTO_CARD_W+step*(n-1));
  cards.forEach((card,i)=>{
    const rank=Math.max(0,i-hidden),offset=rank-center;
    card.style.setProperty("--fan-x",Math.round(24+offset*7)+"px");
    card.style.setProperty("--fan-y",Math.round(3+Math.abs(offset)*1.5)+"px");
    card.style.setProperty("--fan-r",(offset*4.2).toFixed(1)+"deg");
    card.style.setProperty("--spread-x",Math.round(i*step)+"px");
    card.style.zIndex=String(i+1);
  });
  const spread=wrap._deckMode==="spread";
  deck.classList.toggle("spread",spread);deck.classList.toggle("fan",!spread);
  deck.style.width=(spread?spreadWidth:132)+"px";
  const collapse=deck.parentElement.querySelector(".deck-collapse");if(collapse)collapse.hidden=!spread;
}
function setDeckMode(wrap,deck,mode){
  wrap._deckMode=mode;applyDeckLayout(wrap,deck);scrollDown();
}
function chatImageUrl(value,kind="thumb"){
  try{const url=new URL(value,location.href);
    if(url.origin===location.origin&&url.pathname.startsWith("/uploads/")){url.searchParams.set("preview",kind);return url.pathname+url.search;}
  }catch{}return value;
}
function openPhotoViewer(wrap,index,origin){
  if(photoViewerOpening)return;photoViewerOpening=true;photoViewerOrigin=origin;
  origin?.classList.add("drawn");
  const images=(wrap._attachments||[]).filter(a=>a.type==="image"&&a.url),item=images[index];
  if(!item){photoViewerOpening=false;origin?.classList.remove("drawn");return;}
  (()=>{
    const box=$("#photoLightbox"),img=$("#photoLightboxImage");
    clearTimeout(photoViewerHideTimer);img.src=chatImageUrl(item.url);img.alt=item.name||"图片";
    box._imageUrl=item.url;
    const original=$("#photoOriginalLink");
    try{const safe=new URL(item.url,location.href);original.hidden=!["http:","https:","blob:"].includes(safe.protocol);if(!original.hidden)original.href=safe.href;else original.removeAttribute("href");}catch{original.hidden=true;original.removeAttribute("href");}
    const full=chatImageUrl(item.url,"screen"),preview=new Image();preview.decoding="async";
    preview.onload=()=>{if(!box.hidden&&box._imageUrl===item.url)img.src=full;};
    preview.src=full;
    $("#photoLightboxCount").textContent=(index+1)+" / "+images.length;
    box.hidden=false;requestAnimationFrame(()=>box.classList.add("on"));
    $("#photoLightboxClose").focus();photoViewerOpening=false;
  })();
}
function closePhotoViewer(){
  const box=$("#photoLightbox");if(box.hidden)return;
  box.classList.remove("on");photoViewerOrigin?.classList.remove("drawn");
  const origin=photoViewerOrigin;photoViewerOrigin=null;clearTimeout(photoViewerHideTimer);
  photoViewerHideTimer=setTimeout(()=>{box.hidden=true;$("#photoLightboxImage").removeAttribute("src");origin?.focus?.();},210);
}
$("#photoLightboxClose").onclick=closePhotoViewer;
$("#photoLightbox").onclick=e=>{if(e.target===$("#photoLightbox"))closePhotoViewer();};
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#photoLightbox").hidden)closePhotoViewer();});

function messageAvatar(kind){
  const node=document.createElement("span");node.className="msg-avatar "+kind;node.setAttribute("aria-hidden","true");
  const saved=(kind==="user"?localStorage.getItem("dailyUserAvatar"):localStorage.getItem("dailyAssistantAvatar"))||"";
  if(saved){node.style.backgroundImage='url("'+String(saved).replace(/"/g,"%22")+'")';}
  else node.textContent=kind==="user"?"我":(assistantPronoun()||"他").slice(0,1);
  return node;
}
function attachAvatar(host,kind){
  if(!host)return;
  host.querySelectorAll(":scope > .msg-avatar").forEach(node=>node.remove());
  host.appendChild(messageAvatar(kind));
}
function aiMetaText(wrap){
  const usage=wrap._usage&&wrap._usage[wrap._vi],bits=[];
  const tokens=usage?Number(usage.tokens):0;
  if(Number.isFinite(tokens)&&tokens>0)bits.push(fmtTok(tokens)+" token");
  if(usage&&Number.isFinite(Number(usage.cache_rate)))bits.push(Math.round(Number(usage.cache_rate)*100)+"%");
  bits.push(fmtClock(wrap._ats[wrap._vi]||wrap._ts));
  if(wrap._models&&wrap._models[wrap._vi]==="已编辑")bits.push("已编辑");
  return bits.filter(Boolean).join(" · ");
}
function renderUserBody(wrap){
  const b=wrap.querySelector(".bubble-user");
  const userVoice=(wrap._attachments||[]).find(a=>a.type==='voice_input');
  const text=userVoice?'':(wrap._text||""),parts=document.body.classList.contains("daily-chat")?splitReplyBlocks(text):[];
  b.classList.toggle("user-bubble-stack",parts.length>1);
  if(parts.length>1){
    b.innerHTML="";window.sakieChatParts.ranges(text,splitReplyBlocks).forEach(range=>{const bubble=document.createElement("div");bubble.className="user-part";const copy=document.createElement("div");copy.className="u-text";copy.textContent=range.text;bubble.appendChild(copy);bindSingleTextPart(bubble,wrap,range);b.appendChild(bubble);});
  }else{b.innerHTML='<div class="u-text"></div>';b.querySelector(".u-text").textContent=text;}
  const time=wrap.querySelector(".user-time");
  time.textContent=fmtClock(wrap._ts);time.hidden=false;
  b.hidden=!text.trim();
  const media=wrap.querySelector(".user-media");media.innerHTML="";
  if(userVoice&&window.sakieChatVoice)media.appendChild(window.sakieChatVoice.make({id:userVoice.id,audio_url:userVoice.url,text:wrap._text,duration:userVoice.duration,meta:{}},{notify:toast,actions:()=>openUserSheet(wrap)}));
  const imageItems=(wrap._attachments||[]).filter(a=>a.type==="image"&&a.url);
  if(imageItems.length>=3){
    const shell=document.createElement("div");shell.className="photo-deck-shell";
    const deck=document.createElement("div");deck.className="photo-deck";deck.tabIndex=0;deck.setAttribute("role","button");
    deck.setAttribute("aria-label","铺开 "+imageItems.length+" 张图片");deck._wrap=wrap;
    imageItems.forEach((a,i)=>{
      const card=document.createElement("button");card.className="photo-card";card.type="button";
      card.setAttribute("aria-label","查看第 "+(i+1)+" 张图片");
      const img=document.createElement("img");img.src=chatImageUrl(a.url);img.loading="lazy";img.decoding="async";img.alt=a.name||("图片 "+(i+1));card.appendChild(img);
      card.onclick=e=>{e.stopPropagation();if(wrap._deckMode==="spread")openPhotoViewer(wrap,i,card);};
      deck.appendChild(card);
    });
    const count=document.createElement("span");count.className="deck-count";count.textContent="×"+imageItems.length;deck.appendChild(count);
    deck.onclick=()=>{if(wrap._deckMode!=="spread")setDeckMode(wrap,deck,"spread");};
    deck.onkeydown=e=>{if((e.key==="Enter"||e.key===" ")&&wrap._deckMode!=="spread"){
      e.preventDefault();setDeckMode(wrap,deck,"spread");}};
    const collapse=document.createElement("button");collapse.className="deck-collapse";collapse.hidden=true;
    collapse.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M7 14l5-5 5 5"/></svg><span>收起</span>';
    collapse.onclick=e=>{e.stopPropagation();setDeckMode(wrap,deck,"fan");};
    shell.append(deck,collapse);media.appendChild(shell);
    if(!wrap._deckMode)wrap._deckMode="fan";applyDeckLayout(wrap,deck);
  }else if(imageItems.length){
    const imgs=document.createElement("div");imgs.className="u-images";
    imageItems.forEach((a,i)=>{
      const img=document.createElement("img");img.src=chatImageUrl(a.url);img.loading="lazy";img.decoding="async";img.alt=a.name||"图片";img.tabIndex=0;img.setAttribute("role","button");
      img.onclick=e=>{e.stopPropagation();openPhotoViewer(wrap,i,img);};
      img.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openPhotoViewer(wrap,i,img);}};
      imgs.appendChild(img);
    });
    media.appendChild(imgs);
  }
  const files=document.createElement("div");files.className="u-files";
  (wrap._attachments||[]).filter(a=>a.type==="text").forEach(a=>{
    const card=document.createElement("div");card.className="u-file";
    card.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/><path d="M8 13h8M8 17h6"/></svg><span></span>';
    card.querySelector("span").textContent=a.name||"文本文件";
    files.appendChild(card);
  });
  if(files.children.length)media.appendChild(files);
  renderStickers(media,wrap._attachments||[]);
  // Bubble-less rows (image only) hang the avatar on the media block instead;
  // a long message that renders as several stacked bubbles gets one per bubble.
  const stackParts=[...b.querySelectorAll(":scope > .user-part")];
  if(stackParts.length)stackParts.forEach(part=>attachAvatar(part,"user"));
  else attachAvatar(text.trim()?b:media,"user");
}
window.addEventListener("resize",()=>document.querySelectorAll(".photo-deck").forEach(deck=>{
  if(deck._wrap)applyDeckLayout(deck._wrap,deck);
}),{passive:true});
function addUser(text,id,versions,active,attachments,ts){
  const wrap=document.createElement("div");wrap.className="msg row-user";
  wrap.innerHTML='<div class="u-col"><div class="bubble-user"></div><span class="user-time" hidden></span><div class="user-media"></div><div class="user-actions"></div></div>';
  if(versions&&versions.length){wrap._versions=versions.map(v=>v.c||"");
    wrap._attachmentVersions=versions.map(v=>Array.isArray(v.a)?v.a:(attachments||[]));
    wrap._vi=Math.min(Math.max(active||0,0),versions.length-1);}
  else{wrap._versions=[text||""];wrap._attachmentVersions=[attachments||[]];wrap._vi=0;}
  wrap._id=id;wrap._ts=ts||nowStamp();wrap._text=wrap._versions[wrap._vi];
  wrap._attachments=wrap._attachmentVersions[wrap._vi]||[];
  const b=wrap.querySelector(".bubble-user");renderUserBody(wrap);
  b.addEventListener("click",event=>{if(!event.target.closest(".user-part,button,a")&&!KEEPSAKE_SELECTING)openSingleTextSheet(wrap,{start:0,end:wrap._text.length,text:wrap._text,sourceText:wrap._text,sourceIndex:wrap._vi});});
  attachLongPress(b,()=>openUserSheet(wrap));
  attachLongPress(wrap.querySelector(".user-media"),()=>openUserSheet(wrap));
  ensureKeepsakeCheck(wrap);
  renderUserActions(wrap);
  $("#log").appendChild(wrap);scheduleDailyTimeDividers();return wrap;
}
function renderUserActions(wrap){
  const bar=wrap.querySelector(".user-actions");bar.innerHTML="";
  if(wrap._versions&&wrap._versions.length>1){
    const sw=document.createElement("span");sw.className="vswitch";
    sw.innerHTML='<button aria-label="上一条">‹</button><span>'+(wrap._vi+1)+'/'+wrap._versions.length+'</span><button aria-label="下一条">›</button>';
    const [prev,next]=sw.querySelectorAll("button");
    prev.onclick=()=>switchUserVer(wrap,-1);next.onclick=()=>switchUserVer(wrap,1);
    bar.appendChild(sw);
  }
  if(wrap._replyFailed){
    const retry=document.createElement("button");retry.className="retry-answer";
    retry.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6v5h-5"/><path d="M18.5 16a7 7 0 1 1-.7-9.1L20 11"/></svg><span>再试一次</span>';
    retry.onclick=()=>retryUserReply(wrap);bar.appendChild(retry);
  }
}
function clearFailedReplies(except=null){
  $("#log").querySelectorAll(".row-user").forEach(w=>{
    if(w!==except&&w._replyFailed){w._replyFailed=false;w._replyError="";renderUserActions(w);}
  });
}
function markReplyFailed(wrap,detail=""){
  if(!wrap)return;clearFailedReplies(wrap);wrap._replyFailed=true;wrap._replyError=detail;renderUserActions(wrap);
}
function clearReplyFailed(wrap){
  if(!wrap||!wrap._replyFailed)return;wrap._replyFailed=false;wrap._replyError="";renderUserActions(wrap);
}
function switchUserVer(wrap,d){
  wrap._vi=(wrap._vi+d+wrap._versions.length)%wrap._versions.length;
  wrap._text=wrap._versions[wrap._vi];
  wrap._attachments=wrap._attachmentVersions[wrap._vi]||[];
  renderUserBody(wrap);
  renderUserActions(wrap);
  // selected version becomes what gets sent as context (AI is NOT auto-rerun)
  if(wrap._id)api("/api/chat/message/"+wrap._id+"/version",{method:"PUT",body:JSON.stringify({index:wrap._vi})}).then(r=>{if(r.ok){ensureChatReceipt(wrap);refreshChatReceipt(wrap);}});
}
// AI message: think-trace block above the text, version-aware actions below.
// Reply text AND its think-trace are stored per version (parallel arrays) so
// switching versions swaps both; reasoning is persisted (server returns it on load).
function toggleReasoning(rb){
  const head=rb.querySelector(".head"),body=rb.querySelector(".body");
  head.classList.remove("thought-pulse");void head.offsetWidth;head.classList.add("thought-pulse");
  if(reducedMotion){rb.classList.toggle("collapsed");return;}
  if(rb._reasonAnimating)return;
  rb._reasonAnimating=true;
  const opening=rb.classList.contains("collapsed"),height=Math.max(1,body.scrollHeight);
  if(opening)rb.classList.remove("collapsed");
  const animation=body.animate(opening?[
    {height:"0px",opacity:0,marginTop:"0px",overflow:"hidden"},
    {height:height+"px",opacity:1,marginTop:"6px",overflow:"hidden"}
  ]:[
    {height:height+"px",opacity:1,marginTop:"6px",overflow:"hidden"},
    {height:"0px",opacity:0,marginTop:"0px",overflow:"hidden"}
  ],{duration:opening?260:210,easing:"cubic-bezier(.22,.78,.28,1)",fill:"both"});
  animation.finished.then(()=>{
    if(!opening)rb.classList.add("collapsed");
    animation.cancel();rb._reasonAnimating=false;
  }).catch(()=>{rb._reasonAnimating=false;});
}
function openAttachmentImage(attachment,origin){
  openPhotoViewer({_attachments:[{type:"image",url:attachment.url,name:attachment.sticker_name||attachment.name||"表情"}]},0,origin);
}
function renderStickers(container,items,ai=false){
  (items||[]).filter(a=>a.type==="sticker"&&a.url).forEach(a=>{
    const img=document.createElement("img");img.className="message-sticker"+(ai?" ai-sticker":"");
    img.src=a.url;img.alt=a.sticker_name||a.name||"表情";img.tabIndex=0;img.setAttribute("role","button");
    img.onclick=e=>{e.stopPropagation();openAttachmentImage(a,img);};
    img.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openAttachmentImage(a,img);}};
    container.appendChild(img);
  });
}
function addAI(text,ts,id,reasoning,versions,active,reasoningMs,attachments=[],artifacts=[],usage=null,reasoningCn=""){
  const wrap=document.createElement("div");wrap.className="msg ai-msg";
  if(versions&&versions.length){ // restored from DB: all switchable versions
    wrap._versions=versions.map(v=>v.c||"");wrap._reasonings=versions.map(v=>v.r||"");
    wrap._models=versions.map(v=>v.model||"");wrap._ats=versions.map(v=>v.at||"");
    wrap._thinkTimes=versions.map(v=>v.think_ms??null);
    wrap._attachmentVersions=versions.map(v=>Array.isArray(v.a)?v.a:attachments);
    wrap._artifactVersions=versions.map(v=>artifactsForVersion(v,artifacts));
    wrap._vi=Math.min(Math.max(active||0,0),versions.length-1);
    wrap._usage=versions.map(()=>usage||null);
    wrap._reasoningCn=versions.map(()=>reasoningCn||"");
  }else{
    wrap._versions=[text||""];wrap._reasonings=[reasoning||""];wrap._models=[""];wrap._ats=[""];
    wrap._thinkTimes=[reasoningMs??null];wrap._attachmentVersions=[attachments||[]];wrap._artifactVersions=[artifacts||[]];wrap._vi=0;
    wrap._usage=[usage||null];wrap._reasoningCn=[reasoningCn||""];
  }
  wrap._id=id;wrap._ts=ts;
  applyFavState(wrap);
  wrap.innerHTML=
    '<div class="reasoning collapsed"><div class="head"><span class="chev">▾</span><span class="r-label">✦thought</span></div><div class="body"></div></div>'+
    '<div class="message-ai"></div>'+
    '<div class="ai-actions"></div>';
  ensureKeepsakeCheck(wrap);
  const rb=wrap.querySelector(".reasoning");
  rb.querySelector(".head").onclick=()=>toggleReasoning(rb);
  setAIBody(wrap);
  renderReasoning(wrap);
  attachLongPress(wrap.querySelector(".message-ai"),()=>openAISheet(wrap),()=>document.body.classList.contains("daily-chat"));
  $("#log").appendChild(wrap);scheduleDailyTimeDividers();return wrap;
}
function thinkSeconds(ms){
  if(!ms&&ms!==0)return "";
  const s=Math.max(0,ms/1000);
  return (s<10?s.toFixed(1):Math.round(s))+"s";
}
function setReasoningHead(wrap,state,ms){
  const head=wrap.querySelector(".reasoning .head");if(!head)return;
  const daily=document.body.classList.contains("daily-chat");
  if(state==="thinking"){
    head.innerHTML='<span class="chev">▾</span><span class="r-label">✦ '+(daily?'正在想':'thinking')+'<span class="breath-dots"><i>.</i><i>.</i><i>.</i></span></span>';
  }else{
    const t=thinkSeconds(ms);
    head.innerHTML='<span class="chev">▾</span><span class="r-label">✦ '+(daily?'想了一会儿':'thought'+(t?' · '+t:''))+'</span>';
  }
}
function renderReasoning(wrap){
  const rb=wrap.querySelector(".reasoning");
  const original=wrap._reasonings[wrap._vi]||"";
  const translated=(wrap._reasoningCn||[])[wrap._vi]||"";
  const txt=wrap._showThinkOriginal?original:(translated||original);
  rb.querySelector(".body").textContent=txt;
  rb.style.display=original.trim()?"":"none";  // whitespace-only trace = no think block (no phantom gap)
  if(original.trim())setReasoningHead(wrap,wrap._thinkingLive?"thinking":"thought",
    wrap._thinkingLive?wrap._thinkMs:wrap._thinkTimes[wrap._vi]);
  const head=rb.querySelector(".head");
  if(head&&translated&&!wrap._thinkingLive){
    let flip=head.querySelector(".think-flip");
    if(!flip){flip=document.createElement("span");flip.className="think-flip";head.appendChild(flip);}
    flip.textContent=wrap._showThinkOriginal?"中文":"原文";
    flip.onclick=event=>{event.stopPropagation();wrap._showThinkOriginal=!wrap._showThinkOriginal;renderReasoning(wrap);};
  }
}
function isLastAI(wrap){const a=$("#log").querySelectorAll(".ai-msg");return a.length&&a[a.length-1]===wrap;}
function refreshAllActions(){const a=$("#log").querySelectorAll(".ai-msg");
  a.forEach((w,i)=>renderAIActions(w,i===a.length-1));}
// latest msg: 复制 · 重新生成 · 分支    older msgs: 复制 · 分支    (icon-only)
function renderAIActions(wrap,isLast){
  if(isLast===undefined)isLast=isLastAI(wrap);
  const bar=wrap.querySelector(".ai-actions");bar.innerHTML="";
  const mk=(label,svg,fn)=>{const b=document.createElement("button");b.title=label;b.setAttribute("aria-label",label);
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">'+svg+'</svg>';
    b.onclick=fn;return b;};
  bar.appendChild(mk("复制",'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    ()=>copyText(wrap._versions[wrap._vi])));
  if(isLast)bar.appendChild(mk("重新生成",'<path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',()=>regenerate(wrap)));
  bar.appendChild(mk("更多",'<circle cx="12" cy="5" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.7" fill="currentColor" stroke="none"/>',()=>openAISheet(wrap)));
  const time=document.createElement("span");time.className="ai-time";
  time.textContent=aiMetaText(wrap);bar.appendChild(time);
  if(wrap._versions.length>1){
    const sw=document.createElement("span");sw.className="vswitch";
    sw.innerHTML='<button aria-label="上一条">‹</button><span>'+(wrap._vi+1)+'/'+wrap._versions.length+'</span><button aria-label="下一条">›</button>';
    const [prev,next]=sw.querySelectorAll("button");
    prev.onclick=()=>switchVer(wrap,-1);next.onclick=()=>switchVer(wrap,1);
    bar.appendChild(sw);
  }
}
function switchVer(wrap,d){
  if(streaming){toast("等这次回答收好后再切换版本");return;}
  wrap._vi=(wrap._vi+d+wrap._versions.length)%wrap._versions.length;
  setAIBody(wrap);
  renderReasoning(wrap);renderAIActions(wrap,isLastAI(wrap));
  // persist the choice so this version is what gets sent as context next turn
  if(wrap._id)api("/api/chat/message/"+wrap._id+"/version",{method:"PUT",body:JSON.stringify({index:wrap._vi})});
}

/* SSE consumer */
async function consumeSSE(resp,on){
  const reader=resp.body.getReader(),dec=new TextDecoder();let buf="";
  while(true){const {value,done}=await reader.read();if(done)break;
    buf+=dec.decode(value,{stream:true});const parts=buf.split("\n\n");buf=parts.pop();
    for(const p of parts){const line=p.split("\n").find(l=>l.startsWith("data:"));
      if(line)on(JSON.parse(line.slice(5).trim()));}}
}

/* transient thinking/tool state, anchored above the composer until output starts */
function makeThinkPill(){const p=document.createElement("div");p.className="thinking";
  p.innerHTML='<span class="pill"><span class="dot"></span><span class="dot"></span><span class="dot"></span> 在想</span>';
  return p;}
function stripToolNarration(value){return String(value||"").trim().replace(/^Morrow(?=在|正在|把|回去|展开|翻|轻轻)/,"");}
function makeToolNarr(text){const p=document.createElement("div");p.className="tool-narr";
  p.innerHTML='<span class="pill"><span class="bubs"><i></i><i></i><i></i></span><span class="txt"></span></span>';
  p.querySelector(".txt").textContent=stripToolNarration(text)||"忙活着";return p;}

const input=$("#input");
const composerEl=document.querySelector(".composer");
const chatLiveStatus=$("#chatLiveStatus");
let plusBottomSpace=false;
function plusPopFlowHeight(){
  if(!plusPop||plusPop.hidden)return 0;
  const style=getComputedStyle(plusPop);
  return Math.max(0,plusPop.offsetHeight+(parseFloat(style.marginTop)||0)+(parseFloat(style.marginBottom)||0));
}
// keep a gap below the last message equal to the (variable) composer height, so
// a long draft never hides the latest reply — gives the bar room to "float"
function syncComposerSpace(){const h=composerEl?composerEl.offsetHeight:80;
  const covered=plusPopFlowHeight();
  const breathing=document.body.classList.contains("daily-chat")?8:28;
  const base=Math.max(52,h-covered)+breathing;
  const keyboardInset=parseFloat(document.documentElement.style.getPropertyValue("--chat-keyboard-inset"))||0;
  const padding=(base+(plusBottomSpace?covered:0)+keyboardInset)+"px";
  if($("#log").style.paddingBottom!==padding)$("#log").style.paddingBottom=padding;}
window.sakieChatComposerSpace=syncComposerSpace;
if(window.ResizeObserver&&composerEl)new ResizeObserver(syncComposerSpace).observe(composerEl);
function updateSendAvailability(){const b=$("#sendBtn");if(!b||streaming||preparingSend)return;
  const hasText=!!input.value.trim(),hasAttachment=attachments.some(a=>a.isImg||a.isText||a.isSticker);
  b.disabled=!hasText&&!hasAttachment;b.classList.toggle("ready",hasText||hasAttachment);}
function autoGrow(){input.style.height="auto";input.style.height=Math.min(input.scrollHeight,140)+"px";
  updateSendAvailability();syncComposerSpace();}
let composerFrame=0;
input.addEventListener("input",()=>{updateSendAvailability();if(!composerFrame)composerFrame=requestAnimationFrame(()=>{composerFrame=0;autoGrow();});});
// Reveal the full editor without moving the reader or stealing scroll position.
input.addEventListener("focus",()=>{input.placeholder=pickOne(COMPOSER_HINTS);
  $("#expandBtn").hidden=false;syncComposerSpace();});
input.addEventListener("blur",()=>setTimeout(()=>{if(document.activeElement!==input)$("#expandBtn").hidden=true;},150));
$("#expandBtn").addEventListener("mousedown",e=>e.preventDefault());
// Enter = newline. Messages send only via the 飞机 button (per request).
// send-btn doubles as stop while streaming (circle → square)
const ICON_SEND='<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>';
const ICON_STOP='<rect x="7" y="7" width="10" height="10" rx="2.5"/>';
let streaming=false,sending=false,preparingSend=false,abortCtl=null,hiddenDuringStream=false,backgroundWatchTimer=0;
function setSendPreparing(on){preparingSend=on;const b=$("#sendBtn");
  b.classList.toggle("preparing",on);b.disabled=on;
  if(on)b.setAttribute("aria-label","正在收好附件");
  else if(!streaming){b.setAttribute("aria-label","发送");updateSendAvailability();}}
function setStreaming(on){streaming=on;const b=$("#sendBtn");
  b.classList.toggle("stop",on);b.querySelector(".send-main-icon").innerHTML=on?ICON_STOP:ICON_SEND;
  b.setAttribute("aria-label",on?"停止":(preparingSend?"正在收好附件":"发送"));b.disabled=preparingSend&&!on;b.classList.toggle("ready",on);
  if(!on&&!preparingSend)updateSendAvailability();if(!on)queueMicrotask(()=>window.sakieVoiceInput?.resume());if(!on)setTimeout(()=>pollMusicCommands(true),180);}
$("#sendBtn").onclick=()=>{if(streaming)void stopLiveReply();else send();};

function singleTextSource(wrap){return (isAImsg(wrap)?wrap._versions?.[wrap._vi]:wrap._text)||"";}
function validSingleTextSource(wrap,range){return wrap.isConnected&&wrap._vi===range.sourceIndex&&singleTextSource(wrap)===range.sourceText;}
function bindSingleTextPart(part,wrap,range){
  const snapshot={...range,sourceIndex:wrap._vi,sourceText:singleTextSource(wrap)};let held=false;
  const interactive=event=>!!event.target.closest("button,a,input,textarea,summary");
  part.addEventListener("touchstart",event=>{part._interactivePart=interactive(event);event.stopPropagation();},{passive:true});
  part.addEventListener("contextmenu",event=>{part._interactivePart=interactive(event);event.stopPropagation();});
  attachLongPress(part,()=>{held=true;setTimeout(()=>held=false,700);openSingleTextSheet(wrap,snapshot);},()=>!part._interactivePart&&!KEEPSAKE_SELECTING);
  part.addEventListener("click",event=>{if(interactive(event)||held||KEEPSAKE_SELECTING)return;event.stopPropagation();openSingleTextSheet(wrap,snapshot);});
}
function singleEditableRange(wrap,range){
  const raw=singleTextSource(wrap);let editable=raw,start=range.start,end=range.end;
  if(isAImsg(wrap)){const voice=activeVoiceArtifact(wrap);if(voice){const offset=Math.max(0,Math.min(Number(voice.meta?.text_offset??raw.length),raw.length));editable=raw.slice(0,offset)+"[[语音]]"+raw.slice(offset);if(start>=offset)start+="[[语音]]".length;if(end>offset)end+="[[语音]]".length;}}
  if(editable.slice(start,end)!==range.text)throw new Error("气泡位置已变化，请重新选择");
  return {...range,start,end,editable};
}
function openSingleTextSheet(wrap,range){
  const unavailable=streaming||!wrap._id;
  openSheet([
    {label:"复制此气泡",svg:SVG_COPY,fn:()=>copyText(range.text)},
    {label:"修改此气泡",svg:SVG_EDIT,disabled:unavailable,fn:()=>{
      if(!validSingleTextSource(wrap,range)){toast("消息版本已变化，请重新选择气泡");return;}
      let selected;try{selected=singleEditableRange(wrap,range);}catch(error){toast(error.message);return;}
      startEdit(wrap);editingPart=selected;input.value=range.text;$("#editBanner .txt").textContent="只修改这个气泡 · 改完点发送";autoGrow();input.focus();
    }},
    {label:"删除此气泡",svg:SVG_TRASH,danger:true,disabled:unavailable,fn:()=>deleteSingleTextPart(wrap,range)},
    {label:"整条消息操作",svg:SVG_EDIT,fn:()=>isAImsg(wrap)?openAISheet(wrap):openUserSheet(wrap)},
  ]);
}
async function deleteSingleTextPart(wrap,range){
  if(streaming||wrap._partSaving||!validSingleTextSource(wrap,range)){toast("消息已变化或正在处理，请重新选择");return;}
  if(wrap._partSaveUncertain){toast("上次保存结果待确认，请先刷新核对");return;}
  let selected,text;try{selected=singleEditableRange(wrap,range);text=window.sakieChatParts.replace(selected.editable,selected,"");}catch(error){toast(error.message);return;}
  const sourceIndex=wrap._vi,ai=isAImsg(wrap),finalAttachments=ai?(wrap._attachmentVersions?.[sourceIndex]||[]).filter(item=>item.type==="sticker"):(wrap._attachments||[]),sourceArtifacts=ai?[...(wrap._artifactVersions?.[sourceIndex]||[])]:[];
  if(!text.trim()&&!finalAttachments.length&&!sourceArtifacts.length){await delMessage(wrap,true);return;}
  if(!await bubbleConfirm({title:"删除这个气泡？",message:"只移除选中的文字气泡，其余内容保持不变。",confirmText:"删除",danger:true}))return;
  if(!validSingleTextSource(wrap,range)){toast("消息版本已变化，请重新选择气泡");return;}
  wrap._partSaving=true;
  try{const response=await api("/api/chat/message/"+wrap._id+"/version",{method:"POST",body:JSON.stringify({content:text,attachments:finalAttachments,source_index:sourceIndex})});const saved=await response.json().catch(()=>({}));if(!response.ok){toast(saved.error||"删除未保存，请刷新核对");return;}if(saved.ok!==true){wrap._partSaveUncertain=true;toast("保存回执未确认，请先刷新核对");return;}applySavedMessageEdit(wrap,saved,text,finalAttachments,sourceIndex,sourceArtifacts);toast("已删除这个气泡");}
  catch{wrap._partSaveUncertain=true;toast("保存结果待确认，请先刷新核对，不会自动重试");}
  finally{wrap._partSaving=false;}
}
let editingMsg=null,editingPart=null;  // 用户或 AI 消息都行：发送 = 给这条加一个版本，不发新消息
const isAImsg=w=>w.classList.contains("ai-msg");
function startEdit(wrap){
  if(streaming){toast("等这次回答收好后再修改");return;}
  resetComposerAttachments();
  editingPart=null;
  editingMsg=wrap;
  const currentAttachments=isAImsg(wrap)?(wrap._attachmentVersions?.[wrap._vi]||[]):(wrap._attachments||[]);
  const editableAttachments=isAImsg(wrap)?currentAttachments.filter(saved=>saved.type==="sticker"):currentAttachments;
  attachments=editableAttachments.map(saved=>({
      existing:true,saved:{...saved},name:saved.name||"附件",
      isImg:saved.type==="image",isText:saved.type==="text",isSticker:saved.type==="sticker",url:saved.url||null
  }));
  renderAttach();
  let editable=(isAImsg(wrap)?wrap._versions[wrap._vi]:wrap._text)||"";
  if(isAImsg(wrap)){const voice=activeVoiceArtifact(wrap);if(voice){const offset=Math.max(0,Math.min(Number(voice.meta?.text_offset??editable.length),editable.length));editable=editable.slice(0,offset)+"[[语音]]"+editable.slice(offset);}}
  input.value=editable;autoGrow();
  $("#editBanner .txt").textContent="修改这条消息 · 改完点发送";
  $("#editBanner").hidden=false;input.focus();scrollDown(true);
}
function cancelEdit(){editingMsg=null;editingPart=null;$("#editBanner").hidden=true;input.value="";resetComposerAttachments();autoGrow();}
$("#editCancel").onclick=cancelEdit;
async function submitEdit(text){
  const wrap=editingMsg,partDraft=editingPart;
  if(editingPart){
    if(!text.trim()){toast("清空这一泡请使用删除此气泡");return;}
    if(!validSingleTextSource(wrap,editingPart)){toast("消息版本已变化，请重新选择气泡");return;}
    text=window.sakieChatParts.replace(editingPart.editable,editingPart,text);
  }
  if(!wrap._id){toast("这条还没存好，等一下再改");return;}
  let finalAttachments=[];
  {
    const supported=a=>isAImsg(wrap)?a.isSticker:(a.isImg||a.isText||a.isSticker);
    const unsupported=attachments.filter(a=>!supported(a));
    if(unsupported.length)toast("这里只能发图片、表情和 txt/md/pdf/docx/xlsx");
    const kept=attachments.filter(a=>a.existing&&supported(a)).map(a=>a.saved);
    const freshItems=attachments.filter(a=>!a.existing&&supported(a));
    try{finalAttachments=kept.concat(await uploadAttachments(freshItems));}
    catch(e){toast("附件上传失败："+e.message);return;}
    if(!text&&!finalAttachments.length)return;
  }
  if(editingMsg!==wrap||(partDraft&&(!validSingleTextSource(wrap,partDraft)||editingPart!==partDraft))){toast("修改已取消或版本已变化，请重新核对");return;}
  const sourceIndex=wrap._vi,sourceArtifacts=isAImsg(wrap)?[...(wrap._artifactVersions?.[sourceIndex]||[])]:[];
  const payload={content:text,attachments:finalAttachments,source_index:sourceIndex};
  const r=await api("/api/chat/message/"+wrap._id+"/version",{method:"POST",body:JSON.stringify(payload)});
  const saved=await r.json().catch(()=>({}));if(!r.ok){toast(saved.error||"修改失败了");return;}
  cancelEdit();
  applySavedMessageEdit(wrap,saved,text,finalAttachments,sourceIndex,sourceArtifacts);
}
function applySavedMessageEdit(wrap,saved,text,finalAttachments,sourceIndex,sourceArtifacts){
  if(isAImsg(wrap)){  // 编辑Morrow的回答 → 追加成新版本，think 跟着复制，下次回复读当前切的这条
    const originalAt=wrap._ats[wrap._vi]||wrap._ts;const editedText=saved.content??text;
    wrap._versions.push(editedText);wrap._reasonings.push(wrap._reasonings[sourceIndex]||"");
    wrap._models.push("已编辑");wrap._ats.push(originalAt);
    // 编辑不发新请求，所以沿用这一轮真实的用量（钱是那次花的），别再挂空。
    if(wrap._usage)wrap._usage.push(wrap._usage[sourceIndex]??null);
    wrap._thinkTimes.push(wrap._thinkTimes[sourceIndex]??null);
    wrap._attachmentVersions.push(finalAttachments);
    wrap._artifactVersions.push(artifactsForVersion({tool_run_id:saved.tool_run_id||"",artifact_ids:saved.artifact_ids||[],artifact_offsets:saved.artifact_offsets||{}},sourceArtifacts));
    wrap._vi=wrap._versions.length-1;
    setAIBody(wrap);renderReasoning(wrap);renderAIActions(wrap,isLastAI(wrap));
    toast("已改（下次回复读这条）");return;
  }
  if(!wrap._versions)wrap._versions=[wrap._text];
  if(!wrap._attachmentVersions)wrap._attachmentVersions=[wrap._attachments||[]];
  wrap._versions.push(text);wrap._attachmentVersions.push(finalAttachments);
  wrap._vi=wrap._versions.length-1;wrap._text=text;wrap._attachments=finalAttachments;
  renderUserBody(wrap);renderUserActions(wrap);
  toast("已修改（下次发送用这条）");
}
async function sendUserVoice(job,owner,{pendingEl}={}){
  if(sending||streaming||sessionId!==owner)return;
  sending=true;
  try{
    const current=await api('/api/chat/voice-input/'+job.id+'?session_id='+owner);if(!current.ok)throw Error();
    const saved=await current.json();
    if(saved.message_id){pendingEl?.remove();await loadMessages();return {saved:true};}
    if(saved.status!=='ready'){toast('语音尚未分析完成');return;}
    if($("#log .placeholder-note"))$("#log").innerHTML="";
    clearFailedReplies();
    const userEl=addUser(job.text,null,null,0,[{type:'voice_input',id:job.id,url:job.audio_url,duration:job.duration}],nowStamp());pendingEl?.remove();scrollDown(true);
    await streamInto('/api/chat/send',{session_id:owner,voice_input_id:job.id,model:getModel(),provider_id:getProviderId(),think:getThink(),context_limit:getContextLimit(),image_limit:getImageLimit(),latest_images_only:getLatestImagesOnly(),cache_ttl:getChatCacheTtl(),music_context:musicChatContext()},{userEl});
    const confirmation=await api('/api/chat/voice-input/'+job.id+'?session_id='+owner);if(!confirmation.ok)throw Error('保存状态未确认');const receipt=await confirmation.json();if(receipt.message_id)return {saved:true};if(!userEl._id)userEl.remove();return {saved:false};
  }finally{sending=false;}
}
window.sakieVoiceInput.init({api,session:()=>sessionId,ensureSession,busy:()=>sending||streaming,send:sendUserVoice,notify:toast,avatar:host=>attachAvatar(host,"user"),scroll:()=>scrollDown(true),menu:items=>openSheet(items),confirm:message=>bubbleConfirm({title:"移除待发送录音？",message,confirmText:"移除",danger:true}),reconcile:async owner=>{if(Number(sessionId)!==Number(owner))return;await loadMessages();if(await replyStillRunning())watchBackgroundReply();}});
async function send(){
  if(sending||streaming)return;
  const text=input.value.trim();
  const sendable=attachments.filter(a=>a.isImg||a.isText||a.isSticker);
  if(!text&&!sendable.length)return;
  sending=true;setSendPreparing(true);
  try{
    if(editingMsg){await submitEdit(text);return;}   // edit mode: update the message, don't reply
    if(attachments.some(a=>!a.isImg&&!a.isText&&!a.isSticker))toast("这里只能发图片、表情和 txt/md/pdf/docx/xlsx");
    let uploaded=[];
    if(sendable.length){
      try{uploaded=await uploadAttachments(sendable);}
      catch(e){toast("附件上传失败："+e.message);return;}
    }
    input.value="";autoGrow();
    attachments.forEach(a=>{if(a.url)URL.revokeObjectURL(a.url);});
    attachments=[];renderAttach();
    if($("#log .placeholder-note"))$("#log").innerHTML="";
    clearFailedReplies();
    const userEl=addUser(text,null,null,0,uploaded,nowStamp());scrollDown(true);
    setSendPreparing(false);
    const _pick=(pendingPick&&pendingPick.text===text)?pendingPick:null;pendingPick=null;
    await streamInto("/api/chat/send",{session_id:sessionId,message:text,attachments:uploaded,pick:_pick,
      model:getModel(),provider_id:getProviderId(),think:getThink(),context_limit:getContextLimit(),
      image_limit:getImageLimit(),latest_images_only:getLatestImagesOnly(),cache_ttl:getChatCacheTtl(),
      vision_enabled:!!ASSISTANT_STATE.vision.enabled,music_context:musicChatContext()},{userEl});
    // Do not steal focus or reopen the keyboard when a delayed reply completes.
  }finally{
    sending=false;setSendPreparing(false);window.sakieVoiceInput?.resume();
  }
}
async function regenerate(wrap){
  if(streaming){toast("等这次回答收好后再重新生成");return;}
  await streamInto("/api/chat/regenerate",{session_id:sessionId,model:getModel(),provider_id:getProviderId(),
    message_id:wrap._id||null,
    think:getThink(),context_limit:getContextLimit(),
    image_limit:getImageLimit(),latest_images_only:getLatestImagesOnly(),cache_ttl:getChatCacheTtl(),music_context:musicChatContext()},
    {versionTarget:wrap,retryUnsaved:!wrap._id});
}
async function retryUserReply(wrap){
  if(streaming||!wrap)return;
  clearReplyFailed(wrap);
  await streamInto("/api/chat/regenerate",{session_id:sessionId,model:getModel(),provider_id:getProviderId(),
    message_id:null,think:getThink(),context_limit:getContextLimit(),
    image_limit:getImageLimit(),latest_images_only:getLatestImagesOnly(),cache_ttl:getChatCacheTtl(),music_context:musicChatContext()},
    {retryUserEl:wrap});
}
// 分支: fork the whole context up to this message into a separately named session，
// leaving this conversation untouched. Find it later in 历史对话.
async function branch(wrap){
  const r=await api("/api/chat/sessions/"+sessionId+"/fork",
    {method:"POST",body:JSON.stringify({up_to_message_id:wrap._id})});
  const data=await r.json().catch(()=>({}));
  toast(r.ok?("已分支到「"+(data.title||"新分支")+"」"):"分支失败了");
}
// shared streaming for send / regenerate / edit
async function streamInto(url,body,opts={}){
  let aiEl=opts.versionTarget||null,started=false,gotReason=false,toolEl=null,failed=false,titlePending=false,receivedDone=false;
  const userRows=$("#log").querySelectorAll(".row-user");
  const failureUser=opts.retryUserEl||opts.userEl||(opts.retryUnsaved&&userRows.length?userRows[userRows.length-1]:null);
  const savedState=aiEl?{
    versions:[...aiEl._versions],reasonings:[...aiEl._reasonings],models:[...aiEl._models],
    ats:[...aiEl._ats],thinkTimes:[...aiEl._thinkTimes],attachmentVersions:aiEl._attachmentVersions.map(a=>[...a]),artifactVersions:aiEl._artifactVersions.map(a=>[...a]),vi:aiEl._vi
  }:null;
  const dropTool=()=>{if(toolEl&&toolEl.parentNode)toolEl.remove();toolEl=null;syncComposerSpace();};
  const finishReasoning=()=>{
    if(!gotReason||!aiEl._thinkingLive)return;
    aiEl._thinkingLive=false;
    aiEl._thinkMs=performance.now()-(aiEl._thinkStartedAt||performance.now());
    setReasoningHead(aiEl,"thought",aiEl._thinkMs);
  };
  if(aiEl){ // regenerate: append to a saved reply, or replace an unsaved stopped placeholder
    if(opts.retryUnsaved){
      aiEl._versions=[""];aiEl._reasonings=[""];aiEl._models=[""];aiEl._ats=[""];aiEl._thinkTimes=[null];aiEl._attachmentVersions=[[]];aiEl._artifactVersions=[[]];aiEl._vi=0;
    }else{
      aiEl._versions.push("");aiEl._reasonings.push("");aiEl._models.push("");aiEl._ats.push("");aiEl._thinkTimes.push(null);aiEl._attachmentVersions.push([]);aiEl._artifactVersions.push([]);
      aiEl._vi=aiEl._versions.length-1;
    }
    aiEl._thinkingLive=false;aiEl._thinkStartedAt=0;aiEl._thinkMs=null;
    aiEl.querySelector(".message-ai").innerHTML="";renderReasoning(aiEl);
  }else{
    aiEl=addAI("",new Date().toISOString(),null,"");
  }
  const failReply=detail=>{
    if(failed||receivedDone)return;failed=true;detail=String(detail||"模型请求失败");
    addChatErrorReceipt(failureUser||aiEl,detail);markReplyFailed(failureUser,"本次请求未完成，可展开报错回执核对。");
  };
  const rollbackFailedAI=()=>{
    if(!failed)return;
    const partialText=aiEl._versions[aiEl._vi]||"",partialReason=aiEl._reasonings[aiEl._vi]||"";
    const retainPartial=wrap=>{
      wrap._deliveryUnconfirmed=true;wrap._thinkingLive=false;setAIBody(wrap);renderReasoning(wrap);
      const warning=document.createElement("details");warning.className="chat-receipt reply-save-warning";
      const summary=document.createElement("summary");summary.textContent="保存回执 · 未确认";
      const explanation=document.createElement("div");explanation.className="chat-receipt-body";
      explanation.textContent="回复未完成 · 未收到保存确认，文字已暂留；刷新核对后再重试。";
      warning.append(summary,explanation);wrap.appendChild(warning);
    };
    if(!savedState||opts.retryUnsaved&&!aiEl._id){
      if(partialText.trim()||partialReason.trim())retainPartial(aiEl);else aiEl.remove();return;
    }
    aiEl._versions=savedState.versions;aiEl._reasonings=savedState.reasonings;
    aiEl._models=savedState.models;aiEl._ats=savedState.ats;aiEl._thinkTimes=savedState.thinkTimes;aiEl._attachmentVersions=savedState.attachmentVersions;aiEl._artifactVersions=savedState.artifactVersions;aiEl._vi=savedState.vi;
    aiEl._thinkingLive=false;setAIBody(aiEl);renderReasoning(aiEl);renderAIActions(aiEl,isLastAI(aiEl));
    if(partialText.trim()||partialReason.trim())retainPartial(addAI(partialText,new Date().toISOString(),null,partialReason));
  };
  const rb=aiEl.querySelector(".reasoning");
  const pill=makeThinkPill();chatLiveStatus.replaceChildren(pill);syncComposerSpace();scrollDown(true);
  abortCtl=new AbortController();setStreaming(true);
  try{
    const r=await fetch(url,{method:url.includes("/message/")?"PUT":"POST",
      headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:abortCtl.signal});
    await consumeSSE(r,(o)=>{
      if(o.type==="session"){sessionId=o.session_id;titlePending=!!o.title_pending;if(opts.userEl&&o.user_message_id)opts.userEl._id=o.user_message_id;}
      else if(o.type==="reasoning"){
        if(pill.parentNode)pill.remove();gotReason=true;
        if(!aiEl._thinkingLive){aiEl._thinkingLive=true;aiEl._thinkStartedAt=performance.now();aiEl._thinkMs=null;}
        aiEl._reasonings[aiEl._vi]+=o.content;
        rb.style.display="";rb.classList.remove("collapsed");
        setReasoningHead(aiEl,"thinking");
        rb.querySelector(".body").textContent=aiEl._reasonings[aiEl._vi];scrollDown();}
      else if(o.type==="tool"){
        addLiveChatAction(aiEl,o);
        // 墙后面：chat 只显示叙事动画（上浮气泡），调用与结果都进 tidy 不进气泡
        if(o.phase==="start"){
          if(pill.parentNode)pill.remove();
          if(!toolEl){toolEl=makeToolNarr(o.narrate);chatLiveStatus.replaceChildren(toolEl);syncComposerSpace();}
          else toolEl.querySelector(".txt").textContent=stripToolNarration(o.narrate)||"忙活着";
          scrollDown();}}
      else if(o.type==="delta"){
        if(failed)return;
        if(!started){started=true;if(pill.parentNode)pill.remove();dropTool();finishReasoning();}
        aiEl._versions[aiEl._vi]+=o.content;
        scheduleAIBody(aiEl);}
      else if(o.type==="empty"){
        failReply(o.message||"这次没有收到回答");if(o.receipt)addChatErrorReceipt(failureUser||aiEl,o.message,o.receipt);}
      else if(o.type==="error"){
        failReply((o.status?o.status+" · ":"")+(o.detail||"模型请求失败"));if(o.receipt)addChatErrorReceipt(failureUser||aiEl,o.detail,o.receipt);}
      // keep the think-trace expanded the whole way through, tuck it away only
      // once the reply is fully done (so the chain is never visually cut short)
      else if(o.type==="done"){receivedDone=true;failed=false;aiEl._deliveryUnconfirmed=false;aiEl._id=o.message_id;dropTool();finishReasoning();
        aiEl._models[aiEl._vi]=o.model||"";aiEl._ats[aiEl._vi]=o.at||"";
        if(o.usage)aiEl._usage[aiEl._vi]=o.usage;
        aiEl._thinkTimes[aiEl._vi]=o.think_ms??aiEl._thinkMs;
        aiEl._attachmentVersions[aiEl._vi]=o.attachments||[];
        aiEl._artifactVersions[aiEl._vi]=o.artifacts||[];
        setAIBody(aiEl); // final render (flush any frame still pending)
        renderReasoning(aiEl); // hide block if the trace turned out empty/whitespace
        clearReplyFailed(failureUser);
        if(o.notification_event_id&&!document.hidden&&document.hasFocus()){
          void api("/api/push/events/"+o.notification_event_id+"/foreground",{method:"POST",body:"{}"});
        }
        if(o.partial)addChatErrorReceipt(aiEl,"回复中断，已收到的部分已保存。",o.receipt);
        if(o.receipt_count===0)aiEl.querySelector(":scope > .chat-receipt")?.remove();
        else{if(o.receipt_count)ensureChatReceipt(aiEl,o.receipt_count);refreshChatReceipt(aiEl);}
        renderUsageDashboard();
        if(titlePending&&!o.partial)void generateConversationTitle(sessionId);
        if(gotReason&&(aiEl._reasonings[aiEl._vi]||"").trim()&&!rb.classList.contains("collapsed"))toggleReasoning(rb);}
    });
    if(!receivedDone&&!failed){aiEl._deliveryUnconfirmed=true;await loadMessages();refreshAllActions();}
  }catch(e){
    if(receivedDone){failed=false;toast("回复已保存，页面状态更新未完成，请刷新核对。");}
    else if(e.name==="AbortError"){toast("已停下");failReply("已停下这一轮；服务器不会再继续生成。");}
    else if(hiddenDuringStream||document.hidden){
      // 断在后台：服务器那一轮还在继续。不要把它标成失败，回前台再同步。
      aiEl._deliveryUnconfirmed=true;
      if(!document.hidden)toast("网络断开，这一轮还在服务器上继续");
    }
    else{
      // 连接断了先别急着判失败：服务器可能还在写，也可能已经写好存库了。
      const still=await replyStillRunning();
      aiEl._deliveryUnconfirmed=true;
      if(still){
        if(!document.hidden)toast("连接断了，这一轮还在服务器上继续");
        watchBackgroundReply();
      }else{
        await loadMessages();refreshAllActions();
        toast("这一轮已经收好，已把完整回复取回来");
      }
    }
  }finally{
    if(pill.parentNode)pill.remove();dropTool();chatLiveStatus.replaceChildren();syncComposerSpace();rollbackFailedAI();setStreaming(false);refreshAllActions();
  }
}
/* ---------- 后台生成：回来时把进度接上/把结果刷出来 ---------- */
async function stopLiveReply(){
  const target=sessionId;
  abortCtl?.abort();
  if(target){try{await api("/api/chat/live/"+target+"/stop",{method:"POST",body:"{}"});}catch{}}
}
async function replyStillRunning(){
  if(!sessionId)return false;
  try{const r=await api("/api/chat/live/"+sessionId);return !!(r.ok&&(await r.json()).running);}catch{return false;}
}
function stopBackgroundWatch(){if(backgroundWatchTimer){clearInterval(backgroundWatchTimer);backgroundWatchTimer=0;}}
function renderBackgroundReply(data){
  if(streaming)return;   // 前台这条流还活着，不要重复画
  let wrap=$("#log").querySelector(".ai-msg.background-reply");
  if(!wrap){
    wrap=addAI("",new Date().toISOString(),null,data&&data.reasoning||"");
    wrap.classList.add("background-reply");
  }
  wrap._versions[wrap._vi]=data&&data.text||"";
  wrap._reasonings[wrap._vi]=data&&data.reasoning||"";
  setAIBody(wrap);renderReasoning(wrap);renderAIActions(wrap,true);scrollDown();
}
function watchBackgroundReply(){
  stopBackgroundWatch();
  backgroundWatchTimer=setInterval(async()=>{
    if(!sessionId||document.hidden){return;}
    let data=null;
    try{const r=await api("/api/chat/live/"+sessionId);data=r.ok?await r.json():null;}catch{}
    if(data&&data.running){renderBackgroundReply(data);return;}
    stopBackgroundWatch();
    await loadMessages();refreshAllActions();
    toast("后台那一轮已经收好了");
  },2000);
}
async function resumeAfterBackground(){
  if(!sessionId)return;
  if(!$("#view-chat")?.classList.contains("active"))return;
  stopBackgroundWatch();
  let data=null;
  try{const r=await api("/api/chat/live/"+sessionId);data=r.ok?await r.json():null;}catch{}
  if(data&&data.running){
    renderBackgroundReply(data);
    watchBackgroundReply();
    return;
  }
  if(streaming)abortCtl?.abort();
  await loadMessages();
  refreshAllActions();
}
document.addEventListener("visibilitychange",()=>{
  if(document.hidden){hiddenDuringStream=hiddenDuringStream||streaming;return;}
  hiddenDuringStream=false;
  void resumeAfterBackground();
});
window.addEventListener("online",()=>{if(!document.hidden)void resumeAfterBackground();});

async function generateConversationTitle(targetSessionId){
  try{
    const r=await api("/api/chat/sessions/"+targetSessionId+"/generate-title",{method:"POST"});
    const data=await r.json();if(!r.ok||!data.applied)return;
    if(sessionId===targetSessionId)$("#chatTitle").textContent=data.title||assistantName();
    const cached=HISTORY_LIST.find(item=>item.id===targetSessionId);if(cached)cached.title=data.title;
  }catch{}
}
/* ---------- message action sheets ---------- */
const sheet=$("#sheet"),sheetMask=$("#sheetMask"),sheetBody=$("#sheetBody");
let sheetOpeningTimer=null;
function showSheet(){
  clearTimeout(sheetOpeningTimer);sheet.classList.remove("dragging","opening");
  sheet.style.removeProperty("transform");sheet.style.removeProperty("transition");
  sheetMask.style.removeProperty("opacity");sheetMask.style.removeProperty("transition");
  sheet.classList.add("on");sheetMask.classList.add("on");
  if(!reducedMotion){
    sheet.classList.add("opening");
    sheetOpeningTimer=setTimeout(()=>sheet.classList.remove("opening"),420);
  }
}
function openSheet(items,footerHTML){
  sheet.classList.remove("choice-sheet","daily-message-sheet");
  sheetBody.innerHTML="";
  items.forEach(it=>{const b=document.createElement("button");if(it.danger)b.className="danger";b.disabled=!!it.disabled;
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">'+it.svg+'</svg>'+it.label;
    b.onclick=()=>{closeSheet();it.fn();};sheetBody.appendChild(b);});
  if(footerHTML)sheetBody.insertAdjacentHTML("beforeend",footerHTML);
  showSheet();
}
function openChoiceSheet({title="请选择",items=[],value="",search=false,closeOnChoose=true,isSelected,onChoose}){
  sheet.classList.remove("daily-message-sheet");
  sheet.classList.add("choice-sheet");sheetBody.innerHTML="";
  const heading=document.createElement("div");heading.className="sheet-choice-title";heading.textContent=title;sheetBody.appendChild(heading);
  const list=document.createElement("div");list.className="sheet-choice-list";sheetBody.appendChild(list);
  const render=query=>{const needle=String(query||"").trim().toLocaleLowerCase();list.innerHTML="";
    const visible=items.filter(item=>!needle||String(item.label||item.value).toLocaleLowerCase().includes(needle));
    visible.forEach(item=>{const button=document.createElement("button"),selected=isSelected?!!isSelected(item.value,item):item.value===value;button.type="button";button.classList.toggle("selected",selected);
      button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/>'+(selected?'<path d="M8.5 12.2l2.4 2.4 4.8-5.4"/>':'')+'</svg><span></span>';
      button.querySelector("span").textContent=item.label||item.value;button.onclick=()=>{if(closeOnChoose)closeSheet();onChoose?.(item.value,item);if(!closeOnChoose)render(searchInput?.value||"");};list.appendChild(button);});
    if(!visible.length)list.innerHTML='<div class="sheet-choice-empty">没有找到相符的模型</div>';
  };render("");
  let searchInput=null;
  if(search){const searchBox=document.createElement("label");searchBox.className="sheet-choice-search";
    searchBox.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input type="text" autocomplete="off" placeholder="筛选模型"><button class="sheet-choice-clear" type="button" aria-label="清除筛选" hidden>×</button>';
    searchInput=searchBox.querySelector("input");const clear=searchBox.querySelector("button");searchInput.oninput=()=>{clear.hidden=!searchInput.value;render(searchInput.value);};
    clear.onclick=e=>{e.preventDefault();searchInput.value="";clear.hidden=true;render("");searchInput.focus();};sheetBody.appendChild(searchBox);
  }
  showSheet();
}
function openContentSheet({title,content}){
  openChoiceSheet({title});
  sheetBody.querySelector(".sheet-choice-list").remove();
  content.hidden=false;sheetBody.appendChild(content);
}
function closeSheet(){
  clearTimeout(sheetOpeningTimer);sheet.classList.remove("on","opening","dragging");sheetMask.classList.remove("on");
  sheet.style.removeProperty("transform");sheet.style.removeProperty("transition");
  sheetMask.style.removeProperty("opacity");sheetMask.style.removeProperty("transition");
  setTimeout(()=>{if(!sheet.classList.contains("on"))sheet.classList.remove("choice-sheet");},300);
}
sheetMask.onclick=closeSheet;
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&sheet.classList.contains("on"))closeSheet();});
const sheetGrip=sheet.querySelector(".grip");
let sheetDrag=null;
sheetGrip.addEventListener("pointerdown",e=>{
  if(!sheet.classList.contains("on"))return;
  clearTimeout(sheetOpeningTimer);sheet.classList.remove("opening");
  sheetDrag={id:e.pointerId,startY:e.clientY,prevY:e.clientY,lastY:e.clientY,
    startAt:performance.now(),prevAt:performance.now(),lastAt:performance.now(),dy:0};
  sheet.classList.add("dragging");sheet.style.transition="none";sheetMask.style.transition="none";
  sheetGrip.setPointerCapture(e.pointerId);e.preventDefault();
});
function moveSheetDrag(e){
  if(!sheetDrag||sheetDrag.id!==e.pointerId)return;
  const now=performance.now(),dy=Math.max(0,e.clientY-sheetDrag.startY),height=Math.max(1,sheet.getBoundingClientRect().height);
  sheetDrag.prevY=sheetDrag.lastY;sheetDrag.prevAt=sheetDrag.lastAt;
  sheetDrag.lastY=e.clientY;sheetDrag.lastAt=now;sheetDrag.dy=dy;
  sheet.style.transform=`translateY(${dy}px)`;
  sheetMask.style.opacity=String(Math.max(0,1-dy/height));e.preventDefault();
}
function finishSheetDrag(e){
  if(!sheetDrag||sheetDrag.id!==e.pointerId)return;
  const drag=sheetDrag;sheetDrag=null;
  const velocity=Math.max(0,(drag.lastY-drag.prevY)/Math.max(1,drag.lastAt-drag.prevAt));
  const height=Math.max(1,sheet.getBoundingClientRect().height);
  const dismiss=drag.dy>Math.min(height*.28,180)||velocity>.55;
  sheet.classList.remove("dragging");
  if(dismiss){
    sheet.classList.remove("on");sheetMask.classList.remove("on");
    sheet.style.transition=reducedMotion?"none":"transform .24s cubic-bezier(.4,0,1,1)";
    sheet.style.transform=`translateY(${height+24}px)`;
    sheetMask.style.transition=reducedMotion?"none":"opacity .2s";sheetMask.style.opacity="0";
    setTimeout(()=>{sheet.style.removeProperty("transform");sheet.style.removeProperty("transition");
      sheetMask.style.removeProperty("opacity");sheetMask.style.removeProperty("transition");},reducedMotion?0:260);
  }else{
    sheet.style.transition=reducedMotion?"none":"transform .32s cubic-bezier(.2,1.18,.32,1)";
    sheetMask.style.transition=reducedMotion?"none":"opacity .22s";
    requestAnimationFrame(()=>{sheet.style.transform="translateY(0)";sheetMask.style.opacity="1";});
    setTimeout(()=>{sheet.style.removeProperty("transform");sheet.style.removeProperty("transition");
      sheetMask.style.removeProperty("opacity");sheetMask.style.removeProperty("transition");},reducedMotion?0:340);
  }
}
addEventListener("pointermove",moveSheetDrag,{passive:false});
addEventListener("pointerup",finishSheetDrag);
addEventListener("pointercancel",finishSheetDrag);
const SVG_EDIT='<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>';
const SVG_COPY='<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>';
const SVG_REGENERATE='<path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>';
const SVG_BRANCH='<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>';
const SVG_TRASH='<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>';
const SVG_STAR_OUTLINE='<path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 20.5l1.4-6.8-5.1-4.7 6.9-.7z"/>';
const SVG_STAR_SOLID='<path fill="currentColor" stroke="currentColor" d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 20.5l1.4-6.8-5.1-4.7 6.9-.7z"/>';
const SVG_KEEPSAKE='<path d="M4 5h16v14H4z"/><path d="m7 15 3-3 2 2 2-2 3 3"/><circle cx="9" cy="9" r="1.2"/>';
let KEEPSAKE_SELECTING=false,KEEPSAKE_SELECTED=new Set();
function ensureKeepsakeCheck(wrap){
  if(!wrap||wrap.querySelector(":scope > .keepsake-check"))return;
  const button=document.createElement("button");button.type="button";button.className="keepsake-check";button.setAttribute("aria-label","选择这条消息留影");
  button.onclick=e=>{e.stopPropagation();toggleKeepsakeMessage(wrap);};wrap.prepend(button);
  wrap.addEventListener("click",e=>{if(!KEEPSAKE_SELECTING)return;e.preventDefault();e.stopImmediatePropagation();toggleKeepsakeMessage(wrap);},true);
}
function updateKeepsakeSelection(){
  $$("#log .msg").forEach(wrap=>{const check=wrap.querySelector(":scope > .keepsake-check");if(!check)return;const kept=KEEPSAKED_MESSAGE_IDS.has(String(wrap._id));check.classList.toggle("kept",kept);check.classList.toggle("on",KEEPSAKE_SELECTED.has(String(wrap._id)));const anchor=wrap.classList.contains("row-user")?wrap.querySelector(".bubble-user"):wrap.querySelector(".message-ai");check.style.top=Math.max(0,(anchor?.offsetTop||0)+8)+"px";});
  $("#keepsakeSelectCount").textContent="已选择 "+KEEPSAKE_SELECTED.size+" 条";
}
function startKeepsakeSelection(wrap){
  if(streaming){toast("等这次回答收好后再留影");return;}
  if(!wrap?._id){toast("这条消息还没有收好");return;}
  if(KEEPSAKED_MESSAGE_IDS.has(String(wrap._id))){toast("这句话已经留在照片里了");return;}
  const log=$("#log"),anchorTop=wrap.getBoundingClientRect().top;
  KEEPSAKE_SELECTING=true;KEEPSAKE_SELECTED=new Set([String(wrap._id)]);document.body.classList.add("keepsake-selecting");
  $("#keepsakeSelectBar").hidden=false;composerEl.hidden=true;updateKeepsakeSelection();
  const restoreAnchor=()=>{if(!wrap.isConnected)return;const delta=wrap.getBoundingClientRect().top-anchorTop;if(Math.abs(delta)>.5)log.scrollTop+=delta;};
  restoreAnchor();requestAnimationFrame(()=>{restoreAnchor();requestAnimationFrame(restoreAnchor);});
}
function toggleKeepsakeMessage(wrap){
  if(!KEEPSAKE_SELECTING||!wrap?._id)return;const key=String(wrap._id);if(KEEPSAKED_MESSAGE_IDS.has(key)){toast("这句话已经留过影了");return;}
  if(KEEPSAKE_SELECTED.has(key))KEEPSAKE_SELECTED.delete(key);else if(KEEPSAKE_SELECTED.size>=10){toast("一张留影最多放 10 条消息");return;}else KEEPSAKE_SELECTED.add(key);updateKeepsakeSelection();
}
function stopKeepsakeSelection(){KEEPSAKE_SELECTING=false;KEEPSAKE_SELECTED.clear();document.body.classList.remove("keepsake-selecting");$("#keepsakeSelectBar").hidden=true;composerEl.hidden=false;updateKeepsakeSelection();syncComposerSpace();}
function localKeepsakeSnapshot(){return [...$("#log").querySelectorAll(".msg")].filter(w=>KEEPSAKE_SELECTED.has(String(w._id))).map(w=>({
  message_id:w._id,role:w.classList.contains("row-user")?"user":"assistant",content:w.classList.contains("row-user")?(w._text||""):(w._versions?.[w._vi]||""),
  attachments:w.classList.contains("row-user")?(w._attachments||[]):(w._attachmentVersions?.[w._vi]||[]),artifacts:w._artifactVersions?.[w._vi]||[],created_at:w._ts||""
}));}
function keepsakeNookMarkup(item,detail=false){const bubble=document.createElement("div");bubble.className="keepsake-bubble "+(item.role==="user"?"user":"assistant");const text=String(item.content||"").trim(),textEl=document.createElement("div");textEl.className="keepsake-bubble-text";textEl.textContent=detail||item.role==="user"?text:(text.length>135?text.slice(0,135)+"…":text);if(text)bubble.appendChild(textEl);const marks=[];(item.attachments||[]).forEach(a=>{if((a.type==="sticker"||a.type==="image")&&a.url){const img=document.createElement("img");img.className="keepsake-media-thumb";img.src=a.url;img.alt=a.sticker_name||a.name||(a.type==="sticker"?"表情":"图片");bubble.appendChild(img);}else if(a.type==="text")marks.push("附件");});(item.artifacts||[]).forEach(a=>{if(a.type!=="voice_letter")return;const chip=document.createElement("div");chip.className="keepsake-voice-chip";const title=a.source_payload?.title||a.source_payload?.subject||"一封语音";chip.textContent="✦ "+title+(detail&&a.visible_text?"\n"+a.visible_text:"");bubble.appendChild(chip);});if(marks.length){const mark=document.createElement("div");mark.className="keepsake-media-mark";mark.textContent="［"+marks.join(" · ")+"］";bubble.appendChild(mark);}return bubble;}
function keepsakePreviewMessages(snapshot){const items=Array.isArray(snapshot)?snapshot:[],user=items.find(item=>item.role==="user"),assistant=items.find(item=>item.role==="assistant");if(user&&assistant)return items.filter(item=>item===user||item===assistant);return items.slice(0,2);}
function keepsakeDateTime(value,mode="short"){
  if(!value)return "";
  const t=chatDateParts(value);if(!t)return "";
  if(mode==="month")return t.year+"-"+t.month;
  const date=mode==="full"?t.year+"-"+t.month+"-"+t.day:t.month+"/"+t.day;
  return date+" "+t.hour+":"+t.minute;
}
function makeKeepsakePhoto(item,preview=false){const photo=document.createElement("button");photo.type="button";photo.className="keepsake-photo";photo.classList.toggle("favorite",!!item.favorite);if(item.favorite){const pin=document.createElement("span");pin.className="keepsake-pin";pin.setAttribute("aria-hidden","true");photo.appendChild(pin);}const windowEl=document.createElement("div"),visible=preview?(item.snapshot||[]):keepsakePreviewMessages(item.snapshot);windowEl.className="keepsake-window"+(visible.some(message=>message.role==="user")&&visible.some(message=>message.role==="assistant")?" conversation":"");visible.forEach(message=>windowEl.appendChild(keepsakeNookMarkup(message)));const caption=document.createElement("div");caption.className="keepsake-caption";const label=document.createElement("span");label.textContent=item.session_title||"那时的对话";const time=document.createElement("time");time.textContent=keepsakeDateTime(item.created_at);caption.append(label,time);photo.append(windowEl,caption);if(preview)photo.tabIndex=-1;return photo;}
function openKeepsakeCompose(){if(!KEEPSAKE_SELECTED.size){toast("先选一条想留下的消息");return;}const draft={snapshot:localKeepsakeSnapshot(),note:"",session_title:$("#chatTitle").textContent||"对话",created_at:new Date().toISOString()};const box=$("#keepsakeComposePreview");box.innerHTML="";box.appendChild(makeKeepsakePhoto(draft,true));$("#keepsakeNote").value="";$("#keepsakeComposeMask").classList.add("on");$("#keepsakeCompose").classList.add("on");}
function closeKeepsakeCompose(){$("#keepsakeComposeMask").classList.remove("on");$("#keepsakeCompose").classList.remove("on");}
$("#keepsakeSelectCancel").onclick=stopKeepsakeSelection;$("#keepsakeSelectNext").onclick=openKeepsakeCompose;$("#keepsakeComposeCancel").onclick=closeKeepsakeCompose;$("#keepsakeComposeMask").onclick=closeKeepsakeCompose;
$("#keepsakeComposeSave").onclick=async()=>{const button=$("#keepsakeComposeSave");button.disabled=true;try{const ids=[...KEEPSAKE_SELECTED].map(Number);const r=await api("/api/keepsakes",{method:"POST",body:JSON.stringify({session_id:sessionId,message_ids:ids,note:$("#keepsakeNote").value})}),data=await r.json();if(!r.ok)throw new Error(data.error||"这张留影没有收好");ids.forEach(id=>KEEPSAKED_MESSAGE_IDS.add(String(id)));closeKeepsakeCompose();stopKeepsakeSelection();toast("这一刻已经留下来了");}catch(error){toast(error.message||"这张留影没有收好");}finally{button.disabled=false;}};
function openUserSheet(wrap){
  const kept=KEEPSAKED_MESSAGE_IDS.has(String(wrap._id));
  openSheet([
    {label:"修改这条",svg:SVG_EDIT,fn:()=>startEdit(wrap)},
    {label:"复制",svg:SVG_COPY,fn:()=>copyText(wrap._text)},
    {label:kept?"已留影":"留影",svg:SVG_KEEPSAKE,disabled:kept,fn:()=>startKeepsakeSelection(wrap)},
    {label:"删除",svg:SVG_TRASH,danger:true,fn:()=>delMessage(wrap)},
  ]);
}
// AI 回答菜单：常用动作在前，其余顺序保持 编辑 / 留影 / 分支 / 删除。
function openAISheet(wrap){
  const kept=KEEPSAKED_MESSAGE_IDS.has(String(wrap._id)),daily=document.body.classList.contains("daily-chat");
  const items=[];
  if(daily&&isLastAI(wrap))items.push({label:"重新生成",svg:SVG_REGENERATE,fn:()=>regenerate(wrap)});
  if(daily)items.push({label:"复制",svg:SVG_COPY,fn:()=>copyText(wrap._versions[wrap._vi])});
  items.push(
    {label:"编辑",svg:SVG_EDIT,fn:()=>startEdit(wrap)},
    {label:kept?"已留影":"留影",svg:SVG_KEEPSAKE,disabled:kept,fn:()=>startKeepsakeSelection(wrap)},
    {label:"分支",svg:SVG_BRANCH,fn:()=>branch(wrap)},
    {label:"删除",svg:SVG_TRASH,danger:true,fn:()=>delMessage(wrap)},
  );
  openSheet(items,msgInfoHTML(wrap));
  sheet.classList.toggle("daily-message-sheet",daily);
}
async function addFav(wrap){
  if(!sessionId||!wrap._id){toast("先发条消息再收藏");return;}
  try{
    const r=await(await api("/api/favorites",{method:"POST",body:JSON.stringify({
      session_id:sessionId,message_id:wrap._id,
      title:$("#chatTitle").textContent||"对话",content:wrap._versions[wrap._vi]||""})})).json();
    if(r&&r.id){
      FAVORITES_BY_MESSAGE.set(String(wrap._id),r);
      wrap._favId=r.id;
      toast("已收藏");
    }else toast("收藏失败");
  }catch(e){toast("收藏失败");}
}
async function removeFav(wrap){
  if(!wrap._favId)return;
  try{
    await api("/api/favorites/"+wrap._favId,{method:"DELETE"});
    FAVORITES_BY_MESSAGE.delete(String(wrap._id));
    wrap._favId=null;
    toast("已取消收藏");
  }catch(e){toast("取消失败");}
}
async function delMessage(wrap,wholeMessage=false){
  if(streaming){toast("等这次回答收好后再删除");return;}
  const ai=isAImsg(wrap),vers=wrap._versions||[];
  if(!wholeMessage&&wrap._id&&vers.length>1){          // 多版本：只删当前切到的这条
    if(!await bubbleConfirm({
      title:"删除当前版本",message:"要删掉现在看到的这一版吗？",
      note:"同一条消息的其他版本会继续保留。",confirmText:"删除",danger:true
    }))return;
    const idx=wrap._vi;
    const response=await api("/api/chat/message/"+wrap._id+"/version",{method:"DELETE",body:JSON.stringify({index:idx})});
    if(!response.ok){await loadMessages();toast("版本刚刚发生了变化，已经重新对齐");return;}
    wrap._versions.splice(idx,1);
    if(!ai&&wrap._attachmentVersions)wrap._attachmentVersions.splice(idx,1);
    if(ai&&wrap._attachmentVersions)wrap._attachmentVersions.splice(idx,1);
    if(ai&&wrap._reasonings)wrap._reasonings.splice(idx,1);
    if(ai&&wrap._models)wrap._models.splice(idx,1);
    if(ai&&wrap._ats)wrap._ats.splice(idx,1);
    if(ai&&wrap._thinkTimes)wrap._thinkTimes.splice(idx,1);
    if(ai&&wrap._artifactVersions)wrap._artifactVersions.splice(idx,1);
    wrap._vi=Math.min(idx,wrap._versions.length-1);
    if(ai){setAIBody(wrap);renderReasoning(wrap);renderAIActions(wrap,isLastAI(wrap));}
    else{wrap._text=wrap._versions[wrap._vi];wrap._attachments=wrap._attachmentVersions[wrap._vi]||[];
      renderUserBody(wrap);renderUserActions(wrap);}
    toast("已删除这条版本");return;
  }
  if(!await bubbleConfirm({
    title:"删除消息",message:"要删掉这条消息吗？",
    note:"删除后不能恢复。",confirmText:"删除",danger:true
  }))return;   // 只有一条：删整条
  if(wrap._id){try{const response=await api("/api/chat/message/"+wrap._id,{method:"DELETE"});if(!response.ok){toast("删除未保存，请刷新核对");return;}}catch{toast("删除结果待确认，请刷新核对");return;}}
  wrap.remove();refreshAllActions();scheduleDailyTimeDividers();updateToBottom();toast("已删除");
}
/* long-press (mobile) + contextmenu (desktop) */
function attachLongPress(el,fn,enabled=()=>true){
  let t;
  el.addEventListener("touchstart",()=>{if(enabled())t=setTimeout(fn,500);},{passive:true});
  el.addEventListener("touchend",()=>clearTimeout(t));
  el.addEventListener("touchmove",()=>clearTimeout(t));
  el.addEventListener("contextmenu",e=>{if(!enabled())return;e.preventDefault();fn();});
}

/* ---------- model switcher + 深度思考 ---------- */
// Active chat model comes from the configured providers (设置 → 提供商).
// Stored as {pid, id, name}; pid null + no providers = fall back to .env model.
const getActive=()=>{try{return JSON.parse(localStorage.getItem("activeModel"));}catch{return null;}};
const getModel=()=>{const a=getActive();return a?a.id:null;};
const getProviderId=()=>{const a=getActive();return a?a.pid:null;};
function applyModel(){const a=getActive(),name=a?a.name:"默认模型";
  $("#modelName").textContent=name;const daily=$("#dailyModelName");if(daily)daily.textContent=name;}
function readModelChoice(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
function writeModelChoice(key,choice){saveLocalPreference(key,JSON.stringify(choice));}
const getThink=()=>localStorage.getItem("deepThink")==="1";
function applyThink(){const t=$("#thinkToggle");if(t)t.checked=getThink();}
$("#thinkToggle").onclick=()=>{saveLocalPreference("deepThink",getThink()?"0":"1");applyThink();
  toast(getThink()?"深度思考 已开":"深度思考 已关");};
const getChatCacheTtl=()=>{
  const v=localStorage.getItem("chatCacheTtl")||"off";
  return ["off","5m","1h"].includes(v)?v:"off";
};
function currentProvider(){
  const pid=getProviderId();
  return PROVIDERS.find(p=>String(p.id)===String(pid))||null;
}
function cacheCapableProvider(){
  const p=currentProvider();
  return !!(p&&p.format==="claude"&&p.cache&&p.cache_mode&&p.cache_mode!=="none");
}
function applyChatCache(){
  const ttl=getChatCacheTtl(),capable=cacheCapableProvider(),text=$("#chatCacheText");
  $$("#chatCacheSeg button").forEach(b=>{
    const isOff=b.dataset.cache==="off";
    b.classList.toggle("on",b.dataset.cache===ttl);
    b.disabled=!capable&&!isOff;
    b.style.opacity=(!capable&&!isOff)?".45":"";
  });
  if(text){
    if(!capable)text.textContent="当前供应商未配置缓存适配";
    else if(ttl==="off")text.textContent="关闭";
    else text.textContent=ttl==="1h"?"开启，约 1 小时缓存":"开启，约 5 分钟缓存";
  }
}
$("#chatCacheSeg").onclick=e=>{
  const b=e.target.closest("button[data-cache]");if(!b||b.disabled)return;
  saveLocalPreference("chatCacheTtl",b.dataset.cache);
  applyChatCache();
};
const getContextLimit=()=>{
  const raw=localStorage.getItem("contextLimit");
  if(!raw||raw==="unlimited")return null;
  const n=parseInt(raw,10);
  return Number.isFinite(n)&&n>0?n:null;
};
function applyContextLimit(){
  const limit=getContextLimit(),range=$("#ctxLimitRange"),text=$("#ctxLimitText");
  if(range){range.value=limit||501;syncRangeFill(range);}
  if(text)text.textContent=limit?("最近 "+limit+" 条消息"):"无限制上下文";
}
$("#ctxLimitOpen").onclick=()=>{
  const setting=$("#ctxLimitSetting"),open=!setting.classList.contains("open");
  setting.classList.toggle("open",open);$("#ctxLimitOpen").setAttribute("aria-expanded",String(open));
};
$("#ctxLimitRange").addEventListener("input",e=>{
  const v=parseInt(e.target.value,10);
  if(v>=501)saveLocalPreference("contextLimit","unlimited");
  else saveLocalPreference("contextLimit",String(Math.max(1,Math.min(500,v))));
  applyContextLimit();
});
const getImgLimitOn=()=>localStorage.getItem("imgLimitOn")==="1";
const getImageLimit=()=>{
  if(!getImgLimitOn())return null;
  const n=parseInt(localStorage.getItem("imageLimit")||"4",10);
  return Number.isFinite(n)?Math.max(1,Math.min(10,n)):4;
};
const getLatestImagesOnly=()=>localStorage.getItem("latestImagesOnly")==="1";
function applyImageStrategy(){
  const on=getImgLimitOn(),latest=getLatestImagesOnly(),limit=getImageLimit()||4;
  $("#imgLimitToggle").checked=on;$("#latestImagesOnly").checked=latest;
  $("#imgLimitBox").hidden=!on;$("#imgLimitRange").value=limit;syncRangeFill($("#imgLimitRange"));
  $("#imgLimitText").textContent=on?("最多发送最近 "+limit+" 张图片"):(latest?"已改为只发最新消息图片":"不限制图片");
}
$("#imgLimitToggle").onchange=e=>{
  saveLocalPreference("imgLimitOn",e.target.checked?"1":"0");
  if(e.target.checked)saveLocalPreference("latestImagesOnly","0");
  applyImageStrategy();
};
$("#imgLimitRange").addEventListener("input",e=>{
  saveLocalPreference("imageLimit",String(e.target.value));applyImageStrategy();
});
$("#latestImagesOnly").onchange=e=>{
  saveLocalPreference("latestImagesOnly",e.target.checked?"1":"0");
  if(e.target.checked)saveLocalPreference("imgLimitOn","0");
  applyImageStrategy();
};
const chatSetDrawer=$("#chatSetDrawer"),chatSetMask=$("#chatSetMask");
function openChatSettings(){applyThink();applyChatCache();applyContextLimit();applyImageStrategy();applyChatBg();loadCompressionStatus();
  loadChatToolVisibility();
  chatSetDrawer.classList.add("on");chatSetMask.classList.add("on");pushChatDrawerRoute("settings");}
function hideChatSettings(){closeChatToolSheet();chatSetDrawer.classList.remove("on");chatSetMask.classList.remove("on");}
function closeChatSettings(){closeChatDrawerRoute("settings",hideChatSettings);}
$("#chatSetClose").onclick=closeChatSettings;chatSetMask.onclick=closeChatSettings;
let CHAT_TOOL_SERVERS=[],chatToolSheetServer=null;
function closeChatToolSheet(){chatToolSheetServer=null;$("#chatToolSheet").classList.remove("on");$("#chatToolSheetMask").classList.remove("on");}
function openChatToolSheet(server){
  if(!server?.visible||!(server.tools||[]).length)return;
  chatToolSheetServer=server;$("#chatToolSheetTitle").textContent=server.name;
  $("#chatToolSheetNote").textContent="available in chat · 只影响日常聊天，不改变小房间";
  const list=$("#chatToolSheetList");list.innerHTML="";
  server.tools.forEach(tool=>{
    const label=document.createElement("label");label.className="chat-tool-choice";
    label.innerHTML='<input type="checkbox"><span class="chat-tool-box" aria-hidden="true"></span><span class="chat-tool-name"></span>';
    const input=label.querySelector("input");input.checked=tool.visible!==false;label.querySelector(".chat-tool-name").textContent=tool.title||tool.name;
    input.onchange=async()=>{const visible=input.checked;input.disabled=true;
      try{const r=await api("/api/chat/tool-visibility",{method:"PUT",body:JSON.stringify({server_id:server.id,tool_name:tool.name,visible})}),data=await r.json();if(!r.ok)throw new Error(data.error||"保存失败");tool.visible=visible;server.customized=true;renderChatToolServers();}
      catch(error){input.checked=!visible;toast(error.message||"保存失败");}finally{input.disabled=false;}};
    list.appendChild(label);
  });
  $("#chatToolSheetMask").classList.add("on");requestAnimationFrame(()=>$("#chatToolSheet").classList.add("on"));
}
function bindChatToolLongPress(label,server){
  let timer=0,longPressed=false;
  const cancel=()=>{clearTimeout(timer);timer=0;};
  label.addEventListener("pointerdown",event=>{if(event.button!==undefined&&event.button!==0)return;longPressed=false;timer=setTimeout(()=>{longPressed=true;openChatToolSheet(server);navigator.vibrate?.(12);},520);});
  label.addEventListener("pointerup",cancel);label.addEventListener("pointercancel",cancel);label.addEventListener("pointerleave",cancel);
  label.addEventListener("click",event=>{if(longPressed){event.preventDefault();event.stopPropagation();longPressed=false;}},true);
  label.addEventListener("contextmenu",event=>{event.preventDefault();cancel();openChatToolSheet(server);});
}
function renderChatToolServers(){
  CHAT_TOOL_SERVERS.forEach(server=>{
    const count=server.tools?.filter(tool=>tool.visible!==false).length||0,total=server.tools?.length||0;
    const countEl=document.querySelector('[data-chat-mcp-count="'+server.id+'"]');if(countEl)countEl.textContent=server.visible?(count+" / "+total+" tools"):"off";
  });
}
async function loadChatToolVisibility(){
  const list=$("#chatToolList");
  try{
    const r=await api("/api/chat/tool-visibility"),data=await r.json();if(!r.ok)throw new Error(data.error||"读取失败");
    list.innerHTML="";const servers=Array.isArray(data.servers)?data.servers:[];CHAT_TOOL_SERVERS=servers;
    const sticker=document.createElement("label");sticker.className="chat-tool-choice sticker-capability";
    sticker.innerHTML='<input type="checkbox"><span class="chat-tool-box" style="border-radius:50%" aria-hidden="true"></span><span class="chat-tool-name">表情包</span>';
    const stickerInput=sticker.querySelector("input");stickerInput.checked=data.sticker?.visible===true;
    stickerInput.onchange=async()=>{const visible=stickerInput.checked;stickerInput.disabled=true;
      try{const response=await api("/api/chat/tool-visibility",{method:"PUT",body:JSON.stringify({capability:"sticker",visible})});if(!response.ok)throw new Error("保存失败");}
      catch(e){stickerInput.checked=!visible;toast("表情包能力没有保存好");}finally{stickerInput.disabled=false;}};
    list.appendChild(sticker);
    const voice=document.createElement("label");voice.className="chat-tool-choice voice-capability";
    voice.innerHTML='<input type="checkbox"><span class="chat-tool-box" style="border-radius:50%" aria-hidden="true"></span><span class="chat-tool-name">语音</span>';
    const voiceInput=voice.querySelector("input");voiceInput.checked=data.voice_letter?.visible===true;
    voiceInput.onchange=async()=>{const visible=voiceInput.checked;voiceInput.disabled=true;
      try{const response=await api("/api/chat/tool-visibility",{method:"PUT",body:JSON.stringify({capability:"voice_letter",visible})});if(!response.ok)throw new Error("保存失败");}
      catch(e){voiceInput.checked=!visible;toast("语音能力没有保存好");}finally{voiceInput.disabled=false;}};
    list.appendChild(voice);
    if(!servers.length){const empty=document.createElement("div");empty.className="chat-tool-empty";empty.textContent="还没有启用的 MCP 工具";list.appendChild(empty);}
    servers.forEach(server=>{
      const label=document.createElement("label");label.className="chat-tool-choice";
      label.innerHTML='<input type="checkbox"><span class="chat-tool-box" aria-hidden="true"></span><span class="chat-tool-name"></span><span class="chat-tool-count"></span>';
      const input=label.querySelector("input");input.checked=server.visible!==false;
      label.querySelector(".chat-tool-name").textContent=server.name;
      const count=label.querySelector(".chat-tool-count");count.dataset.chatMcpCount=server.id;count.textContent=server.visible?((server.tools||[]).filter(tool=>tool.visible!==false).length+" / "+(server.tools||[]).length+" tools"):"off";
      input.onchange=async()=>{
        const visible=input.checked;input.disabled=true;
        try{const response=await api("/api/chat/tool-visibility",{method:"PUT",body:JSON.stringify({server_id:server.id,visible})}),saved=await response.json();if(!response.ok)throw new Error(saved.error||"保存失败");server.visible=visible;renderChatToolServers();}
        catch(e){input.checked=!visible;toast(e.message||"保存失败");}
        finally{input.disabled=false;}
      };
      bindChatToolLongPress(label,server);list.appendChild(label);
    });
  }catch(e){list.innerHTML='<div class="chat-tool-empty">暂时没读到工具展示设置</div>';}
}
$("#chatToolSheetMask").onclick=closeChatToolSheet;
$("#chatToolOpen").onclick=()=>{
  const button=$("#chatToolOpen"),list=$("#chatToolList"),open=!list.classList.contains("open");
  list.hidden=false;requestAnimationFrame(()=>list.classList.toggle("open",open));button.classList.toggle("on",open);button.setAttribute("aria-expanded",open?"true":"false");
};
let compressTargetTokens=2000,compressRecentCount=20;
function applyCompressChoices(){
  $$("#compressTokens button").forEach(b=>b.classList.toggle("on",+b.dataset.value===compressTargetTokens));
  $$("#compressRecent button").forEach(b=>b.classList.toggle("on",+b.dataset.value===compressRecentCount));
}
async function openCompressDialog(){
  if(!sessionId){toast("先聊几句，再来整理这段对话");return;}
  closeChatSettings();await loadAssistantSettings();await loadCompressionStatus();
  compressRecentCount=ASSISTANT_STATE.compress.recent_message_count??COMPRESSION_STATUS?.recent_message_count??20;
  compressTargetTokens=COMPRESSION_STATUS?.target_tokens||2000;applyCompressChoices();
  const s=COMPRESSION_STATUS,total=s?.total_message_count||0;
  $("#compressStatus").textContent=s?.has_summary?
    ("小本本已经整理到第 "+s.covered_message_count+" 条；当前共 "+total+" 条消息。再次整理只会收好新增的较早内容。"):
    ("当前共 "+total+" 条消息。完整聊天不会删除，只改变Morrow接收的上下文。");
  $("#compressInstruction").value="";
  $("#compressMask").classList.add("on");$("#compressCard").classList.add("on");
}
function closeCompressDialog(){$("#compressMask").classList.remove("on");$("#compressCard").classList.remove("on");}
$("#compressHistoryBtn").onclick=openCompressDialog;
$("#compressCancel").onclick=closeCompressDialog;$("#compressMask").onclick=closeCompressDialog;
$("#compressTokens").onclick=e=>{const b=e.target.closest("button[data-value]");if(!b)return;compressTargetTokens=+b.dataset.value;applyCompressChoices();};
$("#compressRecent").onclick=e=>{const b=e.target.closest("button[data-value]");if(!b)return;compressRecentCount=+b.dataset.value;applyCompressChoices();};
$("#compressGo").onclick=async()=>{
  const btn=$("#compressGo");btn.disabled=true;btn.textContent="正在整理…";
  try{
    ASSISTANT_STATE.compress.recent_message_count=compressRecentCount;await saveAssistantSettings();
    const r=await api("/api/chat/compression/"+sessionId,{method:"POST",body:JSON.stringify({
      target_tokens:compressTargetTokens,recent_message_count:compressRecentCount,instruction:$("#compressInstruction").value.trim()
    })});
    const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"整理失败");
    COMPRESSION_STATUS=data;closeCompressDialog();await loadMessages();
    toast("已经把前面的 "+data.newly_compressed_count+" 条记录折进小本本了");
  }catch(e){toast(e.message||"整理失败");}
  finally{btn.disabled=false;btn.textContent="开始整理";}
};
let WINDOW_STATE={recent:20,mode:"organize",preview:null,busy:false};
function applyWindowChoices(){
  $$("#windowRecent button").forEach(b=>b.classList.toggle("on",+b.dataset.value===WINDOW_STATE.recent));
  $$("#windowModes .window-mode").forEach(b=>b.classList.toggle("on",b.dataset.mode===WINDOW_STATE.mode));
}
function windowMessageLabel(item){
  if(!item)return "还没有消息";
  const who=item.role==="user"?"你":assistantName();
  return who+" · "+(item.content||"（没有文字的消息）");
}
function renderWindowPreview(data){
  WINDOW_STATE.preview=data;
  const afterSummary=Number(data.messages_after_summary_count||0);
  $("#windowSummaryTitle").textContent=data.has_summary&&afterSummary?
    ("最近一次摘要 · 后"+afterSummary+"条消息"):"最近一次摘要";
  $("#windowSummaryText").textContent=data.has_summary?(data.summary||"这份摘要是空的"):
    "还没有摘要，这次可以从较早的记录里整理一份。";
  $("#windowSummaryTime").textContent=data.has_summary&&data.summary_updated_at?
    data.summary_updated_at.slice(5,16).replace("-","/"):"尚未生成";
  $("#windowFirst").textContent=windowMessageLabel(data.first_message);
  $("#windowLast").textContent=windowMessageLabel(data.last_message);
  const gap=Number(data.gap_message_count||0),actual=Number(data.recent_message_count||0);
  if(gap){
    $("#windowGapNote").textContent="摘要和最近 "+actual+" 条之间还有 "+gap+" 条消息。整理好再走会把它们收进行李，轻装出发则不带这段。";
    $("#windowModes").hidden=false;
  }else{
    $("#windowGapNote").textContent=data.has_summary?
      "摘要和这 "+actual+" 条消息已经接得整整齐齐，不需要额外整理。":
      "这段对话还不长，最近 "+actual+" 条就是全部行李。";
    $("#windowModes").hidden=true;
    WINDOW_STATE.mode="organize";
  }
  applyWindowChoices();
}
async function loadWindowPreview(){
  const requestId=(WINDOW_STATE.requestId||0)+1;WINDOW_STATE.requestId=requestId;
  if(!WINDOW_STATE.preview){$("#windowGo").disabled=true;$("#windowSummaryText").textContent="正在翻小本本…";}
  try{
    const r=await api("/api/chat/window/"+sessionId+"?recent="+WINDOW_STATE.recent),data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.error||"没有看清这段对话");
    if(requestId!==WINDOW_STATE.requestId)return;
    renderWindowPreview(data);$("#windowGo").disabled=!data.recent_message_count;
  }catch(e){if(requestId!==WINDOW_STATE.requestId)return;if(!WINDOW_STATE.preview)$("#windowSummaryText").textContent=e.message||"暂时没整理好行李范围";toast(e.message||"暂时没整理好行李范围");}
}
async function openWindowDialog(){
  if(!sessionId){toast("先聊几句，再一起换个窗口");return;}
  closeChatSettings();WINDOW_STATE={recent:20,mode:"organize",preview:null,busy:false,requestId:0};applyWindowChoices();
  $("#windowMask").classList.add("on");$("#windowCard").classList.add("on");await loadWindowPreview();
}
function closeWindowDialog(){if(WINDOW_STATE.busy)return;$("#windowMask").classList.remove("on");$("#windowCard").classList.remove("on");}
$("#moveWindowBtn").onclick=openWindowDialog;$("#windowCancel").onclick=closeWindowDialog;$("#windowMask").onclick=closeWindowDialog;
$("#windowRecent").onclick=async e=>{const b=e.target.closest("button[data-value]");if(!b||WINDOW_STATE.busy)return;WINDOW_STATE.recent=+b.dataset.value;applyWindowChoices();await loadWindowPreview();};
$("#windowModes").onclick=e=>{const b=e.target.closest("button[data-mode]");if(!b||WINDOW_STATE.busy)return;WINDOW_STATE.mode=b.dataset.mode;applyWindowChoices();};
$("#windowGo").onclick=async()=>{
  if(WINDOW_STATE.busy||!WINDOW_STATE.preview)return;
  const btn=$("#windowGo");WINDOW_STATE.busy=true;btn.disabled=true;btn.textContent=WINDOW_STATE.preview.needs_summary&&WINDOW_STATE.mode==="organize"?"正在收好行李…":"正在换窗…";
  try{
    const r=await api("/api/chat/window/"+sessionId,{method:"POST",body:JSON.stringify({recent_message_count:WINDOW_STATE.recent,mode:WINDOW_STATE.mode})});
    const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"换窗没有完成");
    WINDOW_STATE.busy=false;closeWindowDialog();sessionId=data.id;$("#chatTitle").textContent=data.title||assistantName();await loadMessages();
    toast("行李带好了，我们在新窗口继续");
  }catch(e){WINDOW_STATE.busy=false;toast(e.message||"换窗没有完成");}
  finally{btn.disabled=false;btn.textContent="确认换窗";}
};
function chatBgOpacity(){const n=parseInt(localStorage.getItem("chatBgOpacity")||"35",10);
  return Number.isFinite(n)?Math.max(0,Math.min(100,n)):35;}
function applyChatBg(){
  const img=localStorage.getItem("chatBgImage")||"",op=chatBgOpacity(),theme=themeBackground();
  document.documentElement.style.setProperty("--chat-bg-image",'url("'+(img||theme.image)+'")');
  document.documentElement.style.setProperty("--chat-bg-opacity",img?String(op/100):"0.5");
  document.documentElement.style.setProperty("--chat-bg-filter",img?"none":theme.filter);
  $("#chatBgText").textContent=img?"已设置自定义背景图":"使用主题底图";
  $("#chatBgClear").hidden=!img;$("#chatBgOpacityBox").hidden=!img;
  $("#chatBgOpacity").value=op;syncRangeFill($("#chatBgOpacity"));$("#chatBgOpacityText").textContent="透明度 "+op+"%";
}
function readFileAsDataURL(file){return new Promise((resolve,reject)=>{
  const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file);
});}
function loadImage(src){return new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;
});}
async function compressChatBg(file){
  const src=await readFileAsDataURL(file),img=await loadImage(src),max=1800;
  let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
  const scale=Math.min(1,max/Math.max(w,h));w=Math.round(w*scale);h=Math.round(h*scale);
  const c=document.createElement("canvas");c.width=w;c.height=h;
  c.getContext("2d").drawImage(img,0,0,w,h);
  return c.toDataURL("image/jpeg",0.86);
}
async function compressDailyAvatar(file){
  const src=await readFileAsDataURL(file),img=await loadImage(src),side=Math.min(img.naturalWidth||img.width,img.naturalHeight||img.height);
  const sx=((img.naturalWidth||img.width)-side)/2,sy=((img.naturalHeight||img.height)-side)/2;
  const c=document.createElement("canvas");c.width=192;c.height=192;
  c.getContext("2d").drawImage(img,sx,sy,side,side,0,0,192,192);
  return c.toDataURL("image/jpeg",0.88);
}
$("#chatBgPick").onclick=()=>$("#chatBgFile").click();
$("#chatBgFile").onchange=async function(){
  const f=this.files&&this.files[0];this.value="";if(!f)return;
  try{saveLocalPreference("chatBgImage",await compressChatBg(f));applyChatBg();toast("背景图已更新");}
  catch(e){toast("背景图保存失败，换张小一点的试试");}
};
$("#chatBgClear").onclick=()=>{removeLocalPreference("chatBgImage");applyChatBg();toast("已恢复主题底图");};
$("#chatBgOpacity").addEventListener("input",e=>{
  saveLocalPreference("chatBgOpacity",String(e.target.value));applyChatBg();
});
// 抽屉里按供应商分组：点供应商名展开它的模型，看着干净。
function openModelPicker(storageKey,onPicked){
  const a=readModelChoice(storageKey);
  sheetBody.innerHTML="";
  if(!PROVIDERS.length){
    const d=document.createElement("div");d.className="caption";
    d.style.cssText="padding:18px 14px;text-align:center";
    d.textContent="还没配置模型 — 去「设置 · 提供商」添加";
    sheetBody.appendChild(d);showSheet();return;
  }
  PROVIDERS.forEach(p=>{
    const box=document.createElement("div");box.className="mp-prov";
    if(a&&a.pid===p.id)box.classList.add("open");  // 展开当前在用的那个供应商
    const head=document.createElement("button");head.className="mp-head";
    head.innerHTML='<span class="pn"></span><span class="ct"></span>'+
      '<svg class="ar" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 6l6 6-6 6"/></svg>';
    head.querySelector(".pn").textContent=p.name;
    head.querySelector(".ct").textContent=p.models.length?"":"未加模型";
    head.onclick=()=>box.classList.toggle("open");
    box.appendChild(head);
    const ml=document.createElement("div");ml.className="mp-models";
    p.models.forEach(m=>{
      const sel=a&&a.pid===p.id&&a.id===m.id;
      const mb=document.createElement("button");mb.className="mp-model"+(sel?" sel":"");
      mb.innerHTML='<svg class="ck" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12l4 4 10-11"/></svg><span></span>';
      mb.querySelector("span").textContent=m.name;
      mb.onclick=()=>{writeModelChoice(storageKey,{pid:p.id,id:m.id,name:m.name});
        closeSheet();if(onPicked)onPicked({pid:p.id,id:m.id,name:m.name});};
      ml.appendChild(mb);
    });
    box.appendChild(ml);sheetBody.appendChild(box);
  });
  showSheet();
}
function openActiveModelPicker(){
  openModelPicker("activeModel",choice=>{
    applyModel();applyChatCache();toast("已切到 "+choice.name);
  });
}
$("#modelSwitch").onclick=openActiveModelPicker;
$("#dailyModelSwitch").onclick=openActiveModelPicker;

/* ---------- 全篇 fullscreen input ---------- */
const fsSheet=$("#fsSheet"),fsMask=$("#fsMask"),fsInput=$("#fsInput");
function openFs(){fsInput.value=input.value;fsSheet.classList.add("on");fsMask.classList.add("on");
  setTimeout(()=>fsInput.focus(),200);}
function closeFs(){fsSheet.classList.remove("on");fsMask.classList.remove("on");}
$("#expandBtn").onclick=openFs;
fsInput.addEventListener("input",()=>{input.value=fsInput.value;autoGrow();});
$("#fsDone").onclick=()=>{closeFs();input.focus();};
fsMask.onclick=closeFs;

/* ---------- 加号: 拍照 / 上传图片/文本 + 附件预览 ---------- */
let attachments=[];
updateSendAvailability();
const plusBtn=$("#plusBtn"),plusPop=$("#plusPop");
function showPlusPage(page="main"){$("#plusMain").hidden=page!=="main";$("#stickerTray").hidden=page!=="sticker";}
let plusPopAnimation=null;
let plusSpaceAnimation=null;
function settlePlusBottomSpace(duration=300){
  if(!plusBottomSpace)return;
  if(plusSpaceAnimation)cancelAnimationFrame(plusSpaceAnimation);
  const log=$("#log"),startPad=parseFloat(getComputedStyle(log).paddingBottom)||0;
  const extra=plusPopFlowHeight(),targetPad=Math.max(0,startPad-extra);
  const startScroll=log.scrollTop,targetScroll=Math.min(startScroll,Math.max(0,log.scrollHeight-extra-log.clientHeight));
  const started=performance.now(),ease=t=>1-Math.pow(1-t,3);
  const frame=now=>{const p=Math.min(1,(now-started)/duration),v=ease(p);
    log.style.paddingBottom=(startPad+(targetPad-startPad)*v)+"px";
    log.scrollTop=startScroll+(targetScroll-startScroll)*v;
    if(p<1)plusSpaceAnimation=requestAnimationFrame(frame);else{plusSpaceAnimation=null;plusBottomSpace=false;syncComposerSpace();}
  };
  plusSpaceAnimation=requestAnimationFrame(frame);
}
let plusToggleEpoch=0;
async function togglePlus(show){const epoch=++plusToggleEpoch,on=show??plusPop.hidden;
  if(on&&(document.activeElement===input||document.body.classList.contains("chat-keyboard-open"))){
    const closed=await (window.sakieChatViewport?.waitForKeyboardClose()??Promise.resolve(true));
    if(epoch!==plusToggleEpoch)return false;
    if(!closed){toast("键盘还在收起，请再点一下加号");return false;}
  }
  if(plusPopAnimation)plusPopAnimation.cancel();plusBtn.classList.toggle("open",on);
  const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches||matchMedia("(pointer:coarse)").matches;
  if(on){const log=$("#log"),wasAtBottom=log.scrollHeight-log.scrollTop-log.clientHeight<120;plusBottomSpace=wasAtBottom;plusPop.hidden=false;showPlusPage("main");closeStickerPopover();syncComposerSpace();if(reduced)return true;
    const distance=plusPopFlowHeight();plusPopAnimation=composerEl.animate([{transform:`translateY(${distance}px)`},{transform:"translateY(0)"}],{duration:360,easing:"cubic-bezier(.22,.8,.3,1)"});
    plusPopAnimation.onfinish=()=>{plusPopAnimation=null;composerEl.style.removeProperty("transform");};
  }else if(!plusPop.hidden){closeStickerPopover();if(reduced){plusPop.hidden=true;plusBottomSpace=false;syncComposerSpace();return;}const distance=plusPopFlowHeight();settlePlusBottomSpace(300);
    plusPopAnimation=composerEl.animate([{transform:"translate3d(0,0,0)"},{transform:`translate3d(0,${distance}px,0)`}],{duration:300,easing:"cubic-bezier(.22,.72,.3,1)",fill:"forwards"});
    plusPopAnimation.onfinish=()=>{plusPop.hidden=true;if(!plusSpaceAnimation){plusBottomSpace=false;syncComposerSpace();}plusPopAnimation.cancel();plusPopAnimation=null;};
  }return true;}
let plusHeld=false,plusHoldTimer=null;
plusBtn.onpointerdown=()=>{plusHeld=false;clearTimeout(plusHoldTimer);plusHoldTimer=setTimeout(()=>{plusHeld=true;void togglePlus(true).then(opened=>{if(opened)requestAnimationFrame(openStickerTray);});},430);};
plusBtn.onpointerup=plusBtn.onpointercancel=()=>clearTimeout(plusHoldTimer);
plusBtn.onclick=(e)=>{e.stopPropagation();if(plusHeld){plusHeld=false;return;}togglePlus();};
const plusFilePickers=[$("#fileCamera"),$("#fileAlbum"),$("#filePick")];
plusFilePickers.forEach(picker=>picker.onclick=e=>e.stopPropagation());
plusFilePickers.forEach(picker=>picker.addEventListener("cancel",()=>window.sakieChatViewport?.refresh()));
$("#btnCamera").onclick=()=>$("#fileCamera").click();
$("#btnAlbum").onclick=()=>$("#fileAlbum").click();
$("#btnFile").onclick=()=>$("#filePick").click();
$("#btnSticker").onclick=()=>openStickerTray();
$("#btnMusic").onclick=()=>{togglePlus(false);openMusicSheet();};
$$("#plusMain button").forEach(button=>{button.addEventListener("pointerdown",()=>{button.classList.remove("press-flash");void button.offsetWidth;button.classList.add("press-flash");setTimeout(()=>button.classList.remove("press-flash"),180);});});
const musicAudio=$("#musicAudio"),musicPlayer=$("#musicPlayer"),musicSheetSeek=$("#musicSheetSeek"),musicDetailSeek=$("#musicDetailSeek");
let musicStreamRecoveryAttempted=false,musicStreamRecovering=false,musicLastObservedTime=0;
let musicCurrent=null,musicSeeking=false,musicConnected=false,musicPlatform="kugou",musicShowFavorites=false,musicSearchRows=[],musicSharing=false,musicDockSide="right",musicLyrics=[],musicLyricIndex=-2,musicTogetherStartedAt=0,musicTogetherTimer=0,musicDetailHideTimer=0;
let musicListeningId=0,musicListeningStartPromise=null,musicListeningTracks=new Map(),musicListeningTickAt=0,musicListeningSyncTimer=0;
let musicLibrary={recent:[],favorites:[],queue:[],mode:"sequence"};
const musicModeCopy={sequence:"顺序播放",single:"单曲循环",shuffle:"随机播放"};
const musicModeIcon={
  sequence:'<svg viewBox="0 0 24 24"><path d="M5 7h12l-2.5-2.5M19 17H7l2.5 2.5"/><path d="M17 7l-2.5 2.5M7 17l2.5-2.5"/></svg>',
  single:'<svg viewBox="0 0 24 24"><path d="M5 6.5h11a4 4 0 0 1 4 4M19 17.5H8a4 4 0 0 1-4-4"/><text x="12" y="15.3" text-anchor="middle">1</text></svg>',
  shuffle:'<svg viewBox="0 0 24 24"><path d="M4 7h2.5c4 0 6 10 10.5 10h3M17 4l3 3-3 3M4 17h2.5c1.7 0 3-1.7 4.2-3.8M14 8.8C15 7.7 16 7 17.5 7H20M17 14l3 3-3 3"/></svg>'
};
function cleanMusicSong(song){return{id:String(song.id||""),name:String(song.name||"未知歌曲"),artist:String(song.artist||"未知歌手"),album:String(song.album||""),cover_url:String(song.cover_url||"")};}
function musicClock(value){if(!Number.isFinite(value))return"0:00";const seconds=Math.max(0,Math.floor(value));return Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0");}
function parseMusicLyrics(value){const rows=[];String(value||"").split(/\r?\n/).forEach(line=>{const matches=[...line.matchAll(/\[(\d{1,3}):(\d{1,2}(?:\.\d{1,3})?)\]/g)];const text=line.replace(/\[[^\]]*\]/g,"").trim();if(!text||!matches.length)return;matches.forEach(match=>rows.push({time:Number(match[1])*60+Number(match[2]),text}));});return rows.sort((a,b)=>a.time-b.time);}
function musicFavorite(song){return musicLibrary.favorites.some(item=>item.id===song.id);}
function musicQueued(song){return musicLibrary.queue.some(item=>item.id===song.id);}
function musicChatContext(){if(!musicSharing||!musicCurrent)return null;let lyric_index=-1;for(let i=0;i<musicLyrics.length;i++){if(musicLyrics[i].time<=musicAudio.currentTime+.18)lyric_index=i;else break;}const lyric_window=[];[[lyric_index-1,"previous"],[lyric_index,"current"],[lyric_index+1,"next"]].forEach(([index,relation])=>{const row=musicLyrics[index];if(row?.text)lyric_window.push({relation,time:Math.max(0,Math.floor(row.time||0)),text:String(row.text).slice(0,300)});});return{id:String(musicCurrent.id||""),name:musicCurrent.name,artist:musicCurrent.artist,album:musicCurrent.album||"",position_seconds:Math.floor(musicAudio.currentTime||0),duration_seconds:Number.isFinite(musicAudio.duration)?Math.floor(musicAudio.duration):0,playing:!musicAudio.paused&&!musicAudio.ended,mode:musicLibrary.mode,lyric_window};}
function saveMusicLibrary(fields={}){musicLibrary={...musicLibrary,...fields};return api("/api/music/library",{method:"PUT",body:JSON.stringify(fields)}).catch(()=>{});}
async function loadMusicLibrary(){try{const response=await api("/api/music/library");if(response.ok)musicLibrary=await response.json();}catch{}renderMusicList();renderMusicQueue();renderMusicPlayback();}
function musicCoverStyle(song){const cover=String(song.cover_url||"").replace(/["\\]/g,"");return cover?'background-image:url("'+cover+'")':"";}
function musicIcon(kind){
  if(kind==="heart")return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linejoin="round"><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8z"/></svg>';
  if(kind==="add")return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  if(kind==="note")return'<svg viewBox="0 0 24 24"><path d="M6 5.5h12v10H9l-3 3z"/><path d="M9 9h6M9 12h4"/></svg>';
  return'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/></svg>';
}
function makeMusicRow(song,{queue=false,favoriteView=false}={}){
  const row=document.createElement("div");row.className="music-row"+(musicCurrent?.id===song.id?" playing":"");
  row.innerHTML='<button class="music-row-cover" type="button" aria-label="播放"></button><button class="music-row-copy" type="button"><span class="music-row-title"></span><span class="music-row-artist"></span></button>'+(favoriteView?'<button class="music-row-action music-note-open" type="button" aria-label="给这首歌留言">'+musicIcon("note")+'</button>':'<button class="music-row-action music-heart" type="button" aria-label="收藏">'+musicIcon("heart")+'</button>')+'<button class="music-row-action music-last" type="button"></button>';
  const cover=row.querySelector(".music-row-cover");cover.style.cssText=musicCoverStyle(song);if(!song.cover_url)cover.innerHTML=musicIcon("disc");
  row.querySelector(".music-row-title").textContent=song.name;row.querySelector(".music-row-artist").textContent=song.artist;
  const play=()=>void playMusic(song,{preserveQueue:queue});cover.onclick=play;row.querySelector(".music-row-copy").onclick=play;
  const heart=row.querySelector(".music-heart");if(heart){heart.classList.toggle("on",musicFavorite(song));heart.onclick=()=>toggleMusicFavorite(song);}
  const note=row.querySelector(".music-note-open");if(note)note.onclick=()=>void openMusicNote(song);
  const last=row.querySelector(".music-last");
  if(queue){last.setAttribute("aria-label","移出队列");last.textContent="×";last.style.fontSize="21px";last.onclick=()=>removeMusicQueue(song.id);}
  else{last.setAttribute("aria-label",musicQueued(song)?"已加入队列":"加入队列");last.classList.toggle("on",musicQueued(song));last.innerHTML=musicQueued(song)?"✓":musicIcon("add");last.onclick=()=>addMusicQueue(song);}
  return row;
}
function makeFavoriteMusicRow(song){
  const wrap=document.createElement("div"),unfavorite=document.createElement("button"),row=makeMusicRow(song,{favoriteView:true});wrap.className="music-favorite-wrap";unfavorite.type="button";unfavorite.className="music-unfavorite";unfavorite.setAttribute("aria-label","取消收藏");unfavorite.innerHTML=musicIcon("heart");wrap.append(unfavorite,row);
  let startX=0,startY=0,dragging=false,longPressed=false,longTimer=0;
  row.addEventListener("pointerdown",event=>{startX=event.clientX;startY=event.clientY;dragging=false;longPressed=false;clearTimeout(longTimer);longTimer=setTimeout(()=>{longPressed=true;wrap.classList.add("revealed");},430);});
  row.addEventListener("pointermove",event=>{const dx=event.clientX-startX,dy=event.clientY-startY;if(!dragging&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)){dragging=true;clearTimeout(longTimer);}if(dragging){event.preventDefault();row.style.transform="translateX("+Math.max(0,Math.min(58,(wrap.classList.contains("revealed")?53:0)+dx))+"px)";}});
  const finish=event=>{clearTimeout(longTimer);if(dragging){const dx=event.clientX-startX;row.style.transform="";wrap.classList.toggle("revealed",(wrap.classList.contains("revealed")?53:0)+dx>27);setTimeout(()=>dragging=false,0);}};row.addEventListener("pointerup",finish);row.addEventListener("pointercancel",()=>{clearTimeout(longTimer);row.style.transform="";dragging=false;});row.addEventListener("click",event=>{if(dragging||longPressed){event.preventDefault();event.stopImmediatePropagation();longPressed=false;}},true);
  unfavorite.onclick=()=>{const favorites=musicLibrary.favorites.filter(item=>item.id!==song.id);void saveMusicLibrary({favorites});wrap.style.height=wrap.offsetHeight+"px";requestAnimationFrame(()=>wrap.classList.add("removing"));setTimeout(()=>renderMusicList(),290);};
  return wrap;
}
function renderMusicList(){
  const box=$("#musicResults"),query=$("#musicQuery").value.trim();let rows,label;
  if(query){rows=musicSearchRows;label="search results";}else if(musicShowFavorites){rows=musicLibrary.favorites;label="our songs";}else{rows=musicLibrary.recent;label="recently played";}
  $("#musicListLabel").textContent=label;$("#musicSheetTitle").textContent=musicShowFavorites&&!query?"our songs":"together";$("#musicFavoritesToggle").classList.toggle("on",musicShowFavorites);
  const favoriteView=musicShowFavorites&&!query;box.innerHTML="";rows.forEach(song=>box.appendChild(favoriteView?makeFavoriteMusicRow(song):makeMusicRow(song)));
  if(!rows.length)box.innerHTML='<div class="music-empty">'+(query?"没有找到这首歌":musicShowFavorites?"还没有收进我们的唱片":"还没有一起听过的歌")+'</div>';
}
function renderMusicQueue(){const box=$("#musicQueueList"),mode=musicLibrary.mode in musicModeIcon?musicLibrary.mode:"sequence",modeButtons=[$("#musicDetailMode"),$("#musicQueueMode")];box.innerHTML="";musicLibrary.queue.forEach(song=>box.appendChild(makeMusicRow(song,{queue:true})));if(!musicLibrary.queue.length)box.innerHTML='<div class="music-empty">队列还是空的</div>';modeButtons.forEach(modeButton=>{modeButton.innerHTML=musicModeIcon[mode];modeButton.setAttribute("aria-label",musicModeCopy[mode]);modeButton.title=musicModeCopy[mode];});}
function toggleMusicFavorite(song){const exists=musicFavorite(song),favorites=exists?musicLibrary.favorites.filter(item=>item.id!==song.id):[cleanMusicSong(song),...musicLibrary.favorites.filter(item=>item.id!==song.id)];void saveMusicLibrary({favorites});renderMusicList();renderMusicQueue();}
function addMusicQueue(song){if(musicQueued(song)){toast("已经在队列里啦");return;}const queue=[...musicLibrary.queue,cleanMusicSong(song)];void saveMusicLibrary({queue});renderMusicList();renderMusicQueue();toast("放进接下来的歌里了");}
function removeMusicQueue(id){const queue=musicLibrary.queue.filter(item=>item.id!==id);void saveMusicLibrary({queue});renderMusicList();renderMusicQueue();}
function recordMusicRecent(song){const saved=cleanMusicSong(song),recent=[saved,...musicLibrary.recent.filter(item=>item.id!==saved.id)].slice(0,50);void saveMusicLibrary({recent});if(!$("#musicQuery").value.trim()&&!musicShowFavorites)renderMusicList();}
let musicCommandPollBusy=false;
async function pollMusicCommands(force=false){if(musicCommandPollBusy||!sessionId||(!force&&!streaming))return;musicCommandPollBusy=true;try{const response=await api("/api/music/commands?session_id="+encodeURIComponent(sessionId));if(!response.ok)return;const commands=await response.json();for(const command of commands){const song=cleanMusicSong(command.payload?.song||{});if(!song.id)continue;await loadMusicLibrary();if(command.action==="play")await playMusic(song,{preserveQueue:true});else{renderMusicList();renderMusicQueue();toast(assistantName()+"把《"+song.name+"》放进接下来的歌里了");}}}catch{}finally{musicCommandPollBusy=false;}}
function musicDockBounds(){const width=musicPlayer.offsetWidth||66,height=musicPlayer.offsetHeight||66;return{minX:8,maxX:Math.max(8,innerWidth-width-8),minY:Math.max(68,parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sat")||0)+58),maxY:Math.max(68,innerHeight-height-104)};}
function setMusicDockPosition(left,top,{save=false,snap=false}={}){const bounds=musicDockBounds();let x=Math.max(bounds.minX,Math.min(Number(left)||bounds.maxX,bounds.maxX)),y=Math.max(bounds.minY,Math.min(Number(top)||bounds.maxY,bounds.maxY));if(snap){musicDockSide=x+(musicPlayer.offsetWidth||66)/2<innerWidth/2?"left":"right";x=musicDockSide==="left"?bounds.minX:bounds.maxX;}musicPlayer.style.left=x+"px";musicPlayer.style.top=y+"px";if(save)saveLocalPreference("nookMusicDock",JSON.stringify({side:musicDockSide,top:y}));}
function restoreMusicDockPosition(){let saved={};try{saved=JSON.parse(localStorage.getItem("nookMusicDock")||"{}");}catch{}musicDockSide=saved.side==="left"?"left":"right";const bounds=musicDockBounds(),left=musicDockSide==="left"?bounds.minX:bounds.maxX;setMusicDockPosition(left,Number.isFinite(saved.top)?saved.top:bounds.maxY);}
function showMusicDock(){const wasHidden=musicPlayer.hidden;musicPlayer.hidden=false;restoreMusicDockPosition();if(wasHidden){musicPlayer.classList.remove("appearing");void musicPlayer.offsetWidth;musicPlayer.classList.add("appearing");setTimeout(()=>musicPlayer.classList.remove("appearing"),540);}}
function renderMusicSharing(){const button=$("#musicDetailShare");button.classList.toggle("on",musicSharing);button.setAttribute("aria-label",musicSharing?"停止和Morrow一起听":"和Morrow一起听");button.title=musicSharing?"正在和Morrow一起听":"和Morrow一起听";musicPlayer.classList.toggle("sharing",musicSharing);}
function renderMusicTogetherTime(){const label=$("#musicTogetherTime");if(!musicSharing||!musicTogetherStartedAt){label.textContent="listening quietly";return;}const seconds=Math.max(0,Math.floor((Date.now()-musicTogetherStartedAt)/1000)),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60);label.textContent="together for "+(hours?hours+"h ":"")+minutes+" min";}
function accrueMusicListening(){const now=performance.now();if(musicListeningTickAt&&musicSharing&&musicCurrent&&!musicAudio.paused&&!musicAudio.ended){const seconds=Math.max(0,Math.min(30,(now-musicListeningTickAt)/1000));if(seconds){const id=String(musicCurrent.id),existing=musicListeningTracks.get(id)||{...cleanMusicSong(musicCurrent),listened_seconds:0};existing.listened_seconds+=seconds;musicListeningTracks.set(id,existing);}}musicListeningTickAt=musicSharing&&musicCurrent&&!musicAudio.paused&&!musicAudio.ended?now:0;}
function musicListeningPayload(){return{duration_seconds:Math.max(0,Math.floor((Date.now()-musicTogetherStartedAt)/1000)),tracks:[...musicListeningTracks.values()].map(track=>({...cleanMusicSong(track),listened_seconds:Math.floor(track.listened_seconds)}))};}
async function beginMusicListening(){musicListeningTracks=new Map();musicListeningId=0;musicListeningTickAt=musicAudio.paused?0:performance.now();musicListeningStartPromise=api("/api/music/listening",{method:"POST",body:"{}"}).then(async response=>{const data=await response.json().catch(()=>({}));if(response.ok)musicListeningId=Number(data.id)||0;return musicListeningId;}).catch(()=>0);await musicListeningStartPromise;}
async function syncMusicListening(ended=false,{keepalive=false}={}){accrueMusicListening();const payload=musicListeningPayload();let id=musicListeningId;if(!id&&musicListeningStartPromise)id=await musicListeningStartPromise;if(ended){musicListeningId=0;musicListeningStartPromise=null;musicListeningTickAt=0;clearInterval(musicListeningSyncTimer);musicListeningSyncTimer=0;}if(!id)return;try{await fetch("/api/music/listening/"+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,ended}),keepalive});}catch{}}
function startMusicListeningArchive(){void beginMusicListening();clearInterval(musicListeningSyncTimer);musicListeningSyncTimer=setInterval(()=>{if(musicSharing)void syncMusicListening(false);},15000);}
function finishMusicListeningArchive(){accrueMusicListening();void syncMusicListening(true);}
let musicNoteSong=null,musicNoteRequest=0,musicNoteLyricsRequest=0,musicNoteLyrics=[];
function hideMusicNoteDeleteActions(except=null){$$('.music-note-comment.delete-ready').forEach(row=>{if(row!==except)row.classList.remove('delete-ready');});}
function renderMusicNotes(comments){const box=$("#musicNoteList");box.innerHTML="";if(!comments.length){box.innerHTML='<div class="music-note-empty">还没有写下什么</div>';return;}comments.forEach(comment=>{const row=document.createElement("div");row.className="music-note-comment "+(comment.author==="assistant"?"assistant":"user");row.innerHTML='<div class="music-note-comment-head"><strong></strong><time></time></div><div class="music-note-comment-text"></div><button class="music-note-delete" type="button" aria-label="删除这条留言">×</button>';const author=row.querySelector("strong");author.dataset.identityCommentAuthor=comment.author==="assistant"?"assistant":"user";author.textContent=commentAuthorName(comment.author);author.setAttribute("aria-label",author.textContent);row.querySelector("time").textContent=String(comment.created_at||"").slice(0,16);row.querySelector(".music-note-comment-text").textContent=comment.content||"";row.onclick=event=>{event.stopPropagation();const reveal=!row.classList.contains("delete-ready");hideMusicNoteDeleteActions(row);row.classList.toggle("delete-ready",reveal);};const remove=row.querySelector(".music-note-delete");remove.onclick=async event=>{event.stopPropagation();if(!await bubbleConfirm({title:"删掉这句留言？",message:comment.content||"",confirmText:"删除",danger:true}))return;const response=await api("/api/music/comments/"+comment.id,{method:"DELETE"}),data=await response.json().catch(()=>({}));if(!response.ok){toast(data.error||"留言没有删掉");return;}if(musicNoteSong)await loadMusicNotes(musicNoteSong.id);};box.appendChild(row);});}
async function loadMusicNotes(songId){const requestId=++musicNoteRequest;$("#musicNoteList").innerHTML='<div class="music-note-empty">正在翻这页唱片…</div>';try{const response=await api("/api/music/comments?song_id="+encodeURIComponent(songId)),comments=await response.json();if(requestId!==musicNoteRequest)return;if(!response.ok)throw new Error(comments.error||"留言没有打开");renderMusicNotes(comments);}catch(error){if(requestId===musicNoteRequest)$("#musicNoteList").innerHTML='<div class="music-note-empty"></div>',$("#musicNoteList").firstChild.textContent=error.message||"留言没有打开";}}
function renderMusicNoteLyrics(rebuild=false){const box=$("#musicNoteLyrics");if(rebuild){box.innerHTML="";if(!musicNoteLyrics.length){box.innerHTML='<div class="music-note-empty">这首歌暂时没有带来歌词</div>';return;}musicNoteLyrics.forEach(line=>{const row=document.createElement("div");row.className="music-note-lyric";row.textContent=line.text;box.appendChild(row);});}if(!musicNoteLyrics.length||musicCurrent?.id!==musicNoteSong?.id)return;let index=-1;for(let i=0;i<musicNoteLyrics.length;i++){if(musicNoteLyrics[i].time<=musicAudio.currentTime+.18)index=i;else break;}[...box.children].forEach((row,i)=>row.classList.toggle("current",i===Math.max(0,index)));}
async function loadMusicNoteLyrics(song){const requestId=++musicNoteLyricsRequest;$("#musicNoteLyrics").innerHTML='<div class="music-note-empty">正在翻歌词…</div>';if(musicCurrent?.id===song.id&&musicLyrics.length){musicNoteLyrics=musicLyrics;renderMusicNoteLyrics(true);return;}try{const response=await api("/api/music/lyrics?id="+encodeURIComponent(song.id)),data=await response.json().catch(()=>({}));if(requestId!==musicNoteLyricsRequest||musicNoteSong?.id!==song.id)return;if(!response.ok)throw new Error(data.error||"歌词没有打开");musicNoteLyrics=parseMusicLyrics(data.lyric);renderMusicNoteLyrics(true);}catch(error){if(requestId===musicNoteLyricsRequest){musicNoteLyrics=[];$("#musicNoteLyrics").innerHTML='<div class="music-note-empty"></div>';$("#musicNoteLyrics").firstChild.textContent=error.message||"歌词没有打开";}}}
async function openMusicNote(song,recordHistory=true){musicNoteSong=cleanMusicSong(song);musicNoteLyrics=[];$("#musicNoteTitle").textContent=musicNoteSong.name;$("#musicNoteArtist").textContent=musicNoteSong.artist;$("#musicNoteText").value="";const cover=String(musicNoteSong.cover_url||"").replace(/["\\]/g,"");$("#musicNoteSheet").style.setProperty("--music-note-cover",cover?'url("'+cover+'")':"none");document.body.classList.add("music-note-open");$("#musicNoteSheet").classList.add("on");$("#musicNoteSheet").querySelector(".music-note-body").scrollTop=0;void loadMusicNotes(musicNoteSong.id);void loadMusicNoteLyrics(musicNoteSong);if(recordHistory&&currentAppRoute()?.overlay!=="music-note"){const route=currentAppRoute()||appRoute(),underlay=route.overlay==="music-detail"?"music-detail":"";history.pushState({...route,level:(route.level||0)+1,overlay:"music-note",musicNoteUnderlay:underlay,musicNoteSong},"");}}
function hideMusicNote(fromHistory=false){if(!fromHistory&&currentAppRoute()?.overlay==="music-note"){history.back();return;}document.body.classList.remove("music-note-open");$("#musicNoteSheet").classList.remove("on");}
function renderMusicLyrics(force=false){const box=$("#musicDetailLyrics");if(!musicCurrent){box.innerHTML='<div class="music-detail-lyric empty">从 Together 里选一首歌吧</div>';box.dataset.songId="";return;}if(!musicLyrics.length){box.innerHTML='<div class="music-detail-lyric empty">这首歌暂时没有带来歌词</div>';box.dataset.songId=musicCurrent.id;return;}let index=-1;for(let i=0;i<musicLyrics.length;i++){if(musicLyrics[i].time<=musicAudio.currentTime+.18)index=i;else break;}index=Math.max(0,index);let track=box.querySelector(".music-detail-lyrics-track"),fresh=false;if(!track||box.dataset.songId!==musicCurrent.id){box.innerHTML="";track=document.createElement("div");track.className="music-detail-lyrics-track settling";musicLyrics.forEach(row=>{const line=document.createElement("div");line.className="music-detail-lyric";line.textContent=row.text;track.appendChild(line);});box.appendChild(track);box.dataset.songId=musicCurrent.id;force=true;fresh=true;}if(!force&&index===musicLyricIndex)return;musicLyricIndex=index;[...track.children].forEach((line,i)=>{const distance=Math.abs(i-index);line.classList.toggle("current",distance===0);line.classList.toggle("near",distance===1);});requestAnimationFrame(()=>{const current=track.children[index];if(!current)return;const offset=box.clientHeight/2-current.offsetTop-current.offsetHeight/2;track.style.transform="translateY("+offset+"px)";if(fresh)requestAnimationFrame(()=>track.classList.remove("settling"));});}
function openMusicDetail(recordHistory=true){if(!musicCurrent){toast("先从 Together 里选一首歌");return;}closeMusicSheet();clearTimeout(musicDetailHideTimer);const detail=$("#musicDetail");detail.hidden=false;document.body.classList.add("music-detail-open");requestAnimationFrame(()=>detail.classList.add("on"));renderMusicPlayback();renderMusicLyrics(true);renderMusicTogetherTime();clearInterval(musicTogetherTimer);musicTogetherTimer=setInterval(renderMusicTogetherTime,1000);if(recordHistory&&currentAppRoute()?.overlay!=="music-detail"){const route=currentAppRoute()||appRoute();history.pushState({...route,level:(route.level||0)+1,overlay:"music-detail"},"");}}
function hideMusicDetail(fromHistory=false){if(!fromHistory&&currentAppRoute()?.overlay==="music-detail"){history.back();return;}const detail=$("#musicDetail");detail.classList.remove("on");document.body.classList.remove("music-detail-open");clearInterval(musicTogetherTimer);musicTogetherTimer=0;clearTimeout(musicDetailHideTimer);musicDetailHideTimer=setTimeout(()=>detail.hidden=true,320);}
function closeMusicPlayer(){if(musicSharing)finishMusicListeningArchive();musicAudio.pause();musicAudio.removeAttribute("src");musicAudio.load();musicCurrent=null;musicSharing=false;musicLyrics=[];musicLyricIndex=-2;musicTogetherStartedAt=0;musicPlayer.classList.remove("sharing","playing");musicPlayer.hidden=true;$("#musicQueueSheet").classList.remove("on");hideMusicDetail(true);closeMusicSheet();renderMusicSharing();syncComposerSpace();toast("唱片收起来了");if("mediaSession" in navigator)try{navigator.mediaSession.metadata=null;}catch{}}
function setMusicSeekValue(value){
  [musicSheetSeek,musicDetailSeek].forEach(seek=>{seek.value=String(value);syncRangeFill(seek);});
}
function waitForMusicMetadata(timeout=8000){
  if(musicAudio.readyState>=1)return Promise.resolve();
  return new Promise((resolve,reject)=>{let timer=0;const finish=error=>{clearTimeout(timer);musicAudio.removeEventListener("loadedmetadata",onReady);musicAudio.removeEventListener("error",onError);error?reject(error):resolve();},onReady=()=>finish(),onError=()=>finish(new Error("新音源没有接上"));musicAudio.addEventListener("loadedmetadata",onReady,{once:true});musicAudio.addEventListener("error",onError,{once:true});timer=setTimeout(()=>finish(new Error("新音源连接超时")),timeout);});
}
async function recoverMusicStream(resumeAt){
  const song=musicCurrent;if(!song||musicStreamRecovering)return;musicStreamRecovering=true;toast("音源提前断开，正在悄悄续上…");
  try{const response=await api("/api/music/prepare",{method:"POST",body:JSON.stringify({id:song.id})}),data=await response.json().catch(()=>({}));if(!response.ok||!data.audio_url)throw new Error(data.error||"没有取到新的音源");if(!musicCurrent||musicCurrent.id!==song.id)return;musicAudio.src=data.audio_url;musicAudio.load();await waitForMusicMetadata();if(!musicCurrent||musicCurrent.id!==song.id)return;const duration=musicAudio.duration,target=Number.isFinite(duration)?Math.min(Math.max(0,resumeAt),Math.max(0,duration-.25)):Math.max(0,resumeAt);musicAudio.currentTime=target;musicLastObservedTime=target;setMusicSeekValue(Number.isFinite(duration)&&duration>0?Math.round(target/duration*1000):0);await musicAudio.play();toast("已经从刚才的位置续上了");}
  catch(error){if(musicCurrent?.id===song.id)toast("音乐账号连接可能过期了，重新连接后再试");}
  finally{musicStreamRecovering=false;renderMusicPlayback();}
}
function renderMusicPlayback(){
  const playing=!musicAudio.paused&&!musicAudio.ended,current=musicCurrent;musicPlayer.classList.toggle("playing",playing);$("#musicSheetPlayer").classList.toggle("playing",playing);$("#musicSheetPlayer").classList.toggle("empty",!current);$("#musicDetailRecord").classList.toggle("playing",playing);
  [$("#musicSheetToggleIcon"),$("#musicDetailToggleIcon")].forEach(icon=>icon.setAttribute("d",playing?"M7 5h4v14H7zm6 0h4v14h-4z":"M8 5v14l11-7z"));
  const duration=musicAudio.duration,value=Number.isFinite(duration)&&duration>0?Math.round(musicAudio.currentTime/duration*1000):0;if(!musicSeeking)setMusicSeekValue(value);
  const time=musicClock(musicAudio.currentTime)+(Number.isFinite(duration)?" / "+musicClock(duration):"");$("#musicSheetTime").textContent=time;$("#musicDetailCurrent").textContent=musicClock(musicAudio.currentTime);$("#musicDetailDuration").textContent=Number.isFinite(duration)?musicClock(duration):"0:00";
  if(current){$("#musicSheetSong").textContent=$("#musicDetailTitle").textContent=current.name;$("#musicSheetArtist").textContent=$("#musicDetailArtist").textContent=current.artist;$("#musicDiscCover").style.cssText=musicCoverStyle(current);$("#musicSheetDisc").style.cssText=musicCoverStyle(current);$("#musicDetailCover").style.cssText=musicCoverStyle(current);const cover=String(current.cover_url||"").replace(/["\\]/g,"");$("#musicDetail").style.setProperty("--music-detail-cover",cover?'url("'+cover+'")':"none");}
  renderMusicLyrics();if(document.body.classList.contains("music-note-open"))renderMusicNoteLyrics();
}
function setMediaSession(song){if(!("mediaSession" in navigator))return;try{navigator.mediaSession.metadata=new MediaMetadata({title:song.name,artist:song.artist,album:song.album||"一起听",artwork:song.cover_url?[{src:song.cover_url}]:[]});navigator.mediaSession.setActionHandler("play",()=>musicAudio.play());navigator.mediaSession.setActionHandler("pause",()=>musicAudio.pause());navigator.mediaSession.setActionHandler("nexttrack",()=>playMusicRelative(1));navigator.mediaSession.setActionHandler("previoustrack",()=>playMusicRelative(-1));navigator.mediaSession.setActionHandler("seekto",detail=>{if(Number.isFinite(detail.seekTime))musicAudio.currentTime=detail.seekTime;});}catch{}}
async function playMusic(song,{preserveQueue=false}={}){
  toast("正在把唱片放上去…");
  try{const response=await api("/api/music/prepare",{method:"POST",body:JSON.stringify({id:song.id})}),data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"这首歌暂时播不了");accrueMusicListening();const saved=cleanMusicSong({...song,...data});musicCurrent={...saved,...data};musicLyrics=parseMusicLyrics(data.lyric);musicLyricIndex=-2;musicStreamRecoveryAttempted=false;musicStreamRecovering=false;musicLastObservedTime=0;const queue=preserveQueue?musicLibrary.queue.map(item=>item.id===saved.id?saved:item):[saved,...musicLibrary.queue.filter(item=>item.id!==saved.id)];void saveMusicLibrary({queue});setMusicSeekValue(0);musicAudio.src=data.audio_url;showMusicDock();setMediaSession(musicCurrent);recordMusicRecent(musicCurrent);renderMusicList();renderMusicQueue();renderMusicPlayback();syncComposerSpace();await musicAudio.play();}
  catch(error){toast(error.message||"这首歌暂时播不了");}
}
function playMusicRelative(direction=1){const queue=musicLibrary.queue;if(!queue.length)return;let index=Math.max(0,queue.findIndex(item=>item.id===musicCurrent?.id));if(musicLibrary.mode==="shuffle"&&queue.length>1){let next=index;while(next===index)next=Math.floor(Math.random()*queue.length);index=next;}else index=(index+direction+queue.length)%queue.length;void playMusic(queue[index],{preserveQueue:true});}
function musicProviderName(platform=musicPlatform){return platform==="netease"?"网易云":"酷狗";}
async function loadMusicStatus(){try{const response=await api("/api/music/status");if(!response.ok)throw new Error();const data=await response.json();musicConnected=!!data.connected;musicPlatform=data.platform==="netease"?"netease":"kugou";$("#musicConnectStatus").textContent=musicConnected?musicProviderName()+"已连接 · 粘贴新 Cookie 可以替换":"公开曲库 · 粘贴 Cookie 连接账号";}catch{$("#musicConnectStatus").textContent="暂时没有读到连接状态";}}
function openMusicSheet(){$("#musicSheetMask").classList.add("on");$("#musicSheet").classList.add("on");document.body.classList.add("music-sheet-open");void loadMusicStatus();void loadMusicLibrary();}
function setMusicMenu(open,{animate=true}={}){const menu=$("#musicMenu");clearTimeout(menu._closeTimer);if(open){menu.classList.remove("closing");menu.hidden=false;return;}if(menu.hidden)return;if(!animate){menu.classList.remove("closing");menu.hidden=true;return;}menu.classList.add("closing");menu._closeTimer=setTimeout(()=>{menu.hidden=true;menu.classList.remove("closing");},180);}
function closeMusicSheet(){setMusicMenu(false,{animate:false});$("#musicQueueSheet").classList.remove("on");$("#musicSheetMask").classList.remove("on");$("#musicSheet").classList.remove("on");document.body.classList.remove("music-sheet-open");}
$("#musicSheetMask").onclick=closeMusicSheet;
$("#musicFavoritesToggle").onclick=()=>{musicShowFavorites=!musicShowFavorites;$("#musicQuery").value="";musicSearchRows=[];renderMusicList();};
$("#musicMenuToggle").onclick=()=>setMusicMenu($("#musicMenu").hidden);
$("#musicDetailShare").onclick=()=>{if(musicSharing){accrueMusicListening();musicSharing=false;finishMusicListeningArchive();musicTogetherStartedAt=0;}else{musicSharing=true;musicTogetherStartedAt=Date.now();startMusicListeningArchive();}renderMusicSharing();renderMusicTogetherTime();toast(musicSharing?"现在和Morrow一起听":"已经停止和Morrow一起听");};
$("#musicClosePlayer").onclick=closeMusicPlayer;
$("#musicCookieSave").onclick=async()=>{const cookie=$("#musicCookie").value.trim(),button=$("#musicCookieSave");if(!cookie){toast("先粘贴酷狗/网易云的 Cookie");return;}button.disabled=true;try{const response=await api("/api/music/settings",{method:"PUT",body:JSON.stringify({cookie})}),data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"连接没有保存好");$("#musicCookie").value="";setMusicMenu(false);musicConnected=!!data.connected;musicPlatform=data.platform==="netease"?"netease":"kugou";toast(musicProviderName()+"已经连上了");await loadMusicStatus();if($("#musicQuery").value.trim())await searchMusic();}catch(error){toast(error.message||"连接没有保存好");}finally{button.disabled=false;}};
async function searchMusic(){const query=$("#musicQuery").value.trim();if(!query){musicSearchRows=[];renderMusicList();return;}const box=$("#musicResults");box.innerHTML='<div class="music-empty">正在翻唱片架…</div>';try{const response=await api("/api/music/search?q="+encodeURIComponent(query)),rows=await response.json();if(!response.ok)throw new Error(rows.error||"没有搜到");musicSearchRows=rows;renderMusicList();}catch(error){box.innerHTML='<div class="music-empty"></div>';box.firstChild.textContent=error.message||"音乐服务暂时没有回应";}}
$("#musicSearch").onclick=searchMusic;$("#musicQuery").onkeydown=event=>{if(event.key==="Enter"){event.preventDefault();void searchMusic();}};$("#musicQuery").oninput=()=>{if(!$("#musicQuery").value.trim()){musicSearchRows=[];renderMusicList();}};
function toggleMusicPlayback(){if(!musicAudio.src)return;musicAudio.paused?musicAudio.play():musicAudio.pause();}
$("#musicSheetToggle").onclick=$("#musicDetailToggle").onclick=toggleMusicPlayback;
function openMusicQueue(){$("#musicQueueSheet").classList.add("on");renderMusicQueue();}
$("#musicSheetQueue").onclick=openMusicQueue;$("#musicDetailQueue").onclick=openMusicQueue;$("#musicQueueClose").onclick=()=>$("#musicQueueSheet").classList.remove("on");
$("#musicNoteClose").onclick=()=>hideMusicNote();
$("#musicNoteSend").onclick=async()=>{if(!musicNoteSong)return;const content=$("#musicNoteText").value.trim(),button=$("#musicNoteSend");if(!content){toast("留言还没有写");return;}button.disabled=true;try{const response=await api("/api/music/comments",{method:"POST",body:JSON.stringify({song:musicNoteSong,content})}),data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"留言没有放进去");$("#musicNoteText").value="";await loadMusicNotes(musicNoteSong.id);toast("留言放进去了");}catch(error){toast(error.message||"留言没有放进去");}finally{button.disabled=false;}};
$("#musicNoteSheet").onclick=event=>{if(!event.target.closest(".music-note-comment"))hideMusicNoteDeleteActions();};
$("#musicNoteText").onkeydown=event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();$("#musicNoteSend").click();}};
$("#musicDetailBack").onclick=()=>hideMusicDetail();$("#musicDetailPrev").onclick=()=>playMusicRelative(-1);$("#musicDetailNext").onclick=()=>playMusicRelative(1);
$("#musicSheetDisc").onclick=()=>openMusicDetail();$("#musicSheetPlayer").querySelector(".music-info").onclick=event=>{if(!event.target.closest("input"))openMusicDetail();};
function cycleMusicMode(){const modes=["sequence","single","shuffle"],mode=modes[(modes.indexOf(musicLibrary.mode)+1)%modes.length];void saveMusicLibrary({mode});renderMusicQueue();toast("已切换为"+musicModeCopy[mode]);}
$("#musicDetailMode").onclick=cycleMusicMode;
$("#musicQueueMode").onclick=cycleMusicMode;
{
  const disc=$("#musicDisc");let startX=0,startY=0,startLeft=0,startTop=0,moved=false;
  disc.onpointerdown=event=>{event.preventDefault();disc.setPointerCapture(event.pointerId);const rect=musicPlayer.getBoundingClientRect();startX=event.clientX;startY=event.clientY;startLeft=rect.left;startTop=rect.top;moved=false;};
  disc.onpointermove=event=>{if(!disc.hasPointerCapture(event.pointerId))return;const dx=event.clientX-startX,dy=event.clientY-startY;if(!moved&&Math.hypot(dx,dy)>6){moved=true;musicPlayer.classList.add("dragging");}if(moved)setMusicDockPosition(startLeft+dx,startTop+dy);};
  const finishDockGesture=event=>{if(disc.hasPointerCapture(event.pointerId))disc.releasePointerCapture(event.pointerId);musicPlayer.classList.remove("dragging");if(moved){const rect=musicPlayer.getBoundingClientRect();setMusicDockPosition(rect.left,rect.top,{save:true,snap:true});}else openMusicDetail();};
  disc.onpointerup=finishDockGesture;disc.onpointercancel=event=>{if(disc.hasPointerCapture(event.pointerId))disc.releasePointerCapture(event.pointerId);musicPlayer.classList.remove("dragging");if(moved){const rect=musicPlayer.getBoundingClientRect();setMusicDockPosition(rect.left,rect.top,{save:true,snap:true});}};
  window.addEventListener("resize",()=>{if(!musicPlayer.hidden)restoreMusicDockPosition();});
}
document.addEventListener("pointerdown",event=>{
  if($("#musicQueueSheet").classList.contains("on")&&!event.target.closest("#musicQueueSheet,#musicSheetQueue,#musicDetailQueue"))$("#musicQueueSheet").classList.remove("on");
  if(!$("#musicMenu").hidden&&!event.target.closest("#musicMenu,#musicMenuToggle"))setMusicMenu(false);
});
renderMusicSharing();
setInterval(pollMusicCommands,1600);
[musicSheetSeek,musicDetailSeek].forEach(seek=>{seek.onpointerdown=()=>{musicSeeking=true;};seek.oninput=()=>{setMusicSeekValue(seek.value);if(Number.isFinite(musicAudio.duration)){const preview=Number(seek.value)/1000*musicAudio.duration;$("#musicSheetTime").textContent=musicClock(preview)+" / "+musicClock(musicAudio.duration);$("#musicDetailCurrent").textContent=musicClock(preview);}};seek.onchange=()=>{if(Number.isFinite(musicAudio.duration)){musicAudio.currentTime=Number(seek.value)/1000*musicAudio.duration;musicLastObservedTime=musicAudio.currentTime;}musicSeeking=false;renderMusicPlayback();renderMusicLyrics(true);};});
musicAudio.addEventListener("timeupdate",()=>{accrueMusicListening();if(!musicSeeking&&Number.isFinite(musicAudio.currentTime)){const duration=musicAudio.duration,suddenEndJump=Number.isFinite(duration)&&musicAudio.currentTime>=duration-.5&&musicLastObservedTime<duration*.88&&musicAudio.currentTime-musicLastObservedTime>5;if(!suddenEndJump)musicLastObservedTime=musicAudio.currentTime;}renderMusicPlayback();});musicAudio.addEventListener("play",()=>{musicListeningTickAt=musicSharing?performance.now():0;renderMusicPlayback();});musicAudio.addEventListener("pause",()=>{accrueMusicListening();renderMusicPlayback();});musicAudio.addEventListener("ended",()=>{accrueMusicListening();const duration=musicAudio.duration,endedAt=musicLastObservedTime||musicAudio.currentTime||0,endedEarly=Number.isFinite(duration)&&duration>=30&&endedAt<duration*.88&&duration-endedAt>10;if(endedEarly){if(!musicStreamRecoveryAttempted){musicStreamRecoveryAttempted=true;void recoverMusicStream(endedAt);}else toast("音乐账号连接可能过期了，重新连接后再试");return;}musicStreamRecoveryAttempted=false;if(musicLibrary.mode==="single"){musicAudio.currentTime=0;musicLastObservedTime=0;void musicAudio.play();}else playMusicRelative(1);});musicAudio.addEventListener("error",()=>{accrueMusicListening();if(musicCurrent&&!musicStreamRecovering)toast("这张唱片的音源断开了，换一首试试");renderMusicPlayback();});
window.addEventListener("beforeunload",()=>{if(musicSharing)void syncMusicListening(true,{keepalive:true});});
let STICKERS=[],STICKER_META={series:[],tags:[]},chosenStickerTags=[],chosenStickerSeries="";
async function loadStickers(){try{const [list,meta]=await Promise.all([api("/api/stickers"),api("/api/stickers/meta")]);if(list.ok)STICKERS=await list.json();if(meta.ok)STICKER_META=await meta.json();}catch{}renderStickerTray();renderStickerManager();}
function showStickerCatalog(on){$("#stickerGrid").hidden=on;$("#stickerCatalog").hidden=!on;$("#stickerManage").hidden=on;if(on)renderStickerMeta();requestAnimationFrame(syncComposerSpace);}
function openStickerTray(){closeStickerPopover();showStickerCatalog(false);showPlusPage("sticker");void loadStickers();requestAnimationFrame(syncComposerSpace);}
function closeStickerTray(){closeStickerPopover();showStickerCatalog(false);showPlusPage("main");requestAnimationFrame(syncComposerSpace);}
$("#stickerTrayBack").onclick=()=>{$("#stickerCatalog").hidden?closeStickerTray():showStickerCatalog(false);};
function renderStickerTray(){const grid=$("#stickerGrid");grid.innerHTML="";const enabled=STICKERS.filter(s=>s.enabled);
  const add=document.createElement("button");add.className="sticker-choice sticker-add";add.type="button";add.innerHTML='<span class="sticker-add-box">＋</span><span>添加</span>';add.setAttribute("aria-label","添加表情");add.onclick=()=>openStickerManager();grid.appendChild(add);
  enabled.forEach(s=>{const b=document.createElement("button");b.className="sticker-choice audience-"+(s.audience||"both");b.type="button";b.title=[s.description,(s.tags||[]).map(t=>"#"+t).join(" "),s.expression&&("表达状态："+s.expression)].filter(Boolean).join(" · ");b.innerHTML='<img><span></span>';b.querySelector("img").src=s.url;b.querySelector("span").textContent=s.name;
    b.querySelector("img").draggable=false;b.oncontextmenu=e=>e.preventDefault();let hold=null,held=false;b.onpointerdown=e=>{held=false;hold=setTimeout(()=>{held=true;openStickerPopover(s,b);},430);};b.onpointerup=b.onpointercancel=()=>clearTimeout(hold);
    b.onclick=()=>{if(held){held=false;return;}attachments=attachments.filter(a=>!a.isSticker);attachments.push({isSticker:true,saved:{type:"sticker",sticker_id:s.id,sticker_name:s.name,name:s.name,description:s.description,expression:s.expression||"",series:s.series||"",tags:s.tags||[],mime:s.mime,path:s.path,url:s.url,size:0},name:s.name,url:s.url});renderAttach();togglePlus(false);};grid.appendChild(b);});}
function renderStickerManager(){renderStickerFormPreview();renderStickerMeta();renderStickerTaxonomy();}
let editingSticker=null,stickerPreviewUrl="",popoverSticker=null,stickerPopoverAt=0;
function stickerAudience(){return $("#stickerAudience .on")?.dataset.value||"both";}
function setStickerAudience(value="both"){$$("#stickerAudience button").forEach(b=>b.classList.toggle("on",b.dataset.value===value));}
function renderStickerFormPreview(){const box=$("#stickerFormPreview"),pick=$("#stickerPreviewPick"),img=pick.querySelector("img"),name=$("#stickerName").value.trim(),description=$("#stickerDescription").value.trim(),expression=$("#stickerExpression").value.trim();
  const src=stickerPreviewUrl||(editingSticker?.url||"");img.hidden=!src;pick.classList.toggle("has-image",!!src);if(src)img.src=src;box.querySelector("strong").textContent=name||"选择表情";box.querySelector("small").textContent=[description,expression&&("表达状态："+expression)].filter(Boolean).join("\n");}
function keepStickerTrayOpen(){if(!plusPop)return;plusPop.hidden=false;plusBtn.classList.add("open");showPlusPage("sticker");syncComposerSpace();}
function renderStickerTaxonomy(){const seriesMenu=$("#stickerSeriesMenu");seriesMenu.innerHTML="";[{name:""},...STICKER_META.series].forEach(item=>{const button=document.createElement("button");button.type="button";button.textContent=item.name||"其他";button.classList.toggle("on",item.name===chosenStickerSeries);button.onclick=e=>{e.preventDefault();e.stopPropagation();chosenStickerSeries=item.name;$("#stickerSeriesButton").textContent=item.name||"其他";seriesMenu.hidden=true;renderStickerTaxonomy();};seriesMenu.appendChild(button);});$("#stickerSeriesButton").textContent=chosenStickerSeries||"其他";const chips=$("#stickerChosenTags");chips.innerHTML="";chosenStickerTags.forEach(tag=>{const chip=document.createElement("span");chip.className="sticker-tag-chip";chip.innerHTML='<span></span><button type="button">×</button>';chip.querySelector("span").textContent="#"+tag;chip.querySelector("button").onclick=e=>{e.preventDefault();e.stopPropagation();chosenStickerTags=chosenStickerTags.filter(x=>x!==tag);renderStickerTaxonomy();renderStickerFormPreview();keepStickerTrayOpen();};chips.appendChild(chip);});renderStickerTagMenu();}
function renderStickerTagMenu(){const menu=$("#stickerTagMenu"),query=$("#stickerTagInput").value.trim().replace(/^#+/,"").toLocaleLowerCase();menu.innerHTML="";STICKER_META.tags.filter(tag=>!chosenStickerTags.includes(tag)&&(!query||tag.toLocaleLowerCase().includes(query))).forEach(tag=>{const button=document.createElement("button");button.type="button";button.textContent="#"+tag;button.onclick=e=>{e.preventDefault();e.stopPropagation();addChosenStickerTag(tag);};menu.appendChild(button);});if(!menu.children.length)menu.innerHTML='<span class="caption">没有其他标签</span>';}
function setStickerTagMenu(on){$("#stickerTagMenu").hidden=!on;$("#stickerTagToggle").classList.toggle("open",on);$("#stickerTagToggle").setAttribute("aria-expanded",String(on));}
function addChosenStickerTag(value){const tag=String(value||"").trim().replace(/^#+/,"").slice(0,24);if(tag&&!chosenStickerTags.includes(tag))chosenStickerTags.push(tag);$("#stickerTagInput").value="";renderStickerTaxonomy();renderStickerFormPreview();keepStickerTrayOpen();}
function openStickerManager(sticker=null){editingSticker=sticker;$("#stickerCatalog").hidden=true;$("#stickerForm").hidden=false;$("#stickerFormTitle").textContent=sticker?"编辑表情":"添加表情";$("#stickerFormSubmit").textContent=sticker?"保存修改":"加入表情盒";$("#stickerName").value=sticker?.name||"";$("#stickerDescription").value=sticker?.description||"";$("#stickerExpression").value=sticker?.expression||"";chosenStickerTags=[...(sticker?.tags||[])];chosenStickerSeries=sticker?.series||"";setStickerAudience(sticker?.audience||"both");$("#stickerImage").value="";stickerPreviewUrl="";renderStickerTaxonomy();setStickerTagMenu(false);renderStickerFormPreview();$("#stickerManager").classList.add("on");}
function openStickerCatalog(){editingSticker=null;showStickerCatalog(true);}
let stickerMetaRevision=0,stickerMetaDirty=false;
function markStickerMetaDirty(){stickerMetaRevision++;stickerMetaDirty=true;}
async function saveStickerMetaNow(){if(!stickerMetaDirty)return;const revision=stickerMetaRevision,series=STICKER_META.series.map(item=>({name:item.name.trim(),description:item.description.trim()})).filter(item=>item.name),tags=[...STICKER_META.tags];stickerMetaDirty=false;try{const r=await api("/api/stickers/meta",{method:"PUT",body:JSON.stringify({series,tags})}),data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"保存失败");if(revision===stickerMetaRevision&&!stickerMetaDirty)STICKER_META=data;}catch(e){stickerMetaDirty=true;toast("系列和标签没有保存好");}}
function renderStickerMeta(){const rows=$("#stickerSeriesRows");rows.innerHTML="";STICKER_META.series.forEach((item,index)=>{const row=document.createElement("div");row.className="sticker-series-row";row.innerHTML='<input maxlength="40" aria-label="系列名称" placeholder="系列名称"><input maxlength="300" aria-label="系列说明" placeholder="共同画面描述"><button type="button">×</button>';const inputs=row.querySelectorAll("input");inputs[0].value=item.name;inputs[1].value=item.description||"";inputs[0].oninput=e=>{item.name=e.target.value;markStickerMetaDirty();};inputs[1].oninput=e=>{item.description=e.target.value;markStickerMetaDirty();};inputs.forEach(input=>input.onblur=()=>void saveStickerMetaNow());row.querySelector("button").onclick=()=>{STICKER_META.series.splice(index,1);markStickerMetaDirty();renderStickerMeta();void saveStickerMetaNow();};rows.appendChild(row);});const tags=$("#stickerMetaTags");tags.innerHTML="";STICKER_META.tags.forEach((tag,index)=>{const chip=document.createElement("span");chip.className="sticker-tag-chip";chip.innerHTML='<span></span><button type="button">×</button>';chip.querySelector("span").textContent="#"+tag;chip.querySelector("button").onclick=()=>{STICKER_META.tags.splice(index,1);markStickerMetaDirty();renderStickerMeta();void saveStickerMetaNow();};tags.appendChild(chip);});}
$("#stickerCatalog").addEventListener("pointerdown",e=>{if(stickerMetaDirty&&!e.target.closest("input,button"))void saveStickerMetaNow();});
$("#stickerManage").onclick=e=>{e.preventDefault();e.stopPropagation();openStickerCatalog();};
$("#stickerSeriesAdd").onclick=()=>{STICKER_META.series.push({name:"",description:""});renderStickerMeta();$("#stickerSeriesRows .sticker-series-row:last-child input")?.focus();};
$("#stickerMetaTagAdd").onclick=()=>{const input=$("#stickerMetaTagNew"),tag=input.value.trim().replace(/^#+/,"");if(tag&&!STICKER_META.tags.includes(tag)){STICKER_META.tags.push(tag);markStickerMetaDirty();}input.value="";renderStickerMeta();void saveStickerMetaNow();};
$("#stickerMetaTagNew").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();$("#stickerMetaTagAdd").click();}};
function closeStickerManager(){$("#stickerManager").classList.remove("on");if(stickerPreviewUrl)URL.revokeObjectURL(stickerPreviewUrl);stickerPreviewUrl="";editingSticker=null;}
$("#stickerManagerClose").onclick=closeStickerManager;$("#stickerManager").onclick=e=>{if(e.target===$("#stickerManager"))closeStickerManager();};
[$("#stickerName"),$("#stickerDescription"),$("#stickerExpression")].forEach(el=>el.oninput=renderStickerFormPreview);
$("#stickerSeriesButton").onclick=()=>{$("#stickerSeriesMenu").hidden=!$("#stickerSeriesMenu").hidden;};
$("#stickerTagInput").onkeydown=e=>{if(e.key==="Enter"||e.key===","){e.preventDefault();addChosenStickerTag(e.target.value);}};
$("#stickerTagInput").oninput=()=>{renderStickerTagMenu();setStickerTagMenu(true);};
$("#stickerTagToggle").onclick=()=>{renderStickerTagMenu();setStickerTagMenu($("#stickerTagMenu").hidden);};
$$("#stickerAudience button").forEach(button=>button.onclick=()=>setStickerAudience(button.dataset.value));
$("#stickerImage").onchange=e=>{if(stickerPreviewUrl)URL.revokeObjectURL(stickerPreviewUrl);const file=e.target.files[0];stickerPreviewUrl=file?URL.createObjectURL(file):"";renderStickerFormPreview();};
function openStickerPopover(sticker,anchor){popoverSticker=sticker;stickerPopoverAt=Date.now();const pop=$("#stickerPopover"),r=anchor.getBoundingClientRect();pop.hidden=false;requestAnimationFrame(()=>{const w=pop.offsetWidth,left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2));pop.style.left=left+"px";pop.style.top=Math.max(8,r.top-pop.offsetHeight-8)+"px";pop.style.setProperty("--arrow-x",(r.left+r.width/2-left)+"px");});}
function closeStickerPopover(){$("#stickerPopover").hidden=true;popoverSticker=null;}
$("#stickerEditBtn").onclick=()=>{const s=popoverSticker;closeStickerPopover();if(s)openStickerManager(s);};
$("#stickerPinBtn").onclick=async()=>{const s=popoverSticker;closeStickerPopover();if(!s)return;const r=await api("/api/stickers/"+s.id+"/pin",{method:"POST"});if(!r.ok){toast("暂时没能置顶");return;}await loadStickers();toast("已经放到最前面");};
$("#stickerDeleteBtn").onclick=async()=>{const s=popoverSticker;closeStickerPopover();if(!s||!await bubbleConfirm({title:"移除这个表情",message:"从表情盒里移除「"+s.name+"」吗？",note:"聊天历史里已经发过的表情仍会保留。",confirmText:"移除",danger:true}))return;await api("/api/stickers/"+s.id,{method:"DELETE"});await loadStickers();};
$("#stickerForm").onsubmit=async e=>{e.preventDefault();const file=$("#stickerImage").files[0],name=$("#stickerName").value.trim(),description=$("#stickerDescription").value.trim(),expression=$("#stickerExpression").value.trim();if((!file&&!editingSticker)||!name||!description)return;const form=new FormData();if(file)form.append("image",file);form.append("name",name);form.append("description",description);form.append("expression",expression);form.append("series",chosenStickerSeries);form.append("tags",JSON.stringify(chosenStickerTags));form.append("audience",stickerAudience());const url=editingSticker?("/api/stickers/"+editingSticker.id):"/api/stickers",r=await fetch(url,{method:editingSticker?"PUT":"POST",body:form}),data=await r.json();if(!r.ok){toast(data.error||"没能放进表情盒");return;}toast(editingSticker?"表情已经改好":"已经放进表情盒");closeStickerManager();await loadStickers();};
function onPicked(inp){
  const files=Array.from(inp.files||[]);if(!files.length)return;let imageLimitHit=false,added=0;
  files.forEach(f=>{if(addAttachment(f))added++;else imageLimitHit=true;});
  if(imageLimitHit)toast("一次最多选 9 张图片");inp.value="";if(added)togglePlus(false);
  if(added)window.sakieChatViewport?.follow();
}
$("#fileCamera").onchange=function(){onPicked(this);};
$("#fileAlbum").onchange=function(){onPicked(this);};
$("#filePick").onchange=function(){onPicked(this);};
function addAttachment(file){
  const lower=(file.name||"").toLowerCase();
  const isImg=file.type.startsWith("image/")||/\.(png|jpe?g|webp|gif)$/.test(lower);
  if(isImg&&attachments.filter(a=>a.isImg).length>=9)return false;
  const docLike=/\.(txt|md|markdown|pdf|docx|xlsx)$/.test(lower)
    ||file.type.startsWith("text/")||file.type==="application/pdf"
    ||/officedocument|ms-excel/.test(file.type);
  const item={file,name:file.name,isImg,isText:docLike,url:null};
  if(item.isImg)item.url=URL.createObjectURL(file);
  attachments.push(item);
  if(item.isImg||item.isText)void prepareAttachmentUpload(item).catch(()=>{});
  renderAttach();return true;
}
const attachmentUploadQueue=[];let activeAttachmentUploads=0;
function pumpAttachmentUploads(){
  while(activeAttachmentUploads<2&&attachmentUploadQueue.length){
    const job=attachmentUploadQueue.shift();activeAttachmentUploads++;
    Promise.resolve().then(job.run).then(job.resolve,job.reject).finally(()=>{activeAttachmentUploads--;pumpAttachmentUploads();});
  }
}
function prepareAttachmentUpload(item){
  if(item._uploaded)return Promise.resolve(item._uploaded);
  if(item._uploadPromise)return item._uploadPromise;
  item._uploadState="上传中";
  item._uploadPromise=new Promise((resolve,reject)=>{attachmentUploadQueue.push({resolve,reject,run:async()=>{
    if(item._removed)throw new Error("已取消附件");
    item._uploadController=new AbortController();
    try{
      const saved=await uploadAttachmentFile(item.file,item.name||"image",item._uploadController.signal);
      item._uploaded=saved;item._uploadState="已备好";if(attachments.includes(item))renderAttach();return saved;
    }catch(error){item._uploadState="上传失败，可重试";item._uploadPromise=null;if(attachments.includes(item))renderAttach();throw error;}
  }});pumpAttachmentUploads();});
  // Selection starts transfer only; no chat or model call occurs until Send.
  item._uploadPromise.catch(()=>{});return item._uploadPromise;
}
async function uploadAttachments(items){
  return Promise.all(items.map(item=>item.isSticker?item.saved:prepareAttachmentUpload(item)));
}
async function uploadAttachmentFile(file,name,signal){
  const fd=new FormData();fd.append("file",file,name);
  const r=await fetch("/api/uploads",{method:"POST",body:fd,signal});
  const body=await r.json().catch(()=>({error:"上传失败"}));
  if(!r.ok)throw new Error(body.error||"上传失败");
  return body;
}
function renderAttach(){
  const row=$("#attachRow");row.innerHTML="";
  attachments.forEach((a,i)=>{const chip=document.createElement("div");chip.className="attach-chip";
    chip.innerHTML=(a.isImg||a.isSticker)?'<img src="'+(a._uploaded?chatImageUrl(a._uploaded.url):a.url)+'">'
      :'<div class="file"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/></svg><span>'+a.name+'</span></div>';
    if(a._uploadState){const state=document.createElement("small");state.className="attach-upload-state";state.textContent=a._uploadState;chip.appendChild(state);}
    const rm=document.createElement("button");rm.className="rm";rm.textContent="×";
    rm.onclick=()=>{a._removed=true;a._uploadController?.abort();if(!a.existing&&a.url)URL.revokeObjectURL(a.url);attachments.splice(i,1);renderAttach();};
    chip.appendChild(rm);row.appendChild(chip);});
  updateSendAvailability();syncComposerSpace();
}
function resetComposerAttachments(){
  attachments.forEach(a=>{a._removed=true;a._uploadController?.abort();if(!a.existing&&a.url)URL.revokeObjectURL(a.url);});
  attachments=[];renderAttach();
}

/* ---------- 消息预览 drawer ---------- */
const prevDrawer=$("#prevDrawer"),prevMask=$("#prevMask");
function chatMessages(){ // user + ai bubbles only (skip thinking/reasoning)
  return [...$("#log").children].filter(el=>el.classList.contains("row-user")||el.querySelector?.(".message-ai"));
}
function msgText(el){return el.classList.contains("row-user")?el._text:(el._versions?el._versions[el._vi]:"");}
function buildPreview(q){
  const body=$("#prevBody");body.innerHTML="";q=(q||"").trim().replace(/\s+/g," ").toLocaleLowerCase();
  const all=chatMessages();
  $("#prevCount").textContent=all.length;
  const rows=all.filter(el=>!q||(msgText(el)||"").replace(/\s+/g," ").toLocaleLowerCase().includes(q));
  if(!rows.length){body.innerHTML='<div class="d-empty">'+(q?"没找到相关消息":"还没有消息")+'</div>';return;}
  rows.forEach(el=>{const mine=el.classList.contains("row-user");
    const line=document.createElement("div");line.className="prev-line";
    line.innerHTML='<span class="who '+(mine?"me":"her")+'">'+(mine?"我":assistantPronoun())+'</span><span class="txt"></span>';
    const txt=line.querySelector(".txt"),message=(msgText(el)||"").replace(/\s+/g," ");
    if(q){
      const at=message.toLocaleLowerCase().indexOf(q);
      if(at>0)txt.append("…");
      const mark=document.createElement("mark");mark.textContent=message.slice(at,at+q.length);txt.append(mark,message.slice(at+q.length));
    }else txt.textContent=message;
    line.onclick=()=>{closePreview();jumpTo(el);};body.appendChild(line);});
}
function jumpTo(el){el.scrollIntoView({behavior:"smooth",block:"center"});
  el.classList.add("flash");setTimeout(()=>el.classList.remove("flash"),1400);}
function openPreview(){buildPreview("");$("#prevSearch").value="";
  prevDrawer.classList.add("on");prevMask.classList.add("on");pushChatDrawerRoute("preview");}
function hidePreview(){prevDrawer.classList.remove("on");prevMask.classList.remove("on");}
function closePreview(){closeChatDrawerRoute("preview",hidePreview);}
$("#previewBtn").onclick=openPreview;$("#prevClose").onclick=closePreview;prevMask.onclick=closePreview;
$("#prevSearch").addEventListener("input",e=>buildPreview(e.target.value));

/* ---------- moments: all conversations over time ---------- */
let MOMENTS_MONTH=localDateKey(new Date()).slice(0,7),MOMENTS_DATE=localDateKey(new Date()),MOMENTS_DATA=null,momentsSearchTimer=null,momentsSearchEpoch=0;
const momentsNumber=value=>new Intl.NumberFormat("zh-CN").format(Number(value)||0);
function shiftMomentsMonth(delta){const [y,m]=MOMENTS_MONTH.split("-").map(Number),date=new Date(y,m-1+delta,1);MOMENTS_MONTH=date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0");MOMENTS_DATE="";loadMoments();}
function momentsScore(item){return (Number(item.message_count)||0)*4+Math.sqrt(Number(item.text_units)||0);}
function renderMomentsChart(data){
  const dayMode=!!MOMENTS_DATE,source=dayMode?data.hourly:data.daily,[year,month]=MOMENTS_MONTH.split("-").map(Number),days=new Date(year,month,0).getDate();
  const values=dayMode?Array.from({length:24},(_,i)=>source.find(x=>x.hour===i)||{hour:i}):Array.from({length:days},(_,i)=>source.find(x=>Number(x.date?.slice(-2))===i+1)||{});
  const max=Math.max(1,...values.map(momentsScore)),chart=$("#momentsChart");chart.innerHTML="";
  values.forEach((item,i)=>{const wrap=document.createElement("div");wrap.className="moments-bar-wrap";const bar=document.createElement("span");bar.className="moments-bar";bar.style.height=(Math.max(item.message_count?5:2,momentsScore(item)/max*100))+"%";bar.title=(dayMode?String(i).padStart(2,"0")+":00":(i+1)+"日")+" · "+(item.message_count||0)+" 条";wrap.appendChild(bar);if((dayMode&&i%6===0)||(!dayMode&&[0,9,19,days-1].includes(i))){const axis=document.createElement("span");axis.className="moments-axis";axis.textContent=dayMode?i:(i+1);wrap.appendChild(axis);}chart.appendChild(wrap);});
}
function renderMomentsCalendar(data){
  const [year,month]=MOMENTS_MONTH.split("-").map(Number),days=new Date(year,month,0).getDate(),active=new Set(data.daily.map(x=>x.date)),week=["sun","mon","tue","wed","thu","fri","sat"];
  $("#momentsMonth").innerHTML=new Date(year,month-1,1).toLocaleDateString("en-US",{month:"short"})+"<br>"+year;$("#momentsMonth").classList.toggle("on",!MOMENTS_DATE);const strip=$("#momentsDays");strip.innerHTML="";
  for(let day=1;day<=days;day++){const value=MOMENTS_MONTH+"-"+String(day).padStart(2,"0"),button=document.createElement("button");button.className="moments-day"+(active.has(value)?" has":"")+(value===MOMENTS_DATE?" on":"");button.innerHTML=day+"<small>"+week[new Date(year,month-1,day).getDay()]+"</small>";button.onclick=()=>{MOMENTS_DATE=value;loadMoments();};strip.appendChild(button);}
  requestAnimationFrame(()=>strip.querySelector(".on")?.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"}));
}
function renderMomentsPhotos(data){const box=$("#momentsPhotos");box.innerHTML="";$("#momentsPhotoCount").textContent=data.images.length+" photos";if(!data.images.length){box.innerHTML='<div class="moments-empty" style="grid-column:1/-1">这段时光里还没有图片</div>';return;}const fake={_attachments:data.images.map(x=>({type:"image",url:x.url,name:x.name}))};data.images.forEach((item,index)=>{const button=document.createElement("button");button.className="moments-photo";button.innerHTML='<img loading="lazy" alt="">';button.querySelector("img").src=chatImageUrl(item.url);button.querySelector("img").alt=item.name||"聊天图片";button.onclick=()=>openPhotoViewer(fake,index,button);box.appendChild(button);});}
async function loadMoments(){
  const url="/api/moments?month="+encodeURIComponent(MOMENTS_MONTH)+(MOMENTS_DATE?"&date="+encodeURIComponent(MOMENTS_DATE):"");
  try{const response=await api(url),data=await response.json();if(!response.ok)throw new Error();MOMENTS_DATA=data;const selected=data.daily.find(item=>item.date===MOMENTS_DATE),today=localDateKey(new Date()),isToday=MOMENTS_DATE===today;$("#momentsDayMessages").textContent=momentsNumber(MOMENTS_DATE?(selected?.message_count||0):data.totals.month_message_count);$("#momentsDayLabel").textContent=isToday?"today":MOMENTS_DATE?MOMENTS_DATE.slice(5).replace("-","/"):"this month";$("#momentsMessages").textContent=momentsNumber(data.totals.message_count);$("#momentsWords").textContent=momentsNumber(data.totals.text_units);renderMomentsCalendar(data);renderMomentsChart(data);renderMomentsPhotos(data);$("#momentsCurveTitle").textContent=MOMENTS_DATE?MOMENTS_DATE.slice(5).replace("-","/")+" · through the day":"this month";$("#momentsPhotoTitle").textContent=isToday?"the day's little windows":MOMENTS_DATE?"that day's little windows":"latest little windows";$("#momentsToDay").hidden=!MOMENTS_DATE||isToday||!data.conversations.length;}catch{$("#momentsPhotos").innerHTML='<div class="moments-empty" style="grid-column:1/-1">时光页暂时没有翻开</div>';}
}
function appendMomentHighlight(root,text,query){const lower=text.toLocaleLowerCase(),needle=query.toLocaleLowerCase();let cursor=0,at;while(needle&&(at=lower.indexOf(needle,cursor))>=0){root.append(document.createTextNode(text.slice(cursor,at)));const mark=document.createElement("mark");mark.className="moment-hit";mark.textContent=text.slice(at,at+query.length);root.appendChild(mark);cursor=at+query.length;}root.append(document.createTextNode(text.slice(cursor)));}
function highlightMomentMessage(element,query){if(!element||!query)return;const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT,{acceptNode:node=>node.parentElement?.closest("button,svg,mark")?NodeFilter.FILTER_REJECT:node.data.toLocaleLowerCase().includes(query.toLocaleLowerCase())?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(node=>{const fragment=document.createDocumentFragment();appendMomentHighlight(fragment,node.data,query);node.replaceWith(fragment);});}
async function jumpToMoment(item,query=""){sessionId=Number(item.session_id);$("#chatTitle").textContent=item.title||item.session_title||assistantName();hideMoments();if(currentAppRoute()?.drawer==="moments")history.back();suppressChatAutofocus=true;showView("chat");suppressChatAutofocus=false;$("#input").blur();const messageId=Number(item.message_id||item.first_message_id);await loadMessages(messageId);const target=[...$("#log").children].find(child=>Number(child._id)===messageId);highlightMomentMessage(target,query);if(target){const settle=()=>target.scrollIntoView({behavior:"auto",block:"center"});requestAnimationFrame(()=>requestAnimationFrame(settle));setTimeout(settle,180);}}
async function searchMoments(query){const q=query.trim(),overview=$("#momentsOverview"),results=$("#momentsResults"),epoch=++momentsSearchEpoch;if(!q){overview.hidden=false;results.hidden=true;results.replaceChildren();return;}overview.hidden=true;results.hidden=false;results.innerHTML='<div class="moments-empty">在旧日子里找一找…</div>';try{const rows=await(await api("/api/moments/search?q="+encodeURIComponent(q))).json();if(epoch!==momentsSearchEpoch||$("#momentsSearch").value.trim()!==q)return;results.innerHTML="";if(!rows.length){results.innerHTML='<div class="moments-empty">没有找到这句话</div>';return;}rows.forEach(item=>{const button=document.createElement("button");button.className="moments-result";button.innerHTML='<span class="moments-result-meta"><span></span><time></time></span><div class="moments-result-text"></div>';button.querySelector(".moments-result-meta span").textContent=item.title||"新的聊天";button.querySelector("time").textContent=(item.created_at||"").slice(0,16);appendMomentHighlight(button.querySelector(".moments-result-text"),item.snippet,q);button.onclick=()=>jumpToMoment(item,q);results.appendChild(button);});}catch{if(epoch===momentsSearchEpoch)results.innerHTML='<div class="moments-empty">刚才没有找回来，再试一次吧</div>';}}
function openMoments(){MOMENTS_DATE=localDateKey(new Date());MOMENTS_MONTH=MOMENTS_DATE.slice(0,7);momentsSearchEpoch++;$("#momentsSearch").value="";$("#momentsOverview").hidden=false;$("#momentsResults").hidden=true;$("#momentsResults").replaceChildren();$("#momentsDrawer").classList.add("on");$("#momentsMask").classList.add("on");pushChatDrawerRoute("moments");loadMoments();}
function hideMoments(){$("#momentsDrawer").classList.remove("on");$("#momentsMask").classList.remove("on");}
function closeMoments(){closeChatDrawerRoute("moments",hideMoments);}
$("#momentsClose").onclick=closeMoments;$("#momentsMask").onclick=closeMoments;
$("#momentsPrev").onclick=()=>shiftMomentsMonth(-1);$("#momentsNext").onclick=()=>shiftMomentsMonth(1);$("#momentsMonth").onclick=()=>{MOMENTS_DATE="";loadMoments();};
$("#momentsSearch").oninput=e=>{clearTimeout(momentsSearchTimer);const value=e.target.value;if(!value.trim()){searchMoments("");return;}momentsSearchTimer=setTimeout(()=>searchMoments(value),220);};
$("#momentsToDay").onclick=()=>{const rows=MOMENTS_DATA?.conversations||[];if(rows.length===1){jumpToMoment(rows[0]);return;}openChoiceSheet({title:"回到哪一段对话？",items:rows.map(row=>({value:row.session_id,label:(row.title||"新的聊天")+" · "+row.message_count+" 条",row})),onChoose:(_,item)=>jumpToMoment(item.row)});};

/* ---------- kebab menu: 新建对话 / 历史对话 ---------- */
let menuPop=null;
function closeMenu(){
  if(!menuPop)return;
  const popup=menuPop;menuPop=null;
  $("#menuBtn").setAttribute("aria-expanded","false");
  const style=getComputedStyle(popup),from={opacity:style.opacity,transform:style.transform};
  popup.classList.add("closing");popup.style.pointerEvents="none";popup.inert=true;popup.removeAttribute("id");
  popup.getAnimations().forEach(animation=>animation.cancel());
  if(reducedMotion){popup.remove();return;}
  const motion=popup.animate([from,{opacity:0,transform:"translateY(-5px) scale(.96)"}],
    {duration:140,easing:"ease-in",fill:"forwards"});
  motion.finished.then(()=>popup.remove(),()=>popup.remove());
}
$("#menuBtn").onclick=(e)=>{e.stopPropagation();
  if(menuPop){closeMenu();return;}
  document.querySelectorAll(".menu-pop.closing").forEach(popup=>popup.remove());
  menuPop=document.createElement("div");menuPop.className="menu-pop";menuPop.id="chatMenuPopup";
  $("#menuBtn").setAttribute("aria-expanded","true");
  const mk=(label,svg,fn)=>{const b=document.createElement("button");
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">'+svg+'</svg>'+label;
    b.onclick=()=>{closeMenu();fn();};return b;};
  menuPop.appendChild(mk("new chat",'<path d="M12 5v14M5 12h14"/>',newChat));
  menuPop.appendChild(mk("history",'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',openHistory));
  menuPop.appendChild(mk("moments",'<path d="M4 18c3-7 6-9 8-9s3 4 5 4 2-3 3-6"/><circle cx="5" cy="6" r="1.4"/>',openMoments));
  menuPop.appendChild(mk("settings",'<path d="M12 2.8l7.8 4.6v9.2L12 21.2l-7.8-4.6V7.4z"/><circle cx="12" cy="12" r="3.1"/>',openChatSettings));
  $(".chat-topbar").appendChild(menuPop);
};

document.addEventListener("keydown",e=>{if(e.key==="Escape"&&menuPop){closeMenu();$("#menuBtn").focus();}});

/* ---------- 历史对话 drawer ---------- */
const histDrawer=$("#histDrawer"),histMask=$("#histMask");
let HISTORY_LIST=[],histSelecting=false,historyArchived=false,exportSelectedSessions=new Set();
async function openHistory(selectMode=false,archived=false){
  const body=$("#histBody");body.innerHTML='<div class="d-empty">加载中…</div>';
  if(selectMode)histSelecting=true;
  historyArchived=histSelecting?false:!!archived;
  histDrawer.classList.toggle("selecting",histSelecting);$("#histSelectBar").hidden=!histSelecting;
  $("#histSelectBtn").hidden=!histSelecting;
  $("#histTitle").textContent=historyArchived?"archive":"history";
  $("#histArchiveBtn").classList.toggle("on",historyArchived);
  $("#histArchiveBtn").setAttribute("aria-pressed",String(historyArchived));
  $("#histArchiveBtn").setAttribute("aria-label",historyArchived?"返回历史对话":"查看归档对话");
  histDrawer.classList.add("on");histMask.classList.add("on");
  pushChatDrawerRoute("history");
  HISTORY_LIST=await(await api("/api/chat/sessions"+(historyArchived?"?archived=1":""))).json();renderHistoryRows();
}
function renderHistoryRows(){
  const body=$("#histBody"),list=HISTORY_LIST;body.innerHTML="";
  if(!list.length){body.innerHTML='<div class="d-empty">'+(historyArchived?"归档盒还是空的":"还没有对话，去说点什么吧")+'</div>';return;}
  list.forEach(s=>{const d=document.createElement("div");d.className="sess-line"+(s.id===sessionId?" cur":"")+(s.pinned?" pinned":"");
    if(exportSelectedSessions.has(s.id))d.classList.add("selected");
    d.innerHTML='<span class="s-check">✓</span><span class="s-pin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 17v5"/><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z"/></svg></span>'+
      '<span class="s-title"></span><span class="s-time"></span>';
    d.querySelector(".s-title").textContent=s.title||"新的聊天";
    d.querySelector(".s-time").textContent=(s.updated_at||"").slice(5,10).replace("-","/");
    if(histSelecting){d.onclick=()=>{if(exportSelectedSessions.has(s.id))exportSelectedSessions.delete(s.id);else exportSelectedSessions.add(s.id);
      renderHistoryRows();};body.appendChild(d);return;}
    // tap = open; long-press / right-click = popup at the press point
    let lpTimer,lpFired,lpX=0,lpY=0;
    d.addEventListener("touchstart",e=>{lpFired=false;const t=e.touches[0];lpX=t.clientX;lpY=t.clientY;
      lpTimer=setTimeout(()=>{lpFired=true;openSessionMenu(s,lpX,lpY);},480);},{passive:true});
    d.addEventListener("touchend",()=>clearTimeout(lpTimer));
    d.addEventListener("touchmove",()=>clearTimeout(lpTimer));
    d.addEventListener("contextmenu",e=>{e.preventDefault();openSessionMenu(s,e.clientX,e.clientY);});
    d.onclick=async()=>{if(lpFired){lpFired=false;return;}
      sessionId=s.id;$("#chatTitle").textContent=s.title||assistantName();closeHist();await loadMessages();};
    body.appendChild(d);});
  $("#histSelectCount").textContent="已选择 "+exportSelectedSessions.size+" 个对话";
}
let sessMenu=null,sessMenuAt=0;
function closeSessMenu(){if(sessMenu){sessMenu.remove();sessMenu=null;}}
let titleEditSession=null;
function openTitleEdit(s){
  titleEditSession=s;const input=$("#titleEditInput");input.value=s.title||"";
  $("#titleEditMask").classList.add("on");$("#titleEditCard").classList.add("on");
  requestAnimationFrame(()=>{input.focus();input.select();});
}
function closeTitleEdit(){
  titleEditSession=null;$("#titleEditMask").classList.remove("on");$("#titleEditCard").classList.remove("on");
}
async function saveTitleEdit(){
  if(!titleEditSession)return;
  const target=titleEditSession,title=$("#titleEditInput").value.trim();
  if(!title){toast("标题不能为空");return;}
  const btn=$("#titleEditSave");btn.disabled=true;
  try{
    const r=await api("/api/chat/sessions/"+target.id,{method:"PUT",body:JSON.stringify({title})});
    const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"修改失败");
    if(target.id===sessionId)$("#chatTitle").textContent=title;
    closeTitleEdit();await openHistory(false,historyArchived);toast("标题改好了");
  }catch(e){toast(e.message||"修改失败");}
  finally{btn.disabled=false;}
}
$("#titleEditCancel").onclick=closeTitleEdit;$("#titleEditMask").onclick=closeTitleEdit;
$("#titleEditSave").onclick=saveTitleEdit;
$("#titleEditInput").onkeydown=e=>{
  if(e.key==="Enter"){e.preventDefault();saveTitleEdit();}
  else if(e.key==="Escape")closeTitleEdit();
};
let deleteSessionTarget=null;
function openDeleteSession(s){
  deleteSessionTarget=s;$("#deleteSessionName").textContent=s.title||"这段对话";
  $("#deleteSessionMask").classList.add("on");$("#deleteSessionCard").classList.add("on");
  requestAnimationFrame(()=>$("#deleteSessionCancel").focus());
}
function closeDeleteSession(){
  deleteSessionTarget=null;$("#deleteSessionMask").classList.remove("on");$("#deleteSessionCard").classList.remove("on");
}
async function confirmDeleteSession(){
  if(!deleteSessionTarget)return;
  const target=deleteSessionTarget,btn=$("#deleteSessionConfirm");btn.disabled=true;
  try{
    const r=await api("/api/chat/sessions/"+target.id,{method:"DELETE"});
    const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"删除失败");
    const wasCurrent=target.id===sessionId;closeDeleteSession();
    if(wasCurrent)await switchToFirstActiveSession();await openHistory(false,historyArchived);toast("对话已删除");
  }catch(e){toast(e.message||"删除失败");}
  finally{btn.disabled=false;}
}
$("#deleteSessionCancel").onclick=closeDeleteSession;$("#deleteSessionMask").onclick=closeDeleteSession;
$("#deleteSessionConfirm").onclick=confirmDeleteSession;
$("#deleteSessionCard").onkeydown=e=>{if(e.key==="Escape")closeDeleteSession();};
async function switchToFirstActiveSession(){
  let list=[];try{list=await(await api("/api/chat/sessions")).json();}catch{}
  if(list.length){
    sessionId=list[0].id;$("#chatTitle").textContent=list[0].title||assistantName();await loadMessages();
  }else newChat();
}
async function setSessionArchived(s,archived){
  const r=await api("/api/chat/sessions/"+s.id,{method:"PUT",body:JSON.stringify({archived:archived?1:0})});
  const data=await r.json().catch(()=>({}));if(!r.ok){toast(data.error||"没有收好");return;}
  exportSelectedSessions.delete(s.id);
  if(archived&&s.id===sessionId)await switchToFirstActiveSession();
  await openHistory(false,historyArchived);
  toast(archived?"已经收进归档盒":"已经放回历史对话");
}
function openSessionMenu(s,x,y){
  closeSessMenu();
  const m=document.createElement("div");m.className="ctx-menu";sessMenu=m;sessMenuAt=Date.now();
  const mk=(label,svg,danger,fn)=>{const b=document.createElement("button");if(danger)b.className="danger";
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">'+svg+'</svg>'+label;
    b.onclick=ev=>{ev.stopPropagation();closeSessMenu();fn();};return b;};
  if(historyArchived){
    m.appendChild(mk("移出归档",'<path d="M4 8.5h16v11H4z"/><path d="M3 4.5h18v4H3z"/><path d="m9 14 3-3 3 3M12 11v6"/>',false,
      ()=>setSessionArchived(s,false)));
  }else{
    m.appendChild(mk(s.pinned?"取消置顶":"置顶聊天",'<path d="M12 17v5"/><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z"/>',false,
      async()=>{await api("/api/chat/sessions/"+s.id,{method:"PUT",body:JSON.stringify({pinned:s.pinned?0:1})});openHistory(false,false);}));
    m.appendChild(mk("收进归档",'<path d="M4 8.5h16v11H4z"/><path d="M3 4.5h18v4H3z"/><path d="M9.5 12.5h5"/>',false,
      ()=>setSessionArchived(s,true)));
  }
  m.appendChild(mk("修改标题",'<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',false,
    ()=>openTitleEdit(s)));
  m.appendChild(mk("删除对话",'<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',true,
    ()=>openDeleteSession(s)));
  document.body.appendChild(m);
  const mw=m.offsetWidth,mh=m.offsetHeight;
  m.style.left=Math.max(8,Math.min(x,window.innerWidth-mw-8))+"px";
  m.style.top=Math.max(8,Math.min(y,window.innerHeight-mh-8))+"px";
}
function hideHist(){histDrawer.classList.remove("on");histMask.classList.remove("on");histDrawer.classList.remove("selecting");
  histSelecting=false;historyArchived=false;$("#histSelectBar").hidden=true;$("#histSelectBtn").hidden=true;
  $("#histTitle").textContent="history";$("#histArchiveBtn").classList.remove("on");$("#histArchiveBtn").setAttribute("aria-pressed","false");}
function closeHist(){closeChatDrawerRoute("history",hideHist);}
$("#histClose").onclick=closeHist;histMask.onclick=closeHist;
$("#histArchiveBtn").onclick=()=>openHistory(false,!historyArchived);
$("#histSelectBtn").onclick=()=>{
  if(histSelecting){closeHist();openConversationExport(true,"multiple");}
};
$("#histSelectDone").onclick=()=>{if(!exportSelectedSessions.size){toast("还没有选择对话");return;}
  closeHist();openConversationExport(true,"multiple");};

/* ---------- 收藏 drawer ---------- */
const favDrawer=$("#favDrawer"),favMask=$("#favMask");
function hideFav(){favDrawer.classList.remove("on");favMask.classList.remove("on");}
function closeFav(){closeChatDrawerRoute("favorites",hideFav);}
$("#favClose").onclick=closeFav;favMask.onclick=closeFav;
async function openFav(){
  const body=$("#favBody");body.innerHTML='<div class="d-empty">加载中…</div>';
  favDrawer.classList.add("on");favMask.classList.add("on");
  pushChatDrawerRoute("favorites");
  let list=[];try{list=await(await api("/api/favorites")).json();}catch{}
  FAVORITES_BY_MESSAGE=new Map((Array.isArray(list)?list:[])
    .filter(f=>f&&f.message_id!=null).map(f=>[String(f.message_id),f]));
  body.innerHTML="";
  if(!list.length){body.innerHTML='<div class="d-empty">还没有收藏。在Morrow的回答 ⋮ 里「添加收藏」吧</div>';return;}
  list.forEach(f=>{
    const d=document.createElement("div");d.className="fav-line";
    d.innerHTML='<div class="ft"><span class="ftitle"></span><span class="fdate"></span></div><div class="fprev"></div>';
    d.querySelector(".ftitle").textContent=f.title||"对话";
    d.querySelector(".fdate").textContent=(f.created_at||"").slice(5,10).replace("-","/");
    d.querySelector(".fprev").textContent=(f.preview||"").replace(/\s+/g," ");
    d.onclick=()=>jumpToFav(f);
    // 长按删除收藏
    let lp,lpf;
    d.addEventListener("touchstart",()=>{lpf=false;lp=setTimeout(()=>{lpf=true;delFav(f);},480);},{passive:true});
    d.addEventListener("touchend",()=>clearTimeout(lp));
    d.addEventListener("touchmove",()=>clearTimeout(lp));
    d.addEventListener("contextmenu",e=>{e.preventDefault();delFav(f);});
    const oc=d.onclick;d.onclick=()=>{if(lpf){lpf=false;return;}oc();};
    body.appendChild(d);
  });
}
async function delFav(f){
  if(!await bubbleConfirm({
    title:"取消收藏",message:"要把这条内容移出收藏吗？",
    note:"原对话不会被删除。",confirmText:"取消收藏",danger:true
  }))return;
  await api("/api/favorites/"+f.id,{method:"DELETE"});
  FAVORITES_BY_MESSAGE.delete(String(f.message_id));
  const wrap=[...$("#log").children].find(c=>String(c._id)===String(f.message_id));
  if(wrap)wrap._favId=null;
  openFav();
}
async function jumpToFav(f){
  closeFav();
  if(f.session_id!==sessionId){
    sessionId=f.session_id;$("#chatTitle").textContent=f.title||assistantName();
    if(!document.body.classList.contains("in-chat"))navigateMain("chat");
    await loadMessages(f.message_id);
  }else{
    const el=[...$("#log").children].find(c=>c._id===f.message_id);
    if(el)jumpTo(el);
  }
}

/* ---------- 消息信息（首字时间 + 真实模型 id）：拼成 ⋮ 菜单底部的一段 ---------- */
function fmtFull(s){const m=/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(s||"");
  return m?m[1]+"年"+(+m[2])+"月"+(+m[3])+"日 "+m[4]:(s||"");}
function nowStamp(){const d=new Date(),p=n=>String(n).padStart(2,"0");
  return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+" "+p(d.getHours())+":"+p(d.getMinutes())+":"+p(d.getSeconds());}
function msgInfoHTML(wrap){
  const at=(wrap._ats||[])[wrap._vi]||"",model=(wrap._models||[])[wrap._vi]||"";
  if(!at&&!model)return "";
  return '<div class="sheet-info"><div>'+escHtml(fmtFull(at))+'</div><div class="m">'+escHtml(model||"—")+'</div></div>';
}

/* close transient popups when tapping elsewhere */
document.addEventListener("click",(e)=>{
  const plusWorkflow=e.target.closest?.("#stickerPopover,#stickerManager,#appDialogMask,#appDialogCard")||plusFilePickers.includes(e.target);
  if(plusPop&&!plusPop.hidden&&!plusWorkflow&&!plusPop.contains(e.target)&&e.target!==plusBtn&&!plusBtn.contains(e.target))togglePlus(false);
  if(!$("#stickerPopover").hidden&&Date.now()-stickerPopoverAt>300&&!$("#stickerPopover").contains(e.target))closeStickerPopover();
  if(menuPop&&!menuPop.contains(e.target)&&e.target!==$("#menuBtn")&&!$("#menuBtn").contains(e.target))closeMenu();
  // 300ms guard so the long-press release's synthetic click doesn't instantly close it
  if(sessMenu&&Date.now()-sessMenuAt>300&&!sessMenu.contains(e.target))closeSessMenu();
});

/* ---------- 记忆 ---------- */
let memoryMode=["light","we"].includes(localStorage.getItem("memoryMode"))?localStorage.getItem("memoryMode"):"light";
let OMBRE_LIBRARY={selected_server_id:0,servers:[],sync:null,cards:[],natural_recall:true,auto_sync:true},ombreDomain="all",ombreSort="active",ombreQuery="",ombreDetailCard=null;
function setMemoryDrawer(open){
  $("#memoryDrawer").classList.toggle("open",open);$("#memoryDrawerMask").classList.toggle("open",open);
  $("#memoryDrawer").setAttribute("aria-hidden",String(!open));$("#memoryMenuBtn").setAttribute("aria-expanded",String(open));
}
function setMemoryMode(mode,load=true){
  memoryMode=mode==="we"?"we":"light";saveLocalPreference("memoryMode",memoryMode);
  $("#memoryNookPanel").hidden=memoryMode!=="light";$("#memoryWePanel").hidden=memoryMode!=="we";$("#memoryOmbrePanel").hidden=true;
  $("#memoryModeTitle").textContent=memoryMode==="we"?"we":"inner";$("#memoryModeMark").textContent=memoryMode==="we"?"names we keep":"kept here";
  $$("#memoryNav button").forEach(button=>button.classList.toggle("on",button.dataset.memoryMode===memoryMode));
  setMemoryDrawer(false);if(load)loadMemory();
}
function renderOmbreServers(){
  const selected=OMBRE_LIBRARY.servers.find(item=>+item.id===+OMBRE_LIBRARY.selected_server_id),picker=$("#ombreServerPicker"),choices=$("#ombreServerChoices");
  picker.textContent=selected?(selected.name+(selected.enabled?"":" · 已停用")):"选择连接";choices.innerHTML="";
  if(!OMBRE_LIBRARY.servers.length){choices.innerHTML='<div class="caption">还没有 MCP 连接，请先去设置里添加。</div>';return;}
  OMBRE_LIBRARY.servers.forEach(server=>{
    const label=document.createElement("label");label.className="ombre-server-choice";
    label.innerHTML='<input type="radio" name="ombreServer"><span></span>';
    const input=label.querySelector("input");input.value=server.id;input.checked=+server.id===+OMBRE_LIBRARY.selected_server_id;
    label.querySelector("span").textContent=server.name+(server.enabled?"":"（已停用）");
    input.onchange=async()=>{const r=await api("/api/ombre-recall/server",{method:"PUT",body:JSON.stringify({server_id:+server.id})}),data=await r.json();if(!r.ok){toast(data.error||"没有保存好");return;}choices.hidden=true;await loadOmbreMemory();};
    choices.appendChild(label);
  });
}
function renderOmbreStatus(){
  const state=$("#ombreSyncState"),button=$("#ombreSyncBtn"),line=$("#ombreLibraryLine"),sync=OMBRE_LIBRARY.sync||{};
  state.classList.toggle("error",sync.status==="error");
  if(!OMBRE_LIBRARY.selected_server_id){state.textContent="还没有选择 Ombre 连接";line.textContent="Ombre · 还没有连接";}
  else if(sync.status==="syncing"){state.textContent="正在从 Ombre 收拢记忆卡…";line.textContent="Ombre · 正在同步";}
  else if(sync.status==="error"){state.textContent="上次没接稳："+(sync.error||"同步失败");line.textContent="Ombre · 上次没接稳";}
  else if(sync.status==="stale"){state.textContent="连接已更改，需要重新同步";line.textContent="Ombre · 等待同步";}
  else if(sync.last_synced_at){state.textContent=Number(sync.card_count||0).toLocaleString()+" 张 · "+sync.last_synced_at;line.textContent=Number(sync.card_count||0).toLocaleString()+" memories · "+String(sync.last_synced_at).slice(5,16);}
  else{state.textContent="还没有同步过";line.textContent="Ombre · 还没有同步";}
  button.disabled=!OMBRE_LIBRARY.selected_server_id||sync.status==="syncing";button.textContent=sync.status==="syncing"?"同步中…":"同步记忆卡";
  $("#ombreNaturalRecall").checked=OMBRE_LIBRARY.natural_recall!==false;
  $("#ombreAutoSync").checked=OMBRE_LIBRARY.auto_sync!==false;
}
function parseOmbreRecall(card){
  const raw=String(card.recall_text||"").trim(),matches=[...raw.matchAll(/\*\*\s*(title|date|summary)\s*:\s*\*\*/gi)],fields={};
  matches.forEach((match,index)=>{const key=match[1].toLowerCase(),start=match.index+match[0].length,end=index+1<matches.length?matches[index+1].index:raw.length;fields[key]=raw.slice(start,end).trim();});
  const clean=value=>String(value||"").replace(/\*\*/g,"").trim();
  const validDate=clean(fields.date).match(/(?:20\d{2})[.\/-]\d{1,2}[.\/-]\d{1,2}(?:\s*(?:上午|下午|早上|晚上|凌晨))?/);
  let original=raw.replace(/\*\*\s*(title|date|summary)\s*:\s*\*\*/gi," ");
  const knownTitle=clean(card.title||fields.title);if(knownTitle&&original.trim().startsWith(knownTitle))original=original.trim().slice(knownTitle.length);
  if(validDate)original=original.replace(validDate[0]," ");
  return {title:knownTitle||"没有名字的记忆",date:validDate?validDate[0]:"",text:clean(fields.summary||original)||"这张卡没有留下正文"};
}
function formatOmbreDate(value,fallback=""){
  const raw=String(value||"").trim(),match=raw.match(/(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})/);
  if(match)return String(+match[2]).padStart(2,"0")+" · "+String(+match[3]).padStart(2,"0");
  if(raw)return raw.slice(0,14);
  const parsed=Date.parse(fallback||"");if(!parsed)return "";const date=new Date(parsed);return String(date.getMonth()+1).padStart(2,"0")+" · "+String(date.getDate()).padStart(2,"0");
}
function formatOmbreFactTime(value){const parsed=Date.parse(value||"");if(!parsed)return "没有留下";return new Date(parsed).toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false});}
function updateOmbreFilterFade(){const wrap=$("#ombreFilterFade"),scroller=$("#ombreTypeFilters");wrap.classList.toggle("at-start",scroller.scrollLeft<3);wrap.classList.toggle("at-end",scroller.scrollLeft+scroller.clientWidth>=scroller.scrollWidth-3);}
function closeOmbreSheets(){ombreDetailCard=null;$("#ombreDetailSheet").classList.remove("open");$("#ombreSettingsSheet").classList.remove("open");$("#ombreRecentSheet").classList.remove("open");$("#ombreSheetMask").classList.remove("open");}
function openOmbreSheet(id){closeOmbreSheets();$("#ombreSheetMask").classList.add("open");requestAnimationFrame(()=>$(id).classList.add("open"));}
async function openOmbreRecent(){
  const list=$("#ombreRecentList");list.innerHTML='<div class="ombre-library-empty">正在翻一翻最近的痕迹…</div>';openOmbreSheet("#ombreRecentSheet");
  try{
    const r=await api("/api/ombre-recall/recent"),data=await r.json();if(!r.ok)throw new Error(data.error||"读取失败");list.innerHTML="";
    if(!data.length){list.innerHTML='<div class="ombre-library-empty">还没有记忆自然浮上来。</div>';return;}
    data.forEach(event=>{
      const row=document.createElement("div");row.className="ombre-recent-event";
      const head=document.createElement("div");head.className="ombre-recent-event-head";
      const title=document.createElement("div");title.className="ombre-recent-event-title";title.textContent=event.title||"没有名字的记忆";
      const time=document.createElement("time");time.className="ombre-recent-event-time";time.textContent=formatOmbreFactTime(event.created_at).replace(/^\d{4}\//,"");head.append(title,time);
      const why=document.createElement("div");why.className="ombre-recent-event-why";const terms=Array.isArray(event.matched_terms)?event.matched_terms:[];why.textContent=terms.length?terms.join(" / "):"在对话里悄悄浮现";
      const method=document.createElement("span");method.className="ombre-recent-event-method";method.textContent=event.match_method==="semantic"?"semantic recall":event.match_method==="keyword-strong"?"direct recall":"soft recall";why.appendChild(method);
      row.append(head,why);list.appendChild(row);
    });
  }catch(error){list.innerHTML='<div class="ombre-library-empty">暂时没能打开这些痕迹。</div>';toast(error.message||"读取失败");}
}
async function restoreOmbreCard(card){
  if(!await bubbleConfirm({title:"让这段记忆重新浮上来？",message:card.title||"这张归档记忆",note:"它会回到 Ombre 的日常记忆中，也能参与以后自然浮现。",cancelText:"先留在深处",confirmText:"重新浮上来"}))return;
  try{const r=await api("/api/ombre-recall/restore",{method:"POST",body:JSON.stringify({bucket_id:card.bucket_id})}),data=await r.json();if(!r.ok)throw new Error(data.error||"没有恢复成功");closeOmbreSheets();toast("这段记忆重新浮上来了");await loadOmbreMemory();}catch(error){toast(error.message||"没有恢复成功");}
}
function openOmbreDetail(card){
  const parsed=parseOmbreRecall({...card,recall_text:card.full_text||card.recall_text}),domains=card.domains||[],tags=[...new Set(card.tags||[])];
  $("#ombreDetailDomain").textContent=(domains.join(" · ")||card.memory_type||"memory");$("#ombreDetailTitle").textContent=parsed.title;$("#ombreDetailText").textContent=parsed.text;
  const facts=$("#ombreDetailFacts");facts.innerHTML="";[["记忆日期",parsed.date||"没有留下"],["创建于",formatOmbreFactTime(card.source_created_at)],["最近激活",formatOmbreFactTime(card.last_active_at)],["重要程度",Number(card.importance||5)+" / 10"]].forEach(([label,value])=>{const a=document.createElement("span"),b=document.createElement("span");a.textContent=label;b.textContent=value;facts.append(a,b);});
  const tagBox=$("#ombreDetailTags");tagBox.innerHTML="";tags.forEach(value=>{const tag=document.createElement("span");tag.textContent=value;tagBox.appendChild(tag);});
  const actions=$("#ombreDetailActions");actions.innerHTML="";if(card.memory_type==="archived"){const button=document.createElement("button");button.type="button";button.className="ombre-restore-btn";button.textContent="let it surface";button.onclick=()=>restoreOmbreCard(card);actions.appendChild(button);}
  openOmbreSheet("#ombreDetailSheet");ombreDetailCard=card;
}
function renderOmbreCards(){
  const filters=$("#ombreTypeFilters"),container=$("#ombreCards"),cards=OMBRE_LIBRARY.cards||[];
  const active=cards.filter(card=>card.memory_type!=="archived"),archived=cards.filter(card=>card.memory_type==="archived");
  const domainCounts=new Map();active.forEach(card=>(card.domains||[]).forEach(domain=>domainCounts.set(domain,(domainCounts.get(domain)||0)+1)));
  const domains=[...domainCounts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  if(ombreDomain!=="all"&&ombreDomain!=="archived"&&!domainCounts.has(ombreDomain))ombreDomain="all";
  filters.innerHTML="";[["all","全部 · "+active.length],...domains.map(([domain,count])=>[domain,domain+" · "+count]),["archived","归档 · "+archived.length]].forEach(([value,label])=>{
    const button=document.createElement("button");button.type="button";button.textContent=label;button.classList.toggle("on",value===ombreDomain);
    button.onclick=()=>{ombreDomain=value;renderOmbreCards();};filters.appendChild(button);
  });
  requestAnimationFrame(updateOmbreFilterFade);
  container.innerHTML="";
  if(!OMBRE_LIBRARY.selected_server_id){container.innerHTML='<div class="ombre-library-empty">先选择保存 Ombre 的 MCP 连接。</div>';return;}
  if(!cards.length){container.innerHTML='<div class="ombre-library-empty">这里还是空的。<br>点一下“同步记忆卡”，把 Ombre 里的卡片带回来。</div>';return;}
  const source=ombreDomain==="archived"?archived:ombreDomain==="all"?active:active.filter(card=>(card.domains||[]).includes(ombreDomain));
  const needle=ombreQuery.trim().toLocaleLowerCase(),visible=source.filter(card=>!needle||[card.title,card.recall_text,...(card.domains||[]),...(card.tags||[])].join(" ").toLocaleLowerCase().includes(needle)).slice();
  const timeValue=(card,key)=>Date.parse(card[key]||"")||0;
  visible.sort((a,b)=>ombreSort==="importance"?(Number(b.importance||0)-Number(a.importance||0)||timeValue(b,"last_active_at")-timeValue(a,"last_active_at")):ombreSort==="created"?(timeValue(b,"source_created_at")-timeValue(a,"source_created_at")):timeValue(b,"last_active_at")-timeValue(a,"last_active_at"));
  $("#ombreCardCount").textContent=visible.length.toLocaleString()+" 张";
  const sortLabels={active:"最近活跃 ↓",importance:"重要程度 ↓",created:"最新记录 ↓"};$("#ombreSortBtn").textContent=sortLabels[ombreSort];
  if(!visible.length){container.innerHTML='<div class="ombre-library-empty">这个分类里还没有记忆。</div>';return;}
  visible.forEach(card=>{
      const article=document.createElement("article");article.className="ombre-card";article.classList.toggle("muted",!card.surface_allowed);
      article.onclick=()=>openOmbreDetail(card);const parsed=parseOmbreRecall(card),domains=card.domains||[];
      const kicker=document.createElement("div");kicker.className="ombre-card-kicker";const domain=document.createElement("span"),date=document.createElement("span");domain.textContent=domains[0]||card.memory_type||"memory";date.className="ombre-card-date";date.textContent=formatOmbreDate(parsed.date,card.source_created_at);kicker.append(domain,date);article.appendChild(kicker);
      const title=document.createElement("div");title.className="ombre-card-title";title.textContent=parsed.title;article.appendChild(title);
      const text=document.createElement("div");text.className="ombre-card-text";text.textContent=parsed.text;article.appendChild(text);
      const meta=document.createElement("div");meta.className="ombre-card-meta";
      const weight=document.createElement("div");weight.className="ombre-importance";weight.title="重要程度 "+Number(card.importance||5)+" / 10";for(let i=1;i<=10;i++){const dot=document.createElement("i");dot.classList.toggle("on",i<=Number(card.importance||5));weight.appendChild(dot);}meta.appendChild(weight);
      const tagPreview=document.createElement("div");tagPreview.className="ombre-tag-preview";const tags=[...new Set(card.tags||[])],shown=tags.slice(0,3);shown.forEach(value=>{const chip=document.createElement("span");chip.textContent=value;tagPreview.appendChild(chip);});if(tags.length>shown.length){const more=document.createElement("span");more.textContent="+"+(tags.length-shown.length);tagPreview.appendChild(more);}meta.appendChild(tagPreview);
      article.appendChild(meta);container.appendChild(article);
  });
}
async function loadOmbreMemory(check=true){
  try{if(check)await api("/api/ombre-recall/auto-check",{method:"POST"});const r=await api("/api/ombre-recall"),data=await r.json();if(!r.ok)throw new Error(data.error||"读取失败");OMBRE_LIBRARY=data;renderOmbreServers();renderOmbreStatus();renderOmbreCards();}
  catch(error){$("#ombreCards").innerHTML='<div class="ombre-library-empty">暂时没能打开 Ombre 卡片。</div>';toast(error.message||"读取失败");}
}
$("#memoryMenuBtn").onclick=()=>setMemoryDrawer(!$("#memoryDrawer").classList.contains("open"));
$("#memoryDrawerMask").onclick=()=>setMemoryDrawer(false);
$$("#memoryNav button").forEach(button=>button.onclick=()=>setMemoryMode(button.dataset.memoryMode));
$("#ombreServerPicker").onclick=()=>{$("#ombreServerChoices").hidden=!$("#ombreServerChoices").hidden;};
$("#ombreSettingsBtn").onclick=()=>openOmbreSheet("#ombreSettingsSheet");
$("#ombreRecentBtn").onclick=openOmbreRecent;
$("#ombreNaturalRecall").onchange=async event=>{
  const enabled=event.target.checked;event.target.disabled=true;
  try{const r=await api("/api/ombre-recall/natural",{method:"PUT",body:JSON.stringify({enabled})}),data=await r.json();if(!r.ok)throw new Error(data.error||"没有保存好");OMBRE_LIBRARY.natural_recall=enabled;toast(enabled?"自然浮现已打开":"自然浮现已安静关闭");}
  catch(error){event.target.checked=!enabled;toast(error.message||"没有保存好");}
  finally{event.target.disabled=false;}
};
$("#ombreAutoSync").onchange=async event=>{
  const enabled=event.target.checked;event.target.disabled=true;
  try{const r=await api("/api/ombre-recall/auto-sync",{method:"PUT",body:JSON.stringify({enabled})}),data=await r.json();if(!r.ok)throw new Error(data.error||"没有保存好");OMBRE_LIBRARY.auto_sync=enabled;toast(enabled?"自动同步已打开":"自动同步已关闭");}
  catch(error){event.target.checked=!enabled;toast(error.message||"没有保存好");}
  finally{event.target.disabled=false;}
};
$("#ombreSheetMask").onclick=closeOmbreSheets;
$("#ombreTypeFilters").addEventListener("scroll",updateOmbreFilterFade,{passive:true});
$("#ombreSearchInput").oninput=event=>{ombreQuery=event.target.value;renderOmbreCards();};
$("#ombreSortBtn").onclick=()=>{ombreSort=ombreSort==="active"?"importance":ombreSort==="importance"?"created":"active";renderOmbreCards();};
$("#ombreSyncBtn").onclick=async()=>{
  const serverId=OMBRE_LIBRARY.selected_server_id;if(!serverId)return;OMBRE_LIBRARY.sync={...(OMBRE_LIBRARY.sync||{}),status:"syncing",error:""};renderOmbreStatus();
  try{const r=await api("/api/mcp-servers/"+serverId+"/recall-sync",{method:"POST"}),data=await r.json();if(!r.ok)throw new Error(data.error||"同步失败");toast("收好了 "+Number(data.card_count||0).toLocaleString()+" 张记忆卡");await loadOmbreMemory();}
  catch(error){OMBRE_LIBRARY.sync={...(OMBRE_LIBRARY.sync||{}),status:"error",error:error.message||"同步失败"};renderOmbreStatus();toast(error.message||"同步失败");}
};
let memKind="fixed";
let memEditing=null,memEditTags=[];
async function loadMemory(){
  setMemoryMode(memoryMode,false);
  if(memoryMode==="we")return;
  const [p,recent,entries]=await Promise.all([
    api("/api/memory/persona").then(r=>r.json()),
    api("/api/memory/recent").then(r=>r.json()),
    api("/api/memory/entries?kind="+memKind).then(r=>r.json())
  ]);
  $("#personaBox").value=p.content||"";
  renderRecentMemories(recent);
  entries.sort((a,b)=>(a.id||0)-(b.id||0));
  const list=$("#entriesList");list.innerHTML="";
  $$("#memTabs button").forEach(b=>b.classList.toggle("on",b.dataset.kind===memKind));
  syncSlidingPill("#memTabs");
  if(!entries.length)list.innerHTML='<div class="caption" style="padding:8px 2px">'+(memKind==="dynamic"?"还没有动态记忆。":"还没有固定记忆。")+'</div>';
  entries.forEach(e=>list.appendChild(renderEntry(e)));
}
function renderRecentMemories(entries){
  const list=$("#memRecentList");list.innerHTML="";
  if(!entries.length){list.innerHTML='<div class="mem-recent-empty">还没有哪一页刚刚浮上来。</div>';return;}
  entries.slice(0,2).forEach(e=>{
    const card=document.createElement("button");card.type="button";card.className="mem-recent-card";
    const content=document.createElement("div");content.className="mem-recent-text";content.textContent=e.content;
    card.appendChild(content);
    if(e.tags&&e.tags.length){
      const tags=document.createElement("div");tags.className="tag-row";
      e.tags.forEach(t=>{const chip=document.createElement("span");chip.className="tag-chip";chip.textContent=t;tags.appendChild(chip);});
      card.appendChild(tags);
    }
    const paw=document.createElementNS("http://www.w3.org/2000/svg","svg");
    paw.setAttribute("class","mem-recent-paw");paw.setAttribute("viewBox","0 0 40 34");paw.setAttribute("aria-hidden","true");
    paw.innerHTML='<ellipse cx="9" cy="9" rx="4" ry="5.5" transform="rotate(-25 9 9)" fill="currentColor"/><ellipse cx="17" cy="5.5" rx="4" ry="5.4" transform="rotate(-7 17 5.5)" fill="currentColor"/><ellipse cx="25" cy="6.5" rx="4" ry="5.4" transform="rotate(10 25 6.5)" fill="currentColor"/><ellipse cx="32" cy="11" rx="3.8" ry="5.2" transform="rotate(27 32 11)" fill="currentColor"/><path d="M8.5 24.5c0-5.9 4.9-10.6 11.4-10.6 6.6 0 11.7 4.8 11.7 10.7 0 4.4-3.1 7.1-7 7.1-2.1 0-3.3-.9-4.7-.9-1.5 0-2.8.9-4.9.9-3.8 0-6.5-2.7-6.5-7.2Z" fill="currentColor"/>';
    card.appendChild(paw);
    card.onclick=()=>openRecentMemory(e);list.appendChild(card);
  });
}
function openRecentMemory(e){
  $("#memRecentDetailText").textContent=e.content||"";
  const tags=$("#memRecentDetailTags");tags.innerHTML="";
  (e.tags||[]).forEach(t=>{const chip=document.createElement("span");chip.className="tag-chip";chip.textContent=t;tags.appendChild(chip);});
  $("#memRecentMask").classList.add("on");$("#memRecentDetail").classList.add("on");
}
function closeRecentMemory(){
  $("#memRecentMask").classList.remove("on");$("#memRecentDetail").classList.remove("on");
}
function splitMemoryDisplay(raw){
  const text=(raw||"").trim();
  const colon=text.match(/^([^：:\n]{1,16})[：:]\s*([\s\S]+)$/);
  if(colon)return{title:colon[1].trim(),body:colon[2].trim()};
  const match=text.match(/^(\S{1,16})[\s\n]+([\s\S]+)$/);
  return match?{title:match[1],body:match[2]}:{title:"",body:text};
}
function renderEntry(e){
  const row=document.createElement("div");row.className="entry";
  const dynamic=e.kind==="dynamic";
  if(dynamic)row.classList.add("dynamic");
  const main=document.createElement("div");main.className="mem-main";
  const display=splitMemoryDisplay(e.content);
  if(!dynamic&&display.title){const title=document.createElement("div");title.className="mem-entry-title";title.textContent="✦"+display.title;main.appendChild(title);}
  const content=document.createElement("div");content.className="content";content.textContent=(!dynamic&&display.title)?display.body:e.content;
  main.appendChild(content);
  if(dynamic&&e.tags&&e.tags.length){
    const tags=document.createElement("div");tags.className="tag-row";
    e.tags.forEach(t=>{const chip=document.createElement("span");chip.className="tag-chip";chip.textContent=t;tags.appendChild(chip);});
    main.appendChild(tags);
  }
  const acts=document.createElement("div");acts.className="mem-actions";
  const ed=document.createElement("button");ed.className="mem-icon";ed.title="修改";ed.setAttribute("aria-label","修改");
  ed.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>';
  ed.onclick=ev=>{ev.stopPropagation();row.classList.remove("actions-open");openMemEdit(e);};
  const dl=document.createElement("button");dl.className="mem-icon danger";dl.title="删除";dl.setAttribute("aria-label","删除");
  dl.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  dl.onclick=async ev=>{ev.stopPropagation();row.classList.remove("actions-open");
    if(!await bubbleConfirm({
      title:"删除记忆",message:"要删掉 "+(dynamic?"ต":"ෆ")+e.id+" 这条记忆吗？",
      note:"删除后Morrow不会再从记忆页读到它。",confirmText:"删除",danger:true
    }))return;
    await api("/api/memory/entries/"+e.id,{method:"DELETE"});loadMemory();
  };
  acts.append(ed,dl);row.append(main,acts);
  let holdTimer=null,held=false;
  const openActions=()=>{held=true;document.querySelectorAll(".entry.actions-open").forEach(el=>el.classList.remove("actions-open"));row.classList.add("actions-open");};
  row.addEventListener("pointerdown",ev=>{if(ev.target.closest("button"))return;held=false;holdTimer=setTimeout(openActions,520);});
  ["pointerup","pointercancel","pointerleave"].forEach(type=>row.addEventListener(type,()=>{clearTimeout(holdTimer);holdTimer=null;}));
  row.addEventListener("contextmenu",ev=>{ev.preventDefault();clearTimeout(holdTimer);openActions();});
  row.addEventListener("click",ev=>{if(held){ev.preventDefault();ev.stopPropagation();held=false;}});
  return row;
}
function renderMemEditTags(){
  const box=$("#memTagEditor"),inp=$("#memTagInput");
  [...box.querySelectorAll(".mem-tag-chip")].forEach(el=>el.remove());
  memEditTags.forEach((tag,i)=>{
    const chip=document.createElement("span");chip.className="mem-tag-chip";
    const label=document.createElement("span");label.textContent=tag;
    const rm=document.createElement("button");rm.type="button";rm.textContent="×";rm.title="删除标签";
    rm.onclick=()=>{memEditTags.splice(i,1);renderMemEditTags();inp.focus();};
    chip.append(label,rm);box.insertBefore(chip,inp);
  });
}
function addMemEditTag(raw){
  const tag=(raw||"").trim();
  if(!tag)return;
  if(!memEditTags.includes(tag))memEditTags.push(tag);
  $("#memTagInput").value="";
  renderMemEditTags();
}
function openMemEdit(e){
  memEditing=e;
  const kind=e.kind||memKind;
  const dynamic=kind==="dynamic";
  memEditTags=[...(e.tags||[])];
  $("#memEditId").textContent=e.id?(dynamic?"ต":"ෆ")+e.id:"New";
  $("#memEditKind").textContent=e.id?(dynamic?"Living memory":"Pinned memory"):"New memory";
  $("#memEditText").value=e.content||"";
  $("#memEditTagsBox").hidden=!dynamic;
  renderMemEditTags();
  $("#memEditMask").classList.add("on");
  $("#memEditDialog").classList.add("on");
  setTimeout(()=>$("#memEditText").focus(),120);
}
function closeMemEdit(){
  memEditing=null;memEditTags=[];
  $("#memEditMask").classList.remove("on");
  $("#memEditDialog").classList.remove("on");
}
async function saveMemEdit(){
  if(!memEditing)return;
  const content=$("#memEditText").value.trim();
  if(!content){toast("记忆内容不能为空");return;}
  const kind=memEditing.kind||memKind;
  const dynamic=kind==="dynamic";
  const body={content,kind};
  if(dynamic)body.tags=memEditTags;
  if(memEditing.id){
    await api("/api/memory/entries/"+memEditing.id,{method:"PUT",body:JSON.stringify(body)});
  }else{
    await api("/api/memory/entries",{method:"POST",body:JSON.stringify(body)});
  }
  closeMemEdit();loadMemory();
}
$("#memEditCancel").onclick=closeMemEdit;
$("#memEditMask").onclick=closeMemEdit;
$("#memEditSave").onclick=saveMemEdit;
$("#memRecentMask").onclick=closeRecentMemory;
$("#memRecentClose").onclick=closeRecentMemory;
$("#memPersonaToggle").onclick=()=>{
  const shell=$("#memPersona"),panel=$("#memPersonaPanel"),open=panel.hidden;
  panel.hidden=!open;shell.classList.toggle("open",open);$("#memPersonaToggle").setAttribute("aria-expanded",String(open));
  if(open)setTimeout(()=>$("#personaBox").focus(),120);
};
$("#memTagEditor").onclick=()=>$("#memTagInput").focus();
$("#memTagInput").addEventListener("keydown",e=>{
  if(e.key==="Enter"){
    e.preventDefault();addMemEditTag(e.target.value);
  }else if(e.key==="Backspace"&&!e.target.value&&memEditTags.length){
    memEditTags.pop();renderMemEditTags();
  }
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&$("#memEditDialog").classList.contains("on"))closeMemEdit();
  if(e.key==="Escape"&&$("#assistPromptCard").classList.contains("on"))closeAssistPrompt();
  if(e.key==="Escape"&&$("#autoCompressCard").classList.contains("open"))closeAutoCompressDialog();
  if(e.key==="Escape"&&$("#studyPromptDialog").classList.contains("on"))closeStudyModal("Prompt");
  if(e.key==="Escape"&&$("#studyHandbookDialog").classList.contains("on"))closeStudyModal("Handbook");
});
$("#savePersona").onclick=async()=>{await api("/api/memory/persona",{method:"PUT",body:JSON.stringify({content:$("#personaBox").value})});
  const h=$("#personaSaved");h.classList.add("show");setTimeout(()=>{h.classList.remove("show");$("#memPersonaPanel").hidden=true;
    $("#memPersona").classList.remove("open");$("#memPersonaToggle").setAttribute("aria-expanded","false");},650);};
$("#memAddBtn").onclick=()=>openMemEdit({id:null,content:"",kind:memKind,tags:[]});
$$("#memTabs button").forEach(b=>b.onclick=()=>{memKind=b.dataset.kind;loadMemory();});
document.addEventListener("pointerdown",e=>{if(!e.target.closest(".entry"))document.querySelectorAll(".entry.actions-open").forEach(el=>el.classList.remove("actions-open"));});

/* ---------- 整理 / tidy（摘要、足迹、工具账本与抽屉）---------- */
let tidyMode=["summary","footprint","tool","voice","alarm","keepsake","together"].includes(localStorage.getItem("tidyMode"))?
  localStorage.getItem("tidyMode"):"tool";
function setTidyDrawer(open){
  $("#tidyDrawer").classList.toggle("open",open);
  $("#tidyDrawerMask").classList.toggle("open",open);
  $("#tidyDrawer").setAttribute("aria-hidden",String(!open));
  $("#tidyMenuBtn").setAttribute("aria-expanded",String(open));
  $("#tidyMenuBtn").setAttribute("aria-label",open?"关闭整理侧栏":"打开整理侧栏");
}
function tidySmoothPanel(panel,open,duration=300){
  if(!panel)return;
  const wasHidden=panel.hidden;
  const currentHeight=wasHidden?0:panel.getBoundingClientRect().height;
  const currentOpacity=wasHidden?0:Number.parseFloat(getComputedStyle(panel).opacity)||1;
  panel.getAnimations().forEach(animation=>animation.cancel());
  panel.classList.add("tidy-smooth-panel");
  if(reducedMotion||typeof panel.animate!=="function"){
    panel.hidden=!open;panel.style.removeProperty("height");panel.style.removeProperty("opacity");panel.style.removeProperty("overflow");
    panel.classList.remove("tidy-smooth-panel");return;
  }
  panel.style.height=currentHeight+"px";panel.style.opacity=String(currentOpacity);panel.style.overflow="hidden";
  if(open)panel.hidden=false;
  const start=currentHeight;
  const end=open?panel.scrollHeight:0;
  const animation=panel.animate([
    {height:start+"px",opacity:currentOpacity},
    {height:end+"px",opacity:open?1:0}
  ],{duration,easing:"cubic-bezier(.22,.72,.3,1)",fill:"both"});
  animation.finished.then(()=>{
    if(!open)panel.hidden=true;
    panel.style.height=end+"px";panel.style.opacity=open?"1":"0";animation.cancel();
    panel.style.removeProperty("height");panel.style.removeProperty("opacity");panel.style.removeProperty("overflow");
    panel.classList.remove("tidy-smooth-panel");
  }).catch(()=>{});
}
function tidySmoothDetails(details,open,duration=320){
  if(!details)return;
  const summary=details.querySelector(":scope > summary");if(!summary)return;
  const currentHeight=details.getBoundingClientRect().height||summary.getBoundingClientRect().height;
  details.getAnimations().forEach(animation=>animation.cancel());
  details.dataset.tidyOpen=String(open);
  if(reducedMotion||typeof details.animate!=="function"){details.open=open;return;}
  const collapsed=summary.getBoundingClientRect().height;
  const start=Math.max(collapsed,currentHeight);
  details.style.height=start+"px";details.style.overflow="hidden";
  if(open)details.open=true;
  const end=open?details.scrollHeight:collapsed;
  const animation=details.animate([
    {height:start+"px"},
    {height:end+"px"}
  ],{duration,easing:"cubic-bezier(.22,.72,.3,1)",fill:"both"});
  animation.finished.then(()=>{
    if(!open)details.open=false;
    details.style.height=end+"px";animation.cancel();
    details.style.removeProperty("height");details.style.removeProperty("overflow");
  }).catch(()=>{});
}
async function loadNight(mode=tidyMode){
  window.sakieVoiceArchive?.dispose();
  tidyMode=["summary","footprint","tool","voice","alarm","keepsake","together","presence"].includes(mode)?mode:"tool";
  if(tidyMode!=="keepsake")resetKeepsakeSearch();
  saveLocalPreference("tidyMode",tidyMode);
  const titles={summary:"abstract",footprint:"footprint",tool:"tool",voice:"voice",alarm:"alarm",keepsake:"keepsake",together:"together",presence:"presence"};
  $("#tidyModeTitle").textContent=titles[tidyMode];
  $("#tidyArtifactPanel").classList.toggle("voice-archive-mode",tidyMode==="voice");
  $("#tidyModeMark").hidden=tidyMode==="voice";
  const drawerMode=tidyMode==="voice"||tidyMode==="alarm"||tidyMode==="keepsake",artifactMode=drawerMode||tidyMode==="together";
  $("#tidyModeMark").textContent=tidyMode==="footprint"?"private room":drawerMode?"private drawer":"archive cabinet";
  $$("#tidyNav button").forEach(b=>{
    const active=b.dataset.mode===tidyMode;
    b.classList.toggle("on",active);
    if(active)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
  });
  const archiveMode=tidyMode==="tool"||tidyMode==="summary"||tidyMode==="together";
  $("#tidyCabinetToggle").classList.toggle("on",archiveMode);
  $("#tidyCabinetToggle").setAttribute("aria-expanded",String(archiveMode));
  $("#tidyCabinetChildren").hidden=!archiveMode;
  $("#tidyDrawerToggle").classList.toggle("on",drawerMode);
  $("#tidyDrawerToggle").setAttribute("aria-expanded",String(drawerMode));
  $("#tidyDrawerChildren").hidden=!drawerMode;
  $("#tidyToolPanel").hidden=tidyMode!=="tool";
  $("#tidySummaryPanel").hidden=tidyMode!=="summary";
  $("#tidyArtifactPanel").hidden=!artifactMode;
  $("#tidyFootprintPanel").hidden=tidyMode!=="footprint";
  $("#tidyPresencePanel").hidden=tidyMode!=="presence";
  $("#view-night").classList.toggle("footprint-mode",tidyMode==="footprint");
  syncSystemBars(document.documentElement.getAttribute("data-theme")||"paper");
  $("#studyAddBtn").hidden=tidyMode!=="footprint";
  setTidyDrawer(false);
  if(tidyMode!=="footprint"&&studyPollTimer){clearTimeout(studyPollTimer);studyPollTimer=null;}
  if(tidyMode==="summary")return loadSummaryLogs();
  if(tidyMode==="presence")return loadPresence();
  if(tidyMode==="footprint")return loadStudyData();
  if(tidyMode==="alarm")return loadAlarmDrawer();
  if(tidyMode==="together")return loadMusicListeningArchive();
  if(drawerMode){DRAWER_KIND=tidyMode;return loadArtifactDrawer();}
  return window.sakieTidyTools.load();
}


/* ---------- 此刻（积温状态，只读展示） ---------- */
let PRESENCE_STATE=null, PRESENCE_BEFORE=null, PRESENCE_LOADING=false;
const PRESENCE_AXES=[["connection","想念 / 占有欲",0,1],["pride","克制 / 真火气",-1,1],["valence","心情底色",-1,1],["arousal","进攻性 / 掌控欲",-1,1],["immersion","专注度",0,1],["lust","性欲 / 躁动",0,1]];

function presencePercent(value,min,max){
  const ratio=(Number(value||0)-min)/(max-min);
  return Math.max(0,Math.min(100,ratio*100));
}
function renderPresence(){
  const box=$("#tidyPresencePanel");if(!box)return;
  const data=PRESENCE_STATE||{};
  $("#presenceToggle").checked=!!data.enabled;
  $("#presenceSummary").textContent=data.summary||"还没开始记。";
  $("#presenceMeta").textContent=data.last_tick_at?("上次推进 "+String(data.last_tick_at).slice(5,16)+" · 每 "+(data.interval_minutes||5)+" 分钟"):"还没推进过";
  $("#presenceStamp").textContent=data.last_error?("上次出错："+data.last_error):(data.enabled?"计算中":"已暂停");
  const axes=(data.axes&&data.axes.length)?data.axes.map(a=>[a.key,a.label,a.min,a.max]):PRESENCE_AXES;
  axes.forEach(([key,label,min,max])=>{
    const row=box.querySelector('.presence-axis[data-axis="'+key+'"]');
    if(!row){
      const created=document.createElement("div");
      created.className="presence-axis";created.dataset.axis=key;
      created.innerHTML='<span class="n"></span><div class="bar"><i></i></div><b>0.00</b>';
      box.querySelector("#presenceDetail").insertBefore(created,box.querySelector("#presenceStamp"));
    }
    const target=box.querySelector('.presence-axis[data-axis="'+key+'"]');
    target.querySelector(".n").textContent=label;
    const value=Number((data.state||{})[key]||0);
    target.querySelector(".bar i").style.width=presencePercent(value,min,max)+"%";
    target.querySelector("b").textContent=value.toFixed(2);
  });
}
function presenceEventText(item){
  if(item.kind==="trigger"){
    const map={contact:"想开口",find_activity:"想找点事做",observation:"察觉到她安静了"};
    const reason=String(item.reason||"")
      .replace(/connection\s*进了观察区/,"想念攒到线上了")
      .replace(/过了\s*pride\s*闸门/,"克制没拦住")
      .replace(/pride\s*拦住了/,"克制把他按住了")
      .replace(/valence\s*太低/,"心里不痛快");
    return (map[item.action]||"想动一下")+(reason?(" · "+reason):"");
  }
  if(item.kind==="state"){
    const changes=item.detail&&item.detail.changes?Object.keys(item.detail.changes):[];
    const parts=changes.map(axis=>{
      const pair=item.detail.changes[axis];
      const label=(PRESENCE_AXES.find(a=>a[0]===axis)||[axis,axis])[1];
      return label+" "+pair[0]+" → "+pair[1];
    });
    return parts.length?parts.join("；"):"状态有变化";
  }
  return item.reason||item.kind;
}
function renderPresenceEvents(items,append){
  const list=$("#presenceEventList");if(!list)return;
  if(!append)list.innerHTML="";
  if(!items.length&&!append){
    list.innerHTML='<div class="presence-empty">还没有记录。状态稳定时不会刷屏。</div>';
  }
  items.forEach(item=>{
    const card=document.createElement("div");card.className="presence-event";
    const time=String(item.at||"").slice(5,16);
    card.innerHTML='<div class="t">'+time+'</div><div class="r"></div>';
    card.querySelector(".r").textContent=presenceEventText(item);
    list.appendChild(card);
  });
}
async function loadPresenceEvents(reset){
  if(PRESENCE_LOADING)return;
  PRESENCE_LOADING=true;
  try{
    const query=reset||!PRESENCE_BEFORE?"?limit=12":("?limit=12&before="+PRESENCE_BEFORE);
    const response=await api("/api/presence/events"+query);
    const data=await response.json();
    const items=data.items||[];
    if(reset)PRESENCE_BEFORE=null;
    renderPresenceEvents(items,!reset&&!!PRESENCE_BEFORE);
    if(items.length)PRESENCE_BEFORE=items[items.length-1].id;
    $("#presenceMoreBtn").hidden=items.length<12;
  }catch(error){
    /* 静默失败，页面保持已有内容 */
  }finally{
    PRESENCE_LOADING=false;
  }
}
async function loadPresence(){
  renderPresence();
  try{
    const response=await api("/api/presence/state");
    if(response.ok)PRESENCE_STATE=await response.json();
  }catch(error){}
  renderPresence();
  PRESENCE_BEFORE=null;
  await loadPresenceEvents(true);
}
$("#presenceDetailToggle").onclick=()=>{
  const button=$("#presenceDetailToggle"),detail=$("#presenceDetail");
  const open=button.getAttribute("aria-expanded")==="true";
  button.setAttribute("aria-expanded",String(!open));
  detail.hidden=open;
};
$("#presenceMoreBtn").onclick=()=>loadPresenceEvents(false);
$("#presenceToggle").onchange=async event=>{
  const enabled=event.target.checked;
  event.target.disabled=true;
  try{
    const response=await api("/api/presence/settings",{method:"PUT",body:JSON.stringify({enabled:enabled})});
    if(!response.ok)throw new Error("保存失败");
    PRESENCE_STATE=await response.json();
    renderPresence();
    toast(enabled?"此刻开始计算":"此刻已暂停");
  }catch(error){
    event.target.checked=!enabled;
    toast(error.message||"保存失败");
  }finally{
    event.target.disabled=false;
  }
};

function renderToolRun(run){
  const card=document.createElement("article");card.className="tool-run";
  const hasError=run.items.some(t=>t.status==="error");card.classList.toggle("has-error",hasError);
  const completed=run.items.every(t=>t.run_complete!==false);
  const dot=document.createElement("span");dot.className="tool-run-dot";dot.setAttribute("aria-hidden","true");
  const surface=document.createElement("div");surface.className="tool-run-card";
  const head=document.createElement("div");head.className="tool-run-head";
  const time=document.createElement("div");time.className="tool-run-time";
  const start=run.start.slice(11,16),end=run.end.slice(11,16);
  time.textContent=start&&end&&start!==end?start+" — "+end:(start||end);
  const tidyNarration=(value,source)=>{const text=String(value||"").trim();return source==="builtin"?text.replace(/^Morrow(?=在|正在|把|回去|展开|翻|轻轻)/,""):text;};
  const narrations=[...new Set(run.items.map(t=>tidyNarration(t.narrate,t.source)).filter(Boolean))];
  const allMcp=run.items.every(t=>t.source==="mcp");
  const title=document.createElement("div");title.className="tool-run-title";
  title.textContent=!completed?(tidyNarration(run.items.at(-1)?.narrate,run.items.at(-1)?.source)||"正在做一件事"):
    (narrations.length===1?narrations[0]:(allMcp?assistantName()+"翻了翻你的小册子":assistantName()+"在这一轮做了几件事"));
  head.append(time,title);surface.appendChild(head);
  if(completed&&!hasError){const stamp=document.createElement("span");stamp.className="tool-run-stamp";
    stamp.setAttribute("aria-label","调用完成");stamp.innerHTML="<span>done</span>";surface.appendChild(stamp);}
  const entries=document.createElement("div");entries.className="tool-run-entries";
  run.items.forEach(t=>{
    const row=document.createElement("div");row.className="tool-entry";
    const failed=t.status==="error";row.classList.toggle("error",failed);
    const toggle=document.createElement("button");toggle.type="button";toggle.className="tool-entry-toggle";
    toggle.setAttribute("aria-expanded","false");
    const method=document.createElement("span");method.className="tool-entry-method";method.textContent=t.tool;
    const meta=document.createElement("span");meta.className="tool-entry-meta";
    const hm=document.createElement("span");hm.textContent=(t.created_at||"").slice(11,16);
    const duration=document.createElement("span");
    duration.textContent=Number(t.duration_ms)>0?t.duration_ms+"ms":"";
    const arrow=document.createElement("span");arrow.className="tool-entry-arrow";arrow.setAttribute("aria-hidden","true");
    meta.append(hm);if(duration.textContent)meta.append(duration);meta.append(arrow);toggle.append(method,meta);
    const detail=document.createElement("div");detail.className="tool-entry-detail";detail.hidden=true;
    const prettyToolValue=(value,fallback)=>{
      if(value===null||value===undefined||value==="")return fallback;
      if(typeof value==="object")return JSON.stringify(value,null,2);
      const text=String(value);
      try{const parsed=JSON.parse(text.trim());return JSON.stringify(parsed,null,2);}catch{return text;}
    };
    const inputLabel=document.createElement("div");inputLabel.className="detail-label";inputLabel.textContent="INPUT";
    const input=document.createElement("pre");input.textContent=prettyToolValue(t.args,"{}");
    const resultLabel=document.createElement("div");resultLabel.className="detail-label tool-result-label";
    resultLabel.textContent=failed?"ERROR":"RESULT";
    const result=document.createElement("pre");result.className="tool-result-value";
    result.textContent=prettyToolValue(failed?(t.error||t.result):(t.result),failed?"调用失败":"没有返回内容");
    detail.append(inputLabel,input,resultLabel,result);
    toggle.setAttribute("aria-label",(failed?"查看失败记录：":"查看工具输入与结果：")+t.tool);
    toggle.onclick=()=>{const open=!row.classList.contains("open");row.classList.toggle("open",open);
      toggle.setAttribute("aria-expanded",String(open));tidySmoothPanel(detail,open,270);};
    row.append(toggle,detail);entries.appendChild(row);
  });
  surface.appendChild(entries);card.append(dot,surface);return card;
}

let STUDY_SETTINGS=null,studyPollTimer=null,FOOTPRINT_RUNS=[];
let FOOTPRINT_FILTER={month:"",day:"",initialized:false};
let FOOTPRINT_LATEST_DAY="";
const FOOTPRINT_MONTH_NAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];
function studyRunStamp(run){return run.started_at||run.created_at||"";}
function studyRunDay(run){return studyRunStamp(run).slice(0,10);}
function studyRunIsVisible(run){
  if(run.status==="queued"||run.status==="running")return false;
  const events=Array.isArray(run.activity_log)?run.activity_log:[];
  if(run.status==="quiet"&&!run.has_activity&&!events.length&&!run.self_recap&&!run.handoff)return false;
  return !!run.footprint||!!run.has_activity||!!events.length||run.status==="failed";
}
let VOICE_DRAWER_ARTIFACTS=[],voiceDrawerDetailKey="";
function syncVoiceFavorite(artifactId,favorite){$$('.voice-envelope[data-artifact-id="'+artifactId+'"]').forEach(letter=>letter.classList.toggle("is-favorite",favorite));const stored=VOICE_DRAWER_ARTIFACTS.find(item=>String(item.id)===String(artifactId));if(stored)stored.favorite=favorite;if(currentVoiceArtifact&&String(currentVoiceArtifact.id)===String(artifactId))currentVoiceArtifact.favorite=favorite;}
async function toggleVoiceFavorite(artifact,letter){const wanted=!artifact.favorite;try{const r=await api("/api/artifacts/"+artifact.id+"/favorite",{method:"PUT",body:JSON.stringify({favorite:wanted})}),data=await r.json();if(!r.ok)throw new Error(data.error||"收藏失败");artifact.favorite=!!data.favorite;syncVoiceFavorite(artifact.id,artifact.favorite);toast(artifact.favorite?"语音已收藏":"已取消收藏");if(voiceDrawerDetailKey==="favorites"&&!artifact.favorite)setTimeout(()=>renderVoiceDrawerBox("favorites"),120);}catch(error){toast(error.message||"收藏失败");}}
async function downloadVoiceArtifact(artifact){try{const r=await fetch(artifact.audio_url);if(!r.ok)throw new Error("声音文件不见了");const blob=await r.blob(),url=URL.createObjectURL(blob),link=document.createElement("a"),stamp=String(artifact.created_at||"").replace(/[-:]/g,"").replace(" ","-").slice(0,13);link.href=url;link.download="voice-"+(stamp||artifact.id)+".mp3";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("语音已下载");}catch(error){toast(error.message||"下载失败");}}
function attachVoiceLetterActions(letter,artifact){attachLongPress(letter,()=>{letter._suppressVoiceOpen=true;setTimeout(()=>{letter._suppressVoiceOpen=false;},800);openSheet([
    {label:artifact.favorite?"取消收藏":"收藏语音",svg:artifact.favorite?SVG_STAR_SOLID:SVG_STAR_OUTLINE,fn:()=>toggleVoiceFavorite(artifact,letter)},
    {label:"下载音频",svg:'<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',fn:()=>downloadVoiceArtifact(artifact)}
  ]);});}
function voiceDrawerMonthLabel(month){if(month==="undated")return {title:"LETTERS",year:"UNDATED",aria:"未注明日期"};const date=new Date(month+"-01T00:00:00");if(Number.isNaN(date.getTime()))return {title:"LETTERS",year:"UNDATED",aria:"未注明日期"};return {title:date.toLocaleDateString("en-US",{month:"long"}).toUpperCase(),year:String(date.getFullYear()),aria:date.getFullYear()+"年"+(date.getMonth()+1)+"月"};}
function voiceDrawerGroups(){const favorites=VOICE_DRAWER_ARTIFACTS.filter(item=>item.favorite),months=new Map();VOICE_DRAWER_ARTIFACTS.forEach(artifact=>{const month=String(artifact.created_at||"").slice(0,7)||"undated";if(!months.has(month))months.set(month,[]);months.get(month).push(artifact);});const groups=[{key:"favorites",title:"FAVORITES",year:"SAVED",aria:"收藏",items:favorites,favorite:true}];[...months.keys()].sort((a,b)=>a==="undated"?1:b==="undated"?-1:b.localeCompare(a)).forEach(month=>{const label=voiceDrawerMonthLabel(month);groups.push({key:month,...label,items:months.get(month),favorite:false});});return groups;}
function voiceDrawerGroup(key){return voiceDrawerGroups().find(group=>group.key===key);}
function makeVoiceMailboxCard(group){const card=document.createElement("button");card.type="button";card.className="voice-mailbox-card"+(group.favorite?" favorite":"");card.setAttribute("aria-label",group.aria+"，"+group.items.length+"封语音");const paperCount=Math.max(1,Math.min(3,group.items.length));card.innerHTML='<span class="voice-mailbox-cube" aria-hidden="true"><span class="voice-mailbox-papers"></span><svg class="voice-mailbox-shell" viewBox="0 0 132 140" preserveAspectRatio="none"><ellipse class="voice-shell-shadow" cx="67" cy="132" rx="55" ry="7"/><path class="voice-shell-top" d="M14 69 31 57H125L108 69Z"/><path class="voice-shell-inner" d="M20 67 34 60h84l-11 7Z"/><path class="voice-shell-side" d="M108 69 125 57v65l-17 15Z"/><path class="voice-shell-front" d="M14 69h94v55q0 13-13 13H27q-13 0-13-13Z"/><path class="voice-shell-edge" d="M15 70h92M109 70l15-12"/></svg><span class="voice-mailbox-label"><strong></strong><small></small></span></span><span class="voice-mailbox-caption"></span>';const papers=card.querySelector(".voice-mailbox-papers");for(let i=0;i<paperCount;i++)papers.appendChild(document.createElement("i")).className="voice-mailbox-paper";card.querySelector("strong").textContent=group.title;card.querySelector("small").textContent=group.favorite?group.year+" · "+group.items.length:group.year+" · "+group.items.length+" "+(group.items.length===1?"LETTER":"LETTERS");card.querySelector(".voice-mailbox-caption").textContent=group.favorite?"收藏信匣":group.aria;card.onclick=()=>renderVoiceDrawerDetail(group.key);return card;}
function renderVoiceDrawerShelf(){voiceDrawerDetailKey="";const list=$("#tidyArtifactList"),empty=$("#tidyArtifactEmpty");list.innerHTML="";empty.hidden=VOICE_DRAWER_ARTIFACTS.length>0;list.hidden=!VOICE_DRAWER_ARTIFACTS.length;if(!VOICE_DRAWER_ARTIFACTS.length)return;const grid=document.createElement("div");grid.className="voice-mailbox-grid";voiceDrawerGroups().forEach(group=>grid.appendChild(makeVoiceMailboxCard(group)));list.appendChild(grid);}
function renderVoiceDrawerDetail(key){const group=voiceDrawerGroup(key);if(!group){renderVoiceDrawerShelf();return;}voiceDrawerDetailKey=key;const list=$("#tidyArtifactList");list.innerHTML="";list.hidden=false;$("#tidyArtifactEmpty").hidden=true;const head=document.createElement("div");head.className="voice-detail-head";head.innerHTML='<button class="voice-detail-back" type="button" aria-label="返回信匣架"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button><div class="voice-detail-title"><strong></strong><small></small></div><span></span>';head.querySelector("strong").textContent=group.title+(group.favorite?"":" "+group.year);head.querySelector("small").textContent=group.items.length+" "+(group.items.length===1?"LETTER":"LETTERS");head.querySelector("button").onclick=renderVoiceDrawerShelf;const stage=document.createElement("div");stage.className="voice-stack-stage";stage.innerHTML='<svg class="voice-stack-shell-back" viewBox="0 0 360 344" aria-hidden="true"><ellipse class="voice-shell-shadow" cx="184" cy="313" rx="155" ry="18"/><path class="voice-shell-top" d="M24 190 52 174h292l-28 16Z"/><path class="voice-shell-inner" d="M34 188 57 178h273l-18 10Z"/><path class="voice-shell-side" d="M316 190 344 174v112l-28 16Z"/></svg><svg class="voice-stack-shell-front" viewBox="0 0 360 344" aria-hidden="true"><path class="voice-shell-front" d="M24 190h292v96q0 16-16 16H40q-16 0-16-16Z"/><path class="voice-shell-edge" d="M25 191h290M317 191l26-16"/></svg><span class="voice-stack-bin-label" aria-hidden="true"><strong></strong><small></small></span>';stage.querySelector(".voice-stack-bin-label strong").textContent=group.title;stage.querySelector(".voice-stack-bin-label small").textContent=group.favorite?"KEPT CLOSE":group.year+" · PRIVATE DRAWER";const counter=document.createElement("div");counter.className="voice-stack-counter";const hint=document.createElement("div");hint.className="voice-stack-hint";hint.textContent="拖一拖，或点露出的信边";list.append(head,stage,counter,hint);if(!group.items.length){const note=document.createElement("div");note.className="voice-stack-empty";note.textContent=group.favorite?"还没有特别夹起来的语音。":"这只信匣还是空的。";stage.appendChild(note);counter.textContent="0 LETTERS";hint.hidden=true;return;}const state={selected:0,letters:[]};const select=index=>{state.selected=(index+group.items.length)%group.items.length;state.letters.forEach((letter,itemIndex)=>{const depth=(itemIndex-state.selected+group.items.length)%group.items.length,hidden=depth>11;letter.dataset.depth=String(depth);letter.classList.toggle("is-selected",depth===0);letter.classList.toggle("stack-hidden",hidden);letter.style.zIndex=String(depth===0?30:16-depth);letter.style.setProperty("--stack-y",depth===0?"-30px":Math.min(105,(depth-1)*14)+"px");letter.style.setProperty("--stack-angle",depth===0?"0deg":(depth%2?"-1.15deg":".9deg"));letter.style.setProperty("--stack-scale",String(Math.max(.9,1-depth*.012)));letter.style.removeProperty("--drag-x");});counter.textContent=(state.selected+1)+" / "+group.items.length;};group.items.forEach((item,index)=>{const letter=makeVoiceEnvelope(item);letter.classList.add("voice-stack-letter");letter.setAttribute("aria-label",(item.favorite?"已收藏，":"")+"语音 "+fmtTime(item.created_at));letter.onclick=event=>{if(letter._suppressVoiceOpen){letter._suppressVoiceOpen=false;return;}if(state.selected!==index){select(index);return;}openVoiceEnvelope(letter,item,event);};attachVoiceLetterActions(letter,item);let startX=0,dragX=0,dragging=false;letter.addEventListener("pointerdown",event=>{if(state.selected!==index)return;startX=event.clientX;dragX=0;dragging=false;});letter.addEventListener("pointermove",event=>{if(state.selected!==index||!startX)return;dragX=event.clientX-startX;if(Math.abs(dragX)>5){dragging=true;letter.classList.add("is-dragging");letter.style.setProperty("--drag-x",dragX+"px");}});const finishDrag=()=>{if(!startX)return;startX=0;letter.classList.remove("is-dragging");letter.style.removeProperty("--drag-x");if(dragging){letter._suppressVoiceOpen=true;setTimeout(()=>letter._suppressVoiceOpen=false,500);if(Math.abs(dragX)>42)select(state.selected+(dragX<0?1:-1));}dragging=false;dragX=0;};letter.addEventListener("pointerup",finishDrag);letter.addEventListener("pointercancel",finishDrag);state.letters.push(letter);stage.appendChild(letter);});select(0);}
function defaultVoiceDrawerGroupKey(){const now=new Date(),current=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0"),groups=voiceDrawerGroups();return groups.find(group=>group.key===current)?.key||groups.find(group=>!group.favorite)?.key||"favorites";}
function renderVoiceDrawerBox(key){
  const groups=voiceDrawerGroups(),group=groups.find(item=>item.key===key);
  if(!group){const fallback=defaultVoiceDrawerGroupKey();if(fallback!==key)return renderVoiceDrawerBox(fallback);return;}
  voiceDrawerDetailKey=key;
  const list=$("#tidyArtifactList");list.innerHTML="";list.hidden=false;$("#tidyArtifactEmpty").hidden=true;
  const groupIndex=groups.findIndex(item=>item.key===key),previous=groups[groupIndex-1],next=groups[groupIndex+1];
  const head=document.createElement("div");head.className="voice-detail-head";
  head.innerHTML='<button class="voice-detail-step voice-detail-prev" type="button"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button><div class="voice-detail-title"><strong></strong><small></small></div><button class="voice-detail-step voice-detail-next" type="button"><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></button>';
  head.querySelector("strong").textContent=group.title+(group.favorite?"":" "+group.year);
  head.querySelector("small").textContent=group.items.length+" "+(group.items.length===1?"LETTER":"LETTERS");
  [[head.querySelector(".voice-detail-prev"),previous],[head.querySelector(".voice-detail-next"),next]].forEach(([button,target])=>{button.hidden=!target;if(!target)return;button.setAttribute("aria-label","切换到"+target.aria);button.onclick=()=>renderVoiceDrawerBox(target.key);});
  const stage=document.createElement("div");stage.className="voice-stack-stage";
  stage.innerHTML='<svg class="voice-stack-shell-back" viewBox="0 0 360 344" aria-hidden="true"><ellipse class="voice-shell-shadow" cx="184" cy="313" rx="155" ry="18"/><path class="voice-shell-top" d="M24 190 52 174h292l-28 16Z"/><path class="voice-shell-inner" d="M34 188 57 178h273l-18 10Z"/><path class="voice-shell-side" d="M316 190 344 174v104q0 6-8 8l-28 16q8-5 8-16Z"/></svg><svg class="voice-stack-shell-front" viewBox="0 0 360 344" aria-hidden="true"><path class="voice-shell-front" d="M24 190h292v96q0 16-16 16H40q-16 0-16-16Z"/><path class="voice-shell-edge" d="M25 191h290M317 191l26-16"/></svg><span class="voice-stack-bin-label" aria-hidden="true"><strong></strong><small></small></span>';
  stage.querySelector(".voice-stack-bin-label strong").textContent=group.title;
  stage.querySelector(".voice-stack-bin-label small").textContent=group.favorite?"KEPT CLOSE":group.year+" · PRIVATE DRAWER";
  const counter=document.createElement("div");counter.className="voice-stack-counter";list.append(head,stage,counter);
  if(!group.items.length){const note=document.createElement("div");note.className="voice-stack-empty";note.textContent=group.favorite?"还没有特别夹起来的语音。":"这只信匣还是空的。";stage.appendChild(note);counter.textContent="0 LETTERS";return;}
  const state={selected:0,letters:[]};
  const select=index=>{state.selected=(index+group.items.length)%group.items.length;state.letters.forEach((letter,itemIndex)=>{const depth=(itemIndex-state.selected+group.items.length)%group.items.length,hidden=depth>4;letter.dataset.depth=String(depth);letter.classList.toggle("is-selected",depth===0);letter.classList.toggle("stack-hidden",hidden);letter.style.zIndex=String(depth===0?30:16-depth);letter.style.setProperty("--stack-y",depth===0?"-30px":(depth-1)*14+"px");letter.style.setProperty("--stack-angle",depth===0?"0deg":(depth%2?"-1.15deg":".9deg"));letter.style.setProperty("--stack-scale",String(Math.max(.94,1-depth*.012)));});counter.textContent=(state.selected+1)+" / "+group.items.length;};
  group.items.forEach((item,index)=>{const letter=makeVoiceEnvelope(item);letter.classList.add("voice-stack-letter");letter.setAttribute("aria-label",(item.favorite?"已收藏，":"")+"语音 "+fmtTime(item.created_at));letter.onclick=event=>{if(letter._suppressVoiceOpen){letter._suppressVoiceOpen=false;return;}if(state.selected!==index){select(index);return;}openVoiceEnvelope(letter,item,event);};attachVoiceLetterActions(letter,item);state.letters.push(letter);stage.appendChild(letter);});
  select(0);
}
const ALARM_STATUS={pending:"waiting",running:"waking",reminded:"arrived",cancelled:"folded",missed:"faded"};
async function alarmCardAction(item){
  if(item.status==="pending"){
    if(!await bubbleConfirm({title:"收回这张未来纸条？",message:item.note||"Morrow还没有醒来看见它。",confirmText:"收回"}))return;
    const r=await api("/api/alarms/"+item.id+"/cancel",{method:"POST"});if(!r.ok){toast("纸条没能收回来");return;}toast("纸条已经收回");
  }else{
    if(!await bubbleConfirm({title:"丢掉这张旧纸条？",message:item.note||"它会从抽屉里消失。",confirmText:"删除",danger:true}))return;
    const r=await api("/api/alarms/"+item.id,{method:"DELETE"});if(!r.ok){toast("纸条没有删掉");return;}toast("旧纸条已经丢掉");
  }
  await loadAlarmDrawer();
}
async function loadAlarmDrawer(){
  const list=$("#tidyArtifactList"),empty=$("#tidyArtifactEmpty");$("#tidyArtifactPanel").classList.remove("keepsake-album-mode","music-listening-archive-mode");$("#tidyArtifactPanel").classList.add("alarm-drawer-mode");list.innerHTML="";
  let items=[];try{const r=await api("/api/alarms");items=r.ok?await r.json():[];}catch{}
  empty.querySelector("strong").textContent="future notes";empty.querySelector("span").textContent="还没有未来纸条。等"+assistantName()+"想在之后再来找你时，它们会夹在这里。";empty.hidden=items.length>0;list.hidden=!items.length;if(!items.length)return;
  const wrap=document.createElement("div");wrap.className="alarm-notes";
  let shown=0;const more=document.createElement("button");more.type="button";more.className="va-more";more.textContent="加载更早的纸条";
  function appendPage(){items.slice(shown,shown+20).forEach(item=>{const card=document.createElement("article");card.className="alarm-note "+item.status;card.innerHTML='<div class="alarm-note-head"><span></span><time></time></div><div class="alarm-note-body"></div><div class="alarm-note-source"></div>';card.querySelector("span").textContent=ALARM_STATUS[item.status]||item.status;card.querySelector("time").textContent=String(item.earliest_at||"").slice(0,16)+(item.latest_at&&item.latest_at!==item.earliest_at?" — "+String(item.latest_at).slice(11,16):"");card.querySelector(".alarm-note-body").textContent=item.note||"Morrow没有另外写备注，只把那一刻的念头留给了未来的自己。";const source=(item.source_text||"").trim();const sourceBox=card.querySelector(".alarm-note-source");sourceBox.textContent=source?"那时你说："+source:"没有留下触发它的那句话";attachLongPress(card,()=>alarmCardAction(item));wrap.appendChild(card);});
  shown+=20;more.hidden=shown>=items.length;}
  more.onclick=appendPage;appendPage();list.append(wrap,more);
}
let DRAWER_KIND="keepsake",KEEPSAKES=[],CURRENT_KEEPSAKE=null,KEEPSAKE_FILTER="all",KEEPSAKE_QUERY="",KEEPSAKE_REPLY_TARGET=null,KEEPSAKE_ALBUM_SCROLL=0,KEEPSAKE_DETAIL_SCROLL=0;
let keepsakeSearchHideTimer=null,keepsakeSearchDebounce=null,keepsakePullStartY=null,keepsakePullDistance=0;
function scheduleKeepsakeSearchHide(){clearTimeout(keepsakeSearchHideTimer);if($("#keepsakeSearchInput").value.trim())return;keepsakeSearchHideTimer=setTimeout(()=>closeKeepsakeSearch(),3000);}
function openKeepsakeSearch(focus=false){const reveal=$("#keepsakeSearchReveal");reveal.classList.remove("pulling");reveal.style.height="";reveal.classList.add("open");if(focus)requestAnimationFrame(()=>$("#keepsakeSearchInput").focus());scheduleKeepsakeSearchHide();}
function closeKeepsakeSearch(force=false){if(!force&&$("#keepsakeSearchInput").value.trim())return;clearTimeout(keepsakeSearchHideTimer);const reveal=$("#keepsakeSearchReveal");reveal.classList.remove("pulling","open");reveal.style.height="";$("#keepsakeSearchInput").blur();}
function resetKeepsakeSearch(){clearTimeout(keepsakeSearchDebounce);KEEPSAKE_QUERY="";const input=$("#keepsakeSearchInput");if(input)input.value="";closeKeepsakeSearch(true);}
function keepsakeSearchText(item){return [item.note||"",...(item.snapshot||[]).map(message=>message.content||"")].join("\n").toLocaleLowerCase();}
$("#view-night").addEventListener("touchstart",e=>{if(tidyMode!=="keepsake"||CURRENT_KEEPSAKE||$("#view-night").scrollTop>0||!e.target.closest("#tidyModeTitle"))return;keepsakePullStartY=e.touches[0].clientY;keepsakePullDistance=0;clearTimeout(keepsakeSearchHideTimer);},{passive:true});
$("#view-night").addEventListener("touchmove",e=>{if(keepsakePullStartY===null)return;keepsakePullDistance=Math.max(0,e.touches[0].clientY-keepsakePullStartY);if(keepsakePullDistance<3)return;e.preventDefault();const reveal=$("#keepsakeSearchReveal");reveal.classList.add("pulling");reveal.style.height=Math.min(52,keepsakePullDistance*.72)+"px";},{passive:false});
function finishKeepsakePull(){if(keepsakePullStartY===null)return;const shouldOpen=keepsakePullDistance>=26;keepsakePullStartY=null;if(shouldOpen)openKeepsakeSearch(true);else closeKeepsakeSearch();}
$("#view-night").addEventListener("touchend",finishKeepsakePull,{passive:true});
$("#view-night").addEventListener("touchcancel",finishKeepsakePull,{passive:true});
$("#keepsakeSearchInput").addEventListener("input",e=>{clearTimeout(keepsakeSearchHideTimer);clearTimeout(keepsakeSearchDebounce);KEEPSAKE_QUERY=e.target.value.trim().toLocaleLowerCase();keepsakeSearchDebounce=setTimeout(renderKeepsakeAlbum,180);if(!KEEPSAKE_QUERY)scheduleKeepsakeSearchHide();});
function keepsakeMonthLabel(month){if(!month)return "未注明日期";const [year,value]=month.split("-");return year+" · "+Number(value)+"月";}
async function hideKeepsakeDetail(){document.body.classList.remove("keepsake-detail-view");CURRENT_KEEPSAKE=null;await loadKeepsakeDrawer();requestAnimationFrame(()=>{$("#view-night").scrollTop=KEEPSAKE_ALBUM_SCROLL;});}
function closeKeepsakeDetail(){if(currentAppRoute()?.overlay==="keepsake-detail")history.back();else hideKeepsakeDetail();}
async function returnToKeepsakeSource(item){if(!item)return;document.body.classList.remove("keepsake-detail-view");CURRENT_KEEPSAKE=null;if(currentAppRoute()?.overlay==="keepsake-detail")history.back();sessionId=item.session_id;$("#chatTitle").textContent=item.session_title||assistantName();setTimeout(async()=>{navigateMain("chat");await loadMessages((item.message_ids||[])[0]);},0);}
function renderKeepsakeComments(page,item){
  const comments=document.createElement("div");comments.className="keepsake-comments";
  (item.comments||[]).forEach(comment=>{const row=document.createElement("div");row.className="keepsake-comment "+comment.author;row.innerHTML='<div class="keepsake-comment-head"><strong></strong><time></time></div><div class="keepsake-comment-text"></div><button class="keepsake-comment-delete" type="button" aria-label="删除这条留言">×</button>';const who=row.querySelector("strong");who.dataset.identityCommentAuthor=comment.author==="assistant"?"assistant":"user";who.textContent=commentAuthorName(comment.author);who.setAttribute("aria-label",who.textContent);row.querySelector("time").textContent=keepsakeDateTime(comment.created_at,"full");row.querySelector(".keepsake-comment-text").textContent=comment.content||"";row.onclick=e=>{e.stopPropagation();comments.querySelectorAll(".keepsake-comment.delete-ready").forEach(other=>{if(other!==row)other.classList.remove("delete-ready");});row.classList.toggle("delete-ready");};row.querySelector(".keepsake-comment-delete").onclick=async e=>{e.stopPropagation();if(!await bubbleConfirm({title:"删掉这句留言？",message:comment.content||"",confirmText:"删除",danger:true}))return;const r=await api("/api/keepsakes/comments/"+comment.id,{method:"DELETE"});if(!r.ok){toast("留言没有删掉");return;}item.comments=(item.comments||[]).filter(value=>value.id!==comment.id);openKeepsakeDetail(item,false);};comments.appendChild(row);});
  page.appendChild(comments);
  const pencil=document.createElement("button");pencil.type="button";pencil.className="keepsake-comment-pencil";pencil.setAttribute("aria-label","给这张留影留言");pencil.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>';pencil.onclick=()=>openKeepsakeReply(item);page.appendChild(pencil);
}
function toggleKeepsakeReply(on){$("#keepsakeReplyMask").classList.toggle("on",on);$("#keepsakeReplySheet").classList.toggle("on",on);if(on)requestAnimationFrame(()=>$("#keepsakeReplyText").focus());}
function openKeepsakeReply(item){KEEPSAKE_REPLY_TARGET=item;$("#keepsakeReplyText").value="";$("#keepsakeReplyPreview").textContent=item.session_title||"keepsake";toggleKeepsakeReply(true);}
$("#keepsakeReplyMask").onclick=()=>toggleKeepsakeReply(false);
$("#keepsakeReplySend").onclick=async()=>{const item=KEEPSAKE_REPLY_TARGET,content=$("#keepsakeReplyText").value.trim(),button=$("#keepsakeReplySend");if(!item)return;if(!content){toast("留言还没有写");return;}button.disabled=true;const r=await api("/api/keepsakes/"+item.id+"/comments",{method:"POST",body:JSON.stringify({author:"user",content})}),data=await r.json().catch(()=>({}));button.disabled=false;if(!r.ok){toast(data.error||"留言没有收好");return;}item.comments=[...(item.comments||[]),data];toggleKeepsakeReply(false);KEEPSAKE_REPLY_TARGET=null;openKeepsakeDetail(item,false);toast("留言放进去了");};
document.addEventListener("click",()=>$$('.keepsake-comment.delete-ready').forEach(row=>row.classList.remove("delete-ready")));
function openKeepsakeDetail(item,recordHistory=true){CURRENT_KEEPSAKE=item;document.body.classList.add("keepsake-detail-view");if(recordHistory&&currentAppRoute()?.overlay!=="keepsake-detail"){const route=currentAppRoute()||appRoute(1,"night");history.pushState({...route,level:(route.level||1)+1,overlay:"keepsake-detail",keepsakeId:item.id},"");}const list=$("#tidyArtifactList"),empty=$("#tidyArtifactEmpty");empty.hidden=true;list.hidden=false;list.innerHTML="";const page=document.createElement("section");page.className="keepsake-page";const head=document.createElement("div");head.className="keepsake-page-head";head.innerHTML='<button class="back" type="button">‹ Back</button><button class="source" type="button">To that day ›</button>';head.querySelector(".back").onclick=closeKeepsakeDetail;head.querySelector(".source").onclick=()=>returnToKeepsakeSource(item);head.querySelector(".source").hidden=!item.session_id||!(item.message_ids||[]).length;const frame=document.createElement("div");frame.className="keepsake-full-photo";frame.setAttribute("aria-label","轻点翻看照片背面");const card=document.createElement("div");card.className="keepsake-flip-card";const front=document.createElement("div");front.className="keepsake-face front";const windowEl=document.createElement("div");windowEl.className="keepsake-full-window";(item.snapshot||[]).forEach(message=>windowEl.appendChild(keepsakeNookMarkup(message,true)));front.appendChild(windowEl);const back=document.createElement("div");back.className="keepsake-face back";const note=document.createElement("div");note.className="keepsake-back-note"+(item.note?"":" empty");note.textContent=item.note||"Nothing written on the back";back.appendChild(note);card.append(front,back);frame.appendChild(card);frame.onclick=()=>frame.classList.toggle("flipped");const meta=document.createElement("div");meta.className="keepsake-page-meta";meta.innerHTML='<span></span><time></time>';meta.querySelector("span").textContent=item.session_title||"那时的对话";meta.querySelector("time").textContent=keepsakeDateTime(item.created_at,"full");page.append(head,frame,meta);renderKeepsakeComments(page,item);list.appendChild(page);}
const renderKeepsakeDetailPage=openKeepsakeDetail;
openKeepsakeDetail=function(item,recordHistory=true){const view=$("#view-night"),entering=!CURRENT_KEEPSAKE;if(entering){KEEPSAKE_ALBUM_SCROLL=view.scrollTop;KEEPSAKE_DETAIL_SCROLL=0;}else KEEPSAKE_DETAIL_SCROLL=view.scrollTop;renderKeepsakeDetailPage(item,recordHistory);requestAnimationFrame(()=>{view.scrollTop=KEEPSAKE_DETAIL_SCROLL;});};
async function toggleKeepsakeFavorite(item){const wanted=!item.favorite,r=await api("/api/keepsakes/"+item.id+"/favorite",{method:"PUT",body:JSON.stringify({favorite:wanted})}),data=await r.json().catch(()=>({}));if(!r.ok){toast(data.error||"珍藏状态没有收好");return;}item.favorite=!!data.favorite;toast(item.favorite?"这张留影已珍藏":"已取消珍藏");await loadKeepsakeDrawer();}
async function deleteKeepsake(item){if(!await bubbleConfirm({title:"删掉这张留影？",message:item.note||"这张照片会从抽屉里消失。",note:"原对话不会受到影响，对应消息会恢复为可以留影。",confirmText:"删除",danger:true}))return;const r=await api("/api/keepsakes/"+item.id,{method:"DELETE"});if(!r.ok){toast("这张留影没有删掉");return;}KEEPSAKES=KEEPSAKES.filter(value=>value.id!==item.id);KEEPSAKED_MESSAGE_IDS=new Set(KEEPSAKES.flatMap(value=>value.message_ids||[]).map(String));toast("留影已取下");await loadKeepsakeDrawer();}
async function loadKeepsakeDrawer(){const list=$("#tidyArtifactList"),empty=$("#tidyArtifactEmpty");$("#tidyArtifactPanel").classList.remove("alarm-drawer-mode","music-listening-archive-mode");$("#tidyArtifactPanel").classList.add("keepsake-album-mode");list.innerHTML="";CURRENT_KEEPSAKE=null;let items=[];try{const r=await api("/api/keepsakes");items=r.ok?await r.json():[];}catch{}KEEPSAKES=Array.isArray(items)?items:[];KEEPSAKED_MESSAGE_IDS=new Set(KEEPSAKES.flatMap(item=>item.message_ids||[]).map(String));empty.querySelector("strong").textContent="keepsake";empty.querySelector("span").textContent="还没有留影。从聊天里挑几句话，把那一刻留下来。";empty.hidden=KEEPSAKES.length>0;list.hidden=!KEEPSAKES.length;if(!KEEPSAKES.length)return;renderKeepsakeAlbum();}
function makeKeepsakeFilter(){const filter=document.createElement("div");filter.className="keepsake-filter";filter.innerHTML='<button type="button" data-filter="all">All</button><button type="button" data-filter="pinned">Pinned</button>';filter.querySelectorAll("button").forEach(button=>{button.classList.toggle("on",button.dataset.filter===KEEPSAKE_FILTER);button.onclick=()=>{KEEPSAKE_FILTER=button.dataset.filter;renderKeepsakeAlbum();};});return filter;}
function renderKeepsakeAlbum(){const list=$("#tidyArtifactList");list.innerHTML="";const searched=KEEPSAKE_QUERY?KEEPSAKES.filter(item=>keepsakeSearchText(item).includes(KEEPSAKE_QUERY)):KEEPSAKES;const shown=KEEPSAKE_FILTER==="pinned"?searched.filter(item=>item.favorite):searched;if(!shown.length){const head=document.createElement("div");head.className="keepsake-month-title";const label=document.createElement("span");label.textContent=KEEPSAKE_QUERY?"SEARCH":"PINNED";head.append(label,makeKeepsakeFilter());const note=document.createElement("div");note.className="keepsake-filter-empty";note.textContent=KEEPSAKE_QUERY?"没有找到写着这些字的留影。":"还没有别上星星的留影。";list.append(head,note);return;}const months=new Map();shown.forEach(item=>{const month=keepsakeDateTime(item.created_at,"month");if(!months.has(month))months.set(month,[]);months.get(month).push(item);});[...months].forEach(([month,group],index)=>{const section=document.createElement("section");section.className="keepsake-month";const title=document.createElement("div"),label=document.createElement("span");title.className="keepsake-month-title";label.textContent=keepsakeMonthLabel(month);title.appendChild(label);if(index===0)title.appendChild(makeKeepsakeFilter());const grid=document.createElement("div");grid.className="keepsake-grid";group.forEach(item=>{const photo=makeKeepsakePhoto(item);photo.onclick=()=>openKeepsakeDetail(item);attachLongPress(photo,()=>{photo._suppressKeepsakeOpen=true;setTimeout(()=>photo._suppressKeepsakeOpen=false,700);openSheet([{label:item.favorite?"取消珍藏":"珍藏",svg:item.favorite?SVG_STAR_SOLID:SVG_STAR_OUTLINE,fn:()=>toggleKeepsakeFavorite(item)},{label:"删除留影",svg:SVG_TRASH,danger:true,fn:()=>deleteKeepsake(item)}]);});const open=photo.onclick;photo.onclick=()=>{if(photo._suppressKeepsakeOpen){photo._suppressKeepsakeOpen=false;return;}open();};grid.appendChild(photo);});section.append(title,grid);list.appendChild(section);});}
async function loadVoiceDrawer(){const list=$("#tidyArtifactList"),empty=$("#tidyArtifactEmpty");$("#tidyArtifactPanel").classList.remove("keepsake-album-mode","alarm-drawer-mode","music-listening-archive-mode");empty.hidden=true;list.hidden=false;voiceDrawerDetailKey="";await window.sakieVoiceArchive.mount(list,{api,notify:toast,assistantName});}
function listeningArchiveDuration(seconds){seconds=Math.max(0,Number(seconds)||0);const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60);return hours?hours+"h "+minutes+"m":minutes?minutes+" min":"< 1 min";}
async function loadMusicListeningArchive(){
  const list=$("#tidyArtifactList"),empty=$("#tidyArtifactEmpty"),panel=$("#tidyArtifactPanel");
  panel.classList.remove("keepsake-album-mode","alarm-drawer-mode");panel.classList.add("music-listening-archive-mode");list.innerHTML="";
  let sessions=[];try{const r=await api("/api/music/listening");sessions=r.ok?await r.json():[];}catch{}
  empty.querySelector("strong").textContent="together";empty.querySelector("span").textContent="还没有一起听的记录。下一次并肩听歌，会从这里留下一小段时间。";empty.hidden=sessions.length>0;list.hidden=!sessions.length;if(!sessions.length)return;
  const byMonth=new Map();sessions.forEach(item=>{const month=String(item.started_at||"").slice(0,7)||"undated";if(!byMonth.has(month))byMonth.set(month,[]);byMonth.get(month).push(item);});
  byMonth.forEach((items,month)=>{const section=document.createElement("section");section.className="listening-archive-month";const title=document.createElement("div");title.className="listening-archive-month-title";title.textContent=month==="undated"?"UNDATED":month.replace("-"," · ");const stack=document.createElement("div");stack.className="listening-archive-stack";
    items.forEach(item=>{const card=document.createElement("article");card.className="listening-archive-card";card.innerHTML='<div class="listening-archive-head"><div><strong>together</strong><time></time></div><span></span></div><div class="listening-archive-tracks"></div>';card.querySelector("time").textContent=String(item.started_at||"").slice(5,16).replace("-","/");card.querySelector(".listening-archive-head > span").textContent=listeningArchiveDuration(item.duration_seconds);const tracks=card.querySelector(".listening-archive-tracks"),extra=document.createElement("div");extra.className="listening-archive-extra";extra.hidden=true;
      const sessionTracks=item.tracks||[];sessionTracks.forEach((track,index)=>{const row=document.createElement("div");row.className="listening-archive-track";row.innerHTML='<span class="listening-archive-cover"></span><span class="listening-archive-copy"><strong></strong><small></small></span><time></time>';const cover=row.querySelector(".listening-archive-cover");cover.style.cssText=musicCoverStyle({cover_url:track.cover_url});if(!track.cover_url)cover.innerHTML=musicIcon("disc");row.querySelector(".listening-archive-copy strong").textContent=track.name||"未知歌曲";row.querySelector(".listening-archive-copy small").textContent=track.artist||"未知歌手";row.querySelector("time").textContent=listeningArchiveDuration(track.listened_seconds);(sessionTracks.length>4&&index>=3?extra:tracks).appendChild(row);});
      if(extra.children.length){tracks.appendChild(extra);const more=document.createElement("button");more.type="button";more.className="listening-archive-more";more.textContent="还有 "+extra.children.length+" 首";more.onclick=()=>{const open=extra.hidden;more.classList.toggle("open",open);more.textContent=open?"收起":"还有 "+extra.children.length+" 首";tidySmoothPanel(extra,open,280);};card.appendChild(more);}stack.appendChild(card);});
    section.append(title,stack);list.appendChild(section);
  });
}
async function loadArtifactDrawer(){return DRAWER_KIND==="voice"?loadVoiceDrawer():loadKeepsakeDrawer();}
function footprintMonthName(month){const index=Math.max(0,Math.min(11,Number(month.slice(5,7))-1));return FOOTPRINT_MONTH_NAMES[index];}
function footprintDayLabel(day){
  const date=new Date(day+"T00:00:00"),weekday=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][date.getDay()];
  return footprintMonthName(day.slice(0,7))+" "+Number(day.slice(8,10))+" · "+weekday;
}
function footprintAvailable(runs){
  const days=[...new Set((runs||[]).filter(studyRunIsVisible).map(studyRunDay).filter(Boolean))].sort();
  return {days,months:[...new Set(days.map(day=>day.slice(0,7)))]};
}
function normalizeFootprintFilter(runs){
  const available=footprintAvailable(runs),latest=available.days.at(-1)||"";
  if(!FOOTPRINT_FILTER.initialized){
    FOOTPRINT_FILTER={month:latest.slice(0,7),day:latest,initialized:true};
  }else if(FOOTPRINT_FILTER.day&&FOOTPRINT_FILTER.day===FOOTPRINT_LATEST_DAY&&latest>FOOTPRINT_LATEST_DAY){
    FOOTPRINT_FILTER.month=latest.slice(0,7);FOOTPRINT_FILTER.day=latest;
  }else if(!available.months.includes(FOOTPRINT_FILTER.month)){
    FOOTPRINT_FILTER.month=latest.slice(0,7);FOOTPRINT_FILTER.day=latest;
  }else if(FOOTPRINT_FILTER.day&&!available.days.includes(FOOTPRINT_FILTER.day)){
    const monthDays=available.days.filter(day=>day.startsWith(FOOTPRINT_FILTER.month));
    FOOTPRINT_FILTER.day=monthDays.at(-1)||"";
  }
  FOOTPRINT_LATEST_DAY=latest;
  return available;
}
function renderFootprintCalendar(runs){
  const available=normalizeFootprintFilter(runs),calendar=$("#footprintCalendar");
  calendar.hidden=!available.days.length;if(calendar.hidden)return available;
  const monthIndex=available.months.indexOf(FOOTPRINT_FILTER.month),label=$("#footprintMonthLabel");
  label.textContent=footprintMonthName(FOOTPRINT_FILTER.month);label.classList.toggle("all",!FOOTPRINT_FILTER.day);
  label.setAttribute("aria-pressed",String(!FOOTPRINT_FILTER.day));
  $("#footprintMonthPrev").disabled=monthIndex<=0;$("#footprintMonthNext").disabled=monthIndex<0||monthIndex>=available.months.length-1;
  const box=$("#footprintDays");box.innerHTML="";const today=localDateKey(new Date());
  available.days.filter(day=>day.startsWith(FOOTPRINT_FILTER.month)).forEach(day=>{
    const button=document.createElement("button");button.type="button";button.className="footprint-day-chip";
    button.textContent=String(Number(day.slice(8,10)));button.classList.toggle("on",FOOTPRINT_FILTER.day===day);
    button.classList.toggle("today",day===today);button.setAttribute("aria-label",footprintDayLabel(day));
    button.setAttribute("aria-pressed",String(FOOTPRINT_FILTER.day===day));
    button.onclick=()=>{FOOTPRINT_FILTER.day=day;renderStudyRuns(FOOTPRINT_RUNS);};box.appendChild(button);
  });
  requestAnimationFrame(()=>box.querySelector(".on")?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"}));
  return available;
}
function moveFootprintMonth(offset){
  const available=footprintAvailable(FOOTPRINT_RUNS),index=available.months.indexOf(FOOTPRINT_FILTER.month),next=available.months[index+offset];
  if(!next)return;FOOTPRINT_FILTER.month=next;FOOTPRINT_FILTER.day="";renderStudyRuns(FOOTPRINT_RUNS);
}
$("#footprintMonthPrev").onclick=()=>moveFootprintMonth(-1);
$("#footprintMonthNext").onclick=()=>moveFootprintMonth(1);
$("#footprintMonthLabel").onclick=()=>{FOOTPRINT_FILTER.day="";renderStudyRuns(FOOTPRINT_RUNS);};
function studyModelLabel(){
  const active=getActive();
  return active?(active.name||active.id):"默认模型";
}
function studyContextLabel(){
  const limit=getContextLimit(),images=getImageLimit();
  return (limit?("最近 "+limit+" 条"):"无限制")+" · "+(images?("图片 "+images+" 张"):"图片不限");
}
function openStudyModal(name){
  $("#study"+name+"Mask").classList.add("on");
  $("#study"+name+"Dialog").classList.add("on");
}
function closeStudyModal(name){
  $("#study"+name+"Mask").classList.remove("on");
  $("#study"+name+"Dialog").classList.remove("on");
  if(name==="Handbook")closeStudyHandbookConfirm();
}
function renderStudySettings(){
  if(!STUDY_SETTINGS)return;
  const targets=$("#studySessionTargets");targets.innerHTML="";
  (STUDY_SETTINGS.sessions||[]).forEach(s=>{
    const label=document.createElement("label");label.className="auto-target";
    label.innerHTML='<input type="radio" name="studyAutoSession"><span></span>';
    const input=label.querySelector("input");input.value=s.id;
    input.checked=String(s.id)===String(STUDY_SETTINGS.target_session_id);
    label.querySelector("span").textContent=s.title||"新的聊天";targets.appendChild(label);
  });
  $("#studyRunBtn").disabled=!studySelectedSessionId();
  const modelValue=$("#studyModelValue");
  if(modelValue)modelValue.textContent=STUDY_SETTINGS.configured?
    (STUDY_SETTINGS.model_name||STUDY_SETTINGS.model||"默认模型"):studyModelLabel();
  const savedLimit=STUDY_SETTINGS.context_limit||60,savedImages=STUDY_SETTINGS.image_limit||4;
  if(document.activeElement!==$("#studyContextInput"))$("#studyContextInput").value=savedLimit;
  if(document.activeElement!==$("#studyImageInput"))$("#studyImageInput").value=savedImages;
  if(document.activeElement!==$("#studyUserNote"))$("#studyUserNote").value=STUDY_SETTINGS.user_note||"";
  $("#studyWakeState").textContent=(STUDY_SETTINGS.user_note||"").trim()?"已放好":"门边的话";
  syncStudyAuto();
  renderStudyHandbooks();
}
function studySelectedSessionId(){return Number($("#studySessionTargets input:checked")?.value)||null;}
function studyContextPayload(){return {
  context_limit:Math.max(1,Math.min(500,+$("#studyContextInput").value||60)),
  image_limit:Math.max(1,Math.min(10,+$("#studyImageInput").value||4)),
};}
function syncStudyAuto(){
  if(!STUDY_SETTINGS)return;
  $("#studyAuto").checked=!!STUDY_SETTINGS.enabled;
  const next=STUDY_SETTINGS.next_wake;
  $("#studyAutoNext").textContent=STUDY_SETTINGS.pending_recovery?"waiting to resume":
    (next?.planned_at?("next "+next.planned_at.slice(5,16)):"sleeping");
  $("#studyAutoOpen").classList.toggle("warn",!!STUDY_SETTINGS.pending_recovery);
  fillModelPicker($("#studyModel"),STUDY_SETTINGS.provider_id,STUDY_SETTINGS.model);
}
function renderStudyHandbooks(){
  const box=$("#studyHandbookFiles");if(!box||!STUDY_SETTINGS)return;
  const files=Array.isArray(STUDY_SETTINGS.handbooks)?STUDY_SETTINGS.handbooks:[];box.innerHTML="";
  $("#studyHandbookCount").textContent=files.length+" / 12 files";
  if(!files.length){box.innerHTML='<div class="study-handbook-empty">还没有放入文件<br>支持 UTF-8 的 .md / .markdown，合计最多 10 万字</div>';return;}
  files.forEach(file=>{
    const row=document.createElement("div");row.className="study-handbook-file";
    row.innerHTML='<span class="study-handbook-file-mark" aria-hidden="true"></span><span class="study-handbook-file-name"></span><button class="study-handbook-file-remove" type="button" aria-label="移除文件">×</button>';
    row.querySelector(".study-handbook-file-name").textContent=file.name;
    row.querySelector(".study-handbook-file-remove").onclick=()=>removeStudyHandbook(file.name);
    box.appendChild(row);
  });
}
function plainStudyMonologue(value){
  return String(value||"")
    .replace(/```[^\n]*\n?/g,"").replace(/```/g,"")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g,"$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g,"$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm,"")
    .replace(/^\s{0,3}>\s?/gm,"")
    .replace(/^\s*(?:[-+*]|\d+[.)])\s+/gm,"")
    .replace(/~~([^~]+)~~/g,"$1")
    .replace(/\*\*\*([^*]+)\*\*\*/g,"$1")
    .replace(/___([^_]+)___/g,"$1")
    .replace(/\*\*([^*]+)\*\*/g,"$1")
    .replace(/__([^_]+)__/g,"$1")
    .replace(/\*([^*]+)\*/g,"$1")
    .replace(/_([^_]+)_/g,"$1")
    .replace(/`([^`]+)`/g,"$1")
    .replace(/\\([\\`*_\[\]{}()#+.!>~-])/g,"$1");
}
function renderStudyRuns(runs){
  FOOTPRINT_RUNS=Array.isArray(runs)?runs:[];renderFootprintCalendar(FOOTPRINT_RUNS);
  const box=$("#tidyFootprintList");box.innerHTML="";
  const active=FOOTPRINT_RUNS.find(r=>r.status==="queued"||r.status==="running");
  $("#studyRunBtn").disabled=!!active||!studySelectedSessionId();
  if(active){
    const state=document.createElement("div");state.className="footprint-run-state";
    state.innerHTML='<span class="pulse"></span><span></span>';
    state.querySelector("span:last-child").textContent=assistantName()+(active.status==="queued"?"正往小房间走……":"在小房间里待一会儿……");
    box.appendChild(state);
  }
  const filtered=FOOTPRINT_RUNS.filter(studyRunIsVisible).filter(run=>{
    const day=studyRunDay(run);return FOOTPRINT_FILTER.day?day===FOOTPRINT_FILTER.day:day.startsWith(FOOTPRINT_FILTER.month);
  }).sort((a,b)=>{
    const aDay=studyRunDay(a),bDay=studyRunDay(b);
    return aDay===bDay?studyRunStamp(b).localeCompare(studyRunStamp(a)):bDay.localeCompare(aDay);
  });
  let shown=0,lastDay="";
  filtered.forEach(run=>{
    const day=studyRunDay(run),events=(Array.isArray(run.activity_log)?run.activity_log:[]).slice()
      .sort((a,b)=>String(a.at||"").localeCompare(String(b.at||"")));
    if(day!==lastDay){
      const heading=document.createElement("div");heading.className="footprint-day-heading";
      heading.textContent=footprintDayLabel(day);box.appendChild(heading);lastDay=day;
    }
    const entry=document.createElement("article");entry.className="footprint-entry";
    const time=document.createElement("div");time.className="footprint-time";
    time.innerHTML='<span class="moon">☾</span><span class="when"></span><span class="kind"></span>';
    const began=studyRunStamp(run),ended=run.completed_at||"";
    const startHm=began.slice(11,16),endHm=ended.slice(11,16);
    time.querySelector(".when").textContent=startHm+(endHm&&endHm!==startHm?" — "+endHm:"");
    time.querySelector(".kind").textContent=String(run.origin||"manual").toUpperCase();
    const title=document.createElement("div");title.className="footprint-title";
    title.textContent=run.title||"一段对话";
    entry.append(time,title);
    if(run.footprint){
      const copy=document.createElement("div");copy.className="footprint-copy";copy.textContent=run.footprint;
      entry.appendChild(copy);
    }else if(run.status==="quiet"){
      const note=document.createElement("div");note.className="footprint-note";note.textContent=assistantPronoun()+"这次没有留下公开足迹。";entry.appendChild(note);
    }
    if(run.handoff){
      const handoff=document.createElement("div");handoff.className="footprint-recap";
      const label=document.createElement("span");label.className="footprint-recap-label";label.textContent="by the pillow";
      const copy=document.createElement("div");copy.className="footprint-recap-copy";copy.textContent=run.handoff;
      handoff.append(label,copy);entry.appendChild(handoff);
    }
    if(run.status==="failed"){
      const note=document.createElement("div");note.className="footprint-note";
      note.style.color="var(--danger)";note.textContent=run.error||"这次没来得及把小房间收好。";entry.appendChild(note);
    }
    if(run.recovered){
      const note=document.createElement("div");note.className="footprint-note";
      note.textContent="这页由首次活动留下的真实工具账本恢复；当时未保存的旁白无法补写。";entry.appendChild(note);
    }
    if(run.used_fallback){
      const note=document.createElement("div");note.className="footprint-note";note.textContent="主通道没接稳，"+assistantPronoun()+"从小房间备用通道走了进来。";entry.appendChild(note);
    }
    if(run.wants_follow_up&&run.follow_up_reason){
      const note=document.createElement("div");note.className="footprint-note";
      note.textContent=assistantPronoun()+"给以后留了一个念头："+run.follow_up_reason;entry.appendChild(note);
    }
    if(run._detail_pending&&run.has_activity){
      const lazy=document.createElement("button");lazy.type="button";lazy.className="study-activity";lazy.textContent="展开小房间里的全部记录";
      lazy.onclick=async()=>{lazy.disabled=true;try{const r=await api("/api/study/runs/"+run.id);if(!r.ok)throw Error();Object.assign(run,await r.json(),{_detail_pending:false});if(entry.isConnected)renderStudyRuns(FOOTPRINT_RUNS);}catch{toast("活动记录暂时没读到，请重试");lazy.disabled=false;}};entry.appendChild(lazy);
    }
    if(events.length){
      const details=document.createElement("details");details.className="study-activity";
      if(run.status==="failed"||run.recovered||run._detail_pending===false)details.open=true;
      const summary=document.createElement("summary");
      const tools=events.filter(e=>e.type==="tool").length;
      const words=events.filter(e=>e.type==="monologue").length;
      summary.textContent="小房间里的全部记录 · "+tools+" 次调用"+(words?" · "+words+" 段 Soliloquy":"");
      summary.onclick=e=>{e.preventDefault();const open=details.dataset.tidyOpen?details.dataset.tidyOpen!=="true":!details.open;
        tidySmoothDetails(details,open,340);};
      details.appendChild(summary);
      const timeline=document.createElement("div");timeline.className="study-activity-timeline";
      events.forEach(event=>{
        const wrap=document.createElement("div");wrap.className="study-event";
        const when=(event.at||"").slice(11,19);
        if(event.type==="monologue"){
          wrap.classList.add("study-monologue-event");
          const head=document.createElement("div");head.className="study-event-head";
          head.innerHTML='<span class="event-name">Soliloquy</span><span class="event-time"></span>';
          head.querySelector(".event-time").textContent=when;
          const text=document.createElement("div");text.className="study-monologue";text.textContent=plainStudyMonologue(event.text);
          wrap.append(head,text);
        }else if(event.type==="tool"){
          wrap.classList.add("study-tool-row");
          const toolDetails=document.createElement("details");toolDetails.className="study-tool-event";
          toolDetails.classList.toggle("error",event.status==="error");
          const toolSummary=document.createElement("summary");toolSummary.className="study-event-head";
          const name=document.createElement("span");name.className="event-name";name.textContent=(event.source==="builtin"?String(event.narrate||"").replace(/^Morrow(?=在|正在|把|回去|展开|翻|轻轻)/,""):event.narrate)||event.display_tool||event.name||"工具";
          const stamp=document.createElement("span");stamp.className="event-time";
          stamp.textContent=(event.display_tool||event.name||"工具")+(Number(event.duration_ms)>0?" · "+event.duration_ms+"ms":"");
          stamp.title=when?"发生于 "+when:"";toolSummary.append(name,stamp);toolDetails.appendChild(toolSummary);
          toolSummary.onclick=e=>{e.preventDefault();const open=toolDetails.dataset.tidyOpen?toolDetails.dataset.tidyOpen!=="true":!toolDetails.open;
            tidySmoothDetails(toolDetails,open,280);};
          const raw=document.createElement("div");raw.className="study-tool-detail";
          const argsLabel=document.createElement("div");argsLabel.className="detail-label";argsLabel.textContent="INPUT";
          const args=document.createElement("pre");args.textContent=JSON.stringify(event.args||{},null,2);
          const resultLabel=document.createElement("div");resultLabel.className="detail-label";resultLabel.textContent=event.status==="error"?"ERROR":"RESULT";
          const result=document.createElement("pre");result.textContent=event.error||event.result||"";
          raw.append(argsLabel,args,resultLabel,result);toolDetails.appendChild(raw);wrap.appendChild(toolDetails);
        }else{
          wrap.classList.add("study-status-row");
          const head=document.createElement("div");head.className="study-event-head";
          head.innerHTML='<span class="event-name">小房间</span><span class="event-time"></span>';
          head.querySelector(".event-time").textContent=when;
          const text=document.createElement("div");text.className="study-status-event";text.textContent=event.text||"";
          wrap.append(head,text);
        }
        timeline.appendChild(wrap);
      });
      details.appendChild(timeline);
      entry.appendChild(details);
    }
    box.appendChild(entry);shown++;
  });
  if(!active&&!shown){
    const hasAny=FOOTPRINT_RUNS.some(studyRunIsVisible),empty=document.createElement("div");empty.className="study-runs-empty";
    empty.textContent=hasAny?(FOOTPRINT_FILTER.day?"这一天没有留下足迹。":"这个月还没有足迹。"):
      "这里还没有足迹。手动叫醒一次后，"+assistantPronoun()+"可以读一会儿、做点什么，也可以安静地回去睡。";
    box.appendChild(empty);
  }
  if(active){
    studyPollTimer=setTimeout(()=>{if(tidyMode==="footprint")loadStudyData();},2500);
  }
}
async function loadStudyData(){
  if(studyPollTimer){clearTimeout(studyPollTimer);studyPollTimer=null;}
  try{
    const [settingsRes,runsRes]=await Promise.all([api("/api/study/settings"),api("/api/study/runs?view=compact")]);
    STUDY_SETTINGS=await settingsRes.json();const runs=await runsRes.json();
    renderStudySettings();renderStudyRuns(Array.isArray(runs)?runs:[]);
  }catch{
    $("#tidyFootprintList").innerHTML='<div class="study-runs-empty">小房间暂时没有接稳。</div>';
  }
}
async function loadStudyWakeSettings(){
  try{const r=await api("/api/study/settings");if(!r.ok)return false;STUDY_SETTINGS=await r.json();renderStudySettings();return true;}
  catch{return false;}
}
async function saveStudySettings(overrides={}){
  if(!STUDY_SETTINGS)return false;
  const r=await api("/api/study/settings",{method:"PUT",body:JSON.stringify({
    target_session_id:studySelectedSessionId(),
    wake_prompt:STUDY_SETTINGS.wake_prompt||"",
    ...overrides,
  })});
  const data=await r.json();if(!r.ok){toast(data.error||"小房间设置保存失败");return false;}
  STUDY_SETTINGS=data;renderStudySettings();return true;
}
$("#studyWakeToggle").onclick=()=>{
  const open=!$("#studyWake").classList.contains("open");$("#studyWake").classList.toggle("open",open);
  tidySmoothPanel($("#studyWakeBody"),open,300);$("#studyWakeToggle").setAttribute("aria-expanded",String(open));
};
$("#studyPromptBtn").onclick=()=>{
  $("#studyPromptText").value=(STUDY_SETTINGS&&STUDY_SETTINGS.wake_prompt)||"";
  openStudyModal("Prompt");setTimeout(()=>$("#studyPromptText").focus(),120);
};
$("#studyPromptCancel").onclick=()=>closeStudyModal("Prompt");
$("#studyPromptMask").onclick=()=>closeStudyModal("Prompt");
$("#studyPromptSave").onclick=async()=>{
  if(!STUDY_SETTINGS)return;
  STUDY_SETTINGS.wake_prompt=$("#studyPromptText").value.trim();
  if(await saveStudySettings({wake_prompt:STUDY_SETTINGS.wake_prompt})){closeStudyModal("Prompt");toast("唤醒提示已保存");}
};
$("#studyUserNoteSave").onclick=async()=>{
  const button=$("#studyUserNoteSave");button.disabled=true;
  try{
    const note=$("#studyUserNote").value.trim();
    if(await saveStudySettings({user_note:note})){
      button.classList.remove("sealed");void button.offsetWidth;button.classList.add("sealed");
      setTimeout(()=>button.classList.remove("sealed"),460);toast(note?"话已经留在门边":"门边的话已经收起");
    }
  }finally{button.disabled=false;}
};
$("#studyAddBtn").onclick=()=>{renderStudySettings();openStudyModal("Handbook");};
$("#studyHandbookClose").onclick=()=>closeStudyModal("Handbook");
$("#studyHandbookMask").onclick=()=>closeStudyModal("Handbook");
$("#studyHandbookChoose").onclick=()=>$("#studyHandbookFile").click();
$("#studyHandbookFile").onchange=async function(){
  const files=[...(this.files||[])];this.value="";if(!files.length)return;
  const form=new FormData();files.forEach(file=>form.append("handbooks",file));
  const r=await fetch("/api/study/handbook",{method:"POST",body:form});
  const data=await r.json();if(!r.ok){toast(data.error||"操作手册没有放进去");return;}
  STUDY_SETTINGS=data;renderStudySettings();toast(files.length>1?(files.length+" 份操作手册已经放好"):"操作手册已经放进小房间");
};
async function removeStudyHandbook(name){
  pendingStudyHandbookRemoval=name;
  $("#studyHandbookConfirmCopy").textContent="把「"+name+"」从小房间拿走吗？\n其他文件和已经完成的足迹不会受影响。";
  $("#studyHandbookConfirm").hidden=false;
}
let pendingStudyHandbookRemoval="";
function closeStudyHandbookConfirm(){pendingStudyHandbookRemoval="";const box=$("#studyHandbookConfirm");if(box)box.hidden=true;}
$("#studyHandbookConfirmCancel").onclick=closeStudyHandbookConfirm;
$("#studyHandbookConfirmRemove").onclick=async()=>{
  const name=pendingStudyHandbookRemoval;if(!name)return;
  const button=$("#studyHandbookConfirmRemove");button.disabled=true;
  try{
    const r=await api("/api/study/handbook",{method:"DELETE",body:JSON.stringify({name})}),data=await r.json();
    if(!r.ok)throw new Error(data.error||"移除失败");STUDY_SETTINGS=data;closeStudyHandbookConfirm();renderStudySettings();toast("操作手册已移除");
  }catch(e){toast(e.message||"移除失败");}
  finally{button.disabled=false;}
};
$("#studyRunBtn").onclick=async()=>{
  const recovering=!!STUDY_SETTINGS?.pending_recovery;
  if(!await bubbleConfirm({
    title:recovering?"接着叫醒Morrow吗？":"现在叫醒Morrow吗？",
    message:recovering?"上一次小房间还没有收好，这次会从完整活动记录接着继续。":assistantPronoun()+"会立刻进入小房间，开始这一轮自由活动。",
    note:"确认后会真实调用当前主模型。",cancelText:"让"+assistantPronoun()+"再睡会",confirmText:recovering?"继续收好":"现在唤醒"
  }))return;
  if(!await saveStudySettings({
    provider_id:(readModelPicker($("#studyModel"))||{}).provider_id??getProviderId(),model:(readModelPicker($("#studyModel"))||{}).model??getModel(),model_name:((readModelPicker($("#studyModel"))||{}).model||studyModelLabel()),think:getThink(),
    ...studyContextPayload(),latest_images_only:getLatestImagesOnly(),cache_ttl:getChatCacheTtl(),
  }))return;
  const button=$("#studyRunBtn");button.disabled=true;button.textContent="正在叫"+assistantPronoun()+"……";
  const r=await api("/api/study/runs",{method:"POST",body:JSON.stringify({
    session_id:studySelectedSessionId(),
    model:getModel(),provider_id:getProviderId(),think:getThink(),...studyContextPayload(),
    latest_images_only:getLatestImagesOnly(),cache_ttl:getChatCacheTtl(),
  })});
  const data=await r.json();button.textContent="现在唤醒一次";
  if(!r.ok){toast(data.error||"这次没有叫醒"+assistantPronoun());await loadStudyData();return;}
  toast(assistantName()+"进小房间了");await loadStudyData();
};
async function openStudyAutoDialog(){
  await loadStudyWakeSettings();
  $("#studyAutoCard").classList.add("open");$("#studyAutoOpen").setAttribute("aria-expanded","true");
}
function closeStudyAutoDialog(){
  $("#studyAutoCard").classList.remove("open");$("#studyAutoOpen").setAttribute("aria-expanded","false");
  void loadStudyWakeSettings();
}
$("#studyAutoOpen").onclick=()=>{
  if($("#studyAutoCard").classList.contains("open"))closeStudyAutoDialog();else openStudyAutoDialog();
};
$("#studyAuto").onchange=async e=>{
  const previous=!!STUDY_SETTINGS?.enabled;
  try{
    if(!STUDY_SETTINGS)await loadStudyWakeSettings();
    STUDY_SETTINGS.enabled=e.target.checked;
    await saveStudySettings({
      enabled:e.target.checked,provider_id:(readModelPicker($("#studyModel"))||{}).provider_id??getProviderId(),model:(readModelPicker($("#studyModel"))||{}).model??getModel(),model_name:((readModelPicker($("#studyModel"))||{}).model||studyModelLabel()),think:getThink(),
      ...studyContextPayload(),latest_images_only:getLatestImagesOnly(),cache_ttl:getChatCacheTtl(),
    });
    toast(e.target.checked?"小房间会在夜里自己亮灯":"小房间自主唤醒已关闭");
  }catch(error){STUDY_SETTINGS.enabled=previous;syncStudyAuto();toast(error.message||"小房间开关没有保存好");}
};
$("#studyAutoSave").onclick=async()=>{
  const button=$("#studyAutoSave");button.disabled=true;
  try{
    if(!studySelectedSessionId()){toast("先选择目标对话");return;}
    if(await saveStudySettings({
      enabled:!!$("#studyAuto").checked,provider_id:(readModelPicker($("#studyModel"))||{}).provider_id??getProviderId(),model:(readModelPicker($("#studyModel"))||{}).model??getModel(),model_name:((readModelPicker($("#studyModel"))||{}).model||studyModelLabel()),think:getThink(),
      ...studyContextPayload(),latest_images_only:getLatestImagesOnly(),cache_ttl:getChatCacheTtl(),
    })){
      toast("小房间唤醒设置已保存");closeStudyAutoDialog();
    }
  }finally{button.disabled=false;}
};

/* ---------- 设置 (localStorage + server data) ---------- */
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d;}catch{return d;}};
const setLS=(k,v)=>saveLocalPreference(k,JSON.stringify(v));
// settings drilldown: 入口列表 ↔ 子页
const settingsLayerTransitions=new WeakMap();
function transitionSettingsLayer(stage,current,next,duration=190){
  settingsLayerTransitions.set(stage,(settingsLayerTransitions.get(stage)||0)+1);
  [...stage.children].forEach(el=>el.getAnimations().forEach(animation=>animation.cancel()));
  // Commit the destination in one paint; transparent fades exposed the wallpaper.
  [...stage.children].forEach(el=>el.hidden=el!==next);
  next.hidden=false;stage.classList.remove("settings-transitioning");
}

function showSetPanel(name){
  const home=$("#settings-home"),panels=[...$$(".set-panel")],all=[home,...panels];
  const next=name?$("#set-panel-"+name):home;
  const current=all.find(el=>!el.hidden);
  if(current!==next&&name==="model")showProvList(false);  // enter at the list, not a stale edit form
  if(current!==next&&name==="mcp")showMcpList(false);
  transitionSettingsLayer($("#view-settings"),current,next,190);
  if(name==="mcp")loadMcpServers();
  if(name==="assistant")renderAssistantModels();
  if(name==="tts")loadTtsSettings();
  if(name==="httplog")renderHttpLogs();
  if(name==="data"){loadGithubBackupStatus();loadNookVersion();}
  $("#view-settings").scrollTop=0;
}
async function loadNookVersion(){
  const target=$("#nookVersion");if(!target)return;
  try{const response=await api("/api/version"),data=await response.json();if(!response.ok)throw new Error();
    target.textContent="sakie "+(data.version||"v0.1.0");
  }catch{target.textContent="sakie · 暂时没有读到版本";}
}
$$(".set-entry").forEach(b=>b.onclick=()=>navigateSetPanel(b.dataset.panel));
$$(".set-back").forEach(b=>b.onclick=()=>backToAppLevel(1,()=>showSetPanel(null)));
let TTS_STATE={name:"ElevenLabs",api_url:"https://api.elevenlabs.io",model:"eleven_v3",voice_id:"",voice_name:"",has_api_key:false,
  stability:.45,similarity_boost:.75,style:.15,speed:.88,use_speaker_boost:true};
let TTS_MODELS=[];
let ttsAudioUrl="";
function ttsFormPayload(){return {
  name:$("#ttsName").value.trim(),api_key:$("#ttsKey").value.trim(),api_url:$("#ttsUrl").value.trim(),
  model:$("#ttsModel").value,voice_id:$("#ttsVoiceId").value.trim(),voice_name:TTS_STATE.voice_name||"",
  stability:Number($("#ttsStability").value),similarity_boost:Number($("#ttsSimilarity").value),
  style:Number($("#ttsStyle").value),speed:Number($("#ttsSpeed").value),use_speaker_boost:$("#ttsSpeakerBoost").checked
};}
function renderTtsAdvanced(){
  const values=[
    ["#ttsStability","#ttsStabilityValue",TTS_STATE.stability??.45,""],
    ["#ttsSimilarity","#ttsSimilarityValue",TTS_STATE.similarity_boost??.75,""],
    ["#ttsStyle","#ttsStyleValue",TTS_STATE.style??.15,""],
    ["#ttsSpeed","#ttsSpeedValue",TTS_STATE.speed??.88,"×"]
  ];
  values.forEach(([rangeId,outputId,value,suffix])=>{const range=$(rangeId);range.value=Number(value).toFixed(2);
    $(outputId).textContent=Number(range.value).toFixed(2)+suffix;syncRangeFill(range);});
  $("#ttsSpeakerBoost").checked=TTS_STATE.use_speaker_boost!==false;
  $("#ttsAdvancedSummary").textContent=Number($("#ttsStability").value).toFixed(2)+" · "+Number($("#ttsSpeed").value).toFixed(2)+"×";
}
function setTtsConnection(message,type=""){
  const el=$("#ttsConnectState");el.textContent=message;el.className="tts-connect-state"+(type?" "+type:"");
}
function setTtsModelOptions(models,current){
  const select=$("#ttsModel"),items=Array.isArray(models)?models:[];
  const unique=new Map(items.filter(item=>item&&item.id).map(item=>[item.id,item]));
  if(current&&!unique.has(current))unique.set(current,{id:current,name:current});
  if(!unique.size)unique.set("eleven_v3",{id:"eleven_v3",name:"Eleven v3"});
  select.innerHTML="";unique.forEach(item=>{const option=document.createElement("option");option.value=item.id;
    option.textContent=item.name&&item.name!==item.id?(item.name+" · "+item.id):item.id;select.appendChild(option);});
  select.value=current&&unique.has(current)?current:[...unique.keys()][0];
  TTS_MODELS=[...unique.values()];$("#ttsModelButton").textContent=select.selectedOptions[0]?.textContent||select.value;
}
$("#ttsModelButton").onclick=()=>openChoiceSheet({title:"TTS 模型",value:$("#ttsModel").value,search:TTS_MODELS.length>8,
  items:TTS_MODELS.map(item=>({value:item.id,label:item.name&&item.name!==item.id?(item.name+" · "+item.id):item.id})),
  onChoose:value=>{$("#ttsModel").value=value;$("#ttsModelButton").textContent=$("#ttsModel").selectedOptions[0]?.textContent||value;}});
async function loadTtsSettings(){
  try{
    const response=await api("/api/tts/settings"),data=await response.json();if(!response.ok)throw new Error(data.error||"读取失败");
    TTS_STATE={...TTS_STATE,...data};$("#ttsName").value=TTS_STATE.name||"ElevenLabs";
    $("#ttsKey").value="";$("#ttsKey").placeholder=TTS_STATE.has_api_key?"已保存，留空保持不变":"填写 ElevenLabs API Key";
    $("#ttsUrl").value=TTS_STATE.api_url||"https://api.elevenlabs.io";setTtsModelOptions([],TTS_STATE.model||"eleven_v3");
    $("#ttsVoiceId").value=TTS_STATE.voice_id||"";renderTtsAdvanced();
    setTtsConnection(TTS_STATE.voice_name?("已连接 · "+TTS_STATE.voice_name):(TTS_STATE.has_api_key?"配置已保存，可以检查音色":"还没有检查连接"),TTS_STATE.voice_name?"ok":"");
  }catch(error){setTtsConnection(error.message||"配置没有读取好","error");}
}
async function saveTtsSettings(quiet=false){
  const payload=ttsFormPayload();if(!payload.name||!payload.api_url){if(!quiet)toast("名称和 API URL 都要填写");return false;}
  try{
    const response=await api("/api/tts/settings",{method:"PUT",body:JSON.stringify(payload)}),data=await response.json();
    if(!response.ok)throw new Error(data.error||"保存失败");TTS_STATE={...TTS_STATE,...data};
    $("#ttsKey").value="";$("#ttsKey").placeholder=TTS_STATE.has_api_key?"已保存，留空保持不变":"填写 ElevenLabs API Key";
    if(!quiet)toast("TTS语音设置已保存");return true;
  }catch(error){toast(error.message||"保存失败");return false;}
}
$("#ttsSave").onclick=()=>saveTtsSettings();
$("#ttsFetchModels").onclick=async()=>{
  const button=$("#ttsFetchModels");button.disabled=true;button.textContent="获取中";
  try{
    const response=await api("/api/tts/models",{method:"POST",body:JSON.stringify(ttsFormPayload())}),data=await response.json();
    if(!response.ok)throw new Error(data.error||"没有拿到模型");if(!data.models?.length)throw new Error("没有发现可用的 TTS 模型");
    const current=$("#ttsModel").value;setTtsModelOptions(data.models,current);toast("拿到了 "+data.models.length+" 个 TTS 模型");
  }catch(error){toast(error.message||"获取模型失败");}finally{button.disabled=false;button.textContent="获取";}
};
$("#ttsCheck").onclick=async()=>{
  const button=$("#ttsCheck");button.disabled=true;setTtsConnection("正在寻找这把声音…");
  try{
    const response=await api("/api/tts/check",{method:"POST",body:JSON.stringify(ttsFormPayload())}),data=await response.json();
    if(!response.ok)throw new Error(data.error||"连接失败");TTS_STATE.voice_name=data.voice?.name||"当前音色";
    setTtsConnection("已找到 · "+TTS_STATE.voice_name,"ok");
    if(data.voice?.preview_url){const player=$("#ttsPlayer");if(ttsAudioUrl){URL.revokeObjectURL(ttsAudioUrl);ttsAudioUrl="";}
      player.src=data.voice.preview_url;$("#ttsPlayerWrap").hidden=false;$("#ttsResultMeta").textContent="官方音色试听 · "+TTS_STATE.voice_name;}
  }catch(error){setTtsConnection(error.message||"连接失败","error");}finally{button.disabled=false;}
};
$("#ttsVoiceId").oninput=()=>{TTS_STATE.voice_name="";setTtsConnection("音色 ID 已改变，请重新检查");};
[$("#ttsStability"),$("#ttsSimilarity"),$("#ttsStyle"),$("#ttsSpeed")].forEach(range=>range.oninput=()=>{
  const output={ttsStability:"#ttsStabilityValue",ttsSimilarity:"#ttsSimilarityValue",ttsStyle:"#ttsStyleValue",ttsSpeed:"#ttsSpeedValue"}[range.id];
  $(output).textContent=Number(range.value).toFixed(2)+(range.id==="ttsSpeed"?"×":"");
  $("#ttsAdvancedSummary").textContent=Number($("#ttsStability").value).toFixed(2)+" · "+Number($("#ttsSpeed").value).toFixed(2)+"×";
});
$("#ttsScript").oninput=()=>{$("#ttsCharCount").textContent=$("#ttsScript").value.length+" / 5000";};
$("#ttsTagList").onclick=event=>{
  const button=event.target.closest("button[data-tag]");if(!button)return;const area=$("#ttsScript"),tag=button.dataset.tag;
  const start=area.selectionStart??area.value.length,end=area.selectionEnd??start;
  area.setRangeText(tag,start,end,"end");area.dispatchEvent(new Event("input"));area.focus();
};
$("#ttsGenerate").onclick=async()=>{
  const text=$("#ttsScript").value.trim(),button=$("#ttsGenerate");if(!text){toast("先写一点想试听的话");return;}
  if(!await saveTtsSettings(true))return;button.disabled=true;button.classList.add("busy");button.textContent="正在生成…";
  try{
    const response=await api("/api/tts/synthesize",{method:"POST",body:JSON.stringify({...ttsFormPayload(),text})});
    if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||"声音没有生成好");}
    const blob=await response.blob();if(ttsAudioUrl)URL.revokeObjectURL(ttsAudioUrl);ttsAudioUrl=URL.createObjectURL(blob);
    const player=$("#ttsPlayer");player.src=ttsAudioUrl;$("#ttsPlayerWrap").hidden=false;
    const cost=response.headers.get("X-TTS-Character-Cost"),chars=response.headers.get("X-TTS-Characters")||String(text.length);
    $("#ttsResultMeta").textContent=[TTS_STATE.model||$("#ttsModel").value,TTS_STATE.voice_name||"当前音色",cost?(cost+" credits"):(chars+" 字符")].join(" · ");
    try{await player.play();}catch{toast("声音好了，点播放就能听");}
  }catch(error){toast(error.message||"声音没有生成好");}finally{button.disabled=false;button.classList.remove("busy");button.textContent="生成并播放";}
};
const ASSISTANTS={
  compress:{model:"assistantCompressModel",prompt:"assistantCompressPrompt",think:"assistantCompressThink",
    pick:"#assistCompressModel",promptBtn:"#assistCompressPrompt",thinkEl:"#assistCompressThink",title:"摘要整理模型提示词"},
  night:{model:"assistantNightModel",think:"assistantNightThink",
    pick:"#assistNightModel",thinkEl:"#assistNightThink"},
  title:{model:"assistantTitleModel",prompt:"assistantTitlePrompt",think:"assistantTitleThink",
    pick:"#assistTitleModel",promptBtn:"#assistTitlePrompt",thinkEl:"#assistTitleThink",title:"标题命名模型提示词"},
  vision:{model:"assistantVisionModel",prompt:"assistantVisionPrompt",think:"assistantVisionThink",
    pick:"#assistVisionModel",promptBtn:"#assistVisionPrompt",thinkEl:"#assistVisionThink",title:"识图模型提示词"},
};
const FRONT_ASSISTANT_KEYS=[],FRONT_ASSISTANT_STORAGE="assistantFrontOnlyModels";
let ASSISTANT_STATE={
  compress:{provider_id:null,model:"",model_name:"",think:false,prompt:"",recent_message_count:20},
  night:{provider_id:null,model:"",model_name:"",think:false,format:"",prompt:""},
  title:{provider_id:null,model:"",model_name:"",think:false,prompt:""},
  vision:{provider_id:null,model:"",model_name:"",think:false,prompt:"",enabled:false,session_ids:[]}
};
let editingAssistPrompt=null;
async function saveAssistantSettings(){
  const local={};FRONT_ASSISTANT_KEYS.forEach(key=>local[key]=ASSISTANT_STATE[key]);
  const payload={compress:ASSISTANT_STATE.compress,night:ASSISTANT_STATE.night,
    title:ASSISTANT_STATE.title,vision:ASSISTANT_STATE.vision};
  try{
    const r=await api("/api/assistant-settings",{method:"PUT",body:JSON.stringify(payload)});
    if(r.ok){
      const saved=await r.json();
      ASSISTANT_STATE.compress=saved.compress||ASSISTANT_STATE.compress;
      ASSISTANT_STATE.night=saved.night||ASSISTANT_STATE.night;
      ASSISTANT_STATE.title=saved.title||ASSISTANT_STATE.title;
      ASSISTANT_STATE.vision=saved.vision||ASSISTANT_STATE.vision;
      saveLocalPreference(FRONT_ASSISTANT_STORAGE,JSON.stringify(local));return true;
    }
  }catch{}
  local.title=ASSISTANT_STATE.title;
  saveLocalPreference(FRONT_ASSISTANT_STORAGE,JSON.stringify(local));return false;
}
async function loadAssistantSettings(){
  const local=LS(FRONT_ASSISTANT_STORAGE,{});
  const legacyTitle=local.title&&typeof local.title==="object"?local.title:null;
  const legacyVision=local.vision&&typeof local.vision==="object"?local.vision:null;
  if(legacyTitle)ASSISTANT_STATE.title={...ASSISTANT_STATE.title,...legacyTitle};
  if(legacyVision)ASSISTANT_STATE.vision={...ASSISTANT_STATE.vision,...legacyVision};
  FRONT_ASSISTANT_KEYS.forEach(key=>{
    if(local[key]&&typeof local[key]==="object")ASSISTANT_STATE[key]={...ASSISTANT_STATE[key],...local[key]};
  });
  let changed=false,serverLoaded=false;
  try{
    const r=await api("/api/assistant-settings");
    if(r.ok){
      serverLoaded=true;
      const saved=await r.json();
      ASSISTANT_STATE.compress=saved.compress||ASSISTANT_STATE.compress;
      ASSISTANT_STATE.night=saved.night||ASSISTANT_STATE.night;
      ASSISTANT_STATE.title=saved.title||ASSISTANT_STATE.title;
      const savedVision=saved.vision||ASSISTANT_STATE.vision;
      ASSISTANT_STATE.vision=savedVision;
      const savedTitle=ASSISTANT_STATE.title;
      if(legacyTitle&&!savedTitle.model&&!savedTitle.prompt&&!savedTitle.think){
        ASSISTANT_STATE.title={...savedTitle,...legacyTitle};changed=true;
      }
      if(legacyVision&&!savedVision.model&&!savedVision.think){
        ASSISTANT_STATE.vision={...savedVision,...legacyVision};changed=true;
      }
    }
    // 第一次后端化时，安静迁移昨天已经存在浏览器里的选择。
    Object.entries(ASSISTANTS).forEach(([key,cfg])=>{
      const oldChoice=readModelChoice(cfg.model),item=ASSISTANT_STATE[key];
      if(!item.model&&oldChoice){item.provider_id=oldChoice.pid;item.model=oldChoice.id;item.model_name=oldChoice.name;changed=true;}
      if(cfg.prompt&&!item.prompt&&(localStorage.getItem(cfg.prompt)||"").trim()){item.prompt=localStorage.getItem(cfg.prompt).trim();changed=true;}
      if(!item.think&&localStorage.getItem(cfg.think)==="1"){item.think=true;changed=true;}
    });
    if(changed)await saveAssistantSettings();
  }catch{}
  if(serverLoaded&&!changed){
    const localOnly={};FRONT_ASSISTANT_KEYS.forEach(key=>localOnly[key]=ASSISTANT_STATE[key]);
    saveLocalPreference(FRONT_ASSISTANT_STORAGE,JSON.stringify(localOnly));
  }
  renderAssistantModels();
}
function renderAssistantModels(){
  Object.entries(ASSISTANTS).forEach(([key,cfg])=>{
    const item=ASSISTANT_STATE[key],pick=$(cfg.pick),promptBtn=$(cfg.promptBtn),think=$(cfg.thinkEl);
    if(pick)pick.querySelector("span").textContent=item.model_name||item.model||"选择模型";
    if(promptBtn)promptBtn.classList.toggle("has",!!(item.prompt||"").trim());
    if(think){think.classList.toggle("on",!!item.think);think.setAttribute("aria-pressed",String(!!item.think));}
  });
  const nightFormat=ASSISTANT_STATE.night.format||
    (PROVIDERS.find(p=>String(p.id)===String(ASSISTANT_STATE.night.provider_id))?.format)||"openai";
  $$("#assistNightFormat button").forEach(button=>{
    const on=button.dataset.format===nightFormat;
    button.classList.toggle("on",on);button.setAttribute("aria-pressed",String(on));
  });
}
function bindAssistantModels(){
  Object.entries(ASSISTANTS).forEach(([key,cfg])=>{
    const pick=$(cfg.pick),promptBtn=$(cfg.promptBtn),think=$(cfg.thinkEl);
    if(pick)pick.onclick=()=>openModelPicker(cfg.model,async choice=>{
      ASSISTANT_STATE[key].provider_id=choice.pid;ASSISTANT_STATE[key].model=choice.id;ASSISTANT_STATE[key].model_name=choice.name;
      await saveAssistantSettings();renderAssistantModels();
    });
    if(promptBtn)promptBtn.onclick=()=>openAssistPrompt(key);
    if(think)think.onclick=async()=>{ASSISTANT_STATE[key].think=!ASSISTANT_STATE[key].think;
      await saveAssistantSettings();renderAssistantModels();};
  });
  $("#assistNightFormat").onclick=async event=>{
    const button=event.target.closest("button[data-format]");if(!button)return;
    ASSISTANT_STATE.night.format=button.dataset.format;
    await saveAssistantSettings();renderAssistantModels();
  };
}
async function loadSummaryLogs(){
  const box=$("#tidySummaryList");box.innerHTML='<div class="tidy-empty">加载中…</div>';
  let list=[];try{list=await(await api("/api/tidy/summaries?view=compact")).json();}catch{}
  if(!list.length){box.innerHTML='<div class="tidy-empty">还没有摘要记录。手动或自动把旧对话折进小本本后，会在这里留下版本。</div>';return;}
  box.innerHTML="";
  list.forEach(v=>{
    const day=(v.created_at||"").slice(0,10),hm=(v.created_at||"").slice(11,19);
    const monthIndex=Math.max(0,Math.min(11,Number(day.slice(5,7))-1));
    const dateLabel=day?(FOOTPRINT_MONTH_NAMES[monthIndex].toUpperCase()+" "+Number(day.slice(8,10))+" · "+hm.slice(0,5)):hm.slice(0,5);
    const d=document.createElement("div");d.className="tidy-item summary-log";
    const failed=v.status==="error";d.classList.toggle("error",failed);
    const source=v.source==="sleep"?"睡眠整理":v.source==="auto"?"旧自动整理":v.source==="window"?"换窗":v.source==="branch"?"分支":v.source==="edit"?"手动修订":v.source==="regenerate"?"重新生成":"手动";
    const status={active:"使用中",superseded:"旧版本",reverted:"已回溯",invalidated:"原文已变更",error:"失败"}[v.status]||v.status;
    d.innerHTML='<span class="dot"></span><div class="body"><div class="summary-book-head"><div class="summary-book-date"></div><div class="narr"><span class="n"></span>'+
      '<span class="status-tag"></span><span class="meta"></span></div><button class="result-toggle" aria-label="展开摘要" aria-expanded="false"></button>'+
      '</div><div class="summary-book-reveal" hidden><div class="summary-tech-meta"></div><div class="summary-copy"></div><div class="summary-actions"><button class="summary-edit" type="button">修改摘要</button><button class="summary-regenerate" type="button">重新生成</button><button class="summary-rollback" type="button">回溯到上一版</button><button class="summary-restore" type="button">恢复回溯</button></div></div></div>';
    d.querySelector(".n").textContent=v.title||"对话";
    d.querySelector(".summary-book-date").textContent=dateLabel;
    d.querySelector(".status-tag").textContent=status;
    d.querySelector(".meta").textContent=[source,v.message_count+" 条消息"].filter(Boolean).join(" · ");
    d.querySelector(".summary-tech-meta").textContent=[
      (v.observed_context_tokens||v.estimated_context_tokens)?
        ("请求上下文 "+(v.observed_context_tokens||v.estimated_context_tokens)+(v.observed_context_tokens?" actual":" est.")):null,
      v.estimated_candidate_tokens?("本批原文约 "+v.estimated_candidate_tokens+" tokens"):null,
      "摘要 "+v.target_tokens,"留 "+v.recent_message_count,
      v.source==="auto"&&v.threshold_tokens?("阈值 "+Math.round(v.threshold_tokens/1000)+"k"):null
    ].filter(Boolean).join(" · ");
    d.querySelector(".summary-copy").textContent=failed?(v.error||"这次整理没有成功"):v.summary;
    const toggle=d.querySelector(".result-toggle");
    toggle.onclick=async()=>{if(toggle.disabled)return;if(v._detail_pending){toggle.disabled=true;try{const r=await api("/api/tidy/summaries/"+v.id);if(!r.ok)throw Error();Object.assign(v,await r.json(),{_detail_pending:false});d.querySelector(".summary-copy").textContent=failed?(v.error||"这次整理没有成功"):v.summary;}catch{toast("摘要暂时没读到，请重试");return;}finally{toggle.disabled=false;}}const open=!d.classList.contains("open");d.classList.toggle("open",open);
      toggle.setAttribute("aria-expanded",String(open));toggle.setAttribute("aria-label",open?"收起摘要":"展开摘要");
      tidySmoothPanel(d.querySelector(".summary-book-reveal"),open,320);};
    d.querySelector(".summary-book-head").onclick=e=>{if(!e.target.closest("button"))toggle.click();};
    const active=v.status==="active"&&!failed;
    const edit=d.querySelector(".summary-edit"),regenerate=d.querySelector(".summary-regenerate"),rollback=d.querySelector(".summary-rollback"),restore=d.querySelector(".summary-restore");
    edit.hidden=!active;regenerate.hidden=!active;rollback.hidden=!active;restore.hidden=!v.can_restore;
    edit.onclick=()=>startSummaryEdit(d,v);
    regenerate.onclick=async()=>{
      if(!await bubbleConfirm({title:"重新生成这份摘要",message:"按这份摘要覆盖的原始聊天重新整理一次吗？",
        note:"会调用当前摘要整理模型并产生一次费用；现在这份摘要会保留在版本记录里。",confirmText:"重新生成"}))return;
      regenerate.disabled=true;toast("正在重新整理摘要…");
      try{const r=await api("/api/tidy/summaries/"+v.id+"/regenerate",{method:"POST"}),data=await r.json();
        if(!r.ok)throw new Error(data.error||"重新生成失败");toast("新的摘要已经收好");await loadSummaryLogs();}
      catch(error){toast(error.message||"重新生成失败");regenerate.disabled=false;}
    };
    rollback.onclick=async()=>{
      if(!await bubbleConfirm({title:"回溯这份摘要",message:"恢复到生成它之前的小本本吗？",
        note:"原始聊天不会删除；这个对话的睡眠整理会暂停，等你确认后再开启。",confirmText:"回溯"}))return;
      const r=await api("/api/tidy/summaries/"+v.id+"/rollback",{method:"POST"});
      const data=await r.json();if(!r.ok){toast(data.error||"回溯失败");return;}
      toast("已回到上一份摘要，并暂停这个对话的睡眠整理");loadSummaryLogs();loadAutoCompressionSettings();
    };
    restore.onclick=async()=>{
      if(!await bubbleConfirm({title:"恢复这次回溯？",message:"让这份摘要重新回到原来的位置吗？",
        note:"仅恢复摘要检查点，不会改变原始聊天。",confirmText:"恢复"}))return;
      const r=await api("/api/tidy/summaries/"+v.id+"/restore-rollback",{method:"POST"}),data=await r.json();
      if(!r.ok){toast(data.error||"恢复失败");return;}
      toast("这份摘要已经回到原来的位置");await loadSummaryLogs();await loadAutoCompressionSettings();
    };
    if(v.can_delete)attachLongPress(d,()=>openSheet([{label:"删除摘要版本",svg:SVG_TRASH,danger:true,fn:async()=>{
      if(!await bubbleConfirm({title:"删除这份摘要记录？",message:"这份旧版本会从摘要账本中移除。",note:"当前使用中的摘要和原始聊天不会受影响。",confirmText:"删除",danger:true}))return;
      const r=await api("/api/tidy/summaries/"+v.id,{method:"DELETE"}),data=await r.json().catch(()=>({}));
      if(!r.ok){toast(data.error||"删除失败");return;}toast("旧摘要记录已删除");await loadSummaryLogs();
    }}]));
    box.appendChild(d);
  });
}
$("#tidyMenuBtn").onclick=()=>setTidyDrawer(!$("#tidyDrawer").classList.contains("open"));
$("#tidyDrawerMask").onclick=()=>setTidyDrawer(false);
$("#tidyCabinetToggle").onclick=()=>{const open=$("#tidyCabinetToggle").getAttribute("aria-expanded")!=="true";
  $("#tidyCabinetToggle").setAttribute("aria-expanded",String(open));tidySmoothPanel($("#tidyCabinetChildren"),open,260);};
$("#tidyDrawerToggle").onclick=()=>{const open=$("#tidyDrawerToggle").getAttribute("aria-expanded")!=="true";
  $("#tidyDrawerToggle").setAttribute("aria-expanded",String(open));tidySmoothPanel($("#tidyDrawerChildren"),open,260);};
$("#tidyNav").onclick=e=>{const b=e.target.closest("button[data-mode]");if(b)loadNight(b.dataset.mode);};
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#tidyDrawer").classList.contains("open"))setTidyDrawer(false);});
function openAssistPrompt(key,recordHistory=true){
  const cfg=ASSISTANTS[key];if(!cfg)return;
  editingAssistPrompt=key;
  $("#assistPromptTitle").textContent=cfg.title;
  $("#assistPromptText").value=ASSISTANT_STATE[key].prompt||"";
  $("#assistPromptMask").classList.add("on");
  $("#assistPromptCard").classList.add("on");
  if(recordHistory)navigateSettingsDetail({type:"assistant-prompt",panel:"assistant",key});
  setTimeout(()=>$("#assistPromptText").focus(),120);
}
function hideAssistPrompt(){
  editingAssistPrompt=null;
  $("#assistPromptMask").classList.remove("on");
  $("#assistPromptCard").classList.remove("on");
}
function closeAssistPrompt(){backToAppLevel(2,hideAssistPrompt);}
async function saveAssistPrompt(){
  const key=editingAssistPrompt,cfg=ASSISTANTS[key];if(!cfg)return;
  ASSISTANT_STATE[key].prompt=$("#assistPromptText").value.trim();
  await saveAssistantSettings();
  closeAssistPrompt();renderAssistantModels();
}
$("#assistPromptCancel").onclick=closeAssistPrompt;
$("#assistPromptMask").onclick=closeAssistPrompt;
$("#assistPromptSave").onclick=saveAssistPrompt;
bindAssistantModels();
function loadSettings(){
  showSetPanel(null);  // always land on the entry list
  syncPrefUI();loadProviders();loadAssistantSettings();loadTtsSettings();loadMcpServers();renderUsageDashboard();
  loadWeatherCity();loadPushPrefs();loadAutoCompressionSettings();loadAutoVisionSettings();loadProactiveSettings();loadAlarmSettings();loadStudyWakeSettings();
}
let PROACTIVE_STATE={enabled:false,target_session_id:null,sessions:[],unread_count:0,job:null};
function modelPickerOptions(){
  const out=[];
  (PROVIDERS||[]).forEach(p=>{(p.models||[]).forEach(m=>{const id=String(m.id||"");if(id)out.push({value:p.id+"::"+id,label:p.name+" · "+id});});});
  return out;
}
function fillModelPicker(select,providerId,model){
  if(!select)return;
  const options=modelPickerOptions();
  const current=String(providerId==null?"":providerId)+"::"+String(model||"");
  select.innerHTML="";
  if(model&&!options.some(o=>o.value===current)){
    const opt=document.createElement("option");opt.value=current;opt.textContent="当前："+model;select.appendChild(opt);
  }
  options.forEach(o=>{const opt=document.createElement("option");opt.value=o.value;opt.textContent=o.label;select.appendChild(opt);});
  if(model)select.value=current;
}
function readModelPicker(select){
  const raw=(select&&select.value)||"";const cut=raw.indexOf("::");
  if(cut<0)return null;
  const pid=Number(raw.slice(0,cut)),model=raw.slice(cut+2);
  if(!Number.isFinite(pid)||!model)return null;
  return {provider_id:pid,model:model,model_name:model};
}
function proactiveRuntimePayload(){const picked=readModelPicker($("#proactiveModel"));return {
  provider_id:picked?picked.provider_id:getProviderId(),model:picked?picked.model:getModel(),model_name:picked?picked.model:studyModelLabel(),think:getThink(),
  context_limit:+PROACTIVE_STATE.context_limit||20,image_limit:getImageLimit(),latest_images_only:getLatestImagesOnly(),cache_ttl:getChatCacheTtl(),
};}
function renderProactiveTargets(){
  const box=$("#proactiveTargets");if(!box)return;box.innerHTML="";
  const sessions=PROACTIVE_STATE.sessions||[];
  if(!sessions.length){box.innerHTML='<div class="caption" style="padding:8px 2px">还没有可以选择的对话。</div>';return;}
  sessions.forEach(s=>{
    const label=document.createElement("label");label.className="auto-target";
    label.innerHTML='<input type="radio" name="proactiveSession"><span></span>';
    const input=label.querySelector("input");input.value=s.id;input.checked=+s.id===+PROACTIVE_STATE.target_session_id;
    label.querySelector("span").textContent=s.title||"新的聊天";box.appendChild(label);
  });
}
function startSummaryEdit(card,version){
  const copy=card.querySelector(".summary-copy"),actions=card.querySelector(".summary-actions");
  const textarea=document.createElement("textarea");textarea.className="summary-edit-box";textarea.maxLength=100000;
  textarea.value=version.summary||"";copy.replaceWith(textarea);
  actions.innerHTML='<button class="summary-edit-cancel" type="button">取消</button><button class="summary-edit-save" type="button">保存为新版本</button>';
  actions.querySelector(".summary-edit-cancel").onclick=()=>loadSummaryLogs();
  actions.querySelector(".summary-edit-save").onclick=async()=>{
    const summary=textarea.value.trim(),button=actions.querySelector(".summary-edit-save");if(!summary){toast("摘要不能是空白的");return;}
    button.disabled=true;
    try{const r=await api("/api/tidy/summaries/"+version.id+"/edit",{method:"POST",body:JSON.stringify({summary})}),data=await r.json();
      if(!r.ok)throw new Error(data.error||"摘要没有保存好");toast("手动修订已保存为新版本");await loadSummaryLogs();}
    catch(error){toast(error.message||"摘要没有保存好");button.disabled=false;}
  };
  requestAnimationFrame(()=>{textarea.focus();textarea.setSelectionRange(textarea.value.length,textarea.value.length);});
}
function proactiveJobLabel(job){
  if(!PROACTIVE_STATE.enabled)return "switched off";
  if(!job)return "no plan";
  if(job.status==="sent")return "already here";
  if(job.status==="quiet")return "quiet today";
  if(job.status==="running")return "at the door";
  if(job.status==="failed")return "didn't connect";
  if(job.status==="skipped")return "window closed";
  if(job.status!=="planned"||!job.planned_at)return "no plan";
  const when=new Date(job.planned_at.replace(" ","T")),today=new Date();
  const prefix=when.toDateString()===today.toDateString()?"": "tomorrow ";
  return prefix+String(when.getHours()).padStart(2,"0")+":"+String(when.getMinutes()).padStart(2,"0");
}
function renderProactiveSummary(){
  const toggle=$("#proactiveToggle");if(!toggle)return;
  toggle.checked=!!PROACTIVE_STATE.enabled;
  $("#proactiveState").textContent=proactiveJobLabel(PROACTIVE_STATE.job);
  const wanted=!!PROACTIVE_STATE.job?.wanted,button=$("#wantAssistant");
  button.classList.toggle("on",wanted);button.setAttribute("aria-pressed",String(wanted));
  button.textContent=wanted?"想念放好了":"想"+assistantPronoun();button.disabled=!PROACTIVE_STATE.enabled;
  $("#chatBadge").classList.toggle("on",Number(PROACTIVE_STATE.unread_count)>0);
  $$("#proactiveContext button").forEach(item=>item.classList.toggle("on",+item.dataset.value===+(PROACTIVE_STATE.context_limit||20)));
  fillModelPicker($("#proactiveModel"),PROACTIVE_STATE.provider_id,PROACTIVE_STATE.model);
}
$("#proactiveContext").onclick=e=>{const button=e.target.closest("button[data-value]");if(!button)return;PROACTIVE_STATE.context_limit=+button.dataset.value;renderProactiveSummary();};
async function loadProactiveSettings(){
  try{const r=await api("/api/proactive/settings"),data=await r.json();if(!r.ok)throw new Error(data.error||"读取失败");
    PROACTIVE_STATE=data;renderProactiveTargets();renderProactiveSummary();
  }catch(e){/* 后台状态不挡设置页 */}
}
function openProactiveConfig(){
  $("#proactiveCard").classList.add("open");$("#proactiveOpen").setAttribute("aria-expanded","true");
  loadProactiveSettings();
}
function closeProactiveConfig(){
  $("#proactiveCard").classList.remove("open");$("#proactiveOpen").setAttribute("aria-expanded","false");
}
$("#proactiveOpen").onclick=()=>$("#proactiveCard").classList.contains("open")?closeProactiveConfig():openProactiveConfig();
$("#proactiveToggle").onchange=async e=>{
  const enabled=e.target.checked;e.target.disabled=true;
  try{const r=await api("/api/proactive/settings",{method:"PUT",body:JSON.stringify({enabled,...proactiveRuntimePayload()})});
    const data=await r.json();if(!r.ok)throw new Error(data.error||"保存失败");PROACTIVE_STATE=data;renderProactiveTargets();renderProactiveSummary();
    toast(enabled?"主动消息已经打开":"主动消息已经合上");
  }catch(err){e.target.checked=!enabled;toast(err.message||"保存失败");}finally{e.target.disabled=false;}
};
$("#proactiveSave").onclick=async()=>{
  const button=$("#proactiveSave"),selected=$("#proactiveTargets input:checked");
  if(!selected){toast("先选择一个目标对话");return;}button.disabled=true;
  try{const r=await api("/api/proactive/settings",{method:"PUT",body:JSON.stringify({
      enabled:!!$("#proactiveToggle").checked,target_session_id:+selected.value,...proactiveRuntimePayload(),
    })}),data=await r.json();if(!r.ok)throw new Error(data.error||"保存失败");
    PROACTIVE_STATE=data;renderProactiveTargets();renderProactiveSummary();toast("主动消息设置已保存");closeProactiveConfig();
  }catch(e){toast(e.message||"保存失败");}finally{button.disabled=false;}
};
$("#wantAssistant").onclick=async()=>{
  if(!PROACTIVE_STATE.enabled){toast("先打开主动消息");return;}
  const button=$("#wantAssistant"),wanted=!PROACTIVE_STATE.job?.wanted;button.disabled=true;
  try{const r=await api("/api/proactive/want",{method:"PUT",body:JSON.stringify({wanted})}),data=await r.json();
    if(!r.ok)throw new Error(data.error||"没能放好这份想念");PROACTIVE_STATE=data;renderProactiveSummary();
    toast(wanted?"想念已经轻轻放在这里":"这份想念先收回来了");
  }catch(e){toast(e.message||"没能放好这份想念");}finally{button.disabled=!PROACTIVE_STATE.enabled;}
};
let ALARM_STATE={enabled:false,target_session_id:null,context_limit:20,sessions:[],pending_count:0};
function alarmRuntimePayload(){const picked=readModelPicker($("#alarmModel"));return {provider_id:picked?picked.provider_id:getProviderId(),model:picked?picked.model:getModel(),think:getThink(),context_limit:+ALARM_STATE.context_limit||20,image_limit:getImageLimit(),latest_images_only:getLatestImagesOnly(),cache_ttl:getChatCacheTtl()};}
function renderAlarmSettings(){
  if(!$("#alarmToggle"))return;$("#alarmToggle").checked=!!ALARM_STATE.enabled;$("#alarmState").textContent=(+ALARM_STATE.pending_count||0)+" waiting";
  $$("#alarmContext button").forEach(button=>button.classList.toggle("on",+button.dataset.value===+(ALARM_STATE.context_limit||20)));
  fillModelPicker($("#alarmModel"),ALARM_STATE.provider_id,ALARM_STATE.model);
  const box=$("#alarmTargets");box.innerHTML="";(ALARM_STATE.sessions||[]).forEach(session=>{const label=document.createElement("label");label.className="auto-target";const input=document.createElement("input");input.type="radio";input.name="alarmTarget";input.value=session.id;input.checked=+session.id===+ALARM_STATE.target_session_id;const title=document.createElement("span");title.textContent=session.title||"未命名对话";label.append(input,title);box.appendChild(label);});if(!box.children.length)box.innerHTML='<div class="caption" style="padding:8px 2px">还没有可以选择的对话。</div>';
}
async function loadAlarmSettings(){try{const r=await api("/api/alarms/settings"),data=await r.json();if(!r.ok)throw new Error();ALARM_STATE=data;renderAlarmSettings();}catch{}}
$("#alarmContext").onclick=e=>{const button=e.target.closest("button[data-value]");if(!button)return;ALARM_STATE.context_limit=+button.dataset.value;renderAlarmSettings();};
$("#alarmOpen").onclick=()=>{const open=!$("#alarmCard").classList.contains("open");$("#alarmCard").classList.toggle("open",open);$("#alarmOpen").setAttribute("aria-expanded",String(open));if(open)loadAlarmSettings();};
$("#alarmToggle").onchange=async e=>{const enabled=e.target.checked;e.target.disabled=true;try{const r=await api("/api/alarms/settings",{method:"PUT",body:JSON.stringify({enabled,...alarmRuntimePayload()})}),data=await r.json();if(!r.ok)throw new Error(data.error||"保存失败");ALARM_STATE=data;renderAlarmSettings();toast(assistantName()+(enabled?"闹钟已经打开":"闹钟先合上了"));}catch(error){e.target.checked=!enabled;toast(error.message||"保存失败");}finally{e.target.disabled=false;}};
$("#alarmSave").onclick=async()=>{const selected=$("#alarmTargets input:checked"),button=$("#alarmSave");if(!selected){toast("先选择一个目标对话");return;}button.disabled=true;try{const r=await api("/api/alarms/settings",{method:"PUT",body:JSON.stringify({enabled:!!$("#alarmToggle").checked,target_session_id:+selected.value,...alarmRuntimePayload()})}),data=await r.json();if(!r.ok)throw new Error(data.error||"保存失败");ALARM_STATE=data;renderAlarmSettings();$("#alarmCard").classList.remove("open");$("#alarmOpen").setAttribute("aria-expanded","false");toast(assistantName()+"闹钟设置已保存");}catch(error){toast(error.message||"保存失败");}finally{button.disabled=false;}};
async function markProactiveReadIfHere(){
  const unreadSessions=(PROACTIVE_STATE.unread_session_ids||[]).map(Number);
  if(!sessionId||!unreadSessions.includes(+sessionId)||!Number(PROACTIVE_STATE.unread_count))return;
  try{const r=await api("/api/push/read",{method:"POST",body:JSON.stringify({session_id:sessionId})});
    if(r.ok)await syncProactiveStatus(false);
  }catch(e){/* 下一次轮询再认领 */}
}
async function syncProactiveStatus(refreshChat=false){
  try{const r=await api("/api/proactive/status");if(!r.ok)return;const data=await r.json();
    const hadUnread=Number(PROACTIVE_STATE.unread_count)||0;PROACTIVE_STATE=data;renderProactiveSummary();
    const inTarget=$("#view-chat").classList.contains("active")&&(data.unread_session_ids||[]).map(Number).includes(+sessionId);
    if(refreshChat&&Number(data.unread_count)>0&&inTarget&&!streaming)await loadMessages();
    else if(!hadUnread&&Number(data.unread_count)>0&&inTarget&&!document.hidden&&!streaming)await loadMessages();
  }catch(e){/* 主动消息状态检查保持安静 */}
}
let proactivePollTimer=null;
function startProactivePolling(){
  if(proactivePollTimer)return;void syncProactiveStatus(false);
  proactivePollTimer=setInterval(()=>void syncProactiveStatus(true),30000);
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)void syncProactiveStatus(true);});
let AUTO_COMPRESSION={
  enabled:false,session_ids:[],target_tokens:2000,recent_message_count:20,paused_sessions:{},sessions:[]
};
function applyAutoCompressChoices(){
  [["autoCompressTokens",AUTO_COMPRESSION.target_tokens],
   ["autoCompressRecent",AUTO_COMPRESSION.recent_message_count]].forEach(([id,value])=>{
    $$("#"+id+" button").forEach(b=>b.classList.toggle("on",+b.dataset.value===+value));
  });
}
function renderAutoCompressTargets(){
  const box=$("#autoCompressTargets");box.innerHTML="";
  const sessions=(AUTO_COMPRESSION.sessions||[]).filter(s=>!s.archived);
  if(!sessions.length){box.innerHTML='<div class="caption" style="padding:8px 2px">还没有可以选择的对话。</div>';return;}
  const selected=Number((AUTO_COMPRESSION.session_ids||[])[0]||0);
  sessions.forEach(s=>{
    const label=document.createElement("label");label.className="auto-target";
    label.innerHTML='<input type="radio" name="autoCompressTarget"><span></span><em class="auto-pause" hidden>已暂停</em>';
    label.querySelector("input").value=s.id;label.querySelector("input").checked=selected===+s.id;
    label.querySelector("span").textContent=s.title||"新的聊天";
    label.querySelector(".auto-pause").hidden=!AUTO_COMPRESSION.paused_sessions?.[String(s.id)];
    box.appendChild(label);
  });
}
function syncAutoCompressionSwitch(){
  $("#autoCompress").checked=!!AUTO_COMPRESSION.enabled;
  const selected=(AUTO_COMPRESSION.session_ids||[]).length;
  const paused=Object.keys(AUTO_COMPRESSION.paused_sessions||{}).filter(id=>AUTO_COMPRESSION.session_ids.map(String).includes(id)).length;
  $("#autoSummaryTarget").textContent=AUTO_COMPRESSION.target_tokens+" summary";
  $("#autoSummaryRecent").textContent=AUTO_COMPRESSION.recent_message_count+" recent";
  const config=$("#autoCompressOpen");
  config.classList.toggle("warn",paused>0);
  config.title=paused?selected+" 个目标中有 "+paused+" 个等待确认":
    (selected?selected+" 个目标对话":"还未选择目标对话");
}
async function loadAutoCompressionSettings(){
  try{
    const r=await api("/api/auto-compression");if(!r.ok)return false;
    AUTO_COMPRESSION={...AUTO_COMPRESSION,...await r.json()};syncAutoCompressionSwitch();return true;
  }catch{return false;}
}
async function openAutoCompressDialog(){
  await loadAutoCompressionSettings();applyAutoCompressChoices();renderAutoCompressTargets();
  $("#autoCompressCard").classList.add("open");
  $("#autoCompressOpen").setAttribute("aria-expanded","true");
}
function closeAutoCompressDialog(){
  $("#autoCompressCard").classList.remove("open");
  $("#autoCompressOpen").setAttribute("aria-expanded","false");
  void loadAutoCompressionSettings();
}
async function saveAutoCompression(overrides={}){
  const checked=$("#autoCompressTargets input:checked");
  const selected=checked?[+checked.value]:[];
  const chosen=$("#autoCompressCard").classList.contains("open")?selected:AUTO_COMPRESSION.session_ids;
  const payload={enabled:AUTO_COMPRESSION.enabled,session_ids:chosen,
    target_tokens:AUTO_COMPRESSION.target_tokens,
    recent_message_count:AUTO_COMPRESSION.recent_message_count,
    ...overrides};
  const r=await api("/api/auto-compression",{method:"PUT",body:JSON.stringify(payload)});
  const data=await r.json();if(!r.ok)throw new Error(data.error||"保存失败");
  AUTO_COMPRESSION={...AUTO_COMPRESSION,...data};syncAutoCompressionSwitch();
}
$("#autoCompressOpen").onclick=()=>{
  if($("#autoCompressCard").classList.contains("open"))closeAutoCompressDialog();
  else openAutoCompressDialog();
};
[["autoCompressTokens","target_tokens"],["autoCompressRecent","recent_message_count"]].forEach(([id,key])=>{
  $("#"+id).onclick=e=>{const b=e.target.closest("button[data-value]");if(!b)return;AUTO_COMPRESSION[key]=+b.dataset.value;applyAutoCompressChoices();};
});
$("#autoCompressSave").onclick=async()=>{
  const btn=$("#autoCompressSave");btn.disabled=true;
  try{
    const checked=$("#autoCompressTargets input:checked");
    const selected=checked?[+checked.value]:[];
    if(!selected.length){toast("先选至少一个目标对话");return;}
    AUTO_COMPRESSION.session_ids=selected;
    await saveAutoCompression({resume_session_ids:selected});
    toast("睡眠整理设置已保存");
    closeAutoCompressDialog();
  }catch(e){
    toast(e.message||"保存失败");
  }finally{
    btn.disabled=false;
  }
};
$("#autoCompressLogs").onclick=()=>{closeAutoCompressDialog();tidyMode="summary";navigateMain("night");};
let AUTO_VISION={enabled:false,session_ids:[],sessions:[],total:0,ready:0,pending:0,failed:0};
let visionStatusTimer=null;
function renderAutoVisionTargets(){
  const box=$("#autoVisionTargets");box.innerHTML="";
  const sessions=(AUTO_VISION.sessions||[]).filter(s=>!s.archived);
  if(!sessions.length){box.innerHTML='<div class="caption" style="padding:8px 2px">还没有可以选择的对话。</div>';return;}
  const selected=new Set((AUTO_VISION.session_ids||[]).map(Number));
  sessions.forEach(s=>{
    const label=document.createElement("label");label.className="auto-target";
    label.innerHTML='<input type="checkbox"><span></span>';
    label.querySelector("input").value=s.id;label.querySelector("input").checked=selected.has(s.id);
    label.querySelector("span").textContent=s.title||"新的聊天";box.appendChild(label);
  });
}
function syncAutoVision(){
  $("#autoVision").checked=!!AUTO_VISION.enabled;
  const status=$("#autoVisionStatus");status.innerHTML="";
  [[AUTO_VISION.ready,"ready"],...(AUTO_VISION.pending?[[AUTO_VISION.pending,"pending"]]:[]),
   [AUTO_VISION.failed,"missed"]].forEach(([count,label])=>{
    const pill=document.createElement("span");pill.textContent=count+" "+label;status.appendChild(pill);
  });
  const selected=(AUTO_VISION.session_ids||[]).length;
  $("#autoVisionOpen").title=selected?selected+" 个目标对话":"还未选择目标对话";
}
async function loadAutoVisionSettings(){
  try{
    const r=await api("/api/vision-status");if(!r.ok)return false;
    AUTO_VISION={...AUTO_VISION,...await r.json()};
    ASSISTANT_STATE.vision.enabled=!!AUTO_VISION.enabled;
    ASSISTANT_STATE.vision.session_ids=[...(AUTO_VISION.session_ids||[])];
    syncAutoVision();
    clearTimeout(visionStatusTimer);if(AUTO_VISION.pending)visionStatusTimer=setTimeout(loadAutoVisionSettings,2500);
    return true;
  }catch{return false;}
}
async function saveAutoVisionSettings(overrides={}){
  const payload={enabled:AUTO_VISION.enabled,session_ids:AUTO_VISION.session_ids,...overrides};
  const r=await api("/api/vision-status",{method:"PUT",body:JSON.stringify(payload)});
  const data=await r.json();if(!r.ok)throw new Error(data.error||"保存失败");
  AUTO_VISION={...AUTO_VISION,...data};
  ASSISTANT_STATE.vision.enabled=!!AUTO_VISION.enabled;
  ASSISTANT_STATE.vision.session_ids=[...(AUTO_VISION.session_ids||[])];
  syncAutoVision();return true;
}
async function openAutoVisionDialog(){
  await loadAutoVisionSettings();renderAutoVisionTargets();
  $("#autoVisionCard").classList.add("open");$("#autoVisionOpen").setAttribute("aria-expanded","true");
}
function closeAutoVisionDialog(){
  $("#autoVisionCard").classList.remove("open");$("#autoVisionOpen").setAttribute("aria-expanded","false");
  void loadAutoVisionSettings();
}
$("#autoVisionOpen").onclick=()=>{
  if($("#autoVisionCard").classList.contains("open"))closeAutoVisionDialog();else openAutoVisionDialog();
};
$("#autoVision").onchange=async e=>{
  const previous=!!AUTO_VISION.enabled;AUTO_VISION.enabled=e.target.checked;
  try{await saveAutoVisionSettings();}
  catch(error){AUTO_VISION.enabled=previous;syncAutoVision();toast(error.message||"自动识图开关没有保存好");}
};
$("#autoVisionSave").onclick=async()=>{
  const button=$("#autoVisionSave");button.disabled=true;
  try{
    const selected=[...$$("#autoVisionTargets input:checked")].map(input=>+input.value);
    if(!selected.length){toast("先选至少一个目标对话");return;}
    AUTO_VISION.session_ids=selected;await saveAutoVisionSettings();
    toast("自动识图设置已保存");closeAutoVisionDialog();
  }catch(error){toast(error.message||"保存失败");}
  finally{button.disabled=false;}
};
async function loadWeatherCity(){
  try{const c=await(await api("/api/weather/city")).json();$("#wxCityInput").value=c.city||"";}catch{}
}
$("#wxCitySave").onclick=async()=>{
  const v=$("#wxCityInput").value.trim();
  const r=await api("/api/weather/city",{method:"PUT",body:JSON.stringify({city:v})});
  if(r.ok){toast(v?"城市已更新":"天气已关闭");loadWeather();}else toast("保存失败");
};

/* ---------- Web Push 主动消息推送（每台设备单独订阅） ---------- */
let PUSH_STATE={supported:false,enabled:false,preview:localStorage.getItem("pushPreview")==="1",busy:false};
function isWebPushCapable(){return window.isSecureContext&&
  "serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;}
function pushKeyBytes(value){const pad="=".repeat((4-value.length%4)%4),raw=atob((value+pad).replace(/-/g,"+").replace(/_/g,"/"));
  return Uint8Array.from([...raw].map(char=>char.charCodeAt(0)));}
function pushKeysMatch(subscription,publicKey){
  const actual=subscription?.options?.applicationServerKey;if(!actual)return true;
  const left=new Uint8Array(actual),right=pushKeyBytes(publicKey);
  return left.length===right.length&&left.every((value,index)=>value===right[index]);
}
function pushTimeout(promise,message,ms=15000){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))]);}
async function readyPushRegistration(){
  let registration=await navigator.serviceWorker.getRegistration();
  if(!registration)registration=await pushTimeout(
    navigator.serviceWorker.register("/static/sw.js",{updateViaCache:"none"}),"通知服务没有接稳，请刷新 Morrow 后再试");
  if(registration.active)return registration;
  return pushTimeout(navigator.serviceWorker.ready,"通知服务还没准备好，请刷新 Morrow 后再试");
}
async function requestPushPermission(){
  if(Notification.permission==="granted")return "granted";
  if(Notification.permission==="denied")throw new Error("浏览器已禁止 Morrow 通知，请在地址栏的网站权限中允许通知后再试");
  const permission=await Notification.requestPermission();
  if(permission!=="granted")throw new Error("尚未允许通知，请在浏览器提示中选择允许");
  return permission;
}
async function loadBarkIconPreview(){
  const img=$("#barkIconPreview");if(!img)return;
  try{
    const data=await(await api("/api/push/bark-icon")).json();
    if(data&&data.url){img.src=data.url;img.hidden=false;}
    else {img.hidden=true;img.removeAttribute("src");}
  }catch(error){img.hidden=true;}
}
loadBarkIconPreview();
$("#barkIconInput").addEventListener("change",async event=>{
  const file=event.target.files&&event.target.files[0];
  if(!file)return;
  const form=new FormData();form.append("file",file);
  try{
    const response=await fetch("/api/push/bark-icon",{method:"POST",body:form,credentials:"same-origin"});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"上传失败");
    const preview=$("#barkIconPreview");
    if(preview&&data.url){preview.src=data.url;preview.hidden=false;}
    toast("推送头像已更新");
  }catch(error){toast(error.message||"上传失败");}
});

function syncPushPrefs(message=""){
  const toggle=$("#tgPush"),preview=$("#tgPushPreview"),state=$("#pushPrefState"),test=$("#pushTest");if(!toggle)return;
  const barkReady=!!PUSH_STATE.bark_configured;
  const name=PUSH_STATE.assistant_name||"TA";
  const webRow=$("#pushWebRow");
  if(webRow)webRow.hidden=barkReady;
  if(barkReady)toggle.checked=false;
  const previewCopy=$("#pushPreviewCopy");
  if(previewCopy)previewCopy.textContent="关闭时只显示“"+name+"发来一条消息”";
  if($("#pushPrefState")&&barkReady)$("#pushPrefState").textContent="已改用 Bark 推送，网页通知不需要再开";
  if(barkReady)return;
  toggle.checked=!!PUSH_STATE.enabled;preview.checked=!!PUSH_STATE.preview;
  toggle.disabled=!!PUSH_STATE.busy||!PUSH_STATE.supported;
  preview.disabled=!!PUSH_STATE.busy||!PUSH_STATE.enabled;
  if(test)test.disabled=!!PUSH_STATE.busy||!PUSH_STATE.enabled;
  state.textContent=message||(PUSH_STATE.supported?(PUSH_STATE.enabled?"回复完成或Morrow来找你时，会轻轻提醒":"先打开此开关并允许通知，再点击测试通知"):
    (window.isSecureContext?"当前浏览器未提供推送功能；iPhone 请先添加到主屏幕后打开":"通知需要 HTTPS；本机测试请使用 http://localhost:5151"));
}
async function currentPushSubscription(){const registration=await readyPushRegistration();
  return registration.pushManager.getSubscription();}
async function savePushSubscription(subscription){
  const r=await api("/api/push/subscribe",{method:"POST",body:JSON.stringify({subscription:subscription.toJSON(),preview:PUSH_STATE.preview})});
  if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||"订阅没有保存好");
}
async function loadPushPrefs(){
  PUSH_STATE.supported=isWebPushCapable();
  if(!PUSH_STATE.supported){PUSH_STATE.enabled=false;syncPushPrefs();return;}
  try{
    const registration=await readyPushRegistration();
    const statusResponse=await pushTimeout(api("/api/push/status"),"服务器通知状态读取超时");
    const status=await statusResponse.json();if(!statusResponse.ok||!status.available)throw new Error("服务器推送组件还没有安装好");
    PUSH_STATE.bark_configured=!!status.bark_configured;
    PUSH_STATE.assistant_name=status.assistant_name||"";
    if(PUSH_STATE.bark_configured){PUSH_STATE.enabled=false;syncPushPrefs();return;}
    let subscription=await registration.pushManager.getSubscription();
    if(subscription&&!pushKeysMatch(subscription,status.public_key)){await subscription.unsubscribe();subscription=null;}
    if(!subscription&&Notification.permission==="granted")subscription=await pushTimeout(
      registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pushKeyBytes(status.public_key)}),
      "通知订阅超时，请检查浏览器与服务端网络后再试");
    if(subscription)await savePushSubscription(subscription);
    PUSH_STATE.enabled=!!subscription;syncPushPrefs();
  }
  catch(error){PUSH_STATE.enabled=false;syncPushPrefs(error.message||"暂时没有读到通知状态");}
}
$("#tgPush").onchange=async e=>{
  const want=e.target.checked;
  // Permission must be requested directly inside the tap handler. Awaiting the
  // service worker first loses Android's transient user activation and can
  // suppress the system prompt entirely.
  const permissionPromise=want?requestPushPermission():null;
  PUSH_STATE.busy=true;syncPushPrefs(want?"正在等待通知授权…":"正在关闭…");
  try{
    if(permissionPromise)await permissionPromise;
    const registration=await readyPushRegistration();
    let subscription=await registration.pushManager.getSubscription();
    if(want){
      const status=await pushTimeout(api("/api/push/status"),"服务器通知状态读取超时").then(response=>response.json());
      if(!status.available)throw new Error("服务器推送组件还没有安装好");
      if(!subscription)subscription=await pushTimeout(
        registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pushKeyBytes(status.public_key)}),
        "通知订阅超时，请检查浏览器与服务端网络后再试");
      await savePushSubscription(subscription);PUSH_STATE.enabled=true;toast("Morrow来找你时，会轻轻提醒");
    }else{
      if(subscription){await api("/api/push/subscribe",{method:"DELETE",body:JSON.stringify({endpoint:subscription.endpoint})});await subscription.unsubscribe();}
      PUSH_STATE.enabled=false;toast("已关闭这台设备的主动消息推送");
    }
  }catch(error){PUSH_STATE.enabled=!want;toast(error.message||"推送设置没有保存好");}
  finally{PUSH_STATE.busy=false;syncPushPrefs();}
};
$("#tgPushPreview").onchange=async e=>{
  const previous=PUSH_STATE.preview;PUSH_STATE.preview=e.target.checked;saveLocalPreference("pushPreview",PUSH_STATE.preview?"1":"0");
  PUSH_STATE.busy=true;syncPushPrefs();
  try{const subscription=await currentPushSubscription();if(subscription)await savePushSubscription(subscription);
    toast(PUSH_STATE.preview?"通知会显示Morrow说的话":"通知内容已经藏起来了");}
  catch(error){PUSH_STATE.preview=previous;saveLocalPreference("pushPreview",previous?"1":"0");toast(error.message||"预览设置没有保存好");}
  finally{PUSH_STATE.busy=false;syncPushPrefs();}
};
$("#pushTest").onclick=async()=>{
  const state=$("#pushTestState");state.className="push-test-state";
  PUSH_STATE.busy=true;syncPushPrefs("正在把测试通知送到这台设备…");
  try{
    const subscription=await currentPushSubscription();
    if(!subscription)throw new Error("这台设备还没有通知订阅，请先打开推送开关");
    await savePushSubscription(subscription);
    const response=await pushTimeout(api("/api/push/test",{method:"POST",body:JSON.stringify({endpoint:subscription.endpoint})}),"测试通知请求超时，请检查服务端网络后重试",20000);
    const result=await response.json();if(!response.ok)throw new Error(result.error||"测试通知没有送达");
    state.textContent="已交给浏览器推送服务，请查看系统通知中心";state.classList.add("ok");
  }catch(error){state.textContent=error.message||"测试通知没有送达";state.classList.add("error");}
  finally{PUSH_STATE.busy=false;syncPushPrefs();}
};
let pushDestinationHandled=false;
async function openPushDestination(){
  if(pushDestinationHandled)return;const params=new URLSearchParams(location.search),target=Number(params.get("push_session")||0);if(!target)return;
  pushDestinationHandled=true;
  try{const list=await(await api("/api/chat/sessions")).json(),found=(Array.isArray(list)?list:[]).find(item=>+item.id===target);
    sessionId=target;$("#chatTitle").textContent=found?.title||assistantName();navigateMain("chat");await loadMessages();
    params.delete("push_session");history.replaceState(currentAppRoute()||appRoute(1,"chat"),"",location.pathname+(params.toString()?"?"+params:""));
  }catch{pushDestinationHandled=false;}
}

/* ---------- 偏好设置（主题 / 字号 / 开关，全存本地：本就是"这台设备"的偏好）---------- */
const THEME_BACKGROUNDS={paper:"/static/backgrounds/afternoon-v1.png",green:"/static/backgrounds/new-leaf-v1.png",pink:"/static/backgrounds/letter-v1.png"};
const prefTheme=()=>localStorage.getItem("prefTheme")||"paper";
const prefFont=()=>localStorage.getItem("prefFont")||"15px";
const prefNav=()=>localStorage.getItem("prefNav")!=="0";   // 默认开
const prefDailyChat=()=>localStorage.getItem("prefDailyChat")==="1"||
  (localStorage.getItem("prefDailyChat")===null&&localStorage.getItem("prefNook")==="1");
const prefDailyAvatars=()=>localStorage.getItem("prefDailyAvatars")==="1";
const prefNight=()=>localStorage.getItem("prefNight")==="1";
function themeBackground(){
  const base=prefTheme();
  return {image:Object.hasOwn(THEME_BACKGROUNDS,base)?THEME_BACKGROUNDS[base]:THEME_BACKGROUNDS.paper,
    filter:prefNight()?"brightness(0.28) saturate(0.7)":"none"};
}
function appBgOpacity(){const n=parseInt(localStorage.getItem("appBgOpacity")||"35",10);
  return Number.isFinite(n)?Math.max(0,Math.min(100,n)):35;}
function syncSystemBars(theme){
  /* Android standalone 不可靠地支持透明状态栏；始终给系统栏一个实色主题兜底。
     iOS 的 black-translucent 安装态会忽略这个值，继续让页面背景铺到状态栏下。 */
  const colors={paper:"#edf4ff",dark:"#172231",pink:"#ead4dc",green:"#d8e1d4","pink-dark":"#241d20","green-dark":"#1c211e"};
  const m=$("#themeColor");if(m)m.content=colors[theme]||colors.paper;
  if(m&&$("#view-night")?.classList.contains("active")&&$("#view-night").classList.contains("footprint-mode")){
    const darkPaper=["dark","pink-dark","green-dark"].includes(document.documentElement.dataset.theme||"");
    m.content=getComputedStyle(document.documentElement).getPropertyValue("--foot-bg").trim()||(darkPaper?"#172231":"#edf4ff");
  }
  if(m&&$("#view-chat")?.classList.contains("active")){
    const topbar=getComputedStyle(document.documentElement).getPropertyValue("--surface-raised").trim();
    if(topbar)m.content=topbar;
  }
}
function applyPrefs(){
  const night=prefNight();
  const base=prefTheme();
  const t=night?(base==="green"?"green-dark":base==="pink"?"pink-dark":"dark"):base;
  if(t==="paper")document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme",t);
  syncSystemBars(t);
  document.documentElement.style.setProperty("--chat-fs",prefFont());
  const daily=prefDailyChat(),avatars=daily&&prefDailyAvatars();
  document.body.classList.toggle("ai-bubble",daily);
  document.body.classList.toggle("daily-chat",daily);
  document.body.classList.toggle("daily-avatars",avatars);
  const user=localStorage.getItem("dailyUserAvatar")||"",assistant=localStorage.getItem("dailyAssistantAvatar")||"";
  document.documentElement.style.setProperty("--daily-user-avatar",user?'url("'+user+'")':"none");
  document.documentElement.style.setProperty("--daily-assistant-avatar",assistant?'url("'+assistant+'")':"none");
  $$("#log .row-user").forEach(renderUserBody);
  $$("#log .ai-msg").forEach(wrap=>{setAIBody(wrap);renderReasoning(wrap);renderAIActions(wrap);});
  refreshDailyTimeDividers();
  applyAppBg();
  updateToBottom();
  applyChatBg();
  if(typeof syncComposerSpace==="function")syncComposerSpace();
  const lamp=$("#nightLamp");if(lamp)lamp.classList.toggle("on",night);
}
function syncPrefUI(){
  $$("#themeChips button").forEach(b=>b.classList.toggle("on",b.dataset.v===prefTheme()));
  $$("#fontChips button").forEach(b=>b.classList.toggle("on",b.dataset.v===prefFont()));
  $("#tgNav").checked=prefNav();$("#tgDailyChat").checked=prefDailyChat();$("#tgDailyAvatars").checked=prefDailyAvatars();
  const daily=prefDailyChat(),avatars=prefDailyAvatars(),user=localStorage.getItem("dailyUserAvatar")||"",assistant=localStorage.getItem("dailyAssistantAvatar")||"";
  $("#dailyAvatarPrefs").hidden=false;$("#dailyAvatarPrefs").classList.toggle("open",daily);
  $("#dailyAvatarUploads").hidden=false;$("#dailyAvatarUploads").classList.toggle("open",daily&&avatars);
  $("#dailyUserAvatarPreview").style.backgroundImage=user?'url("'+user+'")':"none";
  $("#dailyAssistantAvatarPreview").style.backgroundImage=assistant?'url("'+assistant+'")':"none";
  $$(".daily-avatar-choice").forEach(button=>{const image=button.dataset.kind==="user"?user:assistant;button.classList.toggle("has-image",!!image);button.classList.toggle("on",button.dataset.kind===dailyAvatarEditing);});
  $("#dailyAvatarActions").hidden=false;$("#dailyAvatarActions").classList.toggle("open",!!dailyAvatarEditing&&daily&&avatars);
  applyAppBg();
  void loadPushPrefs();
  void loadToolIndex();
}
$$("#themeChips button").forEach(b=>b.onclick=()=>{saveLocalPreference("prefTheme",b.dataset.v);applyPrefs();syncPrefUI();});
$$("#fontChips button").forEach(b=>b.onclick=()=>{saveLocalPreference("prefFont",b.dataset.v);applyPrefs();syncPrefUI();});
$("#tgNav").onchange=e=>{saveLocalPreference("prefNav",e.target.checked?"1":"0");updateToBottom();};
$("#tgDailyChat").onchange=e=>{saveLocalPreference("prefDailyChat",e.target.checked?"1":"0");removeLocalPreference("prefNook");applyPrefs();syncPrefUI();};
let dailyAvatarEditing="";
$("#tgDailyAvatars").onchange=e=>{saveLocalPreference("prefDailyAvatars",e.target.checked?"1":"0");if(!e.target.checked)dailyAvatarEditing="";applyPrefs();syncPrefUI();};
$$(".daily-avatar-choice").forEach(button=>button.onclick=()=>{dailyAvatarEditing=button.dataset.kind;syncPrefUI();});
$("#dailyAvatarPick").onclick=()=>$(dailyAvatarEditing==="user"?"#dailyUserAvatarFile":"#dailyAssistantAvatarFile").click();
document.addEventListener("pointerdown",event=>{if(dailyAvatarEditing&&!event.target.closest(".daily-avatar-choice,#dailyAvatarActions")){dailyAvatarEditing="";syncPrefUI();}});
async function saveDailyAvatar(kind,file){
  if(!file)return;try{saveLocalPreference(kind==="user"?"dailyUserAvatar":"dailyAssistantAvatar",await compressDailyAvatar(file));applyPrefs();syncPrefUI();toast("头像已换好");}
  catch{toast("头像保存失败，换张小一点的试试");}
}
$("#dailyUserAvatarFile").onchange=async function(){const f=this.files&&this.files[0];this.value="";await saveDailyAvatar("user",f);};
$("#dailyAssistantAvatarFile").onchange=async function(){const f=this.files&&this.files[0];this.value="";await saveDailyAvatar("assistant",f);};
$("#dailyAvatarClear").onclick=()=>{removeLocalPreference(dailyAvatarEditing==="user"?"dailyUserAvatar":"dailyAssistantAvatar");applyPrefs();syncPrefUI();toast("已恢复默认头像");};
$("#nightLamp").onclick=()=>{saveLocalPreference("prefNight",prefNight()?"0":"1");applyPrefs();syncPrefUI();};
function applyAppBg(){
  const img=localStorage.getItem("appBgImage")||"",op=appBgOpacity(),theme=themeBackground();
  document.documentElement.style.setProperty("--app-bg-image",'url("'+(img||theme.image)+'")');
  document.documentElement.style.setProperty("--app-bg-opacity",img?String(op/100):"0.8");
  document.documentElement.style.setProperty("--app-bg-filter",img?"none":theme.filter);
  const clear=$("#appBgClear"),box=$("#appBgOpacityBox"),range=$("#appBgOpacity"),text=$("#appBgOpacityText");
  if(clear)clear.hidden=!img;if(box)box.hidden=!img;
  if(range){range.value=op;syncRangeFill(range);}if(text)text.textContent="透明度 "+op+"%";
}
$("#appBgPick").onclick=()=>$("#appBgFile").click();
$("#appBgFile").onchange=async function(){
  const f=this.files&&this.files[0];this.value="";if(!f)return;
  try{saveLocalPreference("appBgImage",await compressChatBg(f));applyAppBg();toast("背景图已更新");}
  catch(e){toast("背景图保存失败，换张小一点的试试");}
};
$("#appBgClear").onclick=()=>{removeLocalPreference("appBgImage");applyAppBg();toast("已恢复主题底图");};
$("#appBgOpacity").addEventListener("input",e=>{
  saveLocalPreference("appBgOpacity",String(e.target.value));applyAppBg();
});

/* ---------- 提供商 ---------- */
let PROVIDERS=[];      // cached list from server (also feeds the chat model switcher)
let editingPid=null;   // provider id being edited, or null = adding new
let editModels=[];     // working copy of the model list in the edit form
async function loadProviders(){
  try{const r=await(await api("/api/providers")).json();PROVIDERS=Array.isArray(r)?r:[];}catch{PROVIDERS=[];}
  renderProvList();renderAssistantModels();
}
function renderProvList(){
  const el=$("#provList");if(!el)return;el.innerHTML="";
  if(!PROVIDERS.length){el.innerHTML='<div class="prov-empty caption">还没有供应商。点右上角 ＋ 添加一个。</div>';return;}
  PROVIDERS.forEach(p=>{
    const b=document.createElement("button");b.className="prov-item";
    b.innerHTML='<div class="pinfo"><div class="pname"></div><div class="pmeta"></div></div>'+
      '<span class="chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 6l6 6-6 6"/></svg></span>';
    b.querySelector(".pname").textContent=p.name;
    b.querySelector(".pmeta").textContent=(p.format==="claude"?"Anthropic":"OpenAI")+" · "+(p.models.length?p.models.length+" 个模型":"未加模型");
    b.onclick=()=>openProvEdit(p);el.appendChild(b);
  });
}
function showProvList(animate=true){
  const list=$("#prov-list-view"),edit=$("#prov-edit-view"),current=list.hidden?edit:list;
  if(animate)transitionSettingsLayer($("#set-panel-model"),current,list,175);
  else{list.hidden=false;edit.hidden=true;}
  $("#view-settings").scrollTop=0;
}
function openProvEdit(p,recordHistory=true,animate=true){
  editingPid=p?p.id:null;
  editModels=p?JSON.parse(JSON.stringify(p.models)):[];
  $("#provEditTitle").textContent=p?"编辑提供商":"添加供应商";
  $("#provDel").hidden=!p;
  $("#provFormat").value=p?p.format:"openai";
  $("#provFormatButton").textContent=$("#provFormat").value==="claude"?"Anthropic":"OpenAI";
  $("#provName").value=p?p.name:"";
  $("#provKey").value=p?p.api_key:"";
  $("#provUrl").value=p?p.api_url:"";
  $("#provCache").checked=p?p.cache:false;
  $("#provCacheMode").value=p?(p.cache_mode||"anthropic_explicit_sticky"):"anthropic_explicit_sticky";
  syncProviderCacheModeButton();
  syncCacheRow();renderEditModels();
  const list=$("#prov-list-view"),edit=$("#prov-edit-view");
  if(animate)transitionSettingsLayer($("#set-panel-model"),list,edit,180);
  else{list.hidden=true;edit.hidden=false;}
  $("#view-settings").scrollTop=0;
  if(recordHistory)navigateSettingsDetail({type:"provider",panel:"model",id:p?.id??null});
}
function syncCacheRow(){
  const isClaude=$("#provFormat").value==="claude";
  $("#provCacheRow").hidden=!isClaude;
  $("#provCacheModeField").hidden=!isClaude||!$("#provCache").checked;
}
const PROVIDER_CACHE_MODES=[
  {value:"anthropic_explicit_sticky",label:"Anthropic 显式断点 + 稳定 user_id"},
  {value:"anthropic_explicit",label:"Anthropic 显式断点"},
  {value:"anthropic_auto",label:"Anthropic 自动缓存"}
];
function syncProviderCacheModeButton(){const current=PROVIDER_CACHE_MODES.find(item=>item.value===$("#provCacheMode").value);$("#provCacheModeButton").textContent=current?.label||PROVIDER_CACHE_MODES[0].label;}
$("#provCacheModeButton").onclick=()=>openChoiceSheet({title:"Anthropic 适配格式",value:$("#provCacheMode").value,items:PROVIDER_CACHE_MODES,onChoose:value=>{$("#provCacheMode").value=value;syncProviderCacheModeButton();}});
function modelPriceFields(m){
  const fmt=$("#provFormat").value;
  const id=(m.id||"").toLowerCase();
  const isClaude=fmt==="claude";
  const isGlm=/\bglm|zhipu/.test(id);
  const isDeepseek=/deepseek/.test(id);
  const fields=[
    ["price_input","Input $/1M"],
    ["price_output","Output $/1M"],
    ["price_cache_read","Cache Read $/1M"],
  ];
  let note="";
  if(isClaude){
    fields.push(["price_cache_write","Cache Write 5m $/1M"],["price_cache_write_1h","Cache Write 1h $/1M"]);
    note="Claude cache pricing is ready here; actual cache writes depend on the Anthropic cache path.";
  }else if(isGlm){
    note="GLM hidden cache usually reports reads only, so write pricing is left out.";
  }else{
    fields.push(["price_cache_write","Cache Write $/1M"]);
  }
  if(isDeepseek)note="DeepSeek time pricing is calculated with the saved base price for now.";
  return {fields,note};
}
function renderEditModels(){
  const el=$("#provModels");el.innerHTML="";
  if(!editModels.length){el.innerHTML='<div class="caption" style="padding:4px 2px">还没有模型。点右上「获取」拉一份回来，再点名字改成你想看到的名字。</div>';return;}
  editModels.forEach((m,i)=>{
    const row=document.createElement("div");row.className="model-row";
    row.innerHTML='<div class="model-main"><div class="mcol"><input><div class="mid"></div></div>'+
      '<div class="model-actions"><button class="mexpand" aria-label="价格">›</button></div></div>'+
      '<div class="price-grid"></div><div class="price-note"></div>'+
      '<div class="model-foot"><button class="mdel">Delete model</button></div>';
    const inp=row.querySelector("input");inp.value=m.name;inp.placeholder=m.id;
    inp.oninput=()=>{editModels[i].name=inp.value;};
    row.querySelector(".mid").textContent=m.id;
    row.querySelector(".mdel").onclick=async()=>{
      if(!await bubbleConfirm({
        title:"移除模型",message:"要从这个供应商里移除「"+(m.name||m.id)+"」吗？",
        note:"保存供应商设置后才会正式生效。",confirmText:"移除",danger:true
      }))return;
      editModels.splice(i,1);renderEditModels();
    };
    row.querySelector(".mexpand").onclick=()=>row.classList.toggle("open");
    const spec=modelPriceFields(m),grid=row.querySelector(".price-grid");
    grid.innerHTML=spec.fields.map(([k,label])=>'<div><label>'+label+'</label><input data-k="'+k+'" inputmode="decimal"></div>').join("");
    row.querySelector(".price-note").textContent=spec.note;
    row.querySelectorAll(".price-grid input").forEach(pi=>{
      const k=pi.dataset.k;pi.value=m[k]||"";
      pi.oninput=()=>{editModels[i][k]=pi.value;};
    });
    el.appendChild(row);
  });
}
function setProviderFormat(value){$("#provFormat").value=value;$("#provFormatButton").textContent=value==="claude"?"Anthropic":"OpenAI";syncCacheRow();renderEditModels();}
$("#provFormatButton").onclick=()=>openChoiceSheet({title:"兼容格式",value:$("#provFormat").value,items:[{value:"openai",label:"OpenAI"},{value:"claude",label:"Anthropic"}],onChoose:setProviderFormat});
$("#provCache").onchange=syncCacheRow;
$("#provAdd").onclick=()=>openProvEdit(null);
$(".prov-back").onclick=()=>backToAppLevel(2,showProvList);
function addModelById(id){
  id=(id||"").trim();if(!id)return;
  if(editModels.some(m=>m.id===id)){toast("这个模型已经加过了");return;}
  editModels.push({id,name:id,price_input:"",price_output:"",price_cache_read:"",price_cache_write:"",price_cache_write_1h:""});
  renderEditModels();toast("已加 "+id);
}
function toggleFetchedModel(id){const index=editModels.findIndex(model=>model.id===id);if(index>=0)editModels.splice(index,1);else editModels.push({id,name:id,price_input:"",price_output:"",price_cache_read:"",price_cache_write:"",price_cache_write_1h:""});renderEditModels();}
async function manualAddModel(){
  const id=await bubblePrompt({
    title:"手动添加模型",message:"填写中转站使用的模型 ID。",
    placeholder:"例如 claude-sonnet-4-5",confirmText:"添加"
  });
  if(id!==null)addModelById(id);
}
$("#provFetch").onclick=async()=>{
  const body={api_url:$("#provUrl").value.trim(),api_key:$("#provKey").value.trim(),format:$("#provFormat").value};
  if(!body.api_url){toast("先填 API URL");return;}
  toast("获取中…");
  try{
    const r=await(await api("/api/providers/fetch-models",{method:"POST",body:JSON.stringify(body)})).json();
    if(r.error){toast(r.error);manualAddModel();return;}
    if(!r.models||!r.models.length){toast("没拿到模型，手填一个吧");manualAddModel();return;}
    openChoiceSheet({title:"获取到 "+r.models.length+" 个模型",search:true,closeOnChoose:false,
      items:[{value:"__manual__",label:"✎ 手动填一个"},...r.models.map(id=>({value:id,label:id}))],
      isSelected:value=>value!=="__manual__"&&editModels.some(model=>model.id===value),
      onChoose:value=>{if(value==="__manual__"){closeSheet();manualAddModel();}else toggleFetchedModel(value);}});
  }catch(e){toast("获取失败："+e.message);manualAddModel();}
};
$("#provSave").onclick=async()=>{
  const name=$("#provName").value.trim();if(!name){toast("给供应商起个名字吧");return;}
  const cacheOn=$("#provFormat").value==="claude"&&$("#provCache").checked;
  const body={name,format:$("#provFormat").value,api_key:$("#provKey").value.trim(),
    api_url:$("#provUrl").value.trim(),cache:cacheOn,
    cache_mode:cacheOn?$("#provCacheMode").value:"none",models:editModels};
  try{
    if(editingPid)await api("/api/providers/"+editingPid,{method:"PUT",body:JSON.stringify(body)});
    else await api("/api/providers",{method:"POST",body:JSON.stringify(body)});
    toast("已保存");await loadProviders();backToAppLevel(2,showProvList);
  }catch(e){toast("保存失败："+e.message);}
};
$("#provDel").onclick=async()=>{
  if(!editingPid)return;
  if(!await bubbleConfirm({
    title:"删除供应商",message:"要删掉「"+($("#provName").value.trim()||"这个供应商")+"」吗？",
    note:"其中保存的模型与连接配置也会一起移除。",confirmText:"删除",danger:true
  }))return;
  await api("/api/providers/"+editingPid,{method:"DELETE"});
  toast("已删除");await loadProviders();backToAppLevel(2,showProvList);
};
$("#autoCompress").onchange=async e=>{
  e.stopPropagation();
  const enabled=e.target.checked;
  if(enabled&&!(AUTO_COMPRESSION.session_ids||[]).length){
    e.target.checked=false;await openAutoCompressDialog();AUTO_COMPRESSION.enabled=true;return;
  }
  AUTO_COMPRESSION.enabled=enabled;
  try{await saveAutoCompression({enabled});}catch(err){AUTO_COMPRESSION.enabled=!enabled;syncAutoCompressionSwitch();toast(err.message||"保存失败");}
};
let MCP_SERVERS=[],editingMcpId=null,editingMcpTools=[],editingMcpTransport="",editingMcpStatus="unknown",editingMcpError="",editingMcpHasToken=false,editingMcpClearToken=false;
async function loadMcpServers(){
  try{const r=await(await api("/api/mcp-servers")).json();MCP_SERVERS=Array.isArray(r)?r:[];}catch{MCP_SERVERS=[];}
  renderMcpList();
}
function renderMcpList(){
  const el=$("#mcpList");if(!el)return;el.innerHTML="";
  if(!MCP_SERVERS.length){el.innerHTML='<div class="caption" style="padding:6px 2px">还没有 MCP 服务器。点右上角 ＋ 添加一个。</div>';return;}
  MCP_SERVERS.forEach(m=>{const b=document.createElement("button");b.className="mcp-item";
    b.classList.toggle("on",m.enabled&&m.status==="ok");b.classList.toggle("warn",m.enabled&&m.status!=="ok");
    b.innerHTML='<span class="dot"></span><div class="info"><div class="name"></div><div class="url"></div></div><span class="chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 6l6 6-6 6"/></svg></span>';
    b.querySelector(".name").textContent=m.name;b.querySelector(".url").textContent=m.url;
    b.onclick=()=>openMcpEdit(m);el.appendChild(b);});
}
function showMcpList(animate=true){
  const list=$("#mcp-list-view"),edit=$("#mcp-edit-view"),current=list.hidden?edit:list;
  if(animate)transitionSettingsLayer($("#set-panel-mcp"),current,list,175);
  else{list.hidden=false;edit.hidden=true;}
  $("#view-settings").scrollTop=0;
}
function openMcpEdit(m,recordHistory=true,animate=true){
  editingMcpId=m?m.id:null;editingMcpTools=m?JSON.parse(JSON.stringify(m.tools||[])):[];editingMcpTransport=m?(m.transport||""):"";
  editingMcpStatus=m?(m.status||"unknown"):"unknown";editingMcpError=m?(m.error||""):"";
  editingMcpHasToken=!!(m&&m.has_access_token);editingMcpClearToken=false;
  $("#mcpEditTitle").textContent=m?"编辑 MCP":"添加 MCP";$("#mcpEnabled").checked=m?m.enabled:true;
  $("#mcpEditName").value=m?m.name:"";$("#mcpEditUrl").value=m?m.url:"";$("#mcpNarrate").value=m?(m.narrate||""):"";$("#mcpHint").value=m?(m.catalog_hint||""):"";
  $("#mcpAccessToken").value="";$("#mcpDelete").hidden=!m;renderMcpTokenState();
  $("#mcpTestResult").textContent="";$("#mcpTestResult").className="mcp-test-result";
  $("#mcpTransportNote").textContent=editingMcpTransport?("已自动识别为 "+editingMcpTransport.toUpperCase()):"连接时会自动适配 HTTP / SSE。";
  switchMcpTab("base");renderMcpTools();renderMcpError();
  const list=$("#mcp-list-view"),edit=$("#mcp-edit-view");
  if(animate)transitionSettingsLayer($("#set-panel-mcp"),list,edit,180);
  else{list.hidden=true;edit.hidden=false;}
  $("#view-settings").scrollTop=0;
  if(recordHistory)navigateSettingsDetail({type:"mcp",panel:"mcp",id:m?.id??null});
}
function renderMcpTokenState(){
  const note=$("#mcpTokenNote"),clear=$("#mcpClearToken"),input=$("#mcpAccessToken");
  if(editingMcpClearToken){note.textContent="保存后会清除访问密钥。";input.placeholder="输入新密钥可取消清除";clear.hidden=true;return;}
  note.textContent=editingMcpHasToken?"已保存密钥；留空会保持不变，输入新值会替换。":"密钥只由 Morrow 后端发送，不会提供给模型。";
  input.placeholder=editingMcpHasToken?"已保存，留空保持不变":"用于需要认证的 MCP 服务器";clear.hidden=!editingMcpHasToken;
}
function renderMcpError(){
  const el=$("#mcpConnectionError");el.hidden=!editingMcpError;
  el.textContent=editingMcpError?("最近一次连接失败："+editingMcpError):"";
}
function switchMcpTab(tab){
  $$("#mcpTabs button").forEach(b=>b.classList.toggle("on",b.dataset.tab===tab));
  syncSlidingPill("#mcpTabs");
  requestAnimationFrame(()=>syncSlidingPill("#mcpTabs"));
  $("#mcpBasePane").hidden=tab!=="base";$("#mcpToolsPane").hidden=tab!=="tools";
}
$$("#mcpTabs button").forEach(b=>b.onclick=()=>switchMcpTab(b.dataset.tab));
function renderMcpTools(){
  const el=$("#mcpToolsList");el.innerHTML="";$("#mcpToolsSummary").textContent=editingMcpTools.length?(editingMcpTools.length+" 个工具"):(editingMcpId?"还没有获取工具。":"可以先填 URL，再直接获取工具。");
  editingMcpTools.forEach((t,i)=>{const row=document.createElement("div");row.className="mcp-tool";
    row.innerHTML='<div class="mcp-tool-main"><button class="mcp-tool-expand" aria-label="查看描述">›</button><div class="mcp-tool-name"></div><label class="switch"><input type="checkbox"><span class="slider"></span></label></div><div class="mcp-tool-desc"></div>';
    row.querySelector(".mcp-tool-name").textContent=t.title||t.name;row.querySelector(".mcp-tool-desc").textContent=t.description||"这个工具没有提供描述。";
    const toggle=row.querySelector('input[type="checkbox"]');toggle.checked=t.enabled!==false;toggle.onchange=()=>{editingMcpTools[i].enabled=toggle.checked;};
    row.querySelector(".mcp-tool-expand").onclick=()=>row.classList.toggle("open");el.appendChild(row);});
}
async function saveMcp(stay=true){
  const name=$("#mcpEditName").value.trim(),url=$("#mcpEditUrl").value.trim();if(!name||!url){toast("名称和 URL 都要填写");return null;}
  const token=$("#mcpAccessToken").value.trim();
  const body={name,url,narrate:$("#mcpNarrate").value.trim(),catalog_hint:$("#mcpHint").value.trim(),enabled:$("#mcpEnabled").checked,transport:editingMcpTransport,tools:editingMcpTools};
  if(token)body.access_token=token;else if(editingMcpClearToken)body.clear_access_token=true;
  const path=editingMcpId?"/api/mcp-servers/"+editingMcpId:"/api/mcp-servers",method=editingMcpId?"PUT":"POST";
  const r=await api(path,{method,body:JSON.stringify(body)}),data=await r.json();if(!r.ok){toast(data.error||"保存失败");return null;}
  editingMcpId=data.id;editingMcpStatus=data.status||editingMcpStatus;editingMcpError=data.error||"";editingMcpHasToken=!!data.has_access_token;editingMcpClearToken=false;
  $("#mcpAccessToken").value="";renderMcpTokenState();renderMcpError();$("#mcpDelete").hidden=false;await loadMcpServers();if(!stay)backToAppLevel(2,showMcpList);return data;
}
$("#mcpAdd").onclick=()=>openMcpEdit(null);$(".mcp-back").onclick=async()=>{await loadMcpServers();backToAppLevel(2,showMcpList);};
$("#mcpSave").onclick=async()=>{try{if(await saveMcp(false))toast("已保存");}catch(e){toast("保存失败："+e.message);}};
$("#mcpToolsSave").onclick=async()=>{try{if(await saveMcp(true))toast("工具设置已保存");}catch(e){toast("保存失败："+e.message);}};
$("#mcpTestConnection").onclick=async()=>{
  const url=$("#mcpEditUrl").value.trim(),button=$("#mcpTestConnection"),result=$("#mcpTestResult");
  if(!url){toast("先填写服务器 URL");return;}
  const token=$("#mcpAccessToken").value.trim(),body={server_id:editingMcpId,url};
  if(token)body.access_token=token;if(editingMcpClearToken)body.clear_access_token=true;
  button.disabled=true;button.textContent="连接中…";result.textContent="";result.className="mcp-test-result";
  try{
    const r=await api("/api/mcp-servers/test-connection",{method:"POST",body:JSON.stringify(body)}),data=await r.json();
    if(!r.ok){result.textContent=data.error||"连接失败";result.className="mcp-test-result error";return;}
    result.textContent=(data.transport||"HTTP").toUpperCase()+" 连接正常";result.className="mcp-test-result ok";
  }catch(e){result.textContent="连接失败："+e.message;result.className="mcp-test-result error";}
  finally{button.disabled=false;button.textContent="测试连接";}
};
$("#mcpFetchTools").onclick=async()=>{
  const url=$("#mcpEditUrl").value.trim();if(!url){toast("先填写服务器 URL");return;}toast("正在连接 MCP…");
  const token=$("#mcpAccessToken").value.trim(),body={server_id:editingMcpId,url,tools:editingMcpTools};if(token)body.access_token=token;if(editingMcpClearToken)body.clear_access_token=true;
  try{const r=await api("/api/mcp-servers/discover",{method:"POST",body:JSON.stringify(body)}),data=await r.json();
    if(!r.ok){editingMcpStatus="error";editingMcpError=data.error||"连接失败";renderMcpError();await loadMcpServers();toast(editingMcpError);return;}editingMcpTools=data.tools||[];editingMcpTransport=data.transport||"";editingMcpStatus="ok";editingMcpError="";renderMcpError();
    $("#mcpTransportNote").textContent="已自动识别为 "+editingMcpTransport.toUpperCase();renderMcpTools();toast("已获取 "+editingMcpTools.length+" 个工具");
  }catch(e){toast("连接失败："+e.message);}
};
$("#mcpAccessToken").oninput=e=>{if(e.target.value){editingMcpClearToken=false;renderMcpTokenState();}};
$("#mcpClearToken").onclick=()=>{editingMcpClearToken=true;$("#mcpAccessToken").value="";renderMcpTokenState();};
$("#mcpDelete").onclick=async()=>{
  if(!editingMcpId)return;
  if(!await bubbleConfirm({
    title:"删除 MCP 服务器",message:"要删掉「"+($("#mcpEditName").value.trim()||"这个 MCP 服务器")+"」吗？",
    note:"它提供的工具将不再出现在 Morrow 里。",confirmText:"删除",danger:true
  }))return;
  const r=await api("/api/mcp-servers/"+editingMcpId,{method:"DELETE"}),data=await r.json().catch(()=>({}));
  if(!r.ok){toast(data.error||"删除失败");return;}
  toast("已删除");await loadMcpServers();backToAppLevel(2,showMcpList);
};
function fmtInt(n){return Number(n||0).toLocaleString();}
function fmtCost(n){return "$"+Number(n||0).toFixed(4);}
function fmtTok(n){
  n=Number(n||0);
  if(n>=1000000)return (n/1000000).toFixed(n>=10000000?0:1).replace(/\.0$/,"")+"m";
  if(n>=1000)return (n/1000).toFixed(n>=10000?0:1).replace(/\.0$/,"")+"k";
  return String(n);
}
function shortTime(s){
  const m=(s||"").match(/^\d{4}-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  return m?m[1]+"/"+m[2]+" "+m[3]+":"+m[4]:(s||"").slice(0,11);
}
function providerModelName(providerId, model){
  const p=PROVIDERS.find(x=>String(x.id)===String(providerId));
  const m=p&&(p.models||[]).find(x=>x.id===model);
  return (m&&m.name)||model||"unknown";
}
function cacheFillClass(rate){return rate>=.7?" high":rate>=.3?" mid":"";}
async function renderUsageDashboard(){
  const el=$("#usageDash");el.innerHTML='<div class="glass-card usage-panel"><div class="caption" style="padding:6px 2px">读取中…</div></div>';
  try{
    const [usageRes,monthRes,provRes]=await Promise.all([
      api("/api/usage"),api("/api/usage/month"),api("/api/providers")
    ]);
    const list=await usageRes.json(),s=await monthRes.json(),providers=await provRes.json();
    PROVIDERS=Array.isArray(providers)?providers:PROVIDERS;
    const rate=Number(s.cache_hit_rate||0),pct=Math.round(rate*100);
    const rows=(Array.isArray(list)?list:[]).slice(0,20);
    el.innerHTML='<div class="glass-card usage-panel">'+
      '<div class="dash-title">Cache Monitor</div>'+
      '<div class="monitor-group">'+
      '<div class="cache-meter"><div class="label">Hit Rate</div><div class="cache-bar"><div class="cache-fill'+cacheFillClass(rate)+'" style="width:'+Math.max(0,Math.min(100,pct))+'%"></div></div><div class="pct">'+pct+'%</div></div>'+
      '</div>'+
      '<div class="cache-io-row">'+
      '<div class="cache-io"><span class="k">Read</span><span class="v">'+fmtTok(s.cache_read_input_tokens)+'</span></div>'+
      '<div class="cache-io"><span class="k">Write</span><span class="v">'+fmtTok(s.cache_creation_input_tokens)+'</span></div>'+
      '</div>'+
      '<div class="monthly-row">'+
      '<div class="monthly-item"><div class="v">'+fmtInt(s.cache_hit_requests)+'/'+fmtInt(s.cache_total_requests)+'</div><div class="k">hits/msgs</div></div>'+
      '<div class="monthly-item"><div class="v">'+fmtTok(s.total_tokens)+'</div><div class="k">total tokens</div></div>'+
      '<div class="monthly-item"><div class="v">'+fmtCost(s.cost_usd)+'</div><div class="k">total cost</div></div>'+
      '</div></div>'+
      '<div class="glass-card usage-panel"><div class="dash-title">Requests</div><div id="usageRows"></div></div>';
    const box=$("#usageRows");
    if(!rows.length){box.innerHTML='<div class="caption" style="padding:4px 0">No API requests yet.</div>';return;}
    rows.forEach(u=>{
      const item=document.createElement("div");item.className="request-item";
      item.innerHTML='<div class="item-meta-row"><span class="item-time"></span><span class="item-cost"><span class="dol">$</span><span class="amt"></span></span></div>'+
        '<div class="item-model-name"></div><div class="item-tokens-row"><span class="token-badge in"></span><span class="token-badge out"></span></div>';
      item.querySelector(".item-time").textContent=shortTime(u.created_at);
      item.querySelector(".amt").textContent=Number(u.cost_usd||0).toFixed(4);
      item.querySelector(".item-model-name").textContent=providerModelName(u.provider_id,u.model);
      item.querySelector(".token-badge.in").textContent="In: "+fmtTok(u.input_tokens);
      item.querySelector(".token-badge.out").textContent="Out: "+fmtTok(u.output_tokens);
      box.appendChild(item);
    });
  }catch(e){el.innerHTML='<div class="caption" style="padding:6px 2px">读取失败。</div>';}
}
function fmtBytes(n){
  n=Number(n||0);
  if(n>=1048576)return (n/1048576).toFixed(1).replace(/\.0$/,"")+"MB";
  if(n>=1024)return (n/1024).toFixed(1).replace(/\.0$/,"")+"KB";
  return n+"B";
}
async function renderHttpLogs(){
  const box=$("#httpLogRows");if(!box)return;
  box.innerHTML='<div class="caption" style="padding:6px 2px">读取中…</div>';
  try{
    const rows=await(await api("/api/http-logs")).json();
    box.innerHTML="";
    if(!rows.length){box.innerHTML='<div class="caption" style="padding:4px 0">还没有 HTTP 请求记录。</div>';return;}
    rows.forEach(r=>{
      const item=document.createElement("div");item.className="request-item";
      const code=r.status_code||"ERR",ok=!!r.ok;
      item.innerHTML='<div class="item-meta-row"><span class="item-time"></span><span class="http-status"></span></div>'+
        '<div class="item-model-name"></div><div class="item-tokens-row"><span class="token-badge endpoint"></span><span class="token-badge ms"></span><span class="token-badge size"></span></div>'+
        '<div class="http-error"></div>';
      item.querySelector(".item-time").textContent=shortTime(r.created_at);
      const st=item.querySelector(".http-status");st.classList.toggle("ok",ok);st.textContent=ok?"OK "+code:"FAIL "+code;
      item.querySelector(".item-model-name").textContent=(r.provider_name||"env")+" · "+(r.model||"unknown");
      item.querySelector(".endpoint").textContent=(r.format||"")+(r.msg_count?(" · "+r.msg_count+" msgs"):"");
      item.querySelector(".ms").textContent=(r.elapsed_ms==null?"—":r.elapsed_ms+"ms");
      item.querySelector(".size").textContent=fmtBytes(r.req_bytes);
      const err=(r.error_type?("["+r.error_type+"] "):"")+(r.error||"");
      const errEl=item.querySelector(".http-error");
      if(err)errEl.textContent=err;else errEl.remove();
      box.appendChild(item);
    });
  }catch(e){box.innerHTML='<div class="caption" style="padding:6px 2px">读取失败。</div>';}
}
let conversationExportRange="current";
async function openConversationExport(preserve=false,forceRange=null){
  if(!preserve){exportSelectedSessions.clear();$("#exportReasoning").checked=true;$("#exportAttachments").checked=false;}
  try{HISTORY_LIST=await(await api("/api/chat/sessions")).json();}catch{HISTORY_LIST=[];}
  const activeIds=new Set(HISTORY_LIST.map(s=>s.id));
  exportSelectedSessions=new Set([...exportSelectedSessions].filter(id=>activeIds.has(id)));
  const current=HISTORY_LIST.find(s=>s.id===sessionId);
  conversationExportRange=forceRange||(current?"current":"multiple");
  if(conversationExportRange==="current"&&!current)conversationExportRange="multiple";
  $$('input[name="exportRange"]').forEach(r=>r.checked=r.value===conversationExportRange);
  const currentRadio=$('input[name="exportRange"][value="current"]');if(currentRadio)currentRadio.disabled=!current;
  $("#exportCurrentTitle").textContent=current?(current.title||"新的聊天"):(sessionId?"当前对话已收进归档":"尚未打开对话");
  $("#exportMultipleTitle").textContent=exportSelectedSessions.size?("已选择 "+exportSelectedSessions.size+" 个对话"):"从历史记录中选择";
  updateConversationExportSummary();
  $("#exportChatMask").classList.add("on");$("#exportChatCard").classList.add("on");
}
function closeConversationExport(){$("#exportChatMask").classList.remove("on");$("#exportChatCard").classList.remove("on");}
function selectedConversationIds(){return conversationExportRange==="current"?
  (HISTORY_LIST.some(s=>s.id===sessionId)?[sessionId]:[]):Array.from(exportSelectedSessions);}
function updateConversationExportSummary(){
  const count=selectedConversationIds().length,attachments=$("#exportAttachments").checked;
  $("#exportMultipleTitle").textContent=exportSelectedSessions.size?("已选择 "+exportSelectedSessions.size+" 个对话"):"从历史记录中选择";
  let text="还没有选择对话";
  if(count===1&&!attachments)text="将直接导出 1 个 Markdown 文件";
  else if(count===1)text="将导出为一个 ZIP，内含 Markdown 与附件目录";
  else if(count>1&&!attachments)text="将导出为一个 ZIP，内含 "+count+" 个 Markdown 文件";
  else if(count>1)text="将导出为一个 ZIP，每个对话包含 Markdown 与附件目录";
  $("#exportChatSummary").textContent=text;$("#exportChatGo").disabled=!count;
}
function chooseExportSessions(){closeConversationExport();histSelecting=true;openHistory(true);}
$("#conversationExportBtn").onclick=()=>openConversationExport(false);
$("#exportChatCancel").onclick=closeConversationExport;$("#exportChatMask").onclick=closeConversationExport;
$$('input[name="exportRange"]').forEach(r=>r.onchange=()=>{
  conversationExportRange=r.value;if(r.value==="multiple"){chooseExportSessions();return;}updateConversationExportSummary();
});
$("#exportAttachments").onchange=updateConversationExportSummary;
$("#exportChatGo").onclick=async()=>{
  const ids=selectedConversationIds();if(!ids.length){toast("还没有选择对话");return;}
  const button=$("#exportChatGo");button.disabled=true;toast("正在整理对话…");
  try{
    const r=await api("/api/chat/export",{method:"POST",body:JSON.stringify({session_ids:ids,
      include_reasoning:$("#exportReasoning").checked,include_attachments:$("#exportAttachments").checked})});
    if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error||"导出失败");}
    const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement("a");
    const disposition=r.headers.get("Content-Disposition")||"",match=disposition.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
    a.href=url;a.download=match?decodeURIComponent(match[1]):(ids.length===1?"conversation.md":"conversations.zip");
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    closeConversationExport();toast("对话已导出");
  }catch(e){toast(e.message||"导出失败");button.disabled=false;}
};
let pendingRikkaHubFile=null;
function closeRikkaHubPreview(){
  pendingRikkaHubFile=null;$("#rikkahubPreviewMask").classList.remove("on");$("#rikkahubPreviewCard").classList.remove("on");
}
function rikkahubBusy(on){$("#rikkahubImportBtn").disabled=on;$("#rikkahubPreviewGo").disabled=on;}
$("#rikkahubImportBtn").onclick=()=>$("#rikkahubImportFile").click();
$("#rikkahubImportFile").onchange=async function(){
  const file=this.files&&this.files[0];this.value="";if(!file)return;
  rikkahubBusy(true);toast("正在读 RikkaHub 对话…");
  try{
    const form=new FormData();form.append("conversation",file);
    const r=await fetch("/api/chat/import/rikkahub/preview",{method:"POST",body:form});
    const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"读不到这份对话");
    pendingRikkaHubFile=file;$("#rikkahubPreviewName").textContent=data.title||file.name;
    $("#rikkahubPreviewTime").textContent="RikkaHub 导出于 "+fmtFull((data.exported_at||"").replace("T"," "));
    $("#rikkahubPreviewMessages").textContent=data.messages||0;
    $("#rikkahubPreviewReasoning").textContent=data.reasoning||0;
    $("#rikkahubPreviewImages").textContent=data.attachments||0;
    $("#rikkahubPreviewMask").classList.add("on");$("#rikkahubPreviewCard").classList.add("on");
  }catch(e){pendingRikkaHubFile=null;toast(e.message||"读不到这份对话");}
  finally{rikkahubBusy(false);}
};
$("#rikkahubPreviewCancel").onclick=closeRikkaHubPreview;$("#rikkahubPreviewMask").onclick=closeRikkaHubPreview;
$("#rikkahubPreviewGo").onclick=async()=>{
  if(!pendingRikkaHubFile)return;
  const file=pendingRikkaHubFile;rikkahubBusy(true);toast("正在把对话接回来…");
  try{
    const form=new FormData();form.append("conversation",file);
    const r=await fetch("/api/chat/import/rikkahub",{method:"POST",body:form});
    const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"导入失败");
    closeRikkaHubPreview();HISTORY_LIST=[];sessionId=data.session.id;
    $("#chatTitle").textContent=data.session.title||assistantName();showView("chat");await loadMessages();
    toast("RikkaHub 对话已经接回来了");
  }catch(e){toast(e.message||"导入失败");}
  finally{rikkahubBusy(false);}
};
const BACKUP_LOCAL_KEYS=[
  "activeModel","deepThink","chatCacheTtl","contextLimit","imgLimitOn","imageLimit","latestImagesOnly",
  "chatBgImage","chatBgOpacity","prefTheme","prefFont","prefNav","prefNook","prefDailyChat","prefDailyAvatars","dailyUserAvatar","dailyAssistantAvatar","prefNight","appBgImage","appBgOpacity",
  "assistantCompressModel","assistantCompressPrompt","assistantCompressThink",
  "assistantNightModel","assistantNightPrompt","assistantNightThink","autoCompress"
];
let TOOL_INDEX_STATE={mode:"off",tools:[],groups:[]};
let TOOL_INDEX_OPEN={};
function setToolIndexOpen(open){
  $("#toolIndexCard").classList.toggle("open",open);
  $("#toolIndexToggle").setAttribute("aria-expanded",String(open));
}
$("#toolIndexToggle").onclick=()=>setToolIndexOpen(!$("#toolIndexCard").classList.contains("open"));
function toolIndexAllow(){
  return TOOL_INDEX_STATE.tools.filter(item=>item.kind!=="builtin"&&item.enabled).map(item=>item.name);
}
function toolIndexDeny(){
  return TOOL_INDEX_STATE.tools.filter(item=>item.kind==="builtin"&&!item.enabled).map(item=>item.name);
}
function renderToolIndex(){
  const box=$("#toolIndexGroups");if(!box)return;
  const mode=TOOL_INDEX_STATE.mode==="on";
  $("#toolIndexMode").checked=mode;
  $("#toolIndexDot").className="dot"+(mode?" ok":"");
  $("#toolIndexStatus").textContent=mode
    ?("已开启：每轮只发目录，共 "+TOOL_INDEX_STATE.tools.length+" 个工具")
    :"已关闭：每轮发送全部工具说明。";
  box.innerHTML="";
  (TOOL_INDEX_STATE.groups||[]).forEach(group=>{
    const wrap=document.createElement("div");
    wrap.className="ti-group"+(TOOL_INDEX_OPEN[group.key]?" open":"");
    const head=document.createElement("div");head.className="ti-group-head";
    head.innerHTML='<span class="ti-chev">▸</span><span class="ti-label"></span>'+
      '<span class="ti-count"></span>'+
      '<label class="ti-switch" title="整组开关"><input type="checkbox"><span></span></label>';
    head.querySelector(".ti-label").textContent=group.label;
    head.querySelector(".ti-count").textContent=group.enabled+"/"+group.total;
    const toggle=head.querySelector("input");
    toggle.checked=group.enabled>0;
    toggle.indeterminate=group.enabled>0&&group.enabled<group.total;
    toggle.disabled=!mode;
    toggle.onchange=e=>{
      void saveToolGroup(group.key,e.target.checked);
    };
    head.onclick=e=>{
      if(e.target.closest(".ti-switch"))return;
      TOOL_INDEX_OPEN[group.key]=!TOOL_INDEX_OPEN[group.key];
      renderToolIndex();
    };
    wrap.appendChild(head);
    const body=document.createElement("div");body.className="ti-body";
    TOOL_INDEX_STATE.tools.filter(item=>item.group.key===group.key).forEach(item=>{
      const row=document.createElement("label");row.className="ti-row";
      row.innerHTML='<input type="checkbox"><span class="ti-name"></span><span class="ti-hint"></span>';
      const box=row.querySelector("input");
      box.checked=!!item.enabled;box.disabled=!mode;
      row.querySelector(".ti-name").textContent=item.name;
      row.querySelector(".ti-hint").textContent=item.hint||"";
      box.onchange=e=>{
        const allow=toolIndexAllow().filter(name=>name!==item.name);
        const deny=toolIndexDeny().filter(name=>name!==item.name);
        if(item.kind==="builtin"){if(!e.target.checked)deny.push(item.name);}
        else if(e.target.checked)allow.push(item.name);
        void saveToolIndex({mode:TOOL_INDEX_STATE.mode,allow,deny});
      };
      body.appendChild(row);
    });
    wrap.appendChild(body);
    box.appendChild(wrap);
  });
}
function applyToolIndexPayload(data){
  TOOL_INDEX_STATE={mode:data.mode,tools:data.tools||[],groups:data.groups||[]};
  renderToolIndex();
}
async function loadToolIndex(){
  try{
    const r=await api("/api/tool-index");if(!r.ok)throw new Error("读取失败");
    applyToolIndexPayload(await r.json());
  }catch(error){const status=$("#toolIndexStatus");if(status)status.textContent=error.message||"读取失败";}
}
async function saveToolIndex(payload){
  try{
    const r=await api("/api/tool-index",{method:"PUT",body:JSON.stringify(payload)});
    const data=await r.json();if(!r.ok)throw new Error(data.error||"保存失败");
    applyToolIndexPayload(data);
  }catch(error){toast(error.message||"保存失败");void loadToolIndex();}
}
async function saveToolGroup(key,enabled){
  try{
    const r=await api("/api/tool-index/group",{method:"POST",body:JSON.stringify({key,enabled})});
    const data=await r.json();if(!r.ok)throw new Error(data.error||"保存失败");
    applyToolIndexPayload(data);
    toast(enabled?"这一组已开启":"这一组已关闭");
  }catch(error){toast(error.message||"保存失败");void loadToolIndex();}
}
$("#toolIndexMode").onchange=e=>{void saveToolIndex({mode:e.target.checked?"on":"off",allow:toolIndexAllow(),deny:toolIndexDeny()});};

let GITHUB_BACKUP_STATUS=null;
function setGithubBackupOpen(open){
  $("#githubBackupCard").classList.toggle("open",open);
  $("#githubBackupToggle").setAttribute("aria-expanded",String(open));
}
$("#githubBackupToggle").onclick=()=>setGithubBackupOpen(!$("#githubBackupCard").classList.contains("open"));
function renderGithubBackupStatus(){
  const dot=$("#githubBackupDot"),text=$("#githubBackupStatus"),test=$("#githubBackupTestBtn"),
    create=$("#githubBackupCreateBtn"),restore=$("#githubBackupRestoreBtn"),auto=$("#githubBackupAuto"),autoText=$("#githubBackupAutoText");
  if(!dot||!text)return;dot.className="dot";
  if(!GITHUB_BACKUP_STATUS?.configured){
    dot.classList.add("bad");text.textContent="服务器尚未填写 GitHub 仓库、Token 与备份口令。";
    test.disabled=true;create.disabled=true;restore.disabled=true;auto.disabled=true;auto.checked=false;return;
  }
  dot.classList.add("ok");test.disabled=false;create.disabled=false;restore.disabled=false;
  auto.disabled=!GITHUB_BACKUP_STATUS.auto_allowed;auto.checked=!!GITHUB_BACKUP_STATUS.auto?.enabled;
  if(!GITHUB_BACKUP_STATUS.auto_allowed)autoText.textContent="当前实例只手动备份；在正式服务器允许后可开启。";
  else if(GITHUB_BACKUP_STATUS.auto?.status==="running")autoText.textContent="正在安静地收好今天的备份…";
  else if(GITHUB_BACKUP_STATUS.auto?.last_result==="no_changes")autoText.textContent="今天已检查，没有新变化，不重复上传。";
  else autoText.textContent="每天清晨，在 Morrow 安静下来后备份一次。";
  text.textContent=GITHUB_BACKUP_STATUS.last_backed_up_at?
    ("上次备份 "+fmtFull(GITHUB_BACKUP_STATUS.last_backed_up_at.replace("T"," "))+" · "+
      (GITHUB_BACKUP_STATUS.last_images||0)+" 张图片"):
    ("已配置 "+(GITHUB_BACKUP_STATUS.repository||"GitHub 私有仓库")+"，尚未留下备份。");
}
$("#githubBackupAuto").onchange=async e=>{
  const input=e.target,wanted=input.checked;input.disabled=true;
  try{const r=await api("/api/github-backup/auto",{method:"PUT",body:JSON.stringify({enabled:wanted})}),data=await r.json();
    if(!r.ok)throw new Error(data.error||"自动备份设置失败");toast(wanted?"自动备份已开启":"自动备份已关闭");await loadGithubBackupStatus();
  }catch(err){input.checked=!wanted;toast(err.message||"自动备份设置失败");}
  finally{input.disabled=false;}
};
async function loadGithubBackupStatus(){
  try{const r=await api("/api/github-backup/status");GITHUB_BACKUP_STATUS=r.ok?await r.json():null;}catch{GITHUB_BACKUP_STATUS=null;}
  renderGithubBackupStatus();
}
$("#githubBackupTestBtn").onclick=async()=>{
  const b=$("#githubBackupTestBtn");b.disabled=true;b.textContent="检查中…";
  try{const r=await api("/api/github-backup/test",{method:"POST"}),data=await r.json();
    if(!r.ok)throw new Error(data.error||"连接失败");toast("GitHub 私有备份仓库连接正常");await loadGithubBackupStatus();
  }catch(e){toast(e.message||"连接失败");}
  finally{b.textContent="检查连接";b.disabled=false;}
};
$("#githubBackupCreateBtn").onclick=async()=>{
  if(!await bubbleConfirm({
    title:"留下云端备份",message:"要把现在的 Morrow 数据加密保存到 GitHub 吗？",
    note:"聊天和生活数据完整，仅包含最近部分图片。",confirmText:"开始备份"
  }))return;
  const b=$("#githubBackupCreateBtn");b.disabled=true;b.textContent="备份中…";
  try{const r=await api("/api/github-backup/create",{method:"POST",body:JSON.stringify({client_settings:collectBackupSettings()})}),data=await r.json();
    if(!r.ok)throw new Error(data.error||"云端备份失败");
    toast("云端备份已经收好");await loadGithubBackupStatus();
  }catch(e){toast(e.message||"云端备份失败");}
  finally{b.textContent="立即备份";b.disabled=false;}
};
$("#githubBackupRestoreBtn").onclick=async()=>{
  const b=$("#githubBackupRestoreBtn");b.disabled=true;b.textContent="正在读取最近备份…";
  try{
    const previewRes=await api("/api/github-backup/restore/preview"),preview=await previewRes.json();
    if(!previewRes.ok)throw new Error(preview.error||"无法读取云端备份");
    const policy=preview.image_policy||{};
    const summary="这份备份包含 "+(preview.sessions||0)+" 个对话、"+(preview.messages||0)+" 条消息、"+
      (preview.memories||0)+" 条记忆和 "+(policy.included_images??preview.attachments??0)+" 张图片。";
    if(!await bubbleConfirm({
      title:"从云端恢复",message:summary,
      note:"恢复会替换当前数据，并先在服务器保存一份完整安全备份。",confirmText:"确认恢复",danger:true
    }))return;
    b.textContent="正在恢复…";
    const r=await api("/api/github-backup/restore",{method:"POST",body:JSON.stringify({asset_id:preview.asset.id})}),data=await r.json();
    if(!r.ok)throw new Error(data.error||"恢复失败");
    restoreBackupSettings(data.client_settings);toast("云端备份已恢复，正在重新载入…");setTimeout(()=>location.reload(),800);
  }catch(e){toast(e.message||"恢复失败");}
  finally{b.textContent="从最近备份恢复…";b.disabled=false;}
};
function collectBackupSettings(){const out={};BACKUP_LOCAL_KEYS.forEach(k=>{const v=localStorage.getItem(k);if(v!==null)out[k]=v;});return out;}
function restoreBackupSettings(values){
  if(!values||typeof values!=="object"||Array.isArray(values))return;
  BACKUP_LOCAL_KEYS.forEach(k=>removeLocalPreference(k));
  BACKUP_LOCAL_KEYS.forEach(k=>{if(typeof values[k]==="string")saveLocalPreference(k,values[k]);});
}
function backupBusy(on){$("#exportBtn").disabled=on;$("#importBtn").disabled=on;}
$("#exportBtn").onclick=async()=>{
  backupBusy(true);toast("正在整理备份…");
  try{
    const r=await api("/api/backup/export",{method:"POST",body:JSON.stringify({client_settings:collectBackupSettings()})});
    if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error||"导出失败");}
    const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement("a");
    const disposition=r.headers.get("Content-Disposition")||"",match=disposition.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
    a.href=url;a.download=match?decodeURIComponent(match[1]):"morrow-backup.zip";document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);toast("完整备份已导出");
  }catch(e){toast(e.message||"导出失败");}finally{backupBusy(false);}
};
$("#importBtn").onclick=()=>$("#importFile").click();
let pendingBackupFile=null;
function closeImportPreview(){pendingBackupFile=null;$("#importPreviewMask").classList.remove("on");$("#importPreviewCard").classList.remove("on");}
function backupDateLabel(value){if(!value)return "未记录导出时间";const date=new Date(value);
  return Number.isNaN(date.getTime())?("导出于 "+value):("导出于 "+date.toLocaleString("zh-CN",{hour12:false}));}
$("#importFile").onchange=async function(){
  const file=this.files&&this.files[0];this.value="";if(!file)return;
  backupBusy(true);toast("正在检查备份…");
  try{
    const form=new FormData();form.append("backup",file);
    const r=await fetch("/api/backup/preview",{method:"POST",body:form});
    const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"无法读取备份");
    pendingBackupFile=file;$("#importPreviewFile").textContent=file.name;$("#importPreviewTime").textContent=backupDateLabel(data.created_at);
    $("#importPreviewSessions").textContent=data.sessions||0;$("#importPreviewMessages").textContent=data.messages||0;
    $("#importPreviewMemories").textContent=data.memories||0;$("#importPreviewAttachments").textContent=data.attachments||0;
    $("#importPreviewSecret").hidden=!data.contains_secrets;
    $("#importPreviewMask").classList.add("on");$("#importPreviewCard").classList.add("on");
  }catch(e){pendingBackupFile=null;toast(e.message||"无法读取备份");}finally{backupBusy(false);}
};
$("#importPreviewCancel").onclick=closeImportPreview;$("#importPreviewMask").onclick=closeImportPreview;
$("#importPreviewGo").onclick=async()=>{
  if(!pendingBackupFile)return;const button=$("#importPreviewGo");button.disabled=true;backupBusy(true);toast("正在恢复备份…");
  try{
    const form=new FormData();form.append("backup",pendingBackupFile);
    const r=await fetch("/api/backup/import",{method:"POST",body:form});
    const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"恢复失败");
    restoreBackupSettings(data.client_settings);toast("恢复完成，正在重新载入…");setTimeout(()=>location.reload(),700);
  }catch(e){toast(e.message||"恢复失败");button.disabled=false;backupBusy(false);}
};

/* ---------- boot ---------- */
applyPrefs();applyModel();applyThink();applyChatBg();syncRangeFills();tickClock();checkAuth();
let lastActivityPing=0;
function markNookActivity(){const now=Date.now();if(now-lastActivityPing<300000)return;lastActivityPing=now;
  api("/api/activity",{method:"POST",body:"{}"}).catch(()=>{});}
addEventListener("pointerdown",markNookActivity,{passive:true});
addEventListener("keydown",markNookActivity,{passive:true});
addEventListener("visibilitychange",()=>{if(!document.hidden)markNookActivity();});
