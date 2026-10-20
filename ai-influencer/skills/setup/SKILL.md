---
name: ai-influencer-setup
description: First-run (and re-run) setup for AI Influencer, following the shared setup protocol - pinned kit install, skill recovery, interview, secret-visibility test, Apify/Whop connection, secrets, Auto-review rules, tiny paid tests, routines created paused. Use on "set me up", on first message, or after a computer Update/Recover/Reset.
---

# AI Influencer setup

## When to use
- The first conversation after the template is installed, or when the user says "set me up" / "redo setup".
- After a computer **Update / Recover / Reset** (those wipe installed packages). Every step is idempotent and only fixes what's missing.
- Not for changing one setting. For that, edit `/workspace/ai-influencer/config.json` and confirm with the user.

## Inputs and access
- The protocol this skill follows step by step: `/workspace/grokbot-templates/_shared/setup.md` (before the kit exists, the copy of step 1 below). Template specifics: `/workspace/grokbot-templates/ai-influencer/setup.md` (`KIT_REF`, plugins, secrets, human-only steps, test costs). State: `/workspace/grokbot-templates/_shared/state.md`.
- Plugins: **Apify** (repo-page discovery, optional for daily runs), **Whop** (at launch).
- Secrets by env var name: `GROKBOT_TEST` (dummy, step 4a), `APIFY_TOKEN` (daily scrapes, writes to disk), `HF_API_KEY_ID` + `HF_API_KEY_SECRET` (Genjutsu), `XAI_API_KEY` (recreate route, character images), `GEMINI_API_KEY` (optional Omni), `WHOP_API_KEY` (site deploy, at launch).
- Writes `/workspace/ai-influencer/config.json` and `/workspace/ai-influencer/log.md`.

## Steps
0. **Before anything, one message:**
   - **What it does:** the Bot designs a fictional AI character with you, finds viral trends in your niche every morning, and turns the one you pick into a video of the character. Once the account passes your follower goal, it builds a how-it's-made guide and a one-page Whop site.
   - **What the video is (say this plainly):** unlike the viral original, the finished video is **not** the original clip with your character pasted in. It's either **your own take** of the trend (your room, your light, your sound), with you replaced by the character, or a **generated approximation** made from the character sheet. The original clip is only the idea.
   - **What you need:** about 15 minutes, an Apify account, a Higgsfield API account (or an xAI API key for the no-footage route), and later Whop. Rough spend: under $1/day scraping plus $0.80–$6.81 per 10 s video (see `setup.md`).
   - **Approvals:** the Bot never posts, sends, publishes or spends without your yes.
   - **Consent rule:** no footage or photo of a real person goes to any generation API without a consent record, which the Bot writes only from your own quoted words (`/workspace/bin/consent_record`).

   Then `mkdir -p /workspace/ai-influencer/consent/releases`.
1. **Install the kit, pinned** (copied from `_shared/setup.md` step 1; `KIT_REF` is in `/workspace/grokbot-templates/ai-influencer/setup.md`, currently `v1.0.0`):
   ```bash
   set -e
   KIT=/workspace/grokbot-templates
   KIT_REF=v1.0.0     # from the template's setup.md
   REPO=https://github.com/echris6/grokbot-templates
   if [ -d "$KIT/.git" ]; then
     git -C "$KIT" fetch -q --depth 1 origin tag "$KIT_REF" || { echo "KIT FETCH FAILED for $KIT_REF: stop and tell the user"; exit 1; }
     git -C "$KIT" checkout -q "$KIT_REF"
   elif [ -f "$KIT/.kit-ref" ] && [ "$(cat "$KIT/.kit-ref")" = "$KIT_REF" ] && [ -f "$KIT/_shared/kit/bin/install.sh" ]; then
     :   # tarball copy already at this tag
   else
     rm -rf "$KIT"
     git clone -q --depth 1 --branch "$KIT_REF" "$REPO" "$KIT" 2>/dev/null \
     || { mkdir -p "$KIT" && curl -fsSL "$REPO/archive/refs/tags/$KIT_REF.tar.gz" | tar -xz --strip-components=1 -C "$KIT"; } \
     || true
     if [ ! -f "$KIT/_shared/kit/bin/install.sh" ]; then
       rm -rf "$KIT"; echo "KIT DOWNLOAD FAILED for $KIT_REF: stop and tell the user"; exit 1
     fi
     [ -d "$KIT/.git" ] || echo "$KIT_REF" > "$KIT/.kit-ref"   # marker written only after a verified download
   fi
   bash "$KIT/_shared/kit/bin/install.sh" ai-influencer      # installs tools for this template only
   export PATH="/workspace/bin:$PATH"                        # kit shims; skills also call them by absolute path
   ```
   Then the template's own extras: `command -v chromium >/dev/null || sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq chromium` (guide PDF), and `mkdir -p /workspace/ai-influencer/{character/candidates,trends,jobs,guide,site,state,setup-test}`.
   - On `KIT FETCH FAILED`, `KIT DOWNLOAD FAILED` or `INSTALL INCOMPLETE`: **stop** and tell the user the exact line. Nothing else works without the kit.
   - Self-test (no network, no keys, about 30 s): `python3 /workspace/grokbot-templates/ai-influencer/kit/tests/test_kit.py`. Every line should be PASS. SKIP is fine for the rotation tests on ffmpeg < 6, the HDR test without libx265, and the PDF if Chromium failed to install. Any FAIL: report it and stop.
2. **Check the skills arrived.** For each folder in `/workspace/grokbot-templates/ai-influencer/skills/`, check its `name` is in the `/` menu. If one is missing, save it again from the file ("save this as a skill"). If that fails, copy it to `/home/box/agent-data/workflows/<name>/SKILL.md`. Report which ones you restored.
3. **Interview**, one question per message, multiple choice where possible, skipping anything already in `config.json`:
   1. What are you good at, or what do you do for work?
   2. Do you already have an audience? None / under 1k / 1k–10k / 10k+, and where
   3. Monthly budget for videos and tools? Under $50 / $50–150 / $150–400 / more
   4. Hours per week? Under 3 / 3–7 / 7+ (a daily post is about 15–20 minutes once running)
   5. Niches you'd enjoy (or "suggest some"), and Instagram, TikTok or both. Are you in the EU/EEA, UK or Switzerland? (Gemini Omni can't edit uploaded video there.)
   6. Film yourself acting out trends (film-and-swap), or no footage (recreate)? And how many paid retries per video when the character looks off: 1, 2 (default) or 3? This is this template's quality setting (`quality-tiers.md`, "AI Influencer exception").
   7. Launch the guide at how many followers (suggest 10,000)? Later on, would you reply to brand-deal emails yourself (the outreach question)?

   Then **suggest 3 directions** tied to the answers. Each is a niche plus a character angle in one line, plus why it fits ("you work in finance → office humour, a gaunt 1920s banker in a flawless pinstripe"). The user picks one. Write the shared keys (`/workspace/grokbot-templates/_shared/state.md`) and this template's key to `config.json`:
   ```json
   "ai_influencer": {"niche": "", "platforms": ["instagram","tiktok"], "repost_pages": {"instagram": [], "tiktok": []},
     "lookback_days": 4, "show_top": 3, "rank_top": 20, "check_batch": 6, "reels_per_page": 12, "rank_by": "velocity",
     "route": "film-and-swap", "video_model": "genjutsu", "resolution": "720p", "attempts_per_clip": 2,
     "omni_blocked_region": false, "credit_trend_source": true, "secrets_path": "",
     "character": {"name": "", "sheet": "/workspace/ai-influencer/character/sheet.png",
                   "hero": "/workspace/ai-influencer/character/hero.png", "face": "/workspace/ai-influencer/character/face.png",
                   "card": "/workspace/ai-influencer/character/character.md", "locked_at": null},
     "accounts": {"instagram": "", "tiktok": ""}, "follower_threshold": 10000, "threshold_rule": "any", "follower_source": "ask",
     "milestone_reached_at": null, "risk_ack_at": null,
     "guide": {"price_usd": null, "access_period": "12 months of access, including updates", "md": "/workspace/ai-influencer/guide/guide.md",
               "pdf": "/workspace/ai-influencer/guide/guide.pdf", "product_id": "", "plan_id": "", "purchase_url": "",
               "site_slug": "", "app_id": "", "published_at": null},
     "daily_time": "08:00"}
   ```
   Set `video_model: "gemini-omni"` only if the budget is under $50 and the user isn't in the EEA/UK/CH. **Risks:** read the "Risks" list in `ai-influencer/setup.md` aloud, get an explicit "I understand", and save the time to `risk_ack_at`.
4. **Connect apps, secrets and approval rules.**
   - **a. Secret-visibility test, before any real key.** Ask the user to save a dummy secret `GROKBOT_TEST` = `hello-test` with the secure secret card, then run `bash /workspace/grokbot-templates/_shared/kit/bin/check-env.sh GROKBOT_TEST`.
     - **`set`:** use the card for every key (`secrets_path: "card"`).
     - **`MISSING`:** tell the user plainly. Option (1): make this Bot a Team Bot (even a team of one) and add the keys under Bot details → **Secrets** (`secrets_path: "team-bot"`). Option (2): plugins and OAuth only (`secrets_path: "oauth-only"`): Apify plugin for scrapes, Whop connector or `whop login --method oauth`, and the Bot's built-in image tool. On option (2), **both video routes stay unavailable** (Higgsfield, Gemini and xAI need keys), so say that clearly. Never put a key in a file as a workaround.
   - **b. Plugins.** Connect **Apify** (and **Whop** now or at launch) in **Connect apps**. Ask each for its tool list, save the names to `config.json`, and call one read-only tool: Apify, fetch the details of `apify/instagram-reel-scraper`; Whop, list businesses and confirm `account_id` with the user.
   - **c. Secrets.** Ask only for the keys the chosen route needs, under the exact names in `setup.md`. Then run `bash /workspace/grokbot-templates/_shared/kit/bin/check-env.sh APIFY_TOKEN HF_API_KEY_ID HF_API_KEY_SECRET XAI_API_KEY` (plus `GEMINI_API_KEY` / `WHOP_API_KEY` if used). It prints `set`/`MISSING`, never values. If a key is pasted into chat, tell the user to rotate it.
   - **d. Whop** (now or at launch): connector → list businesses; CLI → `whop auth status`. For the API-key route, walk the user through creating the key with the custom permission set in `guardrails.md` §1.
   - **e. Auto-review rules.** The user does this. Ask them to open **Settings → General → Auto-review**, confirm it's **on**, and add these **Ask first** rules, worded "by any path":
     - creating, updating, publishing, deleting, refunding or deploying anything on Whop, by any path (read-only list/get is fine)
     - starting a paid generation (Higgsfield Genjutsu, Gemini Omni, Grok Imagine video), by any path
     - an Apify run with a spend cap above $1, by any path
     - sending any email or message

     Read the list back and confirm. Say that Auto-review is a model's judgement, not a lock, and that on a Team Bot (4a option 1) routines stay prepare-only (they already are).
5. **Paid tests.** State each cost and ask once for all of them. Outputs go to `/workspace/ai-influencer/setup-test/`.
   - Apify, about $0.01: write `{"username": ["instagram"], "resultsLimit": 3, "skipPinnedPosts": true}` to `setup-test/ig-input.json`, then run `/workspace/bin/apify_run apify~instagram-reel-scraper --input /workspace/ai-influencer/setup-test/ig-input.json --out /workspace/ai-influencer/setup-test/apify.json --max-usd 0.10`. Check the items have `url`, `videoPlayCount` and `timestamp`. (On `oauth-only`, run the same input through the Apify plugin instead.)
   - Grok Imagine, $0.04 (if `XAI_API_KEY` is set): `/workspace/bin/imagine image --prompt "a plain grey test card" --out-dir /workspace/ai-influencer/setup-test/`.
   - No Genjutsu/Omni test here: they need a locked character and the user's own take, so **the first real video is the test** (make-remake prices it first).
6. **Critic:** not used by this template (no builder loop; see `quality-tiers.md`, "AI Influencer exception"). Skip.
7. **Routines.** Create each routine in `/workspace/grokbot-templates/ai-influencer/routines.md` **paused**, in the user's timezone (Settings → Bot → Timezone). Show the schedules and enable each one only when the user says so. Set `routines_enabled`.
8. **Done.** Send a summary: what's connected, the secrets path, what was tested and what it cost, the first daily run time, and the one thing to do next ("design your character": `ai-influencer-design-character`, then the repost-page list). Write `setup_completed_at` to `config.json` and append a line to `/workspace/ai-influencer/log.md`.

## Check the result
- The kit is at `KIT_REF` (`git -C /workspace/grokbot-templates describe --tags`, or `.kit-ref`), and `kit/tests/test_kit.py` printed only PASS/SKIP.
- `check-env.sh` exits 0 for the names the chosen route needs (or `secrets_path` is `oauth-only` and the user was told which routes are off).
- `jq . /workspace/ai-influencer/config.json` parses, with `niche`, `route`, `video_model`, `secrets_path` and `risk_ack_at` set.
- The user confirmed the Auto-review rules. Every routine exists and is paused unless enabled.

## Return
A short summary: connected ✓/✗, secrets path, tests with real costs, routines and their state, the chosen direction, and the next step. No file paths unless asked.

## Needs approval
- The paid tests (one combined yes with amounts).
- Enabling each routine.
- `sudo` installs from the pinned kit are part of setup, so no separate yes; connecting accounts and Auto-review rules are the user's own actions.

## If nothing is found or a step fails
- Kit fetch/download/install failure: stop at step 1 and report the exact line. Don't improvise another source.
- `GROKBOT_TEST` is MISSING: follow 4a. Never loop the user through "Bot details → Secrets" on a personal Bot; that screen exists on Team Bots.
- A plugin won't connect: Apify → the `APIFY_TOKEN` path; Whop → wait until launch.
- A test call fails: show the error line, retry paid calls at most once, and log it.
- Never write `setup_completed_at` if `risk_ack_at` is empty or step 1 failed.
