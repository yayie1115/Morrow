const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
  let requests=0,renders=0,release;
  const panels=new Map(),panel=s=>{if(!panels.has(s))panels.set(s,{dataset:{}});return panels.get(s);};
  const window={api:async()=>{requests++;return new Response('{"ok":true}');},loadSummaryLogs:async()=>{renders++;},loadAlarmDrawer:async()=>{await new Promise(r=>release=r);},loadKeepsakeDrawer:async()=>{},tidySmoothPanel(){},tidySmoothDetails(){},chatImageUrl:(url)=>url+'?preview=thumb',keepsakeNookMarkup:()=>{const image={src:'original',getAttribute:()=>'/uploads/example.png'};return {image,querySelectorAll:()=>[image]};}};
  const document={querySelector:panel,createElement:()=>({}),head:{appendChild(){}}};
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../static/tidy-responsive.js'),'utf8'),{window,document,Date,Promise,Set,Map,Response});
  const responses=await Promise.all([window.api('/api/tidy/summaries'),window.api('/api/tidy/summaries')]);
  assert.equal(requests,1);assert.deepEqual(await responses[0].json(),{ok:true});assert.deepEqual(await responses[1].json(),{ok:true});
  await window.api('/api/keepsakes',{method:'POST'});await window.api('/api/tidy/summaries');assert.equal(requests,3);
  await window.loadSummaryLogs();await window.loadSummaryLogs();assert.equal(renders,1);
  const a=window.loadAlarmDrawer();await Promise.resolve();await Promise.resolve();const b=window.loadKeepsakeDrawer();release();await Promise.all([a,b]);assert.equal(panel('#tidyArtifactPanel').dataset.tidyRetained,'keepsake');
  const el={style:{removeProperty(){}},classList:{remove(){}},getAnimations:()=>[],getBoundingClientRect(){throw Error('forced layout');}};
  window.tidySmoothPanel(el,true);assert.equal(el.hidden,false);
  const thumb=window.keepsakeNookMarkup({},false),detail=window.keepsakeNookMarkup({},true);
  assert.equal(thumb.image.src,'/uploads/example.png?preview=thumb');assert.equal(detail.image.src,'original');assert.equal(thumb.image.loading,'lazy');
  console.log('TIDY_CACHE_INVALIDATION_ORDER_LAYOUT_AND_IMAGE_REGRESSIONS_PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
