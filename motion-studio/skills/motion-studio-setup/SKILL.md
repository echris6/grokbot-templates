---
name: motion-studio-setup
description: First-run and repair setup for Motion Studio - installs the pinned kit and tools, restores skills, interviews the user, connects Whop and Apify, checks secrets, creates the Motion Studio Critic helper Bot and the paused routines. Use on first run, when the user says "set me up", or after a computer Update, Recover or Reset.
---

# Motion Studio setup

## When to use
- First chat after adding the template, "set me up", "finish setup", or any skill reporting a missing tool, script or the critic Bot.
- Again after **Update / Recover / Reset** of the Bot's computer (they wipe installed packages). Every step is idempotent: it only fixes what's missing.
- Not for changing a price, a tier or a routine time later; edit `config.json` or the routine directly.

## Inputs and access
- Shared protocol: `/workspace/grokbot-templates/_shared/setup.md` (steps 0–8). Template values: `/workspace/grokbot-templates/motion-studio/setup.md` (`KIT_REF`, plugins, secrets, Ask-first additions, tests).
- Plugins: **Whop** (required), **Apify** (optional).
- Secrets: `XAI_API_KEY`, `APIFY_TOKEN` (optional), `WHOP_API_KEY` (or Whop OAuth).
- Writes: `/workspace/motion-studio/config.json`, `log.md`, `setup-test/`.

## Steps
1. **Say what this is** (one message): a code-built video studio for any business (software launches, solar, roofers, restaurants, gyms, or whatever market you pick) that finds prospects, makes labelled samples, drafts pitches for you to send, takes paid orders via Whop checkout links and builds each film with a critic loop. You'll need: Whop, an xAI API key, optionally Apify, about 15 minutes. Rough monthly cost: Apify about $3 at one fallback run a day (often $0), Grok Imagine only when a job needs it, plus Grok Bot usage. Nothing is sent, published, priced or charged without your yes.
2. **Install the kit** exactly as `_shared/setup.md` step 1, with `KIT_REF=v1.0.0`, then `bash /workspace/grokbot-templates/_shared/kit/bin/install.sh motion-studio`. Every line must say `ok` or `installed`, including `hf-doctor` (it checks only Node.js, FFmpeg, FFprobe and Chrome). Then `hyperframes --version` and `ffmpeg -version | head -1`.
3. **Make the state folder:** `mkdir -p /workspace/motion-studio/{jobs,state,consent,site,setup-test}`; create `prospects.csv`, `orders.csv` and `seen.csv` with the headers in `_shared/state.md` if missing; create `log.md` if missing.
4. **Restore skills** (`_shared/setup.md` step 2) for every folder in `/workspace/grokbot-templates/motion-studio/skills/`. Report which ones were restored.
5. **Interview** (one question per message, multiple choice): the six shared questions, then:
   - **Which markets?** Pick any number; the list is in `references/markets.md`: software launches / solar / roofing & home services / real estate & property / restaurants & cafés / gyms & studios / clinics & med spas / ecommerce brands / B2B & industrial / events & venues / other local services / **something else (describe it)**. Save the result to `motion_studio.markets`; a described market becomes `custom:<their words>`.
   - If any market is local: **which area?** (city or region, one per run, e.g. "Austin, TX"), saved to `motion_studio.area`.
   - If `software` is picked: which kinds of products (dev tools / AI apps / productivity / consumer / design tools / any)?
   - How many samples a day may the routine make (0 / 1 / 2)?
   - Send outreach from the Bot's own email address or your Gmail?
   - Your timezone.
   Suggest 3 directions from their markets and background (e.g. "solar how-it-works explainers in Austin", "restaurant 9:16 specials ads", "dev-tool launch films"), let the user pick, and write everything to `config.json` (shared keys plus the `motion_studio` block in the template's `setup.md`), with `kit_ref: "v1.0.0"`.
6. **Connect and check** (`_shared/setup.md` step 4): 4a the `GROKBOT_TEST` secret test first; 4b Whop (list businesses, confirm `account_id`, save `whop.tools`) and Apify if wanted; 4c `check-env.sh XAI_API_KEY APIFY_TOKEN WHOP_API_KEY`; 4d Whop business; 4e the Ask-first rules, including Motion Studio's additions. Read the rules back to the user.
7. **Product Hunt check:** open `https://www.producthunt.com` in the browser. Look for an upcoming / coming-soon list (try the site's navigation, `/coming-soon`, `/upcoming`). Save a working URL to `motion_studio.ph_upcoming_url`, or `null`. If pages are blocked, explain **Settings → Computer → Route traffic through this computer** (`references/prospecting.md`) and record `egress_routed` once the user turns it on.
8. **Paid-service tests** from the template's `setup.md`, each with its cost stated and approved: one Imagine still ($0.04) and one Apify run of 3 launches (about $0.01). Then the **free sample-pipeline test**, which exercises exactly what a sample does:
   ```bash
   K=/workspace/grokbot-templates/motion-studio/kit; T=/workspace/motion-studio/setup-test
   rm -rf $T/film && cp -r $K/starter $T/film
   python3 $K/scripts/fill.py --project $T/film --brief $K/starter/demo/brief.json --res 720
   cd $T/film && hyperframes lint && hyperframes check --json > $T/check.json
   hyperframes render --quality draft --fps 30 --output $T/picture.mp4
   bash $K/scripts/sample-audio.sh $T/film $T/picture.mp4 $T/starter
   bash $K/scripts/qa.sh $T/starter.mp4 2.5,5.5,8.5
   ```
   Note in `log.md` whether the render summary said `beginframe` or `screenshot` capture, and how long it took.
9. **Create the critic** (`_shared/setup.md` step 6): a helper Bot named exactly "Motion Studio Critic" with the profile block in `/workspace/grokbot-templates/motion-studio/critic-profile.md`. Send it the storyboard packet from `references/critic-packets.md` for `/workspace/grokbot-templates/motion-studio/kit/starter/STORYBOARD.md`, OUTPUT `/workspace/motion-studio/setup-test/critic-test/critic.md`. Check that the file exists and starts with a verdict.
10. **Routines** from `/workspace/grokbot-templates/motion-studio/routines.md`, created **paused**. Show each schedule in the user's timezone. Enable only what the user says yes to; set `routines_enabled`.
11. **Done:** write `setup_completed_at`, append a `log.md` line, and send the summary.

## Check the result
- `install.sh` printed `INSTALL OK`; `hyperframes doctor --json` reports Node ≥ 22, FFmpeg and Chrome ok.
- `config.json` parses and has `whop.account_id`, `tier`, `critic.bot_name = "Motion Studio Critic"`, `kit_ref`.
- `check.json` has `"ok": true` with 0 errors. The test sample `setup-test/starter.mp4` exists: 10.0 s, 1280×720, with an audio stream. `qa.sh` exits 0 (no lone black frames, no unplanned pops), and `starter-music-only.mp4` exists.
- The critic's test report exists at the path in the packet.
- Every routine is listed as paused or enabled exactly as the user chose.

## Return
One message: what's connected (Whop business name, Apify yes/no, email path), which secrets are `set`, which skills were restored, test costs (e.g. "$0.05 total"), the setup-test sample (`starter.mp4`, with sound) with its file card, the routine times, and one thing to do tomorrow: "Pick three products you like; I'll make the portfolio samples."

## Needs approval
- Each paid test call (cost stated first).
- Creating the helper Bot and each routine (shown before creating).
- Ask-first rules (the user approves each one).
- Nothing on Whop is created during setup.

## If nothing is found or a step fails
- Any `install.sh` line `FAILED`: re-run once; if it fails again, tell the user which line and stop before the interview.
- `check-env.sh` says `MISSING` for a card-saved key: follow `_shared/setup.md` 4a (Team Bot secrets, or plugin/OAuth paths only). Never write a key to a file.
- Render fails: run `hyperframes doctor` and `hyperframes browser ensure`, retry once, then report the doctor output. Do not build a substitute renderer.
- Critic test report missing: re-send the packet once; if still missing, report it and leave `critic` unconfirmed in `config.json`.
- Never mark setup complete with a failed required step.
