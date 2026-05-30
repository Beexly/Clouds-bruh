// Eclipse storefront — search/filter, cart, and a checkout that hits /api/checkout.
const money = (price) => '$' + Math.round((price?.listMinor || 0) / 100).toLocaleString('en-US');
const minorToStr = (m) => '$' + Math.round((m || 0) / 100).toLocaleString('en-US');
const mediaSrc = (u) => (!u ? '' : u.startsWith('http') || u.startsWith('/') ? u : '/' + u);

// ---- cart (localStorage) ----
const CART_KEY = 'eclipse_cart';
const loadCart = () => {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
};
const saveCart = (c) => localStorage.setItem(CART_KEY, JSON.stringify(c));
function addToCart(line) {
  const cart = loadCart();
  const hit = cart.find((l) => l.variantId === line.variantId);
  if (hit) hit.qty += line.qty;
  else cart.push(line);
  saveCart(cart);
  renderCartCount();
  openCart();
}
function setQty(variantId, qty) {
  let cart = loadCart();
  if (qty <= 0) cart = cart.filter((l) => l.variantId !== variantId);
  else { const h = cart.find((l) => l.variantId === variantId); if (h) h.qty = qty; }
  saveCart(cart);
  renderCart();
  renderCartCount();
}
const cartCount = () => loadCart().reduce((n, l) => n + l.qty, 0);

let ALL = [];

function card(p) {
  const hero = (p.media || [])[0];
  const specs = Object.entries(p.specs || {}).slice(0, 2);
  return `
    <a class="card" href="/product.html?slug=${encodeURIComponent(p.slug)}">
      <div class="card__media">
        <span class="card__badge">${p.tier || 'Eclipse'}</span>
        ${hero ? `<img src="${mediaSrc(hero.url)}" alt="${hero.alt || p.title}" loading="lazy" />` : ''}
      </div>
      <div class="card__body">
        <h3 class="card__title">${p.title}</h3>
        ${p.subtitle ? `<p class="card__sub">${p.subtitle}</p>` : ''}
        <p class="card__price">${money(p.price)}</p>
        <div class="card__specs">${specs.map(([k, v]) => `<span class="chip">${v}</span>`).join('')}</div>
      </div>
    </a>`;
}

// ---- search / filter ----
function applyFilters() {
  const q = (document.getElementById('search')?.value || '').toLowerCase().trim();
  const cat = document.getElementById('catfilter')?.value || '';
  const sort = document.getElementById('sortby')?.value || '';
  let list = ALL.filter((p) => {
    const hay = `${p.title} ${p.subtitle || ''} ${(p.tags || []).join(' ')} ${p.category}`.toLowerCase();
    return (!q || hay.includes(q)) && (!cat || p.category === cat);
  });
  if (sort === 'price-asc') list.sort((a, b) => (a.price.listMinor || 0) - (b.price.listMinor || 0));
  if (sort === 'price-desc') list.sort((a, b) => (b.price.listMinor || 0) - (a.price.listMinor || 0));

  render('house-grid', 'house-empty', list.filter((p) => /house/i.test(p.tier || '')));
  render('vault-grid', 'vault-empty', list.filter((p) => !/house/i.test(p.tier || '')));
}

function render(gridId, emptyId, items) {
  const grid = document.getElementById(gridId);
  const empty = document.getElementById(emptyId);
  if (!grid) return;
  grid.innerHTML = items.map(card).join('');
  if (empty) empty.hidden = items.length > 0;
}

// ---- cart drawer ----
function renderCartCount() {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = cartCount();
}
function openCart() { document.getElementById('cart-drawer')?.classList.add('open'); renderCart(); }
function closeCart() { document.getElementById('cart-drawer')?.classList.remove('open'); }

function renderCart() {
  const cart = loadCart();
  const body = document.getElementById('cart-body');
  if (!body) return;
  if (!cart.length) { body.innerHTML = '<p class="cart__empty">Your cart is empty.</p>'; return; }
  const total = cart.reduce((s, l) => s + (l.unitPriceMinor || 0) * l.qty, 0);
  body.innerHTML =
    cart.map((l) => `
      <div class="cart__line">
        <div><strong>${l.title}</strong><br><span class="muted">${minorToStr(l.unitPriceMinor)}</span></div>
        <div class="cart__qty">
          <button data-dec="${l.variantId}">−</button>
          <span>${l.qty}</span>
          <button data-inc="${l.variantId}">+</button>
        </div>
      </div>`).join('') +
    `<div class="cart__total"><span>Total</span><strong>${minorToStr(total)}</strong></div>
     <form id="checkout-form" class="checkout">
       <input type="email" id="co-email" placeholder="you@example.com" required />
       <button type="submit" class="btn-primary">Place order</button>
       <p class="muted small">Preview build — no payment is captured.</p>
     </form>
     <div id="checkout-result"></div>`;

  body.querySelectorAll('[data-inc]').forEach((b) => b.onclick = () => bump(b.dataset.inc, 1));
  body.querySelectorAll('[data-dec]').forEach((b) => b.onclick = () => bump(b.dataset.dec, -1));
  document.getElementById('checkout-form').onsubmit = doCheckout;
}
function bump(variantId, delta) {
  const l = loadCart().find((x) => x.variantId === variantId);
  if (l) setQty(variantId, l.qty + delta);
}

async function doCheckout(e) {
  e.preventDefault();
  const email = document.getElementById('co-email').value;
  const cart = loadCart().map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty }));
  const result = document.getElementById('checkout-result');
  result.textContent = 'Placing order…';
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cart, customer: { email } }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Checkout failed');
    saveCart([]);
    renderCartCount();
    result.innerHTML = `<div class="ok">Order <strong>${data.number}</strong> placed — ${minorToStr(data.totals.grandMinor)}. ${data.note}</div>`;
  } catch (err) {
    result.innerHTML = `<div class="err">${err.message}</div>`;
  }
}

async function load() {
  let data;
  try { data = await (await fetch('/api/storefront.json')).json(); }
  catch { data = { products: [], brand: {} }; }

  if (data.brand?.tagline) document.getElementById('tagline').textContent = data.brand.tagline;
  if (data.brand?.positioning) document.getElementById('positioning').textContent = data.brand.positioning;

  ALL = data.products || [];
  const cats = [...new Set(ALL.map((p) => p.category))].sort();
  const sel = document.getElementById('catfilter');
  if (sel) sel.innerHTML = '<option value="">All categories</option>' + cats.map((c) => `<option value="${c}">${c}</option>`).join('');

  document.getElementById('search')?.addEventListener('input', applyFilters);
  document.getElementById('catfilter')?.addEventListener('change', applyFilters);
  document.getElementById('sortby')?.addEventListener('change', applyFilters);
  document.getElementById('cart-toggle')?.addEventListener('click', openCart);
  document.getElementById('cart-close')?.addEventListener('click', closeCart);

  applyFilters();
  renderCartCount();
}

window.eclipseAddToCart = addToCart;
load();
