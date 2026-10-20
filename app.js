// Shared chrome (header, footer, researcher gate, cart) + per-page renderers.
// Each page sets <body data-page="..."> and includes data.js then app.js.

const $ = (s, el = document) => el.querySelector(s);
const money = (n) => `$${n.toFixed(2)}`;
const byId = (id) => PRODUCTS.find((p) => p.id === id);
const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
const priced = (p) => p.sizes.filter((s) => s.price != null);
const minPrice = (p) => (priced(p).length ? Math.min(...priced(p).map((s) => s.price)) : Infinity);
// On sale, a price shows the list price struck through before the sale price.
const saleMoney = (s) => (s.was != null ? `<span class="sale-pair"><s class="was">${money(s.was)}</s> <span class="now">${money(s.price)}</span></span>` : money(s.price));
const priceTag = (p) => (priced(p).length ? saleMoney(priced(p).find((s) => s.price === minPrice(p))) : "Price on request");
const saleOff = () => (typeof SALE !== "undefined" && SALE.off ? Math.round(SALE.off * 100) : 0);
// Availability from stock.js: on hand, sold out and on reorder, or ordered from the wholesaler on demand
const onHand = (p, s) => STOCK[p.id]?.[s.label];
const availability = (n) => (n > 0 ? { cls: "in", text: "In stock" }
  : n === 0 ? { cls: "back", text: `Backordered · ships in ${LEAD_TIME}` } : { cls: "order", text: `Ships in ${LEAD_TIME}` });
const inStock = (p) => p.sizes.some((s) => onHand(p, s) > 0);
const productAvailability = (p) => (inStock(p) ? availability(1)
  : p.sizes.some((s) => onHand(p, s) === 0) ? availability(0) : availability());
const stockPill = ({ cls, text }) => `<span class="stock-pill ${cls}">${text}</span>`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Size as shown to customers: just the amounts ("BPC 5 mg + TB 5 mg" → "5 mg + 5 mg"). The full label stays the key
// for prices, stock, images and certificates.
const sizeText = (label) => String(label).replace(/\b[A-Za-z][\w-]*\s+(?=[\d.]+\s*mg\b)/g, "");

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const RUO_SHORT = "For laboratory research use only. Not for human or veterinary use.";
const RUO_LONG = `All products sold by ${BRAND.name} are intended solely for in vitro laboratory research by qualified professionals. They are not drugs, food, dietary supplements, or cosmetics, are not intended for human or animal consumption, and are not intended to diagnose, treat, cure, or prevent any disease. Nothing on this site is medical advice or guidance on use in humans or animals. Purchasers are responsible for compliance with all applicable laws.`;

// Rendered product shots from tools/vials (one per product option)
const optSlug = (label) => label.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");
// media/ is served with a 1-year immutable cache — bump MEDIA_V whenever the vial renders change
const MEDIA_V = 12;
// a tracking number → the carrier's tracking page (USPS, UPS, FedEx; anything else goes to a multi-carrier lookup)
const trackUrl = (t) => {
  const n = String(t).replace(/\s+/g, "");
  if (/^1Z[0-9A-Z]{16}$/i.test(n)) return `https://www.ups.com/track?tracknum=${n}`;
  if (/^(9[1-5]\d{18,24}|[A-Z]{2}\d{9}US)$/i.test(n)) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
  if (/^(\d{12}|\d{15}|\d{20})$/.test(n)) return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  return `https://parcelsapp.com/en/tracking/${encodeURIComponent(n)}`;
};
const vialImg = (p, s) => `media/vials/${p.id}--${optSlug(s.label)}.webp?v=${MEDIA_V}`;

// Logo: a dark crossbarless "A" rising over a planet horizon — lit blade edges, a beam off the apex, a star in the counter.
// The wordmark spells AURA with Λ for the bare A. MARK_PARTS is the shared geometry (48×48 box): the vial labels
// (js/vial-model.js, via tools/vials/render.mjs) draw the same parts on canvas, so keep it valid JSON.
const MARK_PARTS = {
  "beam": "M24 -2V7",
  "a": "M24 4.5L37.5 40H30.5L24 21.5L17.5 40H10.5Z",
  "edge": "M10.5 40L24 4.5L37.5 40",
  "inner": "M17.5 40L24 21.5L30.5 40",
  "planet": "M-8 41Q24 23 56 41V56H-8Z",
  "rim": "M-8 41Q24 23 56 41",
  "star": "M24 27.2L24.45 29.85L27.1 30.3L24.45 30.75L24 33.4L23.55 30.75L20.9 30.3L23.55 29.85Z",
  "flare": "M19.5 30.3H28.5"
};
let markIds = 0; // gradient/filter ids must be unique per inline SVG
// tile: the dark rounded square (favicon). Without it the mark sits straight on a dark band.
function markSVG(size, attrs = "", { tile = true } = {}) {
  const k = `mk${markIds++}`, P = MARK_PARTS;
  return `<svg ${attrs} width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" aria-hidden="true"><defs>
    <clipPath id="${k}c"><rect width="48" height="48" rx="11"/></clipPath>
    <mask id="${k}m" maskUnits="userSpaceOnUse" x="-8" y="-8" width="64" height="64"><rect x="-8" y="-8" width="64" height="64" fill="#fff"/><path d="${P.planet}" fill="#000"/></mask>
    <linearGradient id="${k}a" x1="0" y1="6" x2="0" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2b3947"/><stop offset="1" stop-color="#06090d"/></linearGradient>
    <linearGradient id="${k}e" x1="0" y1="5" x2="0" y2="36" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#a9dcff"/><stop offset="1" stop-color="#5aa9e6" stop-opacity=".25"/></linearGradient>
    <linearGradient id="${k}r" x1="-8" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5aa9e6" stop-opacity="0"/><stop offset=".5" stop-color="#e6f5ff"/><stop offset="1" stop-color="#5aa9e6" stop-opacity="0"/></linearGradient>
    <linearGradient id="${k}b" x1="0" y1="-2" x2="0" y2="7" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#a9dcff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <radialGradient id="${k}h" cx="24" cy="31" r="22" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7cc4ff" stop-opacity=".35"/><stop offset="1" stop-color="#7cc4ff" stop-opacity="0"/></radialGradient>
    <filter id="${k}g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.1"/></filter></defs>
    <g${tile ? ` clip-path="url(#${k}c)"><rect width="48" height="48" fill="#04070b"/` : ""}><g mask="url(#${k}m)"><rect x="-8" y="-8" width="64" height="64" fill="url(#${k}h)"/>
      <path d="${P.beam}" stroke="url(#${k}b)" stroke-width="2.2" filter="url(#${k}g)"/><path d="${P.beam}" stroke="url(#${k}b)" stroke-width=".7"/>
      <path d="${P.a}" fill="url(#${k}a)"/>
      <path d="${P.edge}" stroke="url(#${k}e)" stroke-width="1.8" filter="url(#${k}g)"/><path d="${P.edge}" stroke="url(#${k}e)" stroke-width=".75"/>
      <path d="${P.inner}" stroke="#9fd4ff" stroke-opacity=".35" stroke-width=".5"/></g>
      <path d="${P.rim}" stroke="url(#${k}r)" stroke-width="2.4" filter="url(#${k}g)"/><path d="${P.rim}" stroke="url(#${k}r)" stroke-width=".7"/>
      <circle cx="24" cy="30.3" r="2.6" fill="#bfe6ff" opacity=".55" filter="url(#${k}g)"/>
      <path d="${P.flare}" stroke="#cfeaff" stroke-width=".35" opacity=".7"/><path d="${P.star}" fill="#fff"/></g></svg>`;
}
// The name only appears in the header; everywhere else the mark stands alone.
const logoHTML = () => `<a class="logo" href="index.html" aria-label="${esc(BRAND.name)} home">${markSVG(42, 'class="logo-mark"', { tile: false })}<span class="wordmark" aria-hidden="true"><b>ΛURΛ</b><small>PHARMA</small></span></a>`;
const markLink = (size) => `<a class="logo" href="index.html" aria-label="${esc(BRAND.name)} home">${markSVG(size, 'class="logo-mark"', { tile: false })}</a>`;

function setFavicon() {
  const svg = markSVG(48, 'xmlns="http://www.w3.org/2000/svg"');
  document.head.insertAdjacentHTML("beforeend", `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(svg)}">`);
}

/* ---------- chrome ---------- */
const ACCOUNT_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;
function renderChrome() {
  setFavicon();
  const page = document.body.dataset.page;
  const nav = [["shop", "shop.html", "Shop"], ["faq", "faq.html", "FAQ"], ["affiliate", "affiliate.html", "Affiliates"]];
  document.body.insertAdjacentHTML("afterbegin", `
    <div class="bg" aria-hidden="true"></div>
    <div class="ruo-strip">${RUO_SHORT}</div>
    <header class="site dark-band"><div class="wrap">
      ${logoHTML()}
      <button class="menu-btn" aria-label="Menu" aria-expanded="false"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      <nav class="main">${nav.map(([k, h, l]) => `<a href="${h}"${k === page ? ' aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
      <a class="account-btn" href="account.html" aria-label="Account">${ACCOUNT_ICON}</a>
      <button class="cart-btn" aria-label="Open cart"><svg class="cart-ico" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.7 12.4a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L21 7H6.2"/></svg><span class="cart-word">Cart (</span><span id="cart-count">0</span><span class="cart-word">)</span></button>
    </div></header>`);

  document.body.insertAdjacentHTML("beforeend", `
    <footer class="site dark-band"><div class="wrap">
      <div class="cols">
        <div>${markLink(64)}
          <p class="muted">${esc(BRAND.tagline)}</p></div>
        <div><b>Catalog</b>${CATEGORIES.map((c) => `<a href="shop.html?cat=${c.id}">${c.label}</a>`).join("")}</div>
        <div><b>Company</b><a href="coa.html">Certificates</a><a href="quality.html">Quality</a><a href="faq.html">FAQ</a><a href="#">Terms of sale</a><a href="#">Privacy</a></div>
      </div>
      <div class="legal">${RUO_LONG}<br><br>© ${new Date().getFullYear()} ${esc(BRAND.name)} · ${esc(BRAND.domain)}.</div>
    </div></footer>
    <div class="drawer-bg"></div>
    <aside class="drawer" aria-label="Cart"><header><h3 style="margin:0">Cart</h3><button class="link-btn" data-close>Close</button></header>
      <div class="items"></div>
      <footer><div style="display:flex;justify-content:space-between"><span>Subtotal</span><b id="cart-sub">$0.00</b></div>
        <p class="notice" style="margin:0">${RUO_SHORT}</p>
        <a class="btn primary cart-checkout" href="checkout.html">Checkout</a></footer>
    </aside>`);

  $(".menu-btn").onclick = (e) => { const n = $("nav.main"); n.classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", n.classList.contains("open")); };
  $(".cart-btn").onclick = openCart;
  $(".drawer-bg").onclick = closeCart;
  $(".drawer [data-close]").onclick = closeCart;
  renderCart();
  gate();
}

function gate() {
  if (store.get("ruo-ack", false)) return;
  document.body.insertAdjacentHTML("beforeend", `
    <div class="gate" role="dialog" aria-modal="true" aria-labelledby="gate-t"><div class="box">
      <div class="eyebrow">Before you enter</div>
      <h2 id="gate-t" style="font-size:1.5rem">Research use only</h2>
      <p class="muted" style="font-size:.92rem">${esc(BRAND.name)} supplies research compounds to laboratories and qualified researchers. Please confirm:</p>
      <label><input type="checkbox" id="g1"> I am 21 years of age or older.</label>
      <label><input type="checkbox" id="g2"> I am a qualified researcher purchasing for in vitro or laboratory research only — not for human or veterinary use.</label>
      <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
        <button class="btn primary" id="g-enter" disabled>Enter site</button>
        <a class="btn" href="https://www.google.com">Leave</a>
      </div></div></div>`);
  const update = () => ($("#g-enter").disabled = !($("#g1").checked && $("#g2").checked));
  $("#g1").onchange = update; $("#g2").onchange = update;
  $("#g-enter").onclick = () => { store.set("ruo-ack", true); $(".gate").remove(); };
}

/* ---------- cart ---------- */
const cart = () => store.get("cart", []);
function addToCart(id, label, qty = 1, open = true) {
  const c = cart(); const hit = c.find((i) => i.id === id && i.label === label);
  hit ? (hit.qty += qty) : c.push({ id, label, qty });
  store.set("cart", c); renderCart(); if (open) openCart();
}
function renderCart() {
  const c = cart().filter((i) => byId(i.id)?.sizes.some((s) => s.label === i.label && s.price != null));
  const count = c.reduce((n, i) => n + i.qty, 0);
  $("#cart-count").textContent = count;
  $(".cart-btn").classList.toggle("empty", !count); // phones hide the badge on an empty cart
  let sub = 0;
  $(".drawer .items").innerHTML = c.length ? c.map((i, idx) => {
    const p = byId(i.id), s = p.sizes.find((x) => x.label === i.label), price = s.price; sub += price * i.qty;
    const n = onHand(p, s) ?? 0, note = n >= i.qty ? "" : n > 0 ? `${n} in stock, ${i.qty - n} ships in ${LEAD_TIME}` : `Ships in ${LEAD_TIME}`;
    return `<div class="item"><div><b>${esc(p.name)}</b> <span class="muted mono">${esc(sizeText(i.label))} × ${i.qty}</span><br>
      ${note ? `<span class="cart-note">${note}</span><br>` : ""}
      <button class="link-btn" data-rm="${idx}">Remove</button></div><div class="mono">${s.was != null ? `<s class="was">${money(s.was * i.qty)}</s><br>` : ""}${money(price * i.qty)}</div></div>`;
  }).join("") : `<p class="muted" style="padding:20px 0">Your cart is empty.</p>`;
  $("#cart-sub").textContent = money(sub);
  $(".cart-checkout").classList.toggle("is-disabled", !c.length);
  document.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => {
    const c2 = cart(); c2.splice(+b.dataset.rm, 1); store.set("cart", c2); renderCart();
  }));
}
function openCart() { $(".drawer").classList.add("open"); $(".drawer-bg").classList.add("open"); }
function closeCart() { $(".drawer").classList.remove("open"); $(".drawer-bg").classList.remove("open"); }

/* ---------- shared pieces ---------- */
// "6 sizes · 5–60 mg" for plain mg ranges, otherwise "2 options"
// every size, e.g. "10 mg · 40 mg"
function optionSummary(p) {
  return p.sizes.map((s) => esc(sizeText(s.label))).join(" · ");
}
// A batch's lab report: the panel the reports cover (purity, identity, measured content)
function coaPanel(l) {
  const p = byId(l.productId);
  // blends report each ingredient's amount and no purity
  const rows = [...(l.purity ? [["Purity (HPLC)", "≥ 98.0%", `${l.purity}%`]] : []),
    ["Identity", p.mw ? `MW ${p.mw}` : "Matches reference", l.identity],
    ...(l.content ? [["Content", `${esc(sizeText(l.size))} on the label`, l.content]] : []), ...(l.appearance ? [["Appearance", "White to off-white powder", l.appearance]] : [])];
  return `<div class="coa-panel" id="lab-report">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div><div class="eyebrow">Lab report</div><h3 style="margin:0">${esc(p.name)}</h3>
      <p class="muted mono" style="margin:6px 0 0">${l.certNo ? `Batch ${esc(l.certNo)} · ` : ""}${l.sample ? "" : `${esc(sizeText(l.size))} · `}Tested ${l.date}</p></div>
      ${l.sample ? `<div><span class="sample-badge">Sample data — not a real result</span></div>` : ""}</div>
    <div class="table-scroll" style="margin-top:18px"><table class="coa-table">
      <tr><th>Test</th><th>Specification</th><th>Result</th></tr>
      ${rows.map((r) => `<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono pass">${r[2]}</td></tr>`).join("")}
    </table></div>
    <p class="muted" style="font-size:.85rem;margin-top:16px">Laboratory: ${esc(l.lab)}. A printed copy ships with every order.${l.verify ? ` Verify it at ${l.verify} with the key printed on the report.` : ""}</p>
    ${l.pdf ? `<a class="btn" href="${l.pdf}" download target="_blank" rel="noopener" style="margin-top:6px">Download certificate ${esc(l.certNo ?? "")} (PDF)</a>` : ""}</div>`;
}
const latestLot = (id) => LOTS.filter((l) => l.productId === id).sort((a, b) => b.date.localeCompare(a.date))[0];
// the report shown for one size: its own real report; sample data only for products with no real report at all
const reportFor = (p, size) => {
  const real = LOTS.filter((l) => l.productId === p.id && !l.sample);
  return real.length ? real.find((l) => l.size === size.label) ?? null : latestLot(p.id);
};
const noReport = (size) => `<div class="coa-panel" id="lab-report"><div class="eyebrow">Lab report</div>
  <p class="muted" style="margin:8px 0 0">The lab report for ${esc(sizeText(size.label))} is coming soon. Other sizes of this product have reports; choose one above to see it.</p></div>`;

const shownSize = (p) => p.sizes.find((s) => onHand(p, s) > 0) || p.sizes[0]; // picture the size on the shelf
const PLUS = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;
const CHECK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
// The whole card links to the product (the name's link stretches over it); the + button adds the pictured size to the cart.
function productCard(p) {
  const s = shownSize(p), q = s.price != null ? s : priced(p)[0];
  return `<div class="card">
    <div class="vial"><img src="${vialImg(p, shownSize(p))}" alt="${esc(p.name)} vial" loading="lazy" width="1000" height="1000">${stockPill(productAvailability(p))}</div>
    <div class="card-body">
      <span class="tag">${catLabel(p.cat)}</span>
      <a class="name card-link" href="product.html?id=${p.id}">${esc(p.name)}</a>
      <span class="meta">${optionSummary(p)}</span>
      <span class="price">${priceTag(p)}${q
        ? `<button class="go quick-add" data-add="${p.id}" data-label="${esc(q.label)}" aria-label="Add ${esc(p.name)} ${esc(sizeText(q.label))} to cart" title="Add ${esc(sizeText(q.label))} to cart">${PLUS}</button>`
        : `<span class="go" aria-hidden="true">→</span>`}</span>
    </div>
  </div>`;
}
// quick add from any product card: add one vial, tick the button, bump the cart count (the drawer stays closed)
document.addEventListener("click", (e) => {
  const b = e.target.closest(".quick-add"); if (!b) return;
  e.preventDefault();
  addToCart(b.dataset.add, b.dataset.label, 1, false);
  const label = b.getAttribute("aria-label");
  b.classList.add("added"); b.innerHTML = CHECK; b.setAttribute("aria-label", "Added to cart");
  const c = $(".cart-btn"); c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
  clearTimeout(b._t); b._t = setTimeout(() => { b.classList.remove("added"); b.innerHTML = PLUS; b.setAttribute("aria-label", label); }, 1400);
});

/* ---------- pages ---------- */
// Founders sale banner at the top of the home and shop pages; the home one links through to the shop.
function saleBanner(link) {
  if (!saleOff()) return;
  const inner = `<span class="sale-pct">${saleOff()}% OFF</span><span class="sale-copy"><b>Founders ${saleOff()}% Off Sale.</b> Every vial site-wide is ${saleOff()}% off, no code needed.</span>`;
  $("main").insertAdjacentHTML("afterbegin", link ? `<a class="sale-banner" href="shop.html">${inner}<span class="sale-cta">Shop the sale →</span></a>` : `<div class="sale-banner">${inner}</div>`);
}
const pages = {
  home() {
    saleBanner(true);
    const onShelf = Object.keys(STOCK).map(byId).filter((p) => p && inStock(p));
    $("#featured").innerHTML = [...onShelf, ...PRODUCTS.filter((p) => !onShelf.includes(p))].slice(0, 8).map(productCard).join("");
    const l = LOTS.find((x) => x.productId === "bpc-157" && !x.sample) ?? LOTS.find((x) => x.productId === "bpc-157"), p = byId(l.productId);
    $("#mini-coa").innerHTML = `
      <div class="mini-coa-head"><b>${esc(p.name)}${l.sample ? "" : ` ${esc(sizeText(l.size))}`}</b>${l.sample ? `<span class="sample-badge">Sample</span>` : ""}</div>
      <div class="row"><span>Batch</span><span class="mono">${esc(l.certNo ?? l.lot)}</span></div>
      <div class="row"><span>Purity (HPLC)</span><span class="mono pass">${l.purity}%</span></div>
      <div class="row"><span>Identity</span><span class="mono pass">${l.sample ? "Conforms" : esc(l.identity)}</span></div>
      <div class="row"><span>Content</span><span class="mono">${l.content}</span></div>`;
  },

  shop() {
    saleBanner(false);
    const params = new URLSearchParams(location.search);
    let cat = params.get("cat") || "all", q = "", sort = "name";
    $("#chips").innerHTML = [{ id: "all", label: "All" }, { id: "instock", label: "In stock" }, ...CATEGORIES].map((c) =>
      `<button class="chip" data-cat="${c.id}" aria-pressed="${c.id === cat}">${c.label}</button>`).join("");
    const draw = () => {
      let list = PRODUCTS.filter((p) => (cat === "all" || p.cat === cat || (cat === "instock" && inStock(p))) &&
        [p.name, p.aka, p.seq, p.cas].join(" ").toLowerCase().includes(q));
      list.sort(sort === "price" ? (a, b) => minPrice(a) - minPrice(b) : sort === "mw" ? (a, b) => (a.mw ?? 1e9) - (b.mw ?? 1e9) : (a, b) => a.name.localeCompare(b.name));
      list = [...list.filter(inStock), ...list.filter((p) => !inStock(p))];
      $("#results").innerHTML = list.length ? list.map(productCard).join("") : `<p class="muted">No compounds match “${esc(q)}”.</p>`;
      $("#count").textContent = `${list.length} compound${list.length === 1 ? "" : "s"}`;
    };
    $("#chips").onclick = (e) => {
      const b = e.target.closest(".chip"); if (!b) return; cat = b.dataset.cat;
      document.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c === b)); draw();
    };
    $("#q").oninput = (e) => { q = e.target.value.trim().toLowerCase(); draw(); };
    $("#sort").onchange = (e) => { sort = e.target.value; draw(); };
    draw();
  },

  product() {
    const p = byId(new URLSearchParams(location.search).get("id")) || PRODUCTS[0];
    document.title = `${p.name} · ${BRAND.name}`;
    let size = p.sizes.find((s) => onHand(p, s) > 0) || p.sizes[0];
    const lots = LOTS.filter((l) => l.productId === p.id);
    const spec = { ...SPEC, ...p.spec };
    $("#pdp").innerHTML = `
      <div class="pdp-media">
        <div class="vial-lg" id="pdp-main"><img id="pdp-img" src="${vialImg(p, size)}" alt="${esc(p.name)} ${esc(sizeText(size.label))} vial" width="1000" height="1000"></div>
        <div class="thumbs" id="pdp-thumbs" role="group" aria-label="Pictures"></div>
      </div>
      <div class="pdp-info">
        <div class="buy">
        <a class="muted" href="shop.html?cat=${p.cat}" style="font-size:.9rem">← ${catLabel(p.cat)}</a>
        <h1 style="font-size:2.4rem;margin-top:10px">${esc(p.name)}</h1>
        <div class="price" style="font-size:1.4rem;font-weight:650" id="price"></div>
        <div class="avail" id="avail"></div>
        <div class="sizes" role="group" aria-label="Option">${p.sizes.map((s, i) =>
          `<button class="size${onHand(p, s) > 0 ? " has-stock" : ""}" data-i="${i}" aria-pressed="${s === size}">${esc(sizeText(s.label))}</button>`).join("")}</div>
        <div class="qty"><label for="qty" class="muted">Qty</label><input id="qty" class="field" type="number" min="1" max="50" value="1"></div>
        <button class="btn primary" id="add">Add to cart</button>
        </div>
        <p class="notice">${RUO_SHORT} No usage, dosing or administration guidance is provided.</p>
        <div class="specs">
        <h3>Specifications</h3>
        <table class="spec">
          ${p.seq ? `<tr><th>Sequence</th><td>${esc(p.seq)}</td></tr>` : ""}
          ${p.formula ? `<tr><th>Molecular formula</th><td>${esc(p.formula)}</td></tr>` : ""}
          ${p.mw ? `<tr><th>Molecular weight</th><td>${p.mw} g/mol</td></tr>` : ""}
          ${p.cas ? `<tr><th>CAS</th><td>${p.cas}</td></tr>` : ""}
          ${[["Form", spec.form], ["Purity", spec.purity], ["Storage", spec.storage]].filter((r) => r[1]).map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}
        </table>
        </div>
        <div id="coa-slot"></div>
      </div>`;
    const setAvail = () => {
      const n = onHand(p, size), qty = Math.max(1, +$("#qty").value || 1);
      $("#avail").innerHTML = stockPill(availability(n)) +
        (n > 0 && qty > n ? `<span class="muted">Only ${n} on hand. ${qty - n} backordered, ships in ${LEAD_TIME}.</span>` : "");
    };
    $("#qty").oninput = setAvail;
    const setReport = () => { if (!lots.length) return; const l = reportFor(p, size); $("#coa-slot").innerHTML = l ? coaPanel(l) : noReport(size); };
    // gallery: the vial, plus the certificate when this size has one; the certificate opens full size when clicked
    let view = "vial";
    const setGallery = () => {
      const l = lots.length ? reportFor(p, size) : null, cert = l?.img ? l : null;
      if (!cert) view = "vial";
      const main = $("#pdp-main");
      main.classList.toggle("cert", view === "cert");
      main.innerHTML = view === "cert"
        ? `<a href="${cert.img}" target="_blank" rel="noopener" title="Open full size"><img id="pdp-img" src="${cert.img}" alt="Certificate of analysis ${esc(cert.certNo)}, ${esc(p.name)} ${esc(sizeText(size.label))}"></a>
           <a class="cert-dl" href="${cert.pdf}" download target="_blank" rel="noopener">Download PDF</a>`
        : `<img id="pdp-img" src="${vialImg(p, size)}" alt="${esc(p.name)} ${esc(sizeText(size.label))} vial" width="1000" height="1000">`;
      $("#pdp-thumbs").innerHTML = cert ? [
        `<button class="thumb" data-v="vial" aria-pressed="${view === "vial"}" aria-label="Vial"><img src="${vialImg(p, size)}" alt=""></button>`,
        `<button class="thumb cert" data-v="cert" aria-pressed="${view === "cert"}" aria-label="Certificate of analysis ${esc(cert.certNo)}"><img src="${cert.img}" alt=""></button>`].join("") : "";
      document.querySelectorAll("#pdp-thumbs .thumb").forEach((b) => (b.onclick = () => { view = b.dataset.v; setGallery(); }));
    };
    const setPrice = () => { setAvail(); setReport(); setGallery(); $("#price").innerHTML = size.price == null ? "Price on request" : saleMoney(size) + (size.was != null ? ` <span class="sale-chip">Founders ${saleOff()}% off</span>` : ""); $("#add").disabled = size.price == null; };
    setPrice();
    document.querySelectorAll(".size").forEach((b) => (b.onclick = () => {
      size = p.sizes[+b.dataset.i];
      document.querySelectorAll(".size").forEach((x) => x.setAttribute("aria-pressed", x === b)); setPrice();
    }));
    $("#add").onclick = () => addToCart(p.id, size.label, Math.max(1, Math.min(50, +$("#qty").value || 1)));
    $("#related").innerHTML = PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4).map(productCard).join("")
      || PRODUCTS.filter((x) => x.id !== p.id).slice(0, 4).map(productCard).join("");
  },

  // Sign-in form only: there is no account system behind it yet, so it says so instead of pretending to log in.
  affiliate() {
    const msg = (text, err = false) => { $("#portal-msg").textContent = text; $("#portal-msg").classList.toggle("err", err); };
    const toggle = $(".pw-toggle"), pass = $("#pf-pass");
    toggle.onclick = () => {
      const show = pass.type === "password";
      pass.type = show ? "text" : "password";
      toggle.setAttribute("aria-pressed", show); toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
    };
    $("#portal-form").onsubmit = (e) => {
      e.preventDefault();
      if (!$("#pf-user").value.trim() || !pass.value) return msg("Enter your username or email and your password.", true);
      msg("Affiliate sign-in isn't open yet. We'll email approved affiliates when the portal goes live.");
    };
    $("#pf-lost").onclick = (e) => { e.preventDefault(); msg("Password reset opens with the affiliate portal."); };
    $("#pf-join").onclick = (e) => { e.preventDefault(); msg("Affiliate applications open soon."); };
  },

  coa() {
    // old ?batch= links land on the product that batch belongs to
    const old = new URLSearchParams(location.search), code = old.get("batch") ?? old.get("lot");
    const hit = code && LOTS.find((x) => x.lot?.toLowerCase() === code.trim().toLowerCase());
    if (hit) return location.replace(`product.html?id=${hit.productId}#lab-report`);
    // every real report (one per size), then sample data for products without one
    const real = LOTS.filter((l) => !l.sample).sort((a, b) => byId(a.productId).name.localeCompare(byId(b.productId).name) || parseFloat(a.size.replace(/^\D+/, "")) - parseFloat(b.size.replace(/^\D+/, "")));
    const rows = [...real, ...[...new Set(LOTS.filter((l) => l.sample).map((l) => l.productId))].map(latestLot)];
    $("#coa-list").innerHTML = rows.map((l) => { const id = l.productId, p = byId(id);
      return `<tr><td><a href="product.html?id=${id}#lab-report">${esc(p.name)}${l.sample ? "" : ` ${esc(sizeText(l.size))}`}</a></td><td>${l.date}</td>
        <td class="mono">${l.purity ? `${l.purity}%` : "—"}</td><td class="mono">${l.content ?? "—"}</td>
        <td>${l.pdf ? `<a class="mono" href="${l.pdf}" download target="_blank" rel="noopener">${esc(l.certNo ?? "PDF")}</a>` : `<span class="sample-badge">Sample</span>`}</td></tr>`; }).join("");
  },
};

/* ---------- signed in: the account icon becomes the customer's initial ----------
   Reads the session Supabase keeps in localStorage, so pages don't need the Supabase library. The account
   page caches the profile name under aura-name ({ id, name }) and calls accountBadge() on sign-in / sign-out. */
const SB_SESSION_KEY = "sb-guzqebqtxiwngutbdmkl-auth-token";
function accountBadge() {
  const btn = document.querySelector(".account-btn");
  if (!btn) return;
  const u = store.get(SB_SESSION_KEY, null)?.user, cached = store.get("aura-name", null);
  const name = (u && ((cached?.id === u.id && cached.name) || u.user_metadata?.full_name || u.email) || "").trim();
  btn.classList.toggle("signed-in", !!name);
  btn.setAttribute("aria-label", name ? `Account: ${name}` : "Account");
  btn.title = name;
  btn.innerHTML = name ? `<span class="acct-initial" aria-hidden="true">${esc(name[0].toUpperCase())}</span>` : ACCOUNT_ICON;
}
window.accountBadge = accountBadge;
addEventListener("storage", (ev) => { if (ev.key === SB_SESSION_KEY || ev.key === "aura-name") accountBadge(); });   // other tabs

renderChrome();
accountBadge();
pages[document.body.dataset.page]?.();
