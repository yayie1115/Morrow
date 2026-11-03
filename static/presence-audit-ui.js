/* Extend only private presence receipts; text is never interpreted as HTML. */
(()=>{
  const original=window.renderPresenceEvents;
  if(typeof original!=="function")return;
  const states={started:"开始执行（尚无结果）",generated:"生成完成（尚未确认保存）",sent:"消息已保存",quiet:"选择暂不发送",failed:"执行失败",cancelled:"已取消",skipped:"未发送",completed:"活动已完成"};
  window.renderPresenceEvents=function(items,append){
    original(items,append);
    const cards=[...document.querySelectorAll("#presenceEventList .presence-event")].slice(-items.length);
    items.forEach((item,i)=>{
      if(item.kind!=="handoff"||!cards[i])return;
      const d=item.detail||{},box=document.createElement("details"),title=document.createElement("summary"),body=document.createElement("pre");
      title.textContent=(d.purpose==="activity"?"小房间活动":"主动联系")+" · "+(states[d.status]||d.status||"未知状态");
      const snap=d.snapshot||{};
      body.textContent=["记录时间："+item.at,"状态时间："+(snap.at||"未取得有效快照"),"状态数值："+JSON.stringify(snap.values||{}),"",d.state_transmitted?"实际传递的状态提示：\n"+d.state_prompt:"本轮未传递完整积温状态。下列数值仅供核对。","",d.protocol?"唤醒规则：\n"+d.protocol:"", "唤醒提示：\n"+(d.event||""),d.message_id?"关联消息："+d.message_id:""].filter(Boolean).join("\n");
      body.style.cssText="white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:12px;line-height:1.7;user-select:text";
      box.append(title,body);cards[i].querySelector(".r").replaceChildren(box);
    });
  };
})();
