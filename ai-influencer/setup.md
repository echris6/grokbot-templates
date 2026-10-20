# Setup reference (AI Influencer)

The `ai-influencer-setup` skill runs this. It follows `_shared/setup.md`; this file lists what's specific to this template.

```
KIT_REF=v1.0.0
```

The kit is pinned to this release tag. Setup step 1 fetches exactly this tag and stops if the download fails. To update, change the tag on purpose.

## Plugins (Connect apps)

| Plugin | Why | When | Read-only check |
|---|---|---|---|
| **Apify** | Discovering repost pages (searches whose results the Bot reads in chat). Also the daily-scrape path only when `secrets_path` is `oauth-only` (see step 4a) | Setup | Fetch details of `apify/instagram-reel-scraper` |
| **Whop** | Product, variant, course/PDF lesson, checkout link, payments (read) | At launch (setup offers it) | `connection_status`, then confirm the business |

Not used: the **Higgsfield** plugin. It spends web-plan credits, and this template calls the Higgsfield **API** with its own key instead. There's no Gemini plugin; Gemini Omni uses the `GEMINI_API_KEY` secret.

## Secrets (secure secret card, exact env var names)

| Env var | Needed for | Where the user gets it |
|---|---|---|
| `GROKBOT_TEST` | Step 4a only: a dummy (`hello-test`) that shows whether card secrets reach the shell | — |
| `HF_API_KEY_ID`, `HF_API_KEY_SECRET` | film-and-swap with Genjutsu (default route) | Higgsfield API console (console.higgsfield.ai) → API keys; add funds first |
| `XAI_API_KEY` | recreate route (Grok Imagine video) and scripted character images | console.x.ai → API keys |
| `GEMINI_API_KEY` | Gemini Omni (optional, cheaper, ≤ 10 s, not in EEA/UK/CH) | Google AI Studio → API keys |
| `APIFY_TOKEN` | Daily scrapes and follower checks via `/workspace/bin/apify_run`, which writes the dataset straight to disk (plugin results land in the chat, not in a file) | Apify Console → Settings (API token) |
| `WHOP_API_KEY` | `whop apps init/deploy` (the one-page site), at launch | whop.com → Developer → API keys (API keys can't create API keys) |

Check: `bash /workspace/grokbot-templates/_shared/kit/bin/check-env.sh <names>` prints `set` / `MISSING`, never values.

## Tools installed

`bash /workspace/grokbot-templates/_shared/kit/bin/install.sh ai-influencer` installs git, curl, jq, Node 22, the Whop CLI, ffmpeg and the `google-genai` venv, and creates the shims `/workspace/bin/{hf_genjutsu,omni_edit,imagine,apify_run,consent_record}`. The setup skill also installs `chromium` (guide PDF) if it's missing. This template's own scripts run with `python3 /workspace/grokbot-templates/ai-influencer/kit/<script>.py` (stdlib + ffmpeg only).

## Human-only steps

1. Create the accounts: Apify, Higgsfield API (and/or xAI API), and later Whop (whop.com/start).
2. Add funds where a service is prepaid (Higgsfield API units).
3. Create each API key and save it with the secure secret card.
4. Sign in when Grok Bot asks (Apify, Whop OAuth).
5. **Film the takes** (film-and-swap), and sign or collect releases for anyone else who appears.
6. **Post** every video, with the AI label turned on.
7. Later: Whop KYC before withdrawing, and paying for a custom domain if wanted.
8. Optional: turn off model training on inputs in the Higgsfield developer dashboard (Workspace settings). Its API terms §7.2 allow an opt-out.

## Risks the setup states plainly (the user must say they understand)

- **Consent:** Higgsfield API terms §6.2 require documented consent from every identifiable real person in uploaded inputs, covering the upload and the use of the output; §6.1 bans impersonation, deceptive deepfakes and infringing publicity/IP rights. Gemini Omni can't edit "certain recognizable people". So: only the user's own footage (or a signed release, or licensed stock) is uploaded, each with a record in `/workspace/ai-influencer/consent/`.
- **Trends ≠ footage, and the result is not the viral clip:** viral clips are studied, never uploaded or copied. The finished video is the user's **own take** (their room, light and sound) with the character swapped in, or a **generated approximation**. It isn't the original clip with the character pasted in.
- **Secrets:** if the `GROKBOT_TEST` check is MISSING and the user stays on a personal Bot with OAuth-only paths, no video route works (both need API keys).
- **AI label:** Instagram and TikTok ask for an AI label on realistic AI video.
- **Income figures** in the listing are claims, not promises.

## First-run test costs (approved once, together)

| Test | Cost |
|---|---|
| Apify `apify/instagram-reel-scraper`, 3 results | about $0.01 ($0.001 start + $0.0026/reel, free plan) |
| Grok Imagine image (`grok-imagine-image-2.0`) | $0.04 |

No Genjutsu, Omni or Imagine-video test in setup: they need the locked character and (for film-and-swap) the user's own take, so the first real video is the test. `ai-influencer-make-remake` prices it before spending. For reference, the smallest Genjutsu job (4 s at 480p) is about $1.27 at list price.

Free self-test of the kit (no keys, no network): `python3 /workspace/grokbot-templates/ai-influencer/kit/tests/test_kit.py`.

Setting up the character afterwards costs about $0.45 through the API (or Grok Bot usage only with the built-in image tool).
