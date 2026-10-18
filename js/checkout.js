// Checkout page: shipping address, payment method (invoice or crypto), order summary, and the order status view
// (checkout.html?order=AO-1001, plus &t=<token> for guest orders). Orders are created by the database function
// place_order(), which re-prices the cart, for signed-in customers or guests (supabase/migrations/). See CHECKOUT.md.
(function () {
  const root = $("#co"), title = $("#co-title"), eyebrow = $("#co-eyebrow");
  const { url, key } = window.AURA_SUPABASE, CFG = window.AURA_CHECKOUT;
  const sb = window.supabase.createClient(url, key);
  const STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");
  const ERRORS = {
    AP_EMAIL: "Enter a valid email address so we can send your invoice and tracking.",
    AP_TOO_MANY: "Too many orders from this email in the last hour. Email support@aurapharma.us if you need help.",
    AP_EMPTY: "Your cart is empty.",
    AP_BAD_ITEM: "Something in your cart isn't valid. Remove it and add it again.",
    AP_UNAVAILABLE: "An item in your cart is no longer available. Remove it and try again.",
    AP_ADDRESS: "Check the shipping address: name, street, city, state and a 5-digit ZIP are required.",
    AP_PRICE_CHANGED: "Prices have changed since this page loaded. Reload the page to see the new total.",
  };
  const errText = (e) => ERRORS[Object.keys(ERRORS).find((k) => e?.message?.startsWith(k))] ?? `Couldn't place the order (${e?.message ?? "unknown error"}).`;
  const STATUS = { awaiting_payment: "Awaiting payment", paid: "Paid", shipped: "Shipped", cancelled: "Cancelled" };

  const lines = () => cart().flatMap((i) => {
    const p = byId(i.id), s = p?.sizes.find((x) => x.label === i.label && x.price != null);
    return s ? [{ ...i, p, s, price: s.price }] : [];
  });
  const totals = (ls) => {
    const sub = Math.round(ls.reduce((n, l) => n + l.price * l.qty, 0) * 100) / 100;
    const ship = sub >= CFG.freeShippingFrom ? 0 : CFG.shippingFlat;
    return { sub, ship, total: Math.round((sub + ship) * 100) / 100 };
  };
  const summary = (ls, t) => `<aside class="co-summary">
      <h3>Order summary</h3>
      ${ls.map((l) => {
        const n = onHand(l.p, l.s) ?? 0, note = n >= l.qty ? "" : n > 0 ? `${n} in stock, ${l.qty - n} ships in ${LEAD_TIME}` : `Ships in ${LEAD_TIME}`;
        return `<div class="co-line"><img src="${vialImg(l.p, l.s)}" alt="" width="56" height="56">
          <div><b>${esc(l.p.name)}</b><span class="muted mono">${esc(sizeText(l.label))} × ${l.qty}</span>${note ? `<span class="cart-note">${note}</span>` : ""}</div>
          <span class="mono">${money(l.price * l.qty)}</span></div>`;
      }).join("")}
      <div class="co-row"><span>Subtotal</span><span class="mono">${money(t.sub)}</span></div>
      <div class="co-row"><span>Shipping (US)</span><span class="mono">${t.ship ? money(t.ship) : "Free"}</span></div>
      ${t.ship ? `<p class="muted co-small">Free shipping on orders of ${money(CFG.freeShippingFrom)} or more.</p>` : ""}
      <div class="co-row co-total"><span>Total</span><span class="mono">${money(t.total)}</span></div>
      <p class="muted co-small">A printed copy of the lab report ships with every vial.</p>
    </aside>`;
  const panel = (html) => `<div class="co-panel">${html}</div>`;

  // ---- states before the form
  const emptyCart = () => { root.innerHTML = panel(`<p>Your cart is empty.</p><a class="btn primary" href="shop.html">Browse the catalog</a>`); };
  const signIn = (ls, t) => {
    root.innerHTML = `<div class="co-grid"><div>${panel(`<h3>Sign in to check out</h3>
      <p class="muted">Sign in to see your orders in one place and check out faster next time, or continue as a guest.</p>
      <div class="co-actions"><a class="btn primary" href="account.html?next=checkout">Sign in</a><a class="btn" href="account.html?tab=signup&next=checkout">Create account</a></div>
      <div class="co-or"><span>or</span></div>
      <button class="btn co-guest" id="co-guest">Continue as guest</button>`)}</div>${summary(ls, t)}</div>`;
    $("#co-guest").onclick = () => form(ls, t, null);
  };

  // ---- the form (prof = the signed-in customer's profile, or null for a guest)
  function form(ls, t, prof) {
    const guest = !prof;
    const saved = store.get("ship", {});
    const v = (k, d = "") => esc(saved[k] ?? d);
    const f = (id, label, attrs = "", val = v(id)) => `<div class="co-field"><label for="s-${id}">${label}</label><input class="field" id="s-${id}" value="${val}" ${attrs}></div>`;
    root.innerHTML = `<div class="co-grid"><form id="co-form" novalidate>
      ${panel(`<h3>Shipping address</h3>
        <p class="muted co-small">We ship within the United States. ${guest ? `Checking out as a guest. <a href="account.html?next=checkout">Sign in instead</a>` : `Signed in as ${esc(prof.email)}.`}</p>
        ${guest ? f("email", "Email (for your invoice and tracking)", 'type="email" autocomplete="email" required') : ""}
        ${f("name", "Full name", 'autocomplete="name" required', v("name", prof?.full_name ?? ""))}
        ${f("line1", "Street address", 'autocomplete="address-line1" required')}
        ${f("line2", "Apartment, suite, lab (optional)", 'autocomplete="address-line2"')}
        <div class="co-cols">
          ${f("city", "City", 'autocomplete="address-level2" required')}
          <div class="co-field"><label for="s-state">State</label><select class="field" id="s-state" autocomplete="address-level1" required>
            <option value="">—</option>${STATES.map((s) => `<option${saved.state === s ? " selected" : ""}>${s}</option>`).join("")}</select></div>
          ${f("zip", "ZIP", 'autocomplete="postal-code" inputmode="numeric" maxlength="10" required')}
        </div>
        ${f("phone", "Phone (optional, for the courier)", 'autocomplete="tel" type="tel"')}`)}
      ${panel(`<h3>Payment</h3>
        <div class="co-methods" role="radiogroup" aria-label="Payment method">
          <label class="co-method"><input type="radio" name="pay" value="invoice" checked>
            <span><b>Pay by invoice</b><span class="muted">Bank transfer. We email an invoice for this order within one business day; it ships once payment clears.</span></span></label>
          ${CFG.crypto ? `<label class="co-method"><input type="radio" name="pay" value="crypto">
            <span><b>Pay with crypto</b><span class="muted">Bitcoin, Ethereum, USDC, USDT and others through our payment page. Ships once the payment confirms.</span></span></label>` : ""}
        </div>
        ${prof?.verified ? "" : `<p class="muted co-small">We confirm research use for new customers before an order ships, and will email you if we need anything.</p>`}
        <label class="co-check"><input type="checkbox" id="s-ruo"> I confirm these products are for laboratory research only, not for human or veterinary use, and I accept the terms of sale.</label>
        <button class="btn primary co-place" type="submit">Place order · ${money(t.total)}</button>
        <p class="portal-msg" role="status" id="co-msg"></p>`)}
    </form>${summary(ls, t)}</div>`;

    const msg = (text, err = true) => { const m = $("#co-msg"); m.textContent = text; m.classList.toggle("err", err); };
    $("#co-form").onsubmit = async (ev) => {
      ev.preventDefault();
      const val = (id) => $("#s-" + id).value.trim();
      const ship = { name: val("name"), line1: val("line1"), line2: val("line2"), city: val("city"), state: val("state"), zip: val("zip"), phone: val("phone") };
      if (guest) { ship.email = val("email"); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ship.email)) return msg(ERRORS.AP_EMAIL); }
      if (!ship.name || !ship.line1 || !ship.city || !ship.state) return msg(ERRORS.AP_ADDRESS);
      if (!/^\d{5}(-\d{4})?$/.test(ship.zip)) return msg("Enter a 5-digit ZIP code.");
      if (!$("#s-ruo").checked) return msg("Please confirm research use to place the order.");
      store.set("ship", ship);
      const method = root.querySelector("input[name=pay]:checked").value;
      const btn = $(".co-place"); btn.disabled = true; msg("Placing your order…", false);
      const { data, error } = await sb.rpc("place_order", {
        items: ls.map((l) => ({ id: l.id, label: l.label, qty: l.qty })), ship, method, expected_total: t.total });
      if (error) { btn.disabled = false; return msg(errText(error)); }
      const { order_no: order, guest_token: token } = data[0];
      store.set("cart", []); renderCart();
      // guests: the order's secret token goes in the status link and is remembered on this device
      if (token) store.set("guest-orders", { ...store.get("guest-orders", {}), [order]: token });
      history.replaceState(null, "", statusUrl(order, token));
      if (method === "crypto") return payCrypto(order, token, msg);
      showOrder(order, token, true);
    };
  }

  // ---- crypto: ask our server for the NOWPayments invoice, then go there
  async function payCrypto(order, token, msg) {
    msg?.("Opening the crypto payment page…", false);
    const { data: { session } } = await sb.auth.getSession();
    try {
      const r = await fetch("/api/crypto-invoice", { method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? {} : { Authorization: `Bearer ${session?.access_token}` }) },
        body: JSON.stringify(token ? { order, token } : { order }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.url) return location.assign(j.url);
      throw new Error(j.error || `HTTP ${r.status}`);
    } catch (e) {
      // the order exists; the status page offers the payment link again
      showOrder(order, token, true, `The crypto payment page didn't open (${e.message}). Try again below, or email support@aurapharma.us.`);
    }
  }

  // ---- an order's status
  async function showOrder(no, token, fresh = false, problem = "", poll = false) {
    const { data: o, error } = token ? await sb.rpc("guest_order", { order_no: no, token }) : await sb.from("orders").select("order_no, email, items, subtotal, shipping, total, ship_name, ship_line1, ship_line2, ship_city, ship_state, ship_zip, pay_method, status, crypto_invoice_url, tracking, paid_at, created_at").eq("order_no", no).maybeSingle();
    if (error || !o) {
      title.textContent = "Order not found";
      root.innerHTML = panel(token
        ? `<p class="muted">We couldn't find order ${esc(no)}. Use the full link from your order, or email support@aurapharma.us.</p>`
        : `<p class="muted">We couldn't find order ${esc(no)} on this account. Sign in with the account that placed it.</p><a class="btn" href="account.html?next=checkout">Sign in</a>`);
      return;
    }
    if (fresh && !poll) scrollTo(0, 0);
    eyebrow.textContent = `Order ${o.order_no}`;
    title.textContent = fresh && o.status === "awaiting_payment" ? "Thank you, your order is placed" : `Order ${o.order_no}`;
    const placed = new Date(o.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const next = {
      awaiting_payment: o.pay_method === "invoice"
        ? `<p>We'll email an invoice for <b>${money(+o.total)}</b> to <b>${esc(o.email)}</b> within one business day. Use <b class="mono">${esc(o.order_no)}</b> as the payment reference. Your order ships once payment clears.</p>`
        : `<p>Pay <b>${money(+o.total)}</b> in crypto to complete this order. It ships once the payment confirms on the network.</p>
           <button class="btn primary" id="co-pay">${o.crypto_invoice_url ? "Return to the crypto payment page" : "Pay with crypto"}</button>
           <p class="muted co-small">Already paid? Confirmation can take a few minutes; this page updates when it arrives.</p>`,
      paid: `<p>Payment received${o.paid_at ? ` on ${new Date(o.paid_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })}` : ""}. We'll email tracking to ${esc(o.email)} when it ships.</p>`,
      shipped: `<p>Your order has shipped.${o.tracking ? ` Tracking: <a class="mono" href="${trackUrl(o.tracking)}" target="_blank" rel="noopener">${esc(o.tracking)}</a>` : ""}</p>`,
      cancelled: `<p>This order was cancelled. Questions: <a href="mailto:support@aurapharma.us">support@aurapharma.us</a>.</p>`,
    }[o.status];
    root.innerHTML = `<div class="co-grid"><div>
      ${panel(`<div class="co-status-head"><span class="acct-badge ${o.status === "awaiting_payment" || o.status === "cancelled" ? "" : "ok"}">${STATUS[o.status]}</span><span class="muted">Placed ${placed}</span></div>
        ${problem ? `<p class="notice">${esc(problem)}</p>` : ""}${next}
        <p class="portal-msg" role="status" id="co-msg"></p>`)}
      ${panel(`<h3>Ship to</h3><p class="co-address">${[o.ship_name, o.ship_line1, o.ship_line2, `${o.ship_city}, ${o.ship_state} ${o.ship_zip}`].filter(Boolean).map(esc).join("<br>")}</p>
        ${token ? `<p class="muted co-small">Bookmark this page to check on your order; the link is private to you.</p>` : ""}
        <div class="co-actions"><a class="btn" href="shop.html">Continue shopping</a>${token ? "" : `<a class="btn" href="account.html?tab=orders">Your orders</a>`}</div>`)}
    </div>
    <aside class="co-summary"><h3>Items</h3>
      ${o.items.map((i) => `<div class="co-line co-line-plain"><div><b>${esc(i.name)}</b><span class="muted mono">${esc(sizeText(i.label))} × ${i.qty}</span></div><span class="mono">${money(i.price * i.qty)}</span></div>`).join("")}
      <div class="co-row"><span>Subtotal</span><span class="mono">${money(+o.subtotal)}</span></div>
      <div class="co-row"><span>Shipping</span><span class="mono">${+o.shipping ? money(+o.shipping) : "Free"}</span></div>
      <div class="co-row co-total"><span>Total</span><span class="mono">${money(+o.total)}</span></div>
      <p class="muted co-small">Payment: ${o.pay_method === "invoice" ? "invoice (bank transfer)" : "crypto"}</p>
    </aside></div>`;
    const pay = $("#co-pay");
    if (pay) pay.onclick = () => { pay.disabled = true; payCrypto(o.order_no, token, (t) => { $("#co-msg").textContent = t; }); };
    // a crypto payment in flight: check back until the webhook marks it paid
    if (o.pay_method === "crypto" && o.status === "awaiting_payment" && o.crypto_invoice_url && !problem)
      setTimeout(() => showOrder(no, token, fresh, "", true), 20000);
  }

  async function start() {
    const qs = new URLSearchParams(location.search), order = qs.get("order");
    const { data: { session } } = await sb.auth.getSession();
    if (order) {
      const token = qs.get("t") || store.get("guest-orders", {})[order];
      return token ? showOrder(order, token) : session ? showOrder(order) : signInForOrder();
    }
    const ls = lines(); if (!ls.length) return emptyCart();
    const t = totals(ls);
    if (!session) return signIn(ls, t);
    const { data: prof } = await sb.from("profiles").select("email, full_name, verified").eq("id", session.user.id).maybeSingle();
    form(ls, t, prof ?? { email: session.user.email });
  }
  const statusUrl = (order, token) => `checkout.html?order=${encodeURIComponent(order)}${token ? `&t=${token}` : ""}`;
  const signInForOrder = () => { root.innerHTML = panel(`<p class="muted">Sign in to see this order.</p><a class="btn primary" href="account.html?next=${encodeURIComponent("checkout.html" + location.search)}">Sign in</a>`); };
  start();
})();
