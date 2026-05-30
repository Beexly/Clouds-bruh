const money = (price) => '$' + Math.round((price?.listMinor || 0) / 100).toLocaleString('en-US');
const mediaSrc = (u) => (!u ? '' : u.startsWith('http') || u.startsWith('/') ? u : '/' + u);

function card(p) {
  const hero = (p.media || [])[0];
  const specs = Object.entries(p.specs || {}).slice(0, 3);
  return `
    <article class="card">
      <div class="card__media">
        <span class="card__badge">${p.tier || 'Eclipse'}</span>
        ${hero ? `<img src="${mediaSrc(hero.url)}" alt="${hero.alt || p.title}" loading="lazy" />` : ''}
      </div>
      <div class="card__body">
        <h3 class="card__title">${p.title}</h3>
        ${p.subtitle ? `<p class="card__sub">${p.subtitle}</p>` : ''}
        <p class="card__price">${money(p.price)}</p>
        <div class="card__specs">${specs.map(([k, v]) => `<span class="chip">${k}: ${v}</span>`).join('')}</div>
      </div>
    </article>`;
}

async function load() {
  let data;
  try {
    data = await (await fetch('/api/storefront.json')).json();
  } catch {
    data = { products: [], brand: {} };
  }

  if (data.brand?.tagline) document.getElementById('tagline').textContent = data.brand.tagline;
  if (data.brand?.positioning) document.getElementById('positioning').textContent = data.brand.positioning;

  const house = (data.products || []).filter((p) => /house/i.test(p.tier || ''));
  const vault = (data.products || []).filter((p) => !/house/i.test(p.tier || ''));

  render('house-grid', 'house-empty', house);
  render('vault-grid', 'vault-empty', vault);
}

function render(gridId, emptyId, items) {
  const grid = document.getElementById(gridId);
  const empty = document.getElementById(emptyId);
  grid.innerHTML = items.map(card).join('');
  empty.hidden = items.length > 0;
}

load();
