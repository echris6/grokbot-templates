---
name: motion-studio-check-payments
description: Poll Whop for payments on each open quote (filtered by its checkout configuration id, paid only, matched on that id), mark paid orders in orders.csv and notify the user; flag expired quotes and payments with no matching order. Use for the payment-check routine or when the user asks "did they pay?".
---

# Check payments

## When to use
- The "Payment check" routine, or the user asks whether a client paid.
- Not for refunds (the user does those in the Whop dashboard) or for creating checkout links.

## Inputs and access
- `/workspace/motion-studio/orders.csv`, `config.json` → `whop.account_id`, `whop.tools`.
- `/workspace/grokbot-templates/_shared/whop.md` Recipe C.
- **Whop** connector (`payments list`, read-only), or `whop payments list … --format json`.

## Steps
1. Load `orders.csv`. Select orders with `status = quoted` and `created_at` within the last 30 days.
2. For each, call `payments list` with `account_id`, `checkout_configuration_ids: [<checkout_configuration_id>]`, `statuses: [paid]`.
3. For each returned payment whose `id` isn't already in the order's `payment_id`:
   - **match on the checkout configuration first:** the payment's checkout configuration id (from the filter, or a `checkout_configuration_id` field if the payment carries one) equals the order's `checkout_configuration_id`. Each order has its own link with `stock: 1`, so this is the reliable key;
   - set `status = paid`, `payment_id`, `paid_at` (the payment's `paid_at`), `amount`;
   - **secondary check, never a blocker:** if the payment shows `metadata.order_id` and it differs from the order's id, still mark the order paid but tell the user both ids. A missing `metadata` is normal (Whop's docs don't promise payments copy it from the checkout configuration).
4. Quotes older than 30 days and still `quoted`: list them for the user ("Quote expired: <order>. Delete the checkout link?"). Don't delete.
5. Once a day (the morning run): `payments list` with `statuses: [paid]` updated in the last 2 days; any payment whose checkout configuration matches no order → report it, don't guess.
6. Write `orders.csv` (temp file + rename). Append a `log.md` line: date · check-payments · N paid · $0.
7. For each newly paid order, tell the user and hand over to `motion-studio-study-references` (the routine starts it; in chat, ask "Start now?").

## Check the result
- Every `paid` row has a `payment_id` that Whop returned in this run, an `amount` and a `paid_at`.
- No order changed status without a matching payment.
- Late settlements (ACH pending → paid) are picked up because quoted orders are re-checked every run.

## Return
For each new payment: "Paid: <order_id> · $<amount>. Starting the build at <tier> tier." Then any expired quotes and unmatched payments as a short list.

## Needs approval
- Nothing to read payments.
- Deleting an expired checkout configuration, refunds, or any Whop change: never here; the user decides.

## If nothing is found or a step fails
- No new payments: "Nothing new today: no new payments" (routine) or "No payment yet for <order>" (chat).
- Whop call fails or returns an auth error: report it once with the error text, change nothing, and ask the user to reconnect Whop.
- A payment's metadata disagrees with the checkout-configuration match: the checkout configuration wins; tell the user both ids and let them stop the build if it's wrong.
