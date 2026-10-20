---
name: spatial-studio-check-payments
description: Poll Whop for payments on each open Spatial Studio quote (by checkout configuration id, paid only), mark paid orders in orders.csv and notify the user; flag expired quotes and paid payments with no matching order. Use for the payment-check routine or "did they pay?".
---

# Check payments

## When to use
- The "Payment check" routine, or the user asks whether a client paid.
- Not for refunds (the user does those in the Whop dashboard) or for creating links (`spatial-studio-take-order`).

## Inputs and access
- `/workspace/spatial-studio/orders.csv`, `config.json` → `whop.account_id`, `whop.tools`.
- `/workspace/grokbot-templates/_shared/whop.md` Recipe C.
- **Whop** connector (`payments list`, read-only), or `whop payments list … --format json`.

## Steps
1. Load `orders.csv`. Select orders with `status = quoted` and `created_at` within the last 30 days.
2. For each one, call `payments list` with `account_id`, `checkout_configuration_ids: [<checkout_configuration_id>]` and `statuses: [paid]`.
3. For each returned payment whose `id` isn't already the order's `payment_id`:
   - check that `metadata.order_id` equals the order id. If it doesn't, flag it to the user and stop for that order.
   - set `status = paid`, `payment_id`, `paid_at` (the payment's `paid_at`), and `amount` (its `total`).
4. Quotes older than 30 days and still `quoted`: list them for the user ("Quote expired: <order>. Delete the checkout link?"). Don't delete anything.
5. Once a day (the morning run): `payments list` with `statuses: [paid]`, updated in the last 2 days. Report any payment whose checkout configuration matches no order, and don't guess.
6. Write `orders.csv` (temp file + rename). Append to `log.md`: date · check-payments · N paid · $0.
7. For each newly paid order: in a routine, notify the user. In chat, ask "Start the build now?" When the user says go, set `status = building` and run `spatial-studio-build-spatial` at the order's tier.

## Check the result
- Every `paid` row has a `payment_id` that Whop returned in this run, plus an `amount` and a `paid_at`.
- No order changed status without a matching payment. Late settlements (ACH pending → paid) are caught because quoted orders are re-checked every run.

## Return
For each new payment: "Paid: <order_id> · $<amount>. Ready to build at <tier> tier." Then any expired quotes and unmatched payments as a short list.

## Needs approval
- Nothing to read payments. Deleting a checkout configuration, refunds or any Whop change: never in this skill.

## If nothing is found or a step fails
- No new payments: "Nothing new today: no new payments" (routine) or "No payment yet for <order>" (chat).
- An auth error from Whop: report it once with the error text, change nothing, and ask the user to reconnect Whop.
- Metadata mismatch: never start work on that order. Show the user both ids.
