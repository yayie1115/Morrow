// 积温引擎的运行器：读 stdin 的 JSON，推进一次 tick，输出 JSON。
// 由 presence_engine.py 通过 node 调用；每次无状态重建（状态来自数据库）。
// 注意：上游 createJiwen 的 initialState 实际未被 load() 使用，所以状态必须走 onLoad。
const fs = require('fs');
const path = require('path');

// stdout is the Python/Node JSON protocol, including when thresholds fire.
// Upstream diagnostic logging belongs on stderr and must never corrupt it.
const { format } = require('util');
for (const level of ['log', 'info', 'debug']) {
  console[level] = (...args) => process.stderr.write(format(...args) + '\n');
}


const { createJiwen } = require(path.join(__dirname, 'vendor', 'jiwen', 'jiwen.js'));

const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
const persona = input.persona || {};
let saved = null;

const engine = createJiwen({
  onLoad: async () => input.state || null,
  onSave: async (state) => { saved = state; },
  getLastMessage: () => input.lastMessage || null,
  connectionRateFn: () => Number(input.rate || 0.0007),
  persona: {
    subjectName: persona.subjectName || '她',
    selfName: persona.selfName || '你',
    subjectPronoun: persona.subjectPronoun || '她',
  },
  getCircadianBias: () => input.circadian || null,
  ...(input.options || {}),
});

(async () => {
  const minutes = Number(input.minutes || 0);
  const triggers = minutes > 0 ? await engine.tick(minutes) : [];
  const state = saved || (await engine.getState());
  process.stdout.write(JSON.stringify({
    state,
    triggers: triggers || [],
    trace: typeof engine.getTriggerTrace === 'function' ? engine.getTriggerTrace() : null,
    summary: typeof engine.getStateSummary === 'function' ? engine.getStateSummary() : '',
    promptContext: engine.getPromptContext(),
    styleGuidance: engine.getStyleGuidance(),
  }));
})().catch((error) => {
  process.stderr.write(String((error && error.stack) || error));
  process.exit(1);
});
