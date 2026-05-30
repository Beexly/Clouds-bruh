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

      ${scarcityLine(p)}

      ${variants.length ? `
      <label class="pdp__label">Variant</label>
      <select id="variant" class="toolbar__select">
        ${variants.map((v) => `<option value="${v.id}">${v.label || (v.color + ' / ' + v.size)}</option>`).join('')}
      </select>` : ''}

      <button id="add" class="btn-primary pdp__add">Add to bag</button>

      <div class="pdp__trust">
        <span>Authenticity guaranteed</span>
        <span>Considered returns within 30 days</span>
        <span>Secure checkout</span>
      </div>

      ${(p.bulletBenefits || []).length ? `
      <ul class="pdp__bullets">${p.bulletBenefits.map((b) => `<li>${b}</li>`).join('')}</ul>` : ''}

      ${Object.keys(p.specs || {}).length ? `
      <table class="pdp__specs">
        ${Object.entries(p.specs).map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}
      </table>` : ''}
    </div>`;

  renderReviews(p);
  renderRecommendations(p, src, m);

  document.getElementById('add').onclick = () => {
    const vid = document.getElementById('variant')?.value || (variants[0] && variants[0].id);
    const v = variants.find((x) => x.id === vid) || variants[0];
    if (!v) return;
    window.eclipseAddToCart({
      productId: p.id,
      variantId: v.id,
      title: `${p.title} — ${v.label || v.color + '/' + v.size}`,
      unitPriceMinor: v.priceMinor || p.price.listMinor,
      qty: 1,
    });
  };

  // — Honest scarcity: only ever from real production-run data —
  function scarcityLine(prod) {
    const run = prod.productionRun;
    if (run && run.unitsProduced && !run.restocked) {
      return `<p class="pdp__scarcity">${run.dropCode || 'Limited drop'} — ${run.unitsProduced} produced, not restocked</p>`;
    }
    return '';
  }

  // — Verified reviews (honest social proof; never fabricated) —
  function stars(n) { return '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n)); }
  function renderReviews(prod) {
    const r = prod.reviews || { count: 0, average: 0, distribution: {}, reviews: [], verifiedCount: 0 };
    const wrap = document.createElement('section');
    wrap.className = 'pdp__rail';
    const dist = [5, 4, 3, 2, 1].map((star) => {
      const c = (r.distribution && r.distribution[star]) || 0;
      const pct = r.count ? Math.round((c / r.count) * 100) : 0;
      return `<div class="reviews__bar"><span>${star}★</span><span class="reviews__track"><span class="reviews__fill" style="width:${pct}%"></span></span><span>${c}</span></div>`;
    }).join('');
    wrap.innerHTML = `
      <h2>Reviews</h2>
      <div class="reviews">
        <div class="reviews__head">
          <span class="reviews__avg">${r.count ? r.average.toFixed(1) : '—'}</span>
          <div>
            <div class="reviews__stars">${r.count ? stars(r.average) : ''}</div>
            <div class="reviews__count">${r.count} review${r.count === 1 ? '' : 's'}${r.verifiedCount ? ` · ${r.verifiedCount} verified` : ''}</div>
          </div>
        </div>
        ${r.count ? `<div class="reviews__dist">${dist}</div>` : '<p class="reviews__empty">No reviews yet. Verified buyers can be the first.</p>'}
        ${(r.reviews || []).map((rv) => `
          <div class="review">
            <div class="review__top"><span class="reviews__stars">${stars(rv.rating)}</span>${rv.verified ? '<span class="review__verified">Verified buyer</span>' : ''}</div>
            ${rv.title ? `<div class="review__title">${rv.title}</div>` : ''}
            <div class="review__body">${rv.body || ''}</div>
          </div>`).join('')}
        <form class="review-form" id="review-form">
          <input type="email" id="rv-email" placeholder="you@example.com" required />
          <select id="rv-rating" required>
            <option value="">Rating…</option><option value="5">5 ★</option><option value="4">4 ★</option><option value="3">3 ★</option><option value="2">2 ★</option><option value="1">1 ★</option>
          </select>
          <input type="text" id="rv-title" placeholder="Title (optional)" />
          <textarea id="rv-body" rows="3" placeholder="Your experience"></textarea>
          <button type="submit" class="btn-primary">Submit review</button>
          <div id="rv-result"></div>
        </form>
      </div>`;
    document.querySelector('main').appendChild(wrap);
    document.getElementById('review-form').onsubmit = async (e) => {
      e.preventDefault();
      const out = document.getElementById('rv-result');
      out.textContent = 'Submitting…';
      try {
        const res = await fetch('/api/reviews', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            productId: prod.id, email: document.getElementById('rv-email').value,
            rating: Number(document.getElementById('rv-rating').value),
            title: document.getElementById('rv-title').value, body: document.getElementById('rv-body').value,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        out.innerHTML = `<div class="ok">${data.note}${data.verified ? ' (verified buyer)' : ''}</div>`;
      } catch (err) { out.innerHTML = `<div class="err">${err.message}</div>`; }
    };
  }

  // — "Pairs with" recommendations —
  function renderRecommendations(prod, srcFn, money) {
    const recs = prod.recommendations || [];
    if (!recs.length) return;
    const wrap = document.createElement('section');
    wrap.className = 'pdp__rail';
    wrap.innerHTML = `
      <h2>Pairs with</h2>
      <div class="grid">
        ${recs.map((rp) => {
          const h = (rp.media || [])[0];
          return `<a class="card" href="/product.html?slug=${encodeURIComponent(rp.slug)}">
            <div class="card__media"><span class="card__badge">${rp.tier || 'Eclipse'}</span>${h ? `<img src="${srcFn(h.url)}" alt="${h.alt || rp.title}" loading="lazy" />` : ''}</div>
            <div class="card__body"><h3 class="card__title">${rp.title}</h3><p class="card__price">${money(rp.price)}</p></div>
          </a>`;
        }).join('')}
      </div>`;
    document.querySelector('main').appendChild(wrap);
  }
})();
