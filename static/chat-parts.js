/* Exact text ranges over the existing message; no separate chat storage. */
(()=>{
  function ranges(source,split){
    const raw=String(source||''),normalized=raw.replace(/\r\n?/g,'\n');let offsets=null;
    if(raw!==normalized){offsets=[0];for(let i=0;i<raw.length;i++){if(raw[i]==='\r'&&raw[i+1]==='\n')i++;offsets.push(i+1);}}
    let cursor=0;return split(normalized).map(block=>{const at=normalized.indexOf(block,cursor);if(at<0)throw new Error('气泡定位已变化，请重新打开消息');const end=at+block.length;cursor=end;const startRaw=offsets?offsets[at]:at,endRaw=offsets?offsets[end]:end;return {start:startRaw,end:endRaw,text:raw.slice(startRaw,endRaw)};});
  }
  function replace(source,range,text){
    if(!Number.isInteger(range.start)||!Number.isInteger(range.end)||range.start<0||range.end<range.start||range.end>source.length||source.slice(range.start,range.end)!==range.text)throw new Error('这条气泡已变化，请重新选择');
    return source.slice(0,range.start)+String(text)+source.slice(range.end);
  }
  window.sakieChatParts={ranges,replace};
})();
