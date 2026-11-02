/* Extend the existing settings screen without replacing the app bundle. */
(() => {
  const select = document.getElementById('provFormat');
  if (!select) return;
  if (![...select.options].some(option => option.value === 'gemini')) {
    select.add(new Option('Gemini 原生', 'gemini'));
  }
  const renderModels = renderEditModels;
  renderEditModels = function () {
    renderModels();
    if (select.value !== 'gemini') return;
    document.querySelectorAll('#provModels .model-row').forEach((row, index) => {
      const grid = document.createElement('div');
      grid.className = 'price-grid gemini-generation-grid';
      grid.innerHTML = '<div><label>温度 · 0–2</label><input data-param="temperature" type="number" min="0" max="2" step="any" placeholder="默认"></div>' +
        '<div><label>Top-P · 0–1</label><input data-param="top_p" type="number" min="0" max="1" step="any" placeholder="默认"></div>';
      grid.querySelectorAll('input').forEach(input => {
        const key = input.dataset.param;
        input.value = editModels[index][key] ?? '';
        input.oninput = () => {
          if (input.value === '') delete editModels[index][key];
          else editModels[index][key] = input.value;
        };
      });
      row.insertBefore(grid, row.querySelector('.model-foot'));
      const note = document.createElement('div');
      note.className = 'price-note';
      note.textContent = '温度与 Top-P 留空时使用模型默认值；保存提供商后生效。';
      grid.after(note);
      row.querySelector('.mexpand').setAttribute('aria-label', '参数与价格');
    });
  };
  const setFormat = setProviderFormat;
  setProviderFormat = function (value) {
    setFormat(value);
    if (value === 'gemini') document.getElementById('provFormatButton').textContent = 'Gemini 原生';
  };
  document.getElementById('provFormatButton').onclick = () => openChoiceSheet({
    title: '兼容格式', value: select.value,
    items: [{value: 'openai', label: 'OpenAI'}, {value: 'claude', label: 'Anthropic'}, {value: 'gemini', label: 'Gemini 原生'}],
    onChoose: setProviderFormat
  });
  const openProvider = openProvEdit;
  openProvEdit = function (...args) {
    const result = openProvider(...args);
    if (select.value === 'gemini') document.getElementById('provFormatButton').textContent = 'Gemini 原生';
    return result;
  };
  const renderProviders = renderProvList;
  renderProvList = function () {
    renderProviders();
    document.querySelectorAll('#provList .prov-item').forEach((row, index) => {
      const provider = PROVIDERS[index];
      if (provider?.format === 'gemini') row.querySelector('.pmeta').textContent = 'Gemini 原生 · ' + (provider.models.length ? provider.models.length + ' 个模型' : '未加模型');
    });
  };
  document.getElementById('provSave').addEventListener('click', event => {
    if (select.value !== 'gemini') return;
    const invalid = [...document.querySelectorAll('.gemini-generation-grid input')].find(input => !input.validity.valid);
    if (invalid) {
      event.preventDefault(); event.stopImmediatePropagation();
      toast('温度范围为 0–2，Top-P 范围为 0–1。');
      invalid.reportValidity();
    }
  }, true);
})();
