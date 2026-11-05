/* Larger detail images with the shared, authenticated original-image viewer. */
(()=>{
  const style=document.createElement('style');
  style.textContent='.keepsake-full-window .keepsake-media-thumb{display:block;width:min(260px,100%);height:auto;max-height:360px;object-fit:contain;cursor:zoom-in}.keepsake-full-window .keepsake-media-thumb:focus-visible{outline:2px solid var(--accent);outline-offset:3px}';
  document.head.appendChild(style);
  const original=window.keepsakeNookMarkup;
  if(typeof original==='function')window.keepsakeNookMarkup=function(item,detail=false){
    const bubble=original(item,detail);
    if(detail)bubble.querySelectorAll('img.keepsake-media-thumb').forEach(img=>{
      img.tabIndex=0;img.setAttribute('role','button');
      img.setAttribute('aria-label','放大查看：'+(img.alt||'图片'));
      img.title='点击放大查看';
    });
    return bubble;
  };
  function open(event){
    const img=event.target.closest?.('.keepsake-full-window img.keepsake-media-thumb');
    if(!img)return;
    if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
    event.preventDefault();event.stopImmediatePropagation();
    const images=[...img.closest('.keepsake-full-window').querySelectorAll('img.keepsake-media-thumb')];
    window.openPhotoViewer({_attachments:images.map(node=>({type:'image',url:node.getAttribute('src'),name:node.alt||'图片'}))},images.indexOf(img),img);
  }
  document.addEventListener('click',open,true);
  document.addEventListener('keydown',open,true);
})();
