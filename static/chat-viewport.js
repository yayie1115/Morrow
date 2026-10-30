/* Preserve explicit reading intent through Safari keyboard and composer reflow. */
(()=>{
  const viewport=window.visualViewport,root=document.documentElement,body=document.body;
  const log=document.getElementById("log"),composer=document.querySelector(".composer"),input=document.getElementById("input");
  if(!viewport||!log||!composer)return;
  let frame=0,settle=0,settling=false,pinned=true,readingTop=0,gesture=false;
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
      body.classList.remove("chat-keyboard-open");
      root.style.removeProperty("--chat-viewport-height");root.style.removeProperty("--chat-viewport-top");root.style.removeProperty("--chat-keyboard-overlap");return;
    }
    const active=document.activeElement;
    const editing=active&&active.closest("#view-chat")&&active.matches("input,textarea,[contenteditable='true']");
    // A blur can precede the keyboard closing animation. Use actual occlusion,
    // not focus, to size the bottom inset; never jump it at a 120px threshold.
    const overlap=Math.max(0,Math.max(innerHeight,root.clientHeight)-viewport.height-viewport.offsetTop);
    const keyboard=overlap>120&&(!!editing||body.classList.contains("chat-keyboard-open"));
    root.style.setProperty("--chat-keyboard-overlap",Math.round(overlap)+"px");
    if(body.classList.contains("chat-keyboard-open")!==keyboard)body.classList.toggle("chat-keyboard-open",keyboard);
    const height=Math.max(1,Math.round(viewport.height));
    root.style.setProperty("--chat-viewport-height",height+"px");
    root.style.setProperty("--chat-viewport-top",Math.max(0,Math.round(viewport.offsetTop))+"px");
    // Padding must be measured after viewport/safe-area changes, before scrolling.
    window.sakieChatComposerSpace?.();
    place();
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
  document.addEventListener("focusin",geometry);
  document.addEventListener("focusout",geometry);
  viewport.addEventListener("resize",geometry,{passive:true});
  viewport.addEventListener("scroll",geometry,{passive:true});
  addEventListener("resize",geometry,{passive:true});
  if(window.ResizeObserver){new ResizeObserver(schedule).observe(composer);new ResizeObserver(schedule).observe(log);}
  let wasChat=inChat();
  new MutationObserver(()=>{const now=inChat();if(now!==wasChat){wasChat=now;schedule();}}).observe(body,{attributes:true,attributeFilter:["class"]});
  window.sakieChatViewport={loaded(){pinned=true;readingTop=0;geometry();},follow(){pinned=true;geometry();}};
  schedule();
})();
