/* Preserve explicit reading intent through Safari keyboard and composer reflow. */
(()=>{
  const viewport=window.visualViewport,root=document.documentElement,body=document.body;
  const log=document.getElementById("log"),composer=document.querySelector(".composer"),input=document.getElementById("input");
  if(!viewport||!log||!composer)return;
  let frame=0,settle=0,settling=false,pinned=true,readingTop=0,gesture=false;
  let shownHeight=null,lastHeight=null,heightMotion=null,focusAt=-Infinity,blurAt=-Infinity;
  const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)");
  const inChat=()=>body.classList.contains("in-chat");
  const nearBottom=()=>log.scrollHeight-log.scrollTop-log.clientHeight<120;
  function remember(){pinned=nearBottom();readingTop=log.scrollTop;}
  function place(){
    if(!inChat())return;
    if(pinned)log.scrollTop=log.scrollHeight;else log.scrollTop=readingTop;
  }
  function update(){
    frame=0;
    if(!inChat()||viewport.scale!==1){
      shownHeight=null;lastHeight=null;heightMotion=null;
      body.classList.remove("chat-keyboard-open");
      root.style.removeProperty("--chat-viewport-height");root.style.removeProperty("--chat-viewport-top");root.style.removeProperty("--chat-keyboard-overlap");return;
    }
    const active=document.activeElement;
    const editing=active&&active.closest("#view-chat")&&active.matches("input,textarea,[contenteditable='true']");
    const now=performance.now(),target=Math.max(1,viewport.height);
    if(shownHeight===null){shownHeight=target;lastHeight=target;}
    if(target!==lastHeight){
      const jump=Math.abs(target-lastHeight),opening=target<lastHeight;
      const elapsed=now-(opening?focusAt:blurAt);
      // Only bridge a sparse, large keyboard step near focus/blur. Continuous
      // viewport frames, window resizing and reduced-motion remain direct.
      if(!reducedMotion.matches&&jump>80&&elapsed>=0&&elapsed<600){
        heightMotion={from:shownHeight,to:target,start:now,duration:Math.max(100,(opening?320:260)-elapsed)};
      }else{heightMotion=null;shownHeight=target;}
      lastHeight=target;
    }
    if(heightMotion){
      const t=Math.min(1,(now-heightMotion.start)/heightMotion.duration);
      const ease=1-Math.pow(1-t,3);
      shownHeight=heightMotion.from+(heightMotion.to-heightMotion.from)*ease;
      if(t===1){shownHeight=heightMotion.to;heightMotion=null;}
    }
    // Size the keyboard inset using the SAME presented height as the app.
    const overlap=Math.max(0,Math.max(innerHeight,root.clientHeight)-shownHeight-viewport.offsetTop);
    const keyboard=overlap>120&&(!!editing||body.classList.contains("chat-keyboard-open"));
    root.style.setProperty("--chat-keyboard-overlap",overlap.toFixed(2)+"px");
    if(body.classList.contains("chat-keyboard-open")!==keyboard)body.classList.toggle("chat-keyboard-open",keyboard);
    root.style.setProperty("--chat-viewport-height",shownHeight.toFixed(2)+"px");
    root.style.setProperty("--chat-viewport-top",Math.max(0,Math.round(viewport.offsetTop))+"px");
    // Padding must be measured after viewport/safe-area changes, before scrolling.
    window.sakieChatComposerSpace?.();
    place();
    if(heightMotion)schedule();
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  function geometry(){settling=true;schedule();clearTimeout(settle);settle=setTimeout(()=>{schedule();requestAnimationFrame(()=>{settling=false;remember();});},260);}
  log.addEventListener("touchstart",()=>{gesture=true;},{passive:true});
  for(const type of ["touchend","touchcancel"])log.addEventListener(type,()=>{remember();gesture=false;},{passive:true});
  log.addEventListener("wheel",()=>{gesture=true;setTimeout(()=>{gesture=false;},180);},{passive:true});
  log.addEventListener("scroll",()=>{if(gesture||!settling){remember();}},{passive:true});
  log.addEventListener("pointerup",()=>{if(gesture){remember();gesture=false;}},{passive:true});
  // Avoid Safari first panning the document to focus, then our viewport catching up.
  input?.addEventListener("pointerdown",event=>{
    if(event.isPrimary&&document.activeElement!==input){event.preventDefault();input.focus({preventScroll:true});geometry();}
  });
  document.addEventListener("focusin",()=>{focusAt=performance.now();geometry();});
  document.addEventListener("focusout",()=>{blurAt=performance.now();geometry();});
  viewport.addEventListener("resize",geometry,{passive:true});
  viewport.addEventListener("scroll",geometry,{passive:true});
  addEventListener("resize",geometry,{passive:true});
  if(window.ResizeObserver){new ResizeObserver(schedule).observe(composer);new ResizeObserver(schedule).observe(log);}
  let wasChat=inChat();
  new MutationObserver(()=>{const now=inChat();if(now!==wasChat){wasChat=now;schedule();}}).observe(body,{attributes:true,attributeFilter:["class"]});
  window.sakieChatViewport={loaded(){pinned=true;readingTop=0;geometry();},follow(){pinned=true;geometry();}};
  schedule();
})();
