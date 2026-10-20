# Motion Studio setup

The `motion-studio-setup` skill runs `_shared/setup.md` with the values below.

```
KIT_REF=v1.0.0
TEMPLATE=motion-studio
```

## Plugins (Connect apps)

| Plugin | Why | Read-only check |
|---|---|---|
| **Whop** | Creates the hidden "Launch video" product, one checkout link per order, and polls payments. The portfolio site deploys through the Whop CLI. | List businesses; confirm `account_id` with the user; save the tool names to `config.json` → `whop.tools` |
| **Apify** (optional) | Fallback prospect source: today's Product Hunt launches through `maximedupre~product-hunt-scraper`. | List the account's actors or recent runs |

No Gmail plugin is needed: the Bot drafts outreach in its own `@mail.grokbot.com` address (the user claims it once). If the user prefers their own Gmail, they connect it and the Bot creates Gmail drafts instead. Either way the user presses **Send**.

## Secrets (secure secret card, exact names)

| Env var | Needed for | Without it |
|---|---|---|
| `XAI_API_KEY` | Scripted Grok Imagine (`/workspace/bin/imagine`): stills at $0.04, video clips at $0.08/s | Stills can still come from the Bot's built-in image tool in chat; no scripted video clips |
| `APIFY_TOKEN` | `/workspace/bin/apify_run` when a routine runs the actor without the plugin | Use the Apify plugin, or skip the fallback source |
| `WHOP_API_KEY` | The Whop CLI (portfolio site deploys, and a fallback for the connector). Custom permission set from `_shared/guardrails.md` §1: products, variants, checkout configurations, files, apps, read-only payments. No payouts, transfers, refunds or team management | Use `whop login --method oauth` for the CLI instead, and the connector for everything else |

Run step 4a (the `GROKBOT_TEST` dummy secret) before asking for any real key. Then `bash /workspace/grokbot-templates/_shared/kit/bin/check-env.sh XAI_API_KEY APIFY_TOKEN WHOP_API_KEY`.

## Auto Review "Ask first" rules (step 4e)

The shared list from `_shared/setup.md`, which covers `whop *` writes, Whop connector writes, `/workspace/bin/imagine video*` and every send. Motion Studio adds:
- `/workspace/bin/imagine image*` (paid stills)
- `/workspace/bin/apify_run*` (paid runs)
- `hyperframes cloud*`, `hyperframes lambda*` and `hyperframes cloudrun*` (paid cloud renders on another account)

## Human-only steps

1. Create the Whop account and business at whop.com/start, and complete KYC (Dashboard → Balances) before the first withdrawal.
2. Create the xAI API key at console.x.ai and add credit. Create the Apify account (the free plan's monthly credit covers the fallback) if using it.
3. Create the Whop API key with the custom permission set, or sign in with OAuth when asked.
4. Claim the Bot's email address (Connect apps → Email), or connect Gmail.
5. Optional: in the Grok Bot desktop app, **Settings → Computer → Route traffic through this computer**, if Product Hunt blocks the Bot's cloud browser. It only works while that desktop is on.
6. Apply to Whop for checkout links above $2,500, if needed.

## Paid-service tests (step 5, each approved first)

| Test | Cost | Output |
|---|---|---|
| One Grok Imagine still (16:9 backdrop, no text) | $0.04 | `/workspace/motion-studio/setup-test/imagine/` |
| One Apify run, `maxNbItemsToScrape: 3`, no website scraping | about $0.01 | `/workspace/motion-studio/setup-test/ph-3.json` |
| The sample pipeline on the bundled demo brief: `fill.py --res 720` → `lint` → `check` → `render` → `sample-audio.sh` → `qa.sh` (no paid service) | Grok Bot usage only | `/workspace/motion-studio/setup-test/starter.mp4` (with sound), `starter-music-only.mp4`, `check.json` |

No video-generation test: a 1 s clip would still cost $0.08 and prove little. The first clip is priced and approved inside its first job.

## Template keys in config.json

```json
"motion_studio": {
  "markets": ["software"],
  "area": null,
  "min_rating": 4.0,
  "min_reviews": 20,
  "ph_upcoming_url": null,
  "egress_routed": false,
  "samples_per_day": 1,
  "sample": { "seconds": 10, "aspect": "16:9", "res": 720 },
  "prospect_filters": { "skip_categories": ["crypto", "gambling", "adult"], "min_screenshots": 3, "needs_no_video": true },
  "price_anchors_note": "user sets every price",
  "outreach_from": "bot-email",
  "portfolio": { "site_slug": null, "contact": null }
}
```

## Critic

Create the helper Bot **Motion Studio Critic** with the profile in `critic-profile.md` (setup step 6). Test it with the storyboard packet against `/workspace/grokbot-templates/motion-studio/kit/starter/STORYBOARD.md`; the report must land at `/workspace/motion-studio/setup-test/critic-test/critic.md`.
