# Spatial Studio setup

The `spatial-studio-setup` skill runs `_shared/setup.md` with the values below.

```
KIT_REF=v1.0.0
TEMPLATE=spatial-studio
```

`install.sh spatial-studio` installs ffmpeg, then runs `npm install` in `spatial-studio/kit/core` (playwright 1.64.1, ajv 8.17.1, three 0.186.1; three is also vendored in `kit/core/web/vendor/three/`, so the site works offline) and `npx playwright install --with-deps chromium`. PDF plans also need `pdftoppm`: `sudo apt-get install -y poppler-utils` (requested for `install.sh` in `NOTES-for-lead.md`).

## Plugins (Connect apps)

| Plugin | Why | Read-only check |
|---|---|---|
| **Whop** | One hidden product per idea (e.g. "Interactive floor plan"), one checkout link per order, payment polling. Site deploys go through the Whop CLI. | List businesses; confirm `account_id` with the user; save the tool names to `config.json` → `whop.tools` |
| **Apify** (optional) | Fallback crawler for plan, unit and product pages: `apify~website-content-crawler` (incremental reruns with `useSitemaps` + `onlyCrawlPagesModifiedSince`). | List the account's recent runs |

No Gmail plugin is needed: the Bot drafts outreach in its own email address (the user claims it once). If the user prefers their own Gmail, they connect it and the Bot creates Gmail drafts. Either way the user presses **Send**. Optional: the **ngrok** plugin or Tailscale to share a live local preview. Not needed when samples go out as stills or Whop preview builds.

## Secrets (secure secret card, exact names)

| Env var | Needed for | Without it |
|---|---|---|
| `WHOP_API_KEY` | The Whop CLI: `whop apps init/deploy --preview/builds promote` for hosted walkthroughs, and a fallback for the connector. Custom permission set from `_shared/guardrails.md` §1 (products, variants, checkout configurations, files, apps, read-only payments; no payouts, transfers, refunds or team management) | `whop login --method oauth` for the CLI, and the connector for everything else |
| `APIFY_TOKEN` (fallback) | `/workspace/bin/apify_run` when a routine crawls without the plugin | Use the Apify plugin, or browser-only prospecting |
| `XAI_API_KEY` (optional) | `/workspace/bin/imagine image` for a missing texture or a hero backdrop ($0.04 per image) | The Bot's built-in image tool in chat; textures from the client's photos (preferred anyway) |

Run step 4a (the `GROKBOT_TEST` dummy secret) before asking for any real key. Then `bash /workspace/grokbot-templates/_shared/kit/bin/check-env.sh WHOP_API_KEY APIFY_TOKEN XAI_API_KEY`.

## Auto-review "Ask first" rules (step 4e)

The shared list from `_shared/setup.md` (Whop writes by any path, paid generations, Apify runs capped above $1, every send). Spatial Studio adds, phrased by effect:
- running `whop apps init`, `whop apps deploy` or `whop apps builds promote` by any path (site creation and deploys)
- `/workspace/bin/imagine` by any path (paid images)
- `/workspace/bin/apify_run` with `--max-usd` above 1 by any path

## Human-only steps

1. Create the Whop account and business at whop.com/start. Complete KYC (Dashboard → Balances) before the first withdrawal.
2. Create the Whop API key with the custom permission set, or sign in with OAuth when asked.
3. Optional: create the Apify account (the free plan's monthly credit covers light crawling; check the actor's current pricing on its Apify page) and the xAI key at console.x.ai.
4. Claim the Bot's email address (Connect apps → Email), or connect Gmail.
5. Turn on Auto-review and add the Ask-first rules (step 4e).
6. Apply to Whop for checkout links above $2,500, if needed.

## Paid-service tests (step 5, each approved first)

| Test | Cost | Output |
|---|---|---|
| Local demo: fictional plan → spec → validate → 11 captures → site package (`kit/core/scripts/run-demo.mjs`) | Grok Bot usage only | `/workspace/spatial-studio/setup-test/demo-run/` |
| One Apify `website-content-crawler` run: one public page, `maxCrawlPages: 1`, `--max-usd 0.10` | ≤ $0.10 (capped) | `/workspace/spatial-studio/setup-test/crawl-1.json` |
| One critic packet (plan round on the demo) | Grok Bot usage | `/workspace/spatial-studio/setup-test/critic-test/critic.md` |

No Grok Imagine test: the first image is priced and approved inside its first job.

## Template keys in config.json

```json
"spatial_studio": {
  "idea": "floor-plan-walkthroughs",
  "alternates": [],
  "trade": "",
  "three_d_comfort": 0,
  "region": null,
  "prospects_per_day": 5,
  "samples_per_day": 1,
  "capture_seconds_per_view": null,
  "capture": { "width": 1280, "height": 800, "gl": "swiftshader", "delivery_width": 1920, "delivery_height": 1200 },
  "samples_site_slug": null,
  "clients": [],
  "outreach_from": "bot-email"
}
```
`clients[]` entries: `{ "domain": "", "listing_url": "", "units_built": [], "last_price_per_unit": null, "last_checked": null, "site_slug": null }`.

## Critic

Create the helper Bot **Spatial Studio Critic** with the profile in `critic-profile.md` (setup step 9 in the skill, `_shared/setup.md` step 6). Test it with a plan packet on the demo; the report must land at `/workspace/spatial-studio/setup-test/critic-test/critic.md`.
