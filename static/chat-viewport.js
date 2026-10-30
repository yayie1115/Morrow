/* Keep keyboard geometry local to Chat; never scroll or focus on the user's behalf. */
(()=>{
  const viewport=window.visualViewport;
  if(!viewport)return;
  let frame=0;
  function update(){
    frame=0;
    const body=document.body,root=document.documentElement;
    const active=document.activeElement;
    const editing=active&&active.closest("#view-chat")&&active.matches("input,textarea,[contenteditable='true']");
    const height=Math.max(window.innerHeight,root.clientHeight);
    const keyboard=body.classList.contains("in-chat")&&editing&&viewport.scale===1&&height-viewport.height>120;
    body.classList.toggle("chat-keyboard-open",!!keyboard);
    if(keyboard){
      root.style.setProperty("--chat-viewport-height",Math.round(viewport.height)+"px");
      root.style.setProperty("--chat-viewport-top",Math.max(0,Math.round(viewport.offsetTop))+"px");
    }else{
      root.style.removeProperty("--chat-viewport-height");
      root.style.removeProperty("--chat-viewport-top");
    }
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  viewport.addEventListener("resize",schedule,{passive:true});
  viewport.addEventListener("scroll",schedule,{passive:true});
  addEventListener("resize",schedule,{passive:true});
  document.addEventListener("focusin",schedule);
  document.addEventListener("focusout",schedule);
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:["class"]});
  schedule();
})();
