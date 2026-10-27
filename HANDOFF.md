# Handoff — where the Aura Pharma site stands

Start here when picking the project up again. It says what the site is, how to run and ship it, what is done, what is waiting on whom, and where every piece lives. Detail lives in two other files:

- [CERTIFICATIONS.md](CERTIFICATIONS.md) — the certificate (COA) system: lab reports, batch IDs, Cloudflare, generator, lookups.
- [CHANGELOG.md](CHANGELOG.md) — every change, newest first, with the reasons.
- [ACCOUNTS.md](ACCOUNTS.md) — customer accounts: the Supabase project, the profiles table and its rules, set-up still needed.
- [CHECKOUT.md](CHECKOUT.md) — checkout, orders, invoice and crypto payment, marking orders paid/shipped, price sync.
- [EMAIL.md](EMAIL.md) — the support@aurapharma.us mailbox (Zoho Mail Lite, $12/year), its Cloudflare DNS records, and the Supabase email sender.

> **This repo is public** and Vercel serves the site from it. Never commit supplier names, supplier batch numbers, lab task numbers, verification keys, costs or margins. The private material listed under "Where things live" stays out of git.

*Last updated: 2026-10-17.*

---

## 1. Picking up in 5 minutes

1. **Code:** `C:\Users\jackb\code\peptide-store` (this repo, `main` branch). Run `git pull` first: a Telegram bot (the "claude" VM on the home server) also pushes here.
2. **See it locally:** `python -m http.server 8800 --bind 127.0.0.1` in the repo, then open http://127.0.0.1:8800 (Ctrl+F5 after changes; the browser caches `app.js` and `styles.css`).
3. **Ship it:** commit and push to `main` on GitHub `Peptide-Store/unchudme`. Vercel deploys to **https://www.aurapharma.us** (also https://unchudme.vercel.app) within about a minute. Push as the GitHub account **MotherOf-Pearl** (token stored in Windows Credential Manager), not `jack-pluton`, which has no access.
4. **Certificates:** everything is in `tools/coa/` and described in CERTIFICATIONS.md. Most common request: "give me the lab work for AP-0008" → `cd tools/coa && node lookup.mjs AP-0008`.
5. **How we work:** changes are made and checked locally first; they go live only when Jack says "push".

---

## 2. What the site is

Aura Pharma: a static storefront for research-use-only peptides. No build step; plain HTML, CSS and JavaScript.

| page | file | in the header nav? | notes |
|---|---|---|---|
| Home | `index.html` | (logo) | classical theme (`renaissance.css`, `js/renaissance.js`): marble statue holding a moving painted flame (`js/fire.js`, `media/renaissance/fire-layer.png`), drifting ash (`js/ash.js`), the sale banner at the top, best sellers, "Independent lab reports" and "For research use only" tiles |
| Shop | `shop.html` | Shop | catalog grid with search, categories, sort; classical theme over drifting ash |
| Product | `product.html?id=…` | — | vial / certificate **gallery** (scrolls with the page, not sticky), price, stock, sizes, Specifications (under the buy box), lab report panel for the **selected size** with "Download certificate" |
| FAQ | `faq.html` | FAQ | classical theme over drifting ash |
| Account | `account.html` | profile icon | sign in / create account / reset password / profile with verification badge and order list (Supabase; see ACCOUNTS.md) |
| Checkout | `checkout.html` | cart → Checkout | accounts or guests; US address, pay by invoice or crypto, order status at `?order=AO-…` (see CHECKOUT.md) |
| Affiliate portal | `affiliate.html` | Affiliates | sign-in card (username/email, password with show/hide) over drifting ash, classical theme. **Not connected:** signing in says the portal isn't open yet |
| Lab reports | `coa.html` | no (footer only) | one row per certified product and size, then products still on sample data |
| Quality | `quality.html` | no (footer only) | what the labs test (purity, identity, content, appearance) |

Header: logo · Shop · FAQ · Affiliates · **profile icon** (opens the account page) · cart. On phones: logo mark, profile, cart and menu icons. A research-use strip sits above the header and an entry gate asks visitors to confirm research use.

**Password gate:** the whole site sits behind a password (`middleware.js`, checked on Vercel before anything is served). Temporary until launch. The password is the `PASSWORD` constant in `middleware.js` (a Vercel env var `SITE_PASSWORD` overrides it); delete `middleware.js` to open the site. `/api/crypto-webhook` stays open for NOWPayments.

**Motion rules (Jack's call):** the stars drift slowly in one direction; nothing follows the mouse (stars, planet and vials all ignore the pointer). Reduced-motion users get a still sky.

**Naming rule:** GLP1-R, GLP1-T, GLP1-S everywhere (site, certificates, docs); never the full compound names. GLP1-S is the catalog's own compound, not semaglutide.

### Files that drive it
| file | what it holds | how it changes |
|---|---|---|
| `data.js` | the catalog (22 products, sizes as options), shared specs, sample lab data, and `REPORTS` (real certificates) | catalog by hand; `REPORTS` **only** via `tools/coa/site-data.mjs` |
| `prices.js` | price per option (average of competitor prices) | generated: `node research/apply-pricing.mjs` |
| `stock.js` | vials on hand per option | generated: update `aura-ops/docs/inventory.md` (the only inventory record), run `node tools/stock/sync-stock.mjs`, push |
| `app.js` | header, footer, gate, cart, and every page's rendering | code |
| `styles.css` | all styling | code |
| `media/` | vial photos, hero image, link-preview card | `tools/vials/render.mjs` |
| `.vercelignore` | keeps `tools/`, `research/` and all `.md` docs off the live site | |

---

## 3. Certificates — current state

Full system in CERTIFICATIONS.md. In short: each lab report becomes an Aura Pharma certificate with its own **batch ID** (`AP-0001` …). The certificate has a product table, a test table with specifications, a conclusion when purity meets NLT 98.0%, and a QA signature. The lab's untouched original, a print copy and a record are kept privately under that batch ID in Cloudflare, so any batch ID leads back to the original.

**Live certificates (17):**

| Batch ID | Product | Size | Analysed |
|---|---|---|---|
| AP-0001 | GLP1-R | 10 mg | 2026-07-30 |
| AP-0002 | Tesamorelin | 10 mg | 2026-09-01 |
| AP-0003 | GLP1-R | 20 mg | 2026-08-02 |
| AP-0004 | GLP1-R | 30 mg | 2025-10-01 |
| AP-0005 | GLP1-T | 15 mg | 2025-10-01 |
| AP-0006 | GLP1-T | 30 mg | 2026-07-30 |
| AP-0007 | GLP1-T | 60 mg | 2025-10-01 |
| AP-0008 | BPC-157 | 10 mg | 2025-10-01 |
| AP-0009 | TB-500 | 10 mg | 2025-11-06 |
| AP-0010 | GHK-Cu | 50 mg | 2026-07-30 |
| AP-0011 | GHK-Cu | 100 mg | 2025-10-01 |
| AP-0012 | MOTS-c | 40 mg | 2025-10-01 |
| AP-0013 | BPC-157 + TB-500 | BPC 5 mg + TB 5 mg | 2026-07-30 |
| AP-0014 | BPC-157 + TB-500 | BPC 10 mg + TB 10 mg | 2025-11-24 |
| AP-0015 | CJC-1295 + Ipamorelin | CJC 5 mg + Ipa 5 mg | 2025-11-24 |
| AP-0016 | KLOW | 80 mg | 2025-09-30 |
| AP-0017 | GLOW | 70 mg | 2025-11-05 |

**No report yet** (these sizes show "coming soon", or sample data marked "Sample" for products with no report at all): GLP1-R 5/40/60 mg · GLP1-T 10/20/40 mg · Tesamorelin 5/20 mg · GLP1-S 5/10 mg · Ipamorelin 5/10 mg · CJC-1295 (no DAC) 5 mg · MOTS-c 10/20 mg · TB-500 5 mg · KPV 5/10 mg · Selank 5/10 mg · Semax 5/10 mg · Adamax 5/10 mg · Melanotan I and II · CJC-1295 + Ipamorelin 10 + 10 · Epitalon 10/50 mg · NAD+ 500/1000 mg.

**Adding a report:** CERTIFICATIONS.md → "Publishing a new report" (values file → preview → `generate.mjs --publish --original <lab pdf>` → `site-data.mjs` → check locally → push).

---

## 4. Where things live

| what | where | public? |
|---|---|---|
| Site code, docs, certificate tools | this repo, GitHub `Peptide-Store/unchudme` | **public** |
| Business docs (vision, competitors, top sellers, the original COA template PDF, the Telegram planning log `LATEST_UPDATE.md`) | GitHub `Peptide-Store/platform`, local `C:\Users\jackb\code\peptide-platform` | private |
| Certificate PDFs and pictures for the site | Cloudflare R2 bucket `aura-reports` (public address in `REPORTS_URL`, top of the reports block in `data.js`) | public |
| Lab originals, print copies, records | Cloudflare R2 bucket `aura-archive`, one folder per batch ID | private |
| Certificate register | Cloudflare D1 database `aura-coa` | private |
| Customer accounts and profiles | Supabase project "Aura Pharma" (`guzqebqtxiwngutbdmkl`); schema in `supabase/migrations/` | private |
| Report values files, Janoshik intake list, the first private record | `research/coa/*.json`, `research/coa/janoshik-intake.json`, `research/lab-reports.json` (git-ignored, local only) | private |
| Supplier costs and margin report | `research/supplier-costs.json`, `research/pricing-report.md` (git-ignored) | private |
| Janoshik report images as downloaded | `C:\Users\jackb\Downloads\Test Report #<task>.png` | local |
| Cloudflare login used by the tools | wrangler browser login on Jack's Windows machine (`npx wrangler login` if it expires) | — |

Back up the git-ignored `research/` files: they exist only on that machine (the register and `record.json` files in Cloudflare hold the same certificate data).

---

## 5. Open items

**Needs Jack (decisions, accounts, outside parties)**
- [x] **Domain on Vercel:** live at https://www.aurapharma.us (aurapharma.us redirects to www).
- [ ] **Rest of the domain work:** link-preview tags (`og:image`, `twitter:image`) in every page's head still point to unchudme.vercel.app; put the domain on Cloudflare; serve `aura-reports` at `reports.aurapharma.us` and update `REPORTS_URL`; ~~set up the support@aurapharma.us inbox~~ done 2026-10-17 on Zoho Mail (EMAIL.md).
- [ ] **Certificate footer domain** says aurapharma.co; the site uses aurapharma.us. Pick one.
- [ ] **Supplier check:** do the vials on sale come from the batches tested in 2025 (11 of the 17 certificates)?
- [ ] **TB-500 in the 5 + 5 blend** (AP-0013) was measured as the 889 Da fragment, not thymosin β4 like every other report. Confirm with the supplier.
- [ ] **Reports for the uncertified products and sizes** (list in section 3).
- [ ] **R2 API token** (R2 → Manage API tokens, Object Read & Write on the two buckets) to send customers expiring links to originals.
- [x] **Checkout** built 2026-10-17: invoice payment live; orders in Supabase (CHECKOUT.md).
- [ ] **Crypto payments:** open a NOWPayments account and set the Vercel keys, then `crypto: true` in `js/checkout-config.js` (CHECKOUT.md → Turning crypto on).
- [ ] **New-order alert:** nothing notifies you of new orders yet; check the `orders` table daily.
- [ ] **Shipping price** is a placeholder: $15 flat, free from $200, US only. Confirm.
- [ ] **Terms of sale / Privacy** footer links are still `#`; checkout asks customers to accept the terms of sale.
- [ ] **Legal review** before selling, especially the GLP-1 class (FDA exposure).
- [ ] **Repo visibility:** this repo is public. Making it private needs a Vercel plan that deploys private organisation repos, or moving the repo to the personal account.

**Build when asked**
- [ ] Affiliate portal backend: reuse the Supabase accounts (`role = 'affiliate'`), add applications and tracking. The page is a front end only.
- [x] Customer accounts: sign-in, sign-up, password reset, profiles (Supabase). **Before real customers:** set the site URL and a custom email sender in Supabase (ACCOUNTS.md).
- [ ] Verify-customers and orders admin screen.
- [ ] Certifications page as cards (search, purity, labelled vs measured, "View certificate"), designed in the style Jack shared; not started.
- [ ] Automatic reading of values from lab PDFs (text for tjqxgd, OCR for Janoshik images).
- [ ] Vial images still print old sample lot codes on their labels; re-render without them.

---

## 6. History in brief

See CHANGELOG.md for detail.
- **2026-10-13** — prototype storefront; competitor pricing; stock list.
- **2026-10-14** — rebrand to Aura Pharma; hero, mobile header; testing claims cut back to what the reports show; catalog trimmed to 22; lab report PDFs moved to Cloudflare R2.
- **2026-10-15** — certificate system (batch IDs, register, generator, lookup, template); 17 certificates published; product-page gallery and per-size reports; fuller certificate layout; affiliate portal page; profile icon; header nav down to Shop, FAQ, Affiliates; stars drift one way, nothing follows the mouse; Quality page trimmed.
