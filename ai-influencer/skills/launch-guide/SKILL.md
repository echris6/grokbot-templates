---
name: ai-influencer-launch-guide
description: Sell the finished guide on Whop. Hidden product, one-time variant with the access period, PDF lesson, checkout link, then a one-page whop.site (preview, approve, promote) and publish. Every Whop write is shown first and needs the user's yes. Use on "launch it" / "put the guide on Whop" after write-guide.
---

# Launch the guide on Whop

## When to use
- After `ai-influencer-write-guide`, once the user has read the PDF and says "launch it".
- To change the price, copy or page of an already-launched guide. Same steps, but update instead of create, still behind approval.
- Not before the user approves the PDF. Not for refunds or payouts (always manual, see `/workspace/grokbot-templates/_shared/whop.md` Recipe D).

## Inputs and access
- `/workspace/grokbot-templates/_shared/whop.md` (Recipe A is the source of truth), `/workspace/grokbot-templates/_shared/guardrails.md` §5 (Whop rules).
- `/workspace/ai-influencer/config.json` → `ai_influencer.guide.*`, `character.name`; `/workspace/ai-influencer/guide/guide.pdf`; `/workspace/ai-influencer/character/hero.png`.
- **Whop** plugin (connector, default) for products, variants, course and lesson, files, checkout configurations. **Whop CLI** `whop` with secret `WHOP_API_KEY` for `whop apps init/deploy` (the site is CLI-only).
- Site source: `/workspace/grokbot-templates/ai-influencer/site/` (`README.md` has the exact copy commands).
- Writes `config.json` → `guide.product_id`, `plan_id`, `purchase_url`, `site_slug`, `app_id`, `published_at`; `log.md`.

## Steps
1. **Preflight:** run Whop's `connection_status` and confirm the selected business with the user. `whop auth status` should show the CLI is signed in via `WHOP_API_KEY`. If the price is over $2,500, stop: new accounts are capped per checkout link until Whop approves more.
2. **Show the plan in one message, and ask for one yes to create it hidden:** title "How <Name> is made", headline, description (what it teaches + the access period; no earnings claims), price (one-time, USD), access period, delivery (Whop course with one PDF lesson), site address `<slug>.whop.site`.
3. **Product:** `products_create` with `title`, `headline`, `description`, `visibility: "hidden"`. Save `product_id`.
4. **Variant (price and access):** `variants_create` with `product_id`, `plan_type: "one_time"`, `initial_price: <price>`, `currency: "usd"`, `expiration_days: 365` (the API's access-duration field; match it to the stated access period). Save `plan_id`.
5. **Deliver the PDF** (preferred): create a course experience attached to the product, one chapter, and one lesson with `lesson_type: "pdf"`; upload `guide.pdf` with the files operation and attach it as the lesson's PDF (the lesson object has `main_pdf`). Check the exact operation with `whop <group> <operation> --help` or the connector's tool list. If the PDF can't be attached through the API, say so and ask the user to upload `guide.pdf` into that lesson in the Whop dashboard (a 1-minute manual step). Fallback per Recipe A: private file plus a `redirect_purchase_url` thank-you page.
6. **Checkout link:** `checkout-configurations_create` with `plan_id`. Save `purchase_url`.
7. **Site** (CLI, following `/workspace/grokbot-templates/ai-influencer/site/README.md`). Ask before `init`: `--app_type website` is permanent, and a `--domain` the business doesn't own returns a purchase link (nothing is charged unless the user pays it). Then:
   ```bash
   cd /workspace/ai-influencer/site
   whop apps init --app_type website --name "<Name> Guide" --domain <slug>
   P=$(dirname "$(ls -d /workspace/ai-influencer/site/*/whop.app.json | head -1)")
   cp /workspace/grokbot-templates/ai-influencer/site/src/routes/index.tsx "$P/src/routes/index.tsx"
   cp /workspace/grokbot-templates/ai-influencer/site/src/site.config.ts "$P/src/site.config.ts"
   mkdir -p "$P/public" && ffmpeg -y -i /workspace/ai-influencer/character/hero.png -vf "scale=900:-2" "$P/public/hero.jpg"
   ```
   Fill `$P/src/site.config.ts` (name, price label, access period, page count, `purchaseUrl` = the `purchase_url`). Then `grep -nE "CHARACTER_NAME|PRICE|PAGE_COUNT|PURCHASE_URL" "$P/src/site.config.ts"` must print nothing. `cd "$P" && npm install && npm run build`, then `whop apps deploy --preview --format json`.
8. **Show the preview** (URL plus a screenshot from the Bot's browser at phone and desktop width) together with the product copy and price. Ask: "Promote the site and publish the product?"
9. On yes: `whop apps builds promote <abld_id>`, then `products publish` (or set `visibility` to visible) for the product. Save `published_at`, and append to `log.md`.
10. **Buy-button test:** open the live site, click BUY, and confirm it lands on the Whop checkout for the right product and price. Don't pay. To test delivery, Recipe A suggests a hidden $1 variant that the user buys and then refunds; offer it, but don't do it unasked.

## Check the result
- The product exists with the right price, `plan_type: one_time` and `expiration_days`. Its description states the access period and contains no earnings claim.
- `purchase_url` opens the checkout. The site's BUY button `href` equals `purchase_url`. No placeholders are left on the page.
- The lesson shows the PDF (or the user has confirmed the manual upload).
- Nothing went visible before the yes in step 8.

## Return
Live links (site, checkout), price, access period, fees reminder (domestic cards 2.7% + $0.30; check whop.com's fee page), and the two human-only items still open if any: **KYC before withdrawing** (Dashboard → Balances), and, if it applies, paying for a custom domain.

## Needs approval
- Creating the hidden product, variant, course and checkout link (one yes, step 2).
- `whop apps init` (permanent app type; possible domain purchase link).
- Promoting the site and publishing the product (step 8).
- Any later price change, unpublish or deletion. Refunds and payouts are always the user's call, and the connector's two-step confirm is never skipped.

## If nothing is found or a step fails
- The Whop plugin isn't connected: use the CLI for every step, show each command before running it, and remember the CLI has no sandbox.
- `whop apps deploy` fails the typecheck: show the first error. The page passed `tsc` in a fresh scaffold on 2026-10-20, so check the edited config file first.
- Leave anything created so far **hidden**, report exactly what exists (ids), and never delete it without asking.
