/* Chat geometry and reader position move together through keyboard animation. */
(()=>{
  const viewport=window.visualViewport;
  if(!viewport)return;
  const root=document.documentElement,body=document.body,log=document.getElementById("log");
  if(!log)return;
  let frame=0,settle=0,changing=false,pinned=true,readingTop=0;
  const inChat=()=>body.classList.contains("in-chat");
  const atBottom=()=>log.scrollHeight-log.scrollTop-log.clientHeight<=100;
  function remember(){pinned=atBottom();readingTop=log.scrollTop;}
  function place(){if(!inChat())return;log.scrollTop=pinned?log.scrollHeight:readingTop;}
  function update(){
    frame=0;
    if(!inChat()||viewport.scale!==1){
      body.classList.remove("chat-keyboard-open");
      root.style.removeProperty("--chat-viewport-height");root.style.removeProperty("--chat-viewport-top");return;
    }
    const active=document.activeElement;
    const editing=active&&active.closest("#view-chat")&&active.matches("input,textarea,[contenteditable='true']");
    const keyboard=!!editing&&Math.max(innerHeight,root.clientHeight)-viewport.height>120;
    if(body.classList.contains("chat-keyboard-open")!==keyboard)body.classList.toggle("chat-keyboard-open",keyboard);
    // Keep the same positioning mode before, during and after keyboard animation.
    for(const [name,value]of [["--chat-viewport-height",Math.round(viewport.height)+"px"],["--chat-viewport-top","0px"]]){
      if(root.style.getPropertyValue(name)!==value)root.style.setProperty(name,value);
    }
    if(changing){place();requestAnimationFrame(place);}
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  function geometry(){
    changing=true;clearTimeout(settle);schedule();
    settle=setTimeout(()=>{place();changing=false;remember();},220);
  }
  log.addEventListener("scroll",()=>{if(!changing)remember();},{passive:true});
  // An intentional reader gesture takes priority over automatic bottom following.
  for(const type of ["touchstart","wheel"])log.addEventListener(type,()=>{changing=false;clearTimeout(settle);remember();},{passive:true});
  document.addEventListener("focusin",()=>{if(inChat()){remember();geometry();}});
  document.addEventListener("focusout",geometry);
  viewport.addEventListener("resize",geometry,{passive:true});
  // Safari's visual pan must not move the application header a second time.
  viewport.addEventListener("scroll",schedule,{passive:true});
  addEventListener("resize",geometry,{passive:true});
  window.sakieChatViewport={loaded(){pinned=true;readingTop=0;geometry();}};
  // Reflow from composer expansion, images or fonts must retain bottom intent.
  if(window.ResizeObserver){
    new ResizeObserver(()=>{if(inChat()&&pinned){place();requestAnimationFrame(place);}}).observe(log);
    const composer=document.querySelector(".composer");
    if(composer)new ResizeObserver(()=>{if(inChat()&&pinned){place();requestAnimationFrame(place);}}).observe(composer);
  }
  let wasChat=inChat();
  new MutationObserver(()=>{const now=inChat();if(now!==wasChat){wasChat=now;remember();schedule();}}).observe(body,{attributes:true,attributeFilter:["class"]});
  schedule();
})();
