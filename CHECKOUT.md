# Checkout — orders and payment

How a customer pays on the Aura Pharma site. Built 2026-10-17. Two ways to pay: **invoice** (bank transfer; Aura Pharma emails an invoice by hand) and **crypto** (NOWPayments hosted invoice; off until the keys are set).

> Public repo: never commit the Supabase service-role key, NOWPayments API key or IPN secret. They live only in Vercel's environment variables.

## The customer's path

1. **Cart → Checkout** (`checkout.html`). The cart drawer's Checkout button is live whenever the cart has items.
2. **Signed out:** sign in, create an account (`account.html?next=checkout` brings them back), or **Continue as guest** (adds an email field).
3. **Anyone can order** (guests, unverified and verified accounts): US shipping address (remembered on the device), payment method, research-use confirmation, **Place order**. Each order records `buyer_verified`; **guest and unverified orders get a research-use check before they ship.**
4. The order is created and the cart is emptied. The page becomes the **order status** view (`checkout.html?order=AO-1001`; guests get `&t=<secret token>`, also remembered on their device, and are told to bookmark it):
   - **Invoice:** "We'll email an invoice for $X to you within one business day; reference AO-1001."
   - **Crypto:** goes straight to the NOWPayments payment page. Coming back shows the status, a **Pay with crypto** button to return to the payment page, and it re-checks every 20 s until the payment lands.
5. **Account → Orders tab** (`account.html?tab=orders`): in-progress orders (unpaid, paid, or shipped in the last 14 days) and past orders, each with a Placed → Paid → Shipped tracker, its items, the tracking number linked to the carrier (USPS / UPS / FedEx by number format), **Buy again** (puts the items still sold back in the cart) and **View order**. Tracking appears once you fill in `tracking` on the order.

## Prices and shipping

- The browser never sets a price. `place_order()` (database function) prices each line from `public.catalog_prices`, adds shipping, and **refuses the order if the total differs from what the customer saw** ("prices have changed").
- `catalog_prices` is a copy of `prices.js`. **After every price change:** `node tools/checkout/sync-prices.mjs` (applies to the live database), then push the site.
- Shipping: **$15 flat, free from $200**, US only. It's set in two places that must match: `place_order()` in `supabase/migrations/20261017120000_orders.sql` and `js/checkout-config.js`.
- Stock isn't decremented automatically. After orders, update `aura-ops/docs/inventory.md` (the only inventory record), run `node tools/stock/sync-stock.mjs`, push.

## Running orders (Aura Pharma)

Orders are in Supabase → Table Editor → `orders`. Order numbers run AO-1001, AO-1002, …

| status | meaning | who sets it |
|---|---|---|
| `awaiting_payment` | placed, not paid | `place_order()` |
| `paid` | payment received | you (invoice) or the crypto webhook |
| `shipped` | on its way; put the tracking number in `tracking` | you |
| `cancelled` | | you |

Orders needing a research-use check before shipping: `select order_no, email, total from public.orders where not buyer_verified and status <> 'cancelled';`

```sql
-- invoice paid
update public.orders set status = 'paid', paid_at = now() where order_no = 'AO-1001';
-- shipped
update public.orders set status = 'shipped', shipped_at = now(), tracking = '9400 1000 0000 0000 0000 00' where order_no = 'AO-1001';
```

**There's no new-order alert yet.** Check the `orders` table daily until one is added (Supabase Database Webhook → email/Telegram).

## Database

`supabase/migrations/20261017120000_orders.sql` (applied 2026-10-17):

- `public.catalog_prices`: the server's price list; no customer access at all.
- `public.orders`: customers can **read only their own orders** and only the customer-facing columns (not `notes`, `crypto_invoice_id`, `crypto_status`). They cannot insert or change orders directly.
- `public.place_order(items, ship, method, expected_total)`: signed-in customers and guests (guests must give `ship.email`; they get a `guest_token` back). Checks items (qty 1–50, priced options only), the address (2-letter state, ZIP), the total, and allows at most 5 orders per email per hour.
- `public.guest_order(order_no, token)`: a guest reads their own order (customer-facing fields only) with its secret token.
- Guest checkout was added by `20261017130000_guest_checkout.sql` (applied 2026-10-17): `user_id` may be empty, plus `guest_token` and `buyer_verified`.

**Guest checkout tested 2026-10-17:** no email / tampered total → refused; guest order returns a token and reads back with it, not with a wrong token; anon can't read the orders table; the 6th order in an hour from one email is refused; unverified accounts can order (`buyer_verified = false`) and see only their own orders.

**First tested 2026-10-17** (verified-only rules, since relaxed for guests; in a rolled-back transaction): unverified → refused; tampered total → refused; unknown size, qty 0, bad ZIP → refused; valid orders priced correctly with and without shipping; a customer can't mark an order paid, insert an order, read `catalog_prices` or internal notes, or see another customer's orders; signed-out visitors can't call `place_order`.

## Crypto (NOWPayments)

- `api/crypto-invoice.js`: the site calls it with the customer's sign-in token (or, for a guest, the order's secret token). It checks that the order belongs to them, is crypto and unpaid, creates the NOWPayments invoice **for the amount stored on the order** (once), and returns its URL.
- `api/crypto-webhook.js`: NOWPayments calls it on every payment update. It verifies the HMAC-SHA512 signature (`x-nowpayments-sig`), records `crypto_status`, and sets the order **paid** only on `finished` for at least the order total in USD. A partial payment stays `awaiting_payment` with `crypto_status = partially_paid`; settle it by hand.

### Turning crypto on
1. Open a NOWPayments account; confirm with them that research-use peptides are acceptable; add a payout wallet.
2. NOWPayments → Settings → Payments → create an **API key** and an **IPN secret**.
3. Vercel → unchudme → Settings → Environment Variables (Production):
   - `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API keys → secret / service_role)
   - `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`
   - optional: `SITE_URL` (default `https://www.aurapharma.us`), `SUPABASE_URL` (defaults to the Aura Pharma project)
4. Redeploy, then set `crypto: true` in `js/checkout-config.js` and push.
5. Place a small real order to check the round trip: the order should flip to **Paid** on its own.

Until step 4, only invoice is offered, and the endpoint answers "crypto payments aren't set up yet".
