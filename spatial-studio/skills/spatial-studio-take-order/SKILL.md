---
name: spatial-studio-take-order
description: Turn an interested prospect or client into a priced order - agree the scope per unit (plans/units/products, tier, deliverable, revisions, turnaround), research price anchors, let the user set the price, create a Whop checkout link with an inline plan (stock 1), and draft the quote email. Use when a prospect replies with interest or a client asks for more units.
---

# Take an order

## When to use
- A prospect replied with interest, or an existing client wants more units (e.g. from `spatial-studio-watch-new-units`).
- Not to check whether they paid (`spatial-studio-check-payments`), and never to pick the price.

## Inputs and access
- The thread (pasted or in the Bot's email), `prospects.csv`, `orders.csv`, `config.json` (`whop.account_id`, `whop.product_ids`, `whop.tools`, `tier.default`).
- `/workspace/grokbot-templates/_shared/whop.md` Recipe B, `references/pricing-research.md`, `references/ideas/<idea>.md` → "Paid deliverable" and "Price anchors".
- **Whop** connector (or the `whop` CLI with `--format json`).

## Steps
1. **Scope** (write `jobs/<order-id>/brief.md`; the order id is `ss-<yyyy-mm-dd>-<client-slug>`): which units (names and plan URLs), the tier (default `standard`; `gauntlet` for flagship work), the deliverable (Whop-hosted site and/or zip, stills, pair sheets, ledger), included revision rounds, turnaround, and what the client must send (plans, photos, finish schedules). Photos with people → consent records.
2. **Price evidence:** if `research/prices-<idea>.md` is missing or older than 90 days, run the method in `pricing-research.md` (public pages only). Show the user the low, middle and high with links. **Ask the user for the price** per unit, and for the catalog if relevant. Over $2,500 per link: check the account's approval, or split into `-deposit` and `-balance` orders.
3. **Show the user** before creating anything: the title ("Interactive floor plan · <Client> · <N> plans"), the price, the access wording for the hosted site ("hosted for 12 months from delivery" or what the user decides; never "lifetime"), and the quote email. Wait for their yes.
4. **Create the checkout configuration** (Recipe B): `account_id`, inline `plan` with `product_id`, `plan_type: one_time`, `initial_price`, `currency: usd`, `title`, `visibility: quick_link`, `stock: 1`, `unlimited_stock: false`, `force_create_new_plan: true`, and `metadata.order_id`. Save the returned `id` (`ch_…`) and `purchase_url`.
5. **orders.csv** (temp file + rename): `order_id, client, scope, price, tier, checkout_configuration_id, purchase_url, status = quoted, created_at`. Leave `payment_id`, `paid_at`, `amount`, `delivered_at` empty. Prospect → `won` only once paid.
6. **Draft the quote email** (Bot email or Gmail draft, not sent): scope bullets, price, turnaround, what we need from them, the `purchase_url`, and that work starts when payment shows in Whop. Append a `log.md` line.

## Check the result
- The `ch_` id and `purchase_url` returned by Whop are in `orders.csv`. The price matches what the user typed.
- `metadata.order_id` equals the order id and the job folder name.
- The email states the access period for any hosted site and contains no claims.

## Return
The scope table, the price the user set, the checkout link, and the email draft. "Press Send when ready. I'll check for payment twice a day."

## Needs approval
- The price (user-set), creating the checkout configuration (a Whop write), and sending the email (the user presses Send).

## If nothing is found or a step fails
- Whop returns "plan unavailable" on the first test checkout: switch `visibility` to `hidden`, note it in `config.json`, and tell the user.
- The Whop call fails: show the error, create nothing twice, and ask the user to reconnect Whop.
- The client is vague about scope: draft 2–3 questions to send back instead of a quote.
