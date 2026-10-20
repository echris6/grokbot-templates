# State files

All durable state lives under `/workspace/<template>/`. Never put it in memory: memory can go stale, and other people can't audit it. Skills read and write these files and nothing else.

```
/workspace/<template>/
  config.json          settings from the interview (below)
  log.md               one line per run: date · skill · result · cost
  seen.csv             items already shown to the user (clip URLs, prospect domains), so nothing repeats
  prospects.csv        Motion/Spatial: id, name, url, source, found_at, status, sample_path, notes
  orders.csv           Motion/Spatial: order_id, client, scope, price, tier, checkout_configuration_id, purchase_url, status, created_at, payment_id, paid_at, amount, delivered_at
  consent/<item-id>.md consent records for any footage or photo of a real person (guardrails §3)
  site/                Whop website projects (whop apps init output)
  jobs/<job-id>/       one folder per sample or order: brief, assets, renders, round-<n>/, ledger.md, delivery/
  setup-test/          outputs of the setup test calls
  # AI Influencer adds: character/ (locked reference sheet), trends/<date>/ (trend cards; scraped
  # clips are deleted after 7 days), consent/releases/, guide/, state/followers.csv,
  # state/scraped-hashes.json (never delete: lets the re-upload guard work after clips are gone)
```

## config.json (shared keys)

```json
{
  "template": "motion-studio",
  "version": 1,
  "owner": { "skills": "", "audience": "", "budget_month_usd": 0, "hours_week": 0, "does_outreach": true },
  "direction": "the option the user picked in the interview",
  "tier": { "default": "standard", "samples": "draft" },
  "critic": { "mode": "helper-bot", "bot_name": "Motion Studio Critic" },
  "whop": { "via": "connector", "account_id": "biz_…", "product_ids": {}, "tools": [] },
  "kit_ref": "v1.0.0",
  "routines_enabled": false,
  "setup_completed_at": null
}
```

Templates add their own keys under a key named after the template, for example `"ai_influencer": { "niche": "", "follower_threshold": 10000, "video_model": "genjutsu" }`.

## Status values

- **prospects:** `found` → `sample_ready` → `pitched` (the user sent it) → `replied` → `won` / `lost` / `skip`
- **orders:** `quoted` → `paid` → `building` → `in_review` (the user is reviewing) → `delivered` → `closed` / `refunded`

## Rules

- Only append to `log.md` and `seen.csv`; never rewrite them.
- Write with a temp file and a rename, so a crash never leaves half a CSV.
- An `order_id` is `<template-prefix>-<yyyy-mm-dd>-<slug>`. It is the same id in `orders.csv`, the Whop metadata and the `jobs/` folder name.
