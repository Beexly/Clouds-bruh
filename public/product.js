// PDP — loads one product from /api/product and wires variant selection + add-to-cart.
// Reuses money/mediaSrc/eclipseAddToCart from app.js (loaded first).
(async function () {
  const slug = new URLSearchParams(location.search).get('slug');
  const el = document.getElementById('pdp');
  if (!slug) { el.innerHTML = '<p class="err">No product specified.</p>'; return; }

  let p;
  try {
    const res = await fetch('/api/product?slug=' + encodeURIComponent(slug));
    if (!res.ok) throw new Error('Not found');
    p = await res.json();
  } catch {
    el.innerHTML = '<p class="err">This piece is not available.</p>';
    return;
  }

  const m = (price) => '$' + Math.round((price?.listMinor || 0) / 100).toLocaleString('en-US');
  const src = (u) => (!u ? '' : u.startsWith('http') || u.startsWith('/') ? u : '/' + u);
  const hero = (p.media || [])[0];
  const variants = p.variants || [];

  el.innerHTML = `
    <div class="pdp__media">
      ${hero ? `<img src="${src(hero.url)}" alt="${hero.alt || p.title}" />` : '<div class="pdp__noimg">Imagery pending</div>'}
      <div class="pdp__thumbs">
        ${(p.media || []).map((x) => `<img src="${src(x.url)}" alt="${x.alt || ''}" />`).join('')}
      </div>
    </div>
    <div class="pdp__info">
      <span class="card__badge">${p.tier || 'Eclipse'}</span>
      <h1 class="pdp__title">${p.title}</h1>
      ${p.subtitle ? `<p class="pdp__sub">${p.subtitle}</p>` : ''}
      <p class="pdp__price">${m(p.price)}</p>
      <p class="pdp__desc">${p.description || ''}</p>

      ${variants.length ? `
      <label class="pdp__label">Variant</label>
      <select id="variant" class="toolbar__select">
        ${variants.map((v) => `<option value="${v.id}">${v.color} / ${v.size}</option>`).join('')}
      </select>` : ''}

      <button id="add" class="btn-primary pdp__add">Add to bag</button>

      ${(p.bulletBenefits || []).length ? `
      <ul class="pdp__bullets">${p.bulletBenefits.map((b) => `<li>${b}</li>`).join('')}</ul>` : ''}

      ${Object.keys(p.specs || {}).length ? `
      <table class="pdp__specs">
        ${Object.entries(p.specs).map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}
      </table>` : ''}
    </div>`;

  document.getElementById('add').onclick = () => {
    const vid = document.getElementById('variant')?.value || (variants[0] && variants[0].id);
    const v = variants.find((x) => x.id === vid) || variants[0];
    if (!v) return;
    window.eclipseAddToCart({
      productId: p.id,
      variantId: v.id,
      title: `${p.title} — ${v.color}/${v.size}`,
      unitPriceMinor: v.priceMinor || p.price.listMinor,
      qty: 1,
    });
  };
})();
