// Account page: sign in, create an account, reset a password, view / edit your profile, and (Orders tab,
// account.html?tab=orders) see current and past orders with their progress, tracking and a buy-again button.
// Accounts and profiles live in Supabase (js/supabase-config.js). A profile row is created by the database
// at sign-up (supabase/migrations/); customers can edit their name, institution and research area only.
// "Verified" is set by Aura Pharma after checking research affiliation.
(function () {
  const box = document.getElementById("acct"), title = document.getElementById("acct-title");
  const { url, key } = window.AURA_SUPABASE;
  const sb = window.supabase.createClient(url, key);
  const e = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const here = location.origin + location.pathname;            // where email links bring people back
  let recovering = /type=recovery/.test(location.hash);
  let confirmed = false;   // set when the visitor lands here from the sign-up confirmation email
  // ?next=checkout… sends a signed-in visitor back to checkout (same-site checkout pages only)
  const next = new URLSearchParams(location.search).get("next");
  const nextUrl = next && /^checkout(\.html)?(\?[\w=&%.-]*)?$/.test(next) ? next : null;

  const eye = `<button type="button" class="pw-toggle" aria-label="Show password" aria-pressed="false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button>`;
  const field = (id, label, type = "text", attrs = "") => type === "password"
    ? `<label for="${id}">${label} <span aria-hidden="true">*</span></label><div class="pw"><input id="${id}" class="field" type="password" ${attrs}>${eye}</div>`
    : `<label for="${id}">${label}${/required/.test(attrs) ? ' <span aria-hidden="true">*</span>' : ""}</label><input id="${id}" class="field" type="${type}" ${attrs}>`;
  const msg = (text, err = false) => { const m = box.querySelector(".portal-msg"); m.textContent = text; m.classList.toggle("err", err); };
  const wire = () => box.querySelectorAll(".pw-toggle").forEach((t) => (t.onclick = () => {
    const i = t.previousElementSibling, show = i.type === "password";
    i.type = show ? "text" : "password"; t.setAttribute("aria-pressed", show); t.setAttribute("aria-label", show ? "Hide password" : "Show password");
  }));
  // the header's initial (app.js accountBadge) uses the profile name cached here
  const badge = (user, name) => {
    try { name ? localStorage.setItem("aura-name", JSON.stringify({ id: user.id, name })) : localStorage.removeItem("aura-name"); } catch {}
    window.accountBadge?.();
  };
  const busy = (form, on) => form.querySelectorAll("button, input").forEach((x) => (x.disabled = on));

  // ---- signed out: sign in / create account
  function signedOut(tab = "in", email = "") {
    title.textContent = tab === "in" ? "Sign in" : "Create account";
    box.innerHTML = `
      <div class="acct-tabs" role="tablist">
        <button role="tab" aria-selected="${tab === "in"}" data-t="in">Sign in</button>
        <button role="tab" aria-selected="${tab === "up"}" data-t="up">Create account</button>
      </div>
      <form id="f" novalidate>${tab === "in" ? `
        ${field("email", "Email", "email", `autocomplete="email" required value="${e(email)}"`)}
        ${field("pass", "Password", "password", 'autocomplete="current-password" required')}
        <button class="btn portal-login" type="submit">Sign in</button>
        <p class="portal-msg" role="status"></p>
        <div class="portal-links"><a href="#" id="forgot">Forgot your password?</a></div>` : `
        ${field("name", "Full name", "text", 'autocomplete="name" required')}
        ${field("email", "Email", "email", 'autocomplete="email" required')}
        ${field("pass", "Password (8+ characters)", "password", 'autocomplete="new-password" minlength="8" required')}
        ${field("inst", "Institution or company", "text", 'autocomplete="organization" required')}
        ${field("area", "Research area", "text", 'placeholder="e.g. in vitro peptide research"')}
        <label class="acct-check"><input id="ruo" type="checkbox"> I am 21 or older and a qualified researcher buying for laboratory research only, not for human or veterinary use.</label>
        <button class="btn portal-login" type="submit">Create account</button>
        <p class="portal-msg" role="status"></p>
        <p class="acct-note">New accounts are checked for research affiliation before the first order.</p>`}
      </form>`;
    wire();
    box.querySelectorAll(".acct-tabs button").forEach((b) => (b.onclick = () => signedOut(b.dataset.t)));
    const f = box.querySelector("#f"), v = (id) => box.querySelector("#" + id)?.value.trim() ?? "";
    if (tab === "in") box.querySelector("#forgot").onclick = async (ev) => {
      ev.preventDefault();
      if (!v("email")) return msg("Enter your email above, then choose Forgot your password.", true);
      const { error } = await sb.auth.resetPasswordForEmail(v("email"), { redirectTo: here });
      msg(error ? error.message : "If that email has an account, a reset link is on its way.", !!error);
    };
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const pass = box.querySelector("#pass").value;
      if (tab === "in") {
        if (!v("email") || !pass) return msg("Enter your email and password.", true);
        busy(f, true); const { error } = await sb.auth.signInWithPassword({ email: v("email"), password: pass }); busy(f, false);
        if (error) return msg(/confirm/i.test(error.message) ? "Confirm your email first: open the link we sent you." : "Email or password is incorrect.", true);
        return show();
      }
      if (!v("name") || !v("email") || !v("inst")) return msg("Fill in your name, email and institution.", true);
      if (pass.length < 8) return msg("Use a password of at least 8 characters.", true);
      if (!box.querySelector("#ruo").checked) return msg("Please confirm research use to create an account.", true);
      busy(f, true);
      const { data, error } = await sb.auth.signUp({ email: v("email"), password: pass,
        options: { emailRedirectTo: here, data: { full_name: v("name"), institution: v("inst"), research_area: v("area") } } });
      busy(f, false);
      if (error) return msg(error.message, true);
      if (data.session) return show();
      // Supabase answers a sign-up for an already-registered email with a user that has no identities
      // (and sends nothing), so say so instead of "check your email"
      if (data.user && !data.user.identities?.length) return exists(v("email"));
      title.textContent = "Check your email";
      box.innerHTML = `<p>We sent a confirmation link to <b>${e(v("email"))}</b>. Open it to finish creating your account, then sign in here.</p>
        <p class="portal-msg" role="status"></p><div class="portal-links"><a href="account.html">Back to sign in</a></div>`;
    };
  }

  // ---- sign-up with an email that already has an account
  function exists(email) {
    title.textContent = "Account already exists";
    box.innerHTML = `<p>There's already an account for <b>${e(email)}</b>. Sign in, or reset your password if you've forgotten it.</p>
      <button class="btn portal-login" type="button" id="go-in">Sign in</button>
      <p class="portal-msg" role="status"></p>
      <div class="portal-links"><a href="#" id="forgot">Forgot your password?</a></div>`;
    box.querySelector("#go-in").onclick = () => { signedOut("in", email); box.querySelector("#pass").focus(); };
    box.querySelector("#forgot").onclick = async (ev) => {
      ev.preventDefault();
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: here });
      msg(error ? error.message : `A password reset link is on its way to ${email}.`, !!error);
    };
  }

  // ---- arrived from a password-reset email: choose a new password
  function newPassword() {
    title.textContent = "Choose a new password";
    box.innerHTML = `<form id="f" novalidate>${field("pass", "New password (8+ characters)", "password", 'autocomplete="new-password" minlength="8" required')}
      <button class="btn portal-login" type="submit">Save password</button><p class="portal-msg" role="status"></p></form>`;
    wire();
    box.querySelector("#f").onsubmit = async (ev) => {
      ev.preventDefault();
      const pass = box.querySelector("#pass").value;
      if (pass.length < 8) return msg("Use a password of at least 8 characters.", true);
      const { error } = await sb.auth.updateUser({ password: pass });
      if (error) return msg(error.message, true);
      recovering = false; history.replaceState(null, "", here); show("Password updated.");
    };
  }

  // ---- signed in: profile and orders tabs
  async function profile(user, note = "", tab = new URLSearchParams(location.search).get("tab") === "orders" ? "orders" : "profile") {
    title.textContent = "Your account";
    const { data: p, error } = await sb.from("profiles").select("email, full_name, institution, research_area, verified, role, created_at").eq("id", user.id).maybeSingle();
    if (!error && p) badge(user, p.full_name);
    if (error || !p) { box.innerHTML = `<p class="portal-msg err">Couldn't load your profile (${e(error?.message ?? "not found")}).</p><button class="btn" id="out">Sign out</button>`; box.querySelector("#out").onclick = signOut; return; }
    box.innerHTML = `
      <div class="acct-head"><div><b>${e(p.full_name || p.email)}</b><span class="muted">${e(p.email)}</span></div>
        <div class="acct-badges">
          ${user.email_confirmed_at ? `<span class="acct-badge ok">Email verified</span>` : `<span class="acct-badge">Email not confirmed</span>`}
          ${p.verified ? `<span class="acct-badge ok">Verified researcher</span>` : ""}
        </div></div>
      <div class="acct-tabs" role="tablist">
        <button role="tab" aria-selected="${tab === "profile"}" data-t="profile">Profile</button>
        <button role="tab" aria-selected="${tab === "orders"}" data-t="orders">Orders</button>
      </div>
      ${tab === "orders" ? `<div id="ord" class="ord-list"><p class="muted">Loading your orders…</p></div>` : `
      ${p.verified ? "" : `<p class="acct-note acct-note-top">We check research affiliation before your first order ships. We'll email you if we need anything.</p>`}
      <form id="f" novalidate>
        ${field("name", "Full name", "text", `autocomplete="name" value="${e(p.full_name)}"`)}
        ${field("inst", "Institution or company", "text", `autocomplete="organization" value="${e(p.institution)}"`)}
        ${field("area", "Research area", "text", `value="${e(p.research_area)}"`)}
        <button class="btn portal-login" type="submit">Save changes</button>
        <p class="portal-msg" role="status"></p>
        <div class="portal-links"><span class="muted">Member since ${new Date(p.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span><a href="#" id="out">Sign out</a></div>
      </form>`}`;
    box.querySelectorAll(".acct-tabs button").forEach((b) => (b.onclick = () => {
      history.replaceState(null, "", b.dataset.t === "orders" ? "account.html?tab=orders" : "account.html");
      profile(user, "", b.dataset.t);
    }));
    if (tab === "orders") return orders(user);
    if (note) msg(note);
    // arrived from the confirmation email: say so, with a way into the shop
    if (confirmed) {
      confirmed = false;
      box.insertAdjacentHTML("afterbegin", `<div class="acct-welcome"><b>Your email is confirmed.</b> Your account is ready.
        <a class="btn small" href="shop.html">Continue to the shop →</a></div>`);
    }
    box.querySelector("#out").onclick = (ev) => { ev.preventDefault(); signOut(); };
    box.querySelector("#f").onsubmit = async (ev) => {
      ev.preventDefault();
      const v = (id) => box.querySelector("#" + id).value.trim() || null;
      const { error } = await sb.from("profiles").update({ full_name: v("name"), institution: v("inst"), research_area: v("area") }).eq("id", user.id);
      if (!error) badge(user, v("name"));
      msg(error ? error.message : "Saved.", !!error);
    };
  }

  // ---- Orders tab: in progress (unpaid, paid, or shipped in the last 14 days) and past orders, newest first
  const STATUS = { awaiting_payment: "Awaiting payment", paid: "Paid", shipped: "Shipped", cancelled: "Cancelled" };
  const day = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const steps = (o) => o.status === "cancelled" ? "" : `<ol class="ord-steps">${[
      ["Placed", o.created_at, true],
      ["Paid", o.paid_at, o.status !== "awaiting_payment"],
      ["Shipped", o.shipped_at, o.status === "shipped"],
    ].map(([k, d, done]) => `<li class="${done ? "done" : ""}"><span>${k}</span>${done && d ? `<small>${day(d).replace(/, \d{4}$/, "")}</small>` : ""}</li>`).join("")}</ol>`;
  const sold = (i) => byId(i.id)?.sizes.some((s) => s.label === i.label && s.price != null);
  const card = (o) => {
    const view = `checkout.html?order=${encodeURIComponent(o.order_no)}`, items = o.items ?? [];
    return `<article class="ord">
      <div class="ord-head"><div><b class="mono">${e(o.order_no)}</b><span class="muted">Placed ${day(o.created_at)}</span></div>
        <span class="acct-badge ${o.status === "paid" || o.status === "shipped" ? "ok" : ""}">${STATUS[o.status]}</span></div>
      ${steps(o)}
      <ul class="ord-items">${items.map((i) => { const p = byId(i.id), s = p?.sizes.find((x) => x.label === i.label);
        return `<li>${p && s ? `<img src="${vialImg(p, s)}" alt="" width="40" height="40" loading="lazy">` : `<span class="ord-noimg"></span>`}
          <span>${e(i.name)} <span class="muted">${e(sizeText(i.label))}</span></span><span class="mono muted">× ${i.qty}</span></li>`; }).join("")}</ul>
      ${o.status === "awaiting_payment" ? `<p class="acct-note">${o.pay_method === "invoice" ? "We'll email an invoice for this order; it ships once payment clears." : "Waiting for your crypto payment."}</p>` : ""}
      ${o.tracking ? `<p class="ord-track">Tracking <a class="mono" href="${trackUrl(o.tracking)}" target="_blank" rel="noopener">${e(o.tracking)}</a></p>` : ""}
      <div class="ord-foot"><span class="mono">$${(+o.total).toFixed(2)}</span>
        <div class="ord-actions">
          ${o.tracking ? `<a class="btn small" href="${trackUrl(o.tracking)}" target="_blank" rel="noopener">Track package</a>` : ""}
          ${o.status === "awaiting_payment" && o.pay_method === "crypto" ? `<a class="btn small" href="${view}">Pay now</a>` : ""}
          ${items.some(sold) ? `<button class="btn small" data-again="${e(o.order_no)}">Buy again</button>` : ""}
          <a class="btn small" href="${view}">View order</a>
        </div></div>
    </article>`;
  };
  async function orders(user) {
    const el = box.querySelector("#ord");
    const { data, error } = await sb.from("orders").select("order_no, items, total, status, pay_method, tracking, created_at, paid_at, shipped_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    if (error) { el.innerHTML = `<p class="portal-msg err">Couldn't load your orders (${e(error.message)}).</p>`; return; }
    if (!data.length) { el.innerHTML = `<div class="ord-empty"><p>No orders yet.</p><a class="btn small" href="shop.html">Browse the catalog →</a></div>`; return; }
    const recent = (o) => o.status === "awaiting_payment" || o.status === "paid" || (o.status === "shipped" && Date.now() - new Date(o.shipped_at ?? o.created_at) < 14 * 864e5);
    const now = data.filter(recent), past = data.filter((o) => !recent(o));
    el.innerHTML = (now.length ? `<h3 class="ord-group">In progress</h3>${now.map(card).join("")}` : "")
      + (past.length ? `<h3 class="ord-group">Past orders</h3>${past.map(card).join("")}` : "");
    // buy again: every item still sold goes back in the cart, then the cart opens
    el.querySelectorAll("[data-again]").forEach((b) => (b.onclick = () => {
      const o = data.find((x) => x.order_no === b.dataset.again);
      o.items.filter(sold).forEach((i, n, a) => addToCart(i.id, i.label, i.qty, n === a.length - 1));
    }));
  }

  async function signOut() { await sb.auth.signOut(); badge(null, null); signedOut("in"); }

  async function show(note) {
    if (recovering) return newPassword();
    const { data: { session } } = await sb.auth.getSession();
    if (session && nextUrl && !confirmed) return location.replace(nextUrl);
    session ? profile(session.user, note) : signedOut(new URLSearchParams(location.search).get("tab") === "signup" ? "up" : "in");
  }

  sb.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") { recovering = true; newPassword(); }
    else if (event === "SIGNED_IN" && /access_token|code=/.test(location.href)) {   // back from an email link
      confirmed = /type=signup|type=email/.test(location.href) || !/type=recovery/.test(location.href);
      history.replaceState(null, "", here); show();
    }
  });
  show();
})();
