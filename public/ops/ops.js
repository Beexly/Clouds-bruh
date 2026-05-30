const money = (m) => '$' + Math.round((m || 0) / 100).toLocaleString('en-US');
const mediaSrc = (u) => (!u ? '' : u.startsWith('http') || u.startsWith('/') ? u : '/' + u);

function lane(l) {
  return `
    <div class="lane">
      <span class="lane__label">${l.label}</span>
      <span class="lane__track"><span class="lane__fill" style="width:${l.pct}%"></span></span>
      <span class="lane__val">${l.pct}%</span>
    </div>`;
}

function agent(a) {
  return `
    <div class="agent">
      <div class="agent__name">${a.name}</div>
      <div class="agent__cadence">${cadence(a.cadence)}</div>
      <div class="agent__gov">
        <span class="auto">▲ ${a.governance.autonomous.length} autonomous</span>
        <span class="gated">⚑ ${a.governance.gated.length} gated</span>
      </div>
    </div>`;
}
function cadence(c) {
  if (!c) return 'manual';
  if (c.kind === 'interval') return `every ${c.everyMinutes}m`;
  if (c.kind === 'event') return `on ${c.onEvent}`;
  return c.kind;
}

function qcard(i) {
  const gate = i.gate?.passed
    ? '<span class="gate pass">gate pass</span>'
    : '<span class="gate blocked">gate blocked</span>';
  const thumbs = (i.imagery || [])
    .slice(0, 4)
    .map((m) => `<img src="${mediaSrc(m.url)}" alt="${m.alt || ''}" />`)
    .join('');
  const links = (i.sourceLinks || [])
    .map((l) => `<a href="${l.url}" target="_blank" rel="noopener">↳ ${l.label}</a>`)
    .join('');
  const cmd = ['proposed', 'queued', 'in_review'].includes(i.status)
    ? `<div class="qcard__cmd">npm run review approve ${i.id}</div>`
    : '';
  return `
    <div class="qcard">
      <div class="qcard__title">${i.title}</div>
      <div class="qcard__row"><span>${money(i.costs?.suggestedListMinor)} · ${i.costs?.marginPct || 0}% margin</span>${gate}</div>
      <div class="qcard__thumbs">${thumbs}</div>
      <div class="qcard__links">${links}</div>
      ${cmd}
    </div>`;
}

async function load() {
  let data;
  try {
    data = await (await fetch('/api/ops.json')).json();
  } catch {
    data = { board: { columns: [] }, ledger: { lanes: [], overallPct: 0 }, agents: [] };
  }

  document.getElementById('overall').textContent = (data.ledger?.overallPct ?? 0) + '%';
  document.getElementById('lanes').innerHTML = (data.ledger?.lanes || []).map(lane).join('');
  document.getElementById('agents').innerHTML = (data.agents || []).map(agent).join('');
  renderOrders(data.orders);

  const board = document.getElementById('board');
  const cols = (data.board?.columns || []).filter((c) => c.items.length || ['queued', 'in_review', 'approved'].includes(c.key));
  board.innerHTML = cols.length
    ? cols
        .map(
          (c) => `
        <div class="col">
          <div class="col__head"><span>${c.label}</span><span>${c.items.length}</span></div>
          <div class="col__body">${c.items.map(qcard).join('') || '<div class="board__empty">—</div>'}</div>
        </div>`
        )
        .join('')
    : '<div class="board__empty">Queue is empty. Run <code>npm run agent sourcing</code> to propose candidates.</div>';
}

function renderOrders(o) {
  const wrap = document.getElementById('orders');
  if (!wrap) return;
  if (!o || !o.total) {
    wrap.innerHTML = '<div class="board__empty">No orders yet. A checkout on the storefront creates one here.</div>';
    return;
  }
  const stats = `
    <div class="ordstats">
      <div><span class="ordstats__n">${o.total}</span><span class="ordstats__l">orders</span></div>
      <div><span class="ordstats__n">${o.openCount}</span><span class="ordstats__l">open</span></div>
      <div><span class="ordstats__n">${money(o.revenueMinor)}</span><span class="ordstats__l">recognized</span></div>
    </div>`;
  const rows = o.recent
    .map(
      (r) => `
      <tr>
        <td class="mono">${r.number}</td>
        <td><span class="ostatus">${r.status}</span></td>
        <td>${r.itemCount}</td>
        <td class="mono">${money(r.grandMinor)}</td>
        <td class="muted">${r.email || ''}</td>
        <td>${r.paymentLive ? '<span class="live">LIVE</span>' : '<span class="muted">test</span>'}</td>
      </tr>`
    )
    .join('');
  wrap.innerHTML = stats + `<table class="otable"><thead><tr><th>Order</th><th>Status</th><th>Items</th><th>Total</th><th>Customer</th><th>Pay</th></tr></thead><tbody>${rows}</tbody></table>`;
}

load();
