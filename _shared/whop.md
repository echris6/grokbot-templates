# Whop recipes (all templates)

Every template sells through Whop. There are two ways to reach it:

| | **Whop connector** (default) | **Whop CLI** (fallback, and for site deploys) |
|---|---|---|
| What it is | Whop's official MCP server, `https://mcp.whop.com/mcp`. In Grok Bot: **Connect apps → Whop**. If Whop isn't listed there, add it as a custom Remote HTTPS MCP server with that URL. | `@whop/cli`, installed on the Bot's computer by `kit/bin/install.sh` |
| Auth | Browser OAuth when Grok Bot asks. Don't add an API key or a custom auth header (Whop's MCP docs). | **Either** `whop login --method oauth --format jsonl`, then send the user the `authorizationUrl` it prints (no key needed), **or** the `WHOP_API_KEY` secret: an Account API key with the custom permission set in `guardrails.md` §1 |
| Tools | Ask the connector for its tool list once at setup and save the names to `config.json` → `whop.tools`. Whop's plugin names them `<group>_<operation>`, e.g. `checkout-configurations_create`, `payments_list`. **Use the names the connector reports, not these examples.** | `whop <group> <operation>`, e.g. `whop checkout-configurations create`. Check flags with `whop <group> <operation> --help` or `whop --llms-full`. |
| Business | Every operation takes the business as a parameter: pass `account_id` (`biz_…` from `config.json`) on every call | Selected once with `whop quickstart --account_id biz_…`. Check it with `whop auth status`. |
| Money-moving calls | Two steps for financial, credential and destructive operations: the first call returns `prepared: true` and a confirmation token, the second confirms. Never confirm without the user's yes. | Asks for confirmation interactively. In routines, show the user the exact command instead of running it. |

Other notes:
- Put `--format json` on every CLI call you parse.
- Create, update, publish and deploy calls are **single calls on both paths**, so the Auto-review "Ask first" rules from setup step 4e are what stop them running unasked.
- **There is no sandbox on the CLI**, so every command runs in production. To test a checkout end to end without real money, use Whop's sandbox: a sandbox API key against `https://sandbox-api.whop.com/api/v1` with test card 4242 4242 4242 4242. Payouts and apps don't work there.

## What only the human can do (checked in setup)

1. Create the Whop account and the first business at whop.com/start.
2. Create the API key with the custom permission set. API keys cannot create API keys.
3. Sign in with OAuth for the connector or the CLI, when asked.
4. Complete KYC before withdrawing (Dashboard → Balances → Set up Whop Payments: ID, selfie and bank details).
5. Pay for anything Whop charges for, such as a custom domain.
6. Apply for checkout links above $2,500.
7. Issue refunds. They're left off the Bot's key, so the user refunds in the dashboard, or through the connector with its two-step confirm.

## Recipe A: digital guide + one-page site (AI Influencer, and portfolio pages)

1. **Product.** `products create`:
   - title, headline
   - description: what the guide teaches, plus its **access period** in words, e.g. "12 months of access, including updates"
   - visibility `hidden` until the user approves
2. **Variant (price and access period).** `variants create`:
   - `plan_type: one_time`, `initial_price: <user's price>`, `currency: usd`
   - **`expiration_days: 365`**, matching the access period in the description. Whop requires the access period to be disclosed, and a variant without `expiration_days` never expires.
3. **Deliver the PDF.** Pick one:
   - **Courses lesson (preferred):** create a course experience with one `pdf` lesson holding the guide, then attach the experience to the product. Buyers get it in their Whop hub.
   - **Private file + redirect:** `files create` (private), plus the product's `redirect_purchase_url` set to a thank-you page with instructions.
4. **Checkout link.** `checkout-configurations create` with `plan_id` and `account_id`. It returns `purchase_url`.
5. **One-page site** (CLI only):
   ```bash
   mkdir -p /workspace/<template>/site && cd /workspace/<template>/site
   whop apps init --app_type website --name "<Site name>" --domain <slug>   # scaffolds ./<slug>, live at <slug>.whop.site
   cd <slug>
   # Replace the scaffold's index route with the page from the template's site/ folder (its README says how),
   # and set the BUY button href to the purchase_url.
   whop apps deploy --preview           # uploads WITHOUT going live; send the user the preview
   whop apps builds promote <abld_id>   # live, only after the user's yes
   ```
   - `--app_type website` is **permanent**.
   - Use a `--domain` slug only. A full domain the business doesn't own makes Whop return a purchase link, and that is a purchase the user makes themselves.
   - Never run `whop apps deploy` without `--preview`: without it, the site goes live immediately.
6. **Publish.** `products publish` only after the user approves the page, the price, the access period and the copy.

## Recipe B: one checkout link per order (Motion Studio, Spatial Studio)

1. **Once:** create one product per service, e.g. "Launch video" or "Interactive floor plan". Keep it `hidden`; it exists only to hold per-order prices. Save its id in `config.json` → `whop.product_ids`.
2. **Per order:** create a checkout configuration with an **inline plan**, so every order gets its own price:
   ```json
   {
     "account_id": "biz_…",
     "plan": {
       "product_id": "prod_…",
       "plan_type": "one_time",
       "initial_price": 349,
       "currency": "usd",
       "title": "Launch video · Acme · 20s",
       "visibility": "quick_link",
       "stock": 1,
       "unlimited_stock": false,
       "force_create_new_plan": true
     },
     "metadata": { "order_id": "ms-2026-10-20-acme" },
     "redirect_url": "<optional thank-you page>"
   }
   ```
   - `stock: 1` stops a reusable checkout link from being paid twice.
   - `visibility: quick_link` is the variant value meant for checkout links. If the first test checkout says the plan is unavailable, switch to `hidden` and note it in `config.json`.
   - Save the returned `id` (`ch_…`) and `purchase_url` in `orders.csv` with status `quoted`.
3. **Price.** The Bot never picks the price. It asks the user, and can suggest the template's price anchors. Over $2,500, check that the account has the higher-limit approval first.
4. **Deposits (optional).** For big jobs, use two orders: `<id>-deposit` (50%) and `<id>-balance`.

## Recipe C: notice a payment

Grok Bot's webhook triggers need a `Bearer` header, and Whop's webhooks can't send one. So poll instead. On each routine run, and on demand:

1. For every order in `orders.csv` with status `quoted` and `created_at` within the last 30 days, call `payments list` with:
   - `account_id`
   - `checkout_configuration_ids: [<the order's ch_ id>]`
   - `statuses: [paid]`
2. For each returned payment whose `id` isn't already in the order's `payment_id` column:
   - set the order to `paid`, and fill in `payment_id`, `paid_at` and `amount` (from the payment's `paid_at` and `total`)
   - check that `metadata.order_id` matches. If it doesn't, flag it to the user and don't start work.
   - notify the user: "Paid: <order> · $<amount>. Starting the build at <tier> tier."
3. Late settlement (ACH, `pending` → `paid`) is caught automatically, because each quoted order is re-checked every run until it's paid or 30 days old.
4. After 30 days, tell the user the quote has expired and ask whether to delete the checkout configuration.
5. Once a day, also list `paid` payments updated in the last 2 days with no matching order. Report them to the user (someone paid an old or unknown link) and don't guess which order they belong to.

## Recipe D: refunds and disputes

Never on the Bot's own initiative. If a client asks for a refund, the Bot drafts the reply and tells the user which payment to refund in the Whop dashboard. If the user prefers, it prepares the connector refund and waits for the two-step confirm. Disputes cost $15 each, so a clear delivery note (the ledger, what was agreed, the revision rounds) prevents most of them.

## Fees to quote honestly (Whop, 2026-10)

| Fee | Amount |
|---|---|
| Domestic cards | 2.7% + $0.30 |
| International cards | +1.5% |
| Currency conversion | +1% |
| ACH | 1.5% (max $5) |
| Disputes | $15 each |
| Next-day payout | $2.50 |
| Instant payout | 4% + $2.50 |

Check whop.com's fee page before quoting a client.
