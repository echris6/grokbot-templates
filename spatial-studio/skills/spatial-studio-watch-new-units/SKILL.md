---
name: spatial-studio-watch-new-units
description: Weekly check of every delivered client's site for new units (new floor plans, unit types, products) that have no 3D version yet, using the browser or an incremental Apify crawl (useSitemaps + onlyCrawlPagesModifiedSince); list them with a suggested rerun quote for the user. Use for the weekly routine or "any new plans from my clients?".
---

# Watch for new units (the rerun engine)

## When to use
- The weekly "New units" routine, or the user asks whether clients have added plans or products.
- Not for new prospects (`spatial-studio-find-prospects`).

## Inputs and access
- `/workspace/spatial-studio/config.json` → `spatial_studio.clients` (domain, units already built, last check date), `orders.csv`, `seen.csv`.
- `references/ideas/<idea>.md` → "Rerun trigger" and its crawler input. `references/prospecting.md`.
- The Bot's browser (read-only). Fallback: the **Apify** plugin or `/workspace/bin/apify_run apify~website-content-crawler` with `useSitemaps: true`, `onlyCrawlPagesModifiedSince: <last check date>`, `maxCrawlPages` ≤ 40, `--max-usd` ≤ 0.50 per client.

## Steps
1. For each delivered client, open their plans or products listing (the URL saved at delivery). List the unit names and slugs.
2. **New** = a unit slug not in the client's built list and not in `seen.csv`. Also check whether an existing unit's plan image changed (a new file name or a "revised" note) and list it as "revised".
3. Use an incremental crawl only when the listing is paginated or JS-heavy, and only with the caps above.
4. For each new or revised unit: record the plan URL, the photo count and whether it already has 3D (the idea file's signals). Append to `seen.csv`.
5. Prepare, don't act: for each client with new units, write `jobs/rerun-<yyyy-mm-dd>-<client>/brief.md` with the units and a suggested scope, using **the client's last agreed per-unit price** from `orders.csv` as the reference. The user sets the price again.
6. Update the client's `last_checked` in `config.json`. Append a `log.md` line with any Apify cost.

## Check the result
- Each "new" unit was seen on the client's own site this run. None is already in their built list.
- No email drafted or link created by this skill (the routine only prepares).

## Return
A table: client · new or revised unit · plan link · photos · has 3D? · last price per unit. Then "Want a quote drafted for <client>?" (which runs `spatial-studio-take-order`).

## Needs approval
- An Apify run above the caps. Any quote, link or email is drafted by `take-order` with the user.

## If nothing is found or a step fails
- No new units anywhere: "Nothing new today: no new units at <N> clients". Stop.
- A client's site is down or its listing URL moved: report it once, and keep the client in the watch list.
- No delivered clients yet: "Nothing new today: no delivered clients to watch yet". Stop.
