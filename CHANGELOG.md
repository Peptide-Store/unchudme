# Changelog

What changed on the Aura Pharma storefront and why. Newest first. The certificate system itself is documented in [CERTIFICATIONS.md](CERTIFICATIONS.md).

> Public repo: no supplier names, supplier batches, lab task numbers or verification keys here.

## 2026-10-20 — Founders 50% Off Sale

- **Site-wide 50% off.** `SALE` in `research/apply-pricing.mjs` (0.5 now; set 0 to end it) is written into `prices.js`. Each size keeps its list price as `was`, and `price` becomes the sale price, so the cart, checkout and `catalog_prices` all charge the sale price. Re-run `node tools/checkout/sync-prices.mjs` after changing it.
- Prices show the list price struck through next to the sale price on cards, product pages (with a "Founders 50% off" chip) and in the cart.
- **Landing page banner:** "50% OFF · Founders 50% Off Sale. Every vial site-wide is 50% off, no code needed." Links to the shop. It disappears when `SALE` is 0.

## 2026-10-20 — Hand-set prices across the catalog

- MOTS-c 40 mg set by hand to $140.00 (was $141.99, the competitor average), level with Rebirth Labs at $139.99. Override in `research/apply-pricing.mjs`.
- CJC-1295 + Ipamorelin 10 + 10 mg set by hand to $75.00 (was $99.99).
- Epitalon 50 mg set by hand to $110.00.
- KLOW 80 mg set by hand to $120.00 (was $117.99).
- SS-31 10 mg set by hand to $60.00 (was $59.99).
- Tesamorelin 10 mg set by hand to $80.00 (was $79.99).
- After a price sweep of Rebirth Labs, Mile High Compounds and Crush Research, set by hand: GLP1-R 10 mg $80 (was $72.99), GLP1-T 10 mg $70 (was $62.99), Ipamorelin 10 mg $75 (was $59.99), BPC-157 10 mg $50 (was $48.99), TB-500 10 mg $60 (was $62.99), Adamax 10 mg $70 (was $68.99), Melanotan II 10 mg $45 (was $42.99), GHK-Cu 50 mg $45 (was $40.99), GHK-Cu 100 mg $75 (was $53.99), BPC-157 + TB-500 10 + 10 mg $110 (was $95.99), NAD+ 500 mg $80 (was $75.99). BAC water stays $5.
- MOTS-c 10 mg set by hand to $60.00 (was $45.99).

## 2026-10-20 — Password gate on the whole site

- **`middleware.js`** (Vercel Routing Middleware) runs before every page and file. Without the password, visitors get a branded Aura Pharma password page; the right password sets a 30-day HttpOnly cookie and sends them on to the page they asked for.
- Temporary pre-launch gate: the password is the `PASSWORD` constant in `middleware.js` (a Vercel env var `SITE_PASSWORD` overrides it). Changing it signs everyone out. Delete `middleware.js` to open the site at launch.
- `/api/crypto-webhook` stays open so NOWPayments can still confirm payments. Everything else, including `/media/`, is behind the gate, so link previews no longer show the site.

## 2026-10-17 — Orders tab on the account page

- **Account → Orders** (`account.html?tab=orders`, linked from the order page's "Your orders"): in-progress and past orders with a Placed → Paid → Shipped tracker, items with vial thumbnails, tracking linked to the carrier, Track package, Pay now (unpaid crypto), Buy again and View order. Replaces the short order list under the profile.
- Tracking numbers on the order page are now links too (`trackUrl()` in app.js).
- BAC water 3 ml priced at $5.00 (manual price in `research/apply-pricing.mjs`).

## 2026-10-17 — Catalog trimmed to 19 sizes; one inventory record

- **Catalog:** 17 products, 19 sizes: GLP1-R 10 mg, GLP1-T 10 mg, Tesamorelin 10 mg, Ipamorelin 10 mg, MOTS-c 10 and 40 mg, SS-31 10 mg (back), BPC-157 10 mg, TB-500 10 mg, Adamax 10 mg, Melanotan II 10 mg (was "Standard vial"), GHK-Cu 50 and 100 mg, BPC-157 + TB-500 10 + 10 mg, CJC-1295 + Ipamorelin 10 + 10 mg, KLOW 80 mg, Epitalon 50 mg, NAD+ 500 mg, and BAC water 3 ml (new "Supplies" category; price on request until set). Dropped: GLP1-S, CJC-1295, KPV, Selank, Semax, Melanotan I, GLOW and the other sizes. Lab reports for sizes no longer sold are hidden from the site.
- **Inventory:** `Peptide-Store/aura-ops` → `docs/inventory.md` is the only inventory record. `stock.js` is now generated from it (`node tools/stock/sync-stock.mjs`), not kept by hand.
- Products can override the common spec rows (`spec` in data.js); BAC water shows its own form and storage.

## 2026-10-17 — Signed-in header, existing accounts, size labels

- **Signed-in header:** the account icon becomes a round badge with the customer's initial (from their name) on every page, so they can see they're signed in. Back to the person icon after sign-out. `app.js` reads the Supabase session from the browser; the account page caches the profile name (`aura-name`).
- **"Account already exists":** signing up with an email that already has a confirmed account now says so, with Sign in (email filled in) and Forgot your password, instead of "Check your email" (Supabase sends nothing in that case). An unconfirmed account still gets "Check your email", because Supabase re-sends the confirmation.
- **Size options show amounts only:** blends read "5 mg + 5 mg" rather than "BPC 5 mg + TB 5 mg" on the product page, cart, checkout and certificates (`sizeText()` in app.js). The full labels stay as the keys for prices, stock, images and certificates.

## 2026-10-17 — Email on Zoho

- **support@aurapharma.us** is live on **Zoho Mail Lite** (5 GB, $12/year). Google Workspace and Microsoft 365 both blocked the sign-up. MX, SPF and DKIM records added in Cloudflare via Zoho's one-click setup. Supabase SMTP settings for account emails documented. See EMAIL.md.

## 2026-10-17 — Guest checkout and quick add

- **Continue as guest** on checkout: guests give an email and order without an account; their status link carries a private token (`&t=…`). Unverified accounts can now order too; guest and unverified orders get a research-use check before shipping (`buyer_verified` on each order). At most 5 orders per email per hour.
- **Quick add** on product cards: the arrow is now a **+** button that adds the pictured size to the cart without opening the drawer (tick on the button, cart count bumps). The rest of the card still opens the product. Products with no price keep the arrow.

## 2026-10-17 — Checkout and payment

- **Checkout page** (`checkout.html`, `js/checkout.js`): the cart's Checkout button now opens it. Verified accounts enter a US shipping address and choose **pay by invoice** (bank transfer, invoice emailed by hand) or **crypto** (NOWPayments; switched off in `js/checkout-config.js` until the keys are set). Signed-out and not-yet-verified visitors are told what to do; sign-in returns to checkout.
- **Orders in Supabase**: `orders` table, `catalog_prices` (server copy of `prices.js`, synced by `tools/checkout/sync-prices.mjs`) and `place_order()`, which re-prices the cart so the browser can't set a price. Customers see only their own orders. Shipping $15, free from $200.
- **Order status view** (`checkout.html?order=AO-1001`) and a **Your orders** list on the account page.
- **Crypto endpoints** `api/crypto-invoice.js` and `api/crypto-webhook.js` (signature-checked; marks orders paid). See CHECKOUT.md.

## 2026-10-15 — Account page tweaks

- "Research check pending" badge removed; "Verified researcher" shows only once Aura Pharma has verified the account.
- Arriving from the confirmation email shows "Your email is confirmed" with **Continue to the shop**; a **← Back to home** link sits under the account card.

## 2026-10-15 — Support email

- **support@aurapharma.us** replaces info@aurapharma.us on the home page ("Request full lab documentation from …") and in the docs. The mailbox exists; use it for the Supabase email sender too.

## 2026-10-15 — Customer accounts (Supabase)

- **Profile badges** split in two so they're not confused: "Email verified" and "Research check pending" / "Verified researcher". Spacing under the research-check note fixed.

- **Account page** (`account.html`, `js/account.js`): sign in, create account (name, email, password, institution, research area, research-use confirmation), forgot / reset password, and a profile view with a "Verification pending / Verified researcher" badge and editable details. The header profile icon now opens it.
- **Supabase** project "Aura Pharma" for sign-in and the `profiles` table; schema in `supabase/migrations/`; browser library vendored as `vendor/supabase.js` (supabase-js 2.118.0). Customers can read and edit only their own profile and can't set their own verified flag (tested). Full detail in ACCOUNTS.md.
- Still needed before customers can sign up for real: site URL / redirect URLs and a custom email sender in the Supabase dashboard (ACCOUNTS.md → Set-up still needed).

## 2026-10-15 — GLP1-R pricing ladder

- **GLP1-R prices** set by hand as a per-mg ladder (`OVERRIDES` in `research/apply-pricing.mjs`): 5 mg $54.99 · 10 mg $72.99 · 20 mg $129.99 · 30 mg $164.99 · 40 mg $199.99 · 60 mg $269.99. Matches Mile High and Rebirth Labs at 5 mg and sits just under the market above that. Fixes two errors from averaging competitor prices: 5 mg had cost more than 10 mg ($74.99 vs $70.99), and 60 mg ($459.99) was copied from a single outlier.
- **Home**: lab-reports tile ends "A printed copy ships with every order." (the lab-verification clause removed).

## 2026-10-15 — Static product gallery; domain live

- **Product page**: the image / gallery no longer follows you down the page (it was sticky); it stays in place and scrolls away with the page.
- **Domain**: the site is live at https://www.aurapharma.us (aurapharma.us redirects there). The unchudme.vercel.app address still works.

## 2026-10-15 — Profile icon, handoff doc

- **Header**: profile (account) icon now on desktop too, between the nav and the cart. Placeholder: nothing behind it yet.
- **Affiliate page**: grid pattern removed from the background; just the drifting stars.
- **HANDOFF.md** added: the starting point for picking the project up again (state, how to run and ship, where everything lives, open items).

## 2026-10-15 — Hero motion, specs placement, Quality page

- **Home**: "Browse certificates" link removed from the lab reports tile; the research-use tile adds "Request full lab documentation from info@aurapharma.us".
- **Affiliate page**: the same drifting starfield behind the sign-in card (stars only, no planet).
- **Home hero**: the stars drift slowly in one direction (leftward, nearer stars a little faster). Nothing follows the mouse any more: the starfield, planet and 3D vials all ignore the pointer.
- **Product page**: Specifications back under the buy box (the beside-the-title layout was reverted); the gallery stays.
- **Quality page**: the "Current reports" and "Check it yourself" sections removed; certificates live on the product pages.
- **Nav**: Quality removed from the header (the page still exists, linked from the footer). Header nav is now Shop, FAQ, Affiliates.

## 2026-10-15 — Fuller certificates, product gallery, affiliate portal

- **Certificate layout** in the style of a manufacturer's COA: a product table (name, CAS, formula, molecular weight, sequence, quantity, form, storage, from the catalog) and a test table (test item, specification, result; method when the lab states one) with NLT specifications and a conclusion line when purity meets NLT 98.0%. Only tests the lab actually ran are listed. All 17 certificates re-issued.
- **Certificate images**: each certificate is also published as a picture (`AP-xxxx.webp`).
- **Product page gallery**: vial and certificate thumbnails under the main image; the certificate shows in the main window with a "Download PDF" button and opens full size when clicked. Follows the selected size.
- **Specifications beside the title** on desktop (in the space right of the buy box); stacked as before on tablet and mobile. Spec values wrap by word instead of mid-word.
- **Affiliate portal** (`affiliate.html`, "Affiliates" in the nav): username/email and password sign-in card with show-password. No account system yet: signing in says the portal isn't open yet.

## 2026-10-15 — Lab reports for 17 products and sizes

- **15 new certificates published** (AP-0003 to AP-0017) from Janoshik reports: GLP1-R 20 and 30 mg; GLP1-T 15, 30 and 60 mg; BPC-157 10 mg; TB-500 10 mg; GHK-Cu 50 and 100 mg; MOTS-c 40 mg; BPC-157 + TB-500 (5 + 5 and 10 + 10); CJC-1295 + Ipamorelin (5 + 5); KLOW 80 mg; GLOW 70 mg. With GLP1-R 10 mg (AP-0001) and Tesamorelin 10 mg (AP-0002) that's 17 certified products and sizes.
- **AP-0001 and AP-0002 re-issued** on the final template (batch ID, signature, no lab name or header contacts). AP-0002 now carries the lab's accreditation caveat and is verifiable at tjqxgd.com/coa-verify by its report number (found via the report's QR code; it had been recorded as "no verification").
- **Product page follows the selected size.** Each size shows its own certificate; a size without one says its report is coming soon instead of showing another size's report.
- **Blends** (no purity on the reports) show each ingredient's measured amount.
- **Lab reports page** lists one row per product and size; **removed from the header nav** (still in the footer).
- **Home "Independent lab reports" tile** shows BPC-157's real report instead of sample data.
- **`tools/coa/site-data.mjs`**: `data.js` REPORTS is now generated from the certificate register.
- **Docs:** CERTIFICATIONS.md extended (Janoshik specifics, site behaviour, site-data step); this changelog added.

Open: confirm with the supplier that the 2025-dated tests match the batches on sale; confirm which TB-500 (889 Da fragment vs thymosin β4) is in the 5 + 5 blend; reports still missing for the other products and sizes.

## 2026-10-14 / 15 — Certificate system (see CERTIFICATIONS.md)

- **Cloudflare R2** for PDFs: public bucket `aura-reports` (site downloads), private bucket `aura-archive` (lab originals, print copies, records). Lab PDFs removed from the repo.
- **Aura Pharma certificate generator** (`tools/coa/`): fills the template from a report's values and renders a public copy (site) and a print copy (order insert, with the sample code and the lab's verification key).
- **Template** rebuilt from the platform repo's design: Batch ID, product, sample code, tests, results, comments, analysis date, QA signature. Removed: lab name, manufacturer, supplier batch, header contact lines.
- **Batch ID** (`AP-0001`, …) replaces the lab task number on certificates and on the site; assigned in order by the **D1 register `aura-coa`**, which links each batch ID to the lab task number, key, sample, supplier batch and every file's R2 key and ETag.
- **Everything filed under the batch ID**: `aura-archive/AP-xxxx/` holds the lab original (task number in its file name), the print copy and `record.json`.
- **`lookup.mjs`**: given a batch ID, prints everything withheld from the public certificate and downloads the original, checked against the register.
- **Code names**: GLP1-R, GLP1-T, GLP1-S everywhere (site, certificates, docs); the generator refuses full compound names.
- **Site**: product page and Lab reports page show and link certificates by batch ID; Quality page and FAQ say batch IDs can be quoted to request full testing details.
- **Vercel** no longer serves the `.md` docs. LATEST_UPDATE.md (a planning chat log with private details) moved to the private platform repo.

## 2026-10-14 — Storefront

- **Catalog trimmed to 22 products** (18 removed, with their prices and vial images).
- **Testing claims match the reports**: only purity (HPLC), identity (mass spec) and measured content are claimed; endotoxin, metals, solvents, TFA, water, ISO 17025 and retention-sample claims removed. Every order ships with a printed copy of the lab report.
- **Batch lookup removed**; certificates moved onto product pages; batch and lab task numbers kept off public pages.
- **Home**: starfield and planet hero, smaller vials (hidden on mobile); "Cold-packed" and "8 tests" tiles removed (no cold shipping).
- **Mobile header**: logo mark, account (placeholder), cart with count badge, hamburger menu; hero wordmark and spacing.
- **Prototype wording removed** from footer and cart; checkout button reads "Checkout" (disabled until payments are connected).
- Earlier the same day: rebrand to Aura Pharma (logo, palette, link-preview card), entry gate with research-use confirmation, GLP1-R/-T/-S renames, re-shot vial images.
