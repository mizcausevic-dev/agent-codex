/* Read-only fixture evidence helpers. API values are always written as text. */
(() => {
  const byId = (id) => document.getElementById(id);
  const appendText = (parent, tag, value, className) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (tag === 'th') node.scope = 'col';
    node.textContent = String(value ?? '—');
    parent.append(node);
    return node;
  };
  const fetchJson = async (url, options) => {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  };
  const metric = (label, value, note) => {
    const card = document.createElement('dl');
    card.className = 'metric';
    appendText(card, 'dt', label);
    appendText(card, 'dd', value);
    appendText(card, 'small', note);
    byId('metrics').append(card);
  };
  const table = (headers, rows) => {
    const head = byId('primary-head');
    const body = byId('primary-rows');
    headers.forEach((label) => appendText(head, 'th', label));
    rows.forEach((values) => {
      const row = document.createElement('tr');
      values.forEach((value) => appendText(row, 'td', value));
      body.append(row);
    });
  };
  const item = (title, detail) => {
    const row = document.createElement('div');
    row.className = 'item';
    appendText(row, 'strong', title);
    appendText(row, 'span', detail);
    byId('secondary').append(row);
  };
  const state = (text, error = false) => {
    byId('state').textContent = text;
    byId('state').classList.toggle('error', error);
  };
  window.evidenceUi = { fetchJson, metric, table, item, state };
})();
