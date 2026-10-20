---
name: spatial-studio-setup
description: First-run (and after Update/Recover/Reset) setup for Spatial Studio - install the pinned kit and Playwright, restore missing skills, run the interview that matches the user to 3 three.js business ideas, connect Whop and Apify, check secrets, create the "Spatial Studio Critic" helper Bot, run the local demo and create the routines paused. Use when the user says "set me up" or setup_completed_at is missing.
---

# Spatial Studio setup

## When to use
- First message after the template is added, "set me up", or `/workspace/spatial-studio/config.json` has no `setup_completed_at`.
- Again after a computer **Update / Recover / Reset** (installed packages are wiped). Every step is idempotent.
- Not to change the business idea later: that's `spatial-studio-match-idea`.

## Inputs and access
- `/workspace/grokbot-templates/_shared/setup.md` (the protocol; follow its steps in order), `_shared/guardrails.md`, `_shared/state.md`, `_shared/whop.md`.
- `/workspace/grokbot-templates/spatial-studio/setup.md` (`KIT_REF`, plugins, secret names, Ask-first additions, tests, config keys).
- `/workspace/grokbot-templates/spatial-studio/references/ideas/README.md` (the 11 ideas and the matching rubric).
- Plugins: **Whop**, **Apify** (optional). Secrets: `WHOP_API_KEY`, `APIFY_TOKEN`, `XAI_API_KEY` (optional).

## Steps
1. **Step 0 message** (one message): Spatial Studio turns a business's 2D asset (a floor plan, a unit plan, a product sheet) into an interactive three.js site that a critic checks against their real photos. The Bot sends their own asset back, built, before pitching, and charges per unit. Needs: Whop (free; fees per sale), optionally Apify (cents to a few dollars a month) and an xAI key, about 15 minutes. The Bot never posts, sends, prices or charges without the user's yes. State the consent rule (no photo of a real person goes to a generation API without a consent record). `mkdir -p /workspace/spatial-studio/{consent,jobs,research,site,setup-test,state}`.
2. **Install the kit** exactly as `_shared/setup.md` step 1, with `KIT_REF` from `spatial-studio/setup.md` and template `spatial-studio`. `install.sh spatial-studio` runs `npm install` and `npx playwright install --with-deps chromium` in `kit/core`. Any `FAILED` line → stop and show it.
3. **Restore skills** (`_shared/setup.md` step 2) for every folder in `/workspace/grokbot-templates/spatial-studio/skills/`. Report which ones were restored.
4. **Interview** (one question per message, multiple choice where possible). The 6 shared questions from `_shared/setup.md` step 3, plus:
   7. "Have you used any 3D tools?" (none / looked at 3D tours or games / SketchUp, Blender, CAD or three.js)
   8. "Any trade you know from the inside?" (home building, property management, remodelling, landscaping, events, commercial real estate, retail or franchise, e-commerce, startups, other)
   Write the answers to `config.json` (`owner.*`, `spatial_studio.three_d_comfort`, `spatial_studio.trade`).
5. **Match 3 ideas:** run `spatial-studio-match-idea`. It shows the top 3 and saves the user's pick.
6. **Connect apps, secrets and approval rules:** `_shared/setup.md` step 4, a to e, with the names and extra Ask-first rules in `spatial-studio/setup.md`. Save Whop's tool names to `config.json` → `whop.tools` and confirm `whop.account_id` with the user.
7. **Local demo (free, proves the 3D pipeline on this computer):**
   ```bash
   cd /workspace/grokbot-templates/spatial-studio/kit/core
   node scripts/run-demo.mjs --out /workspace/spatial-studio/setup-test/demo-run
   ```
   It needs `sample-house.json` in that folder: copy `/workspace/grokbot-templates/spatial-studio/demo/sample-house.json` there first. Record the seconds per view from `captures/captures.json` in `config.json` → `spatial_studio.capture_seconds_per_view`. Send the user 3 stills (kitchen, living, plan) with the file card, and say plainly that it's a fictional sample house.
8. **Paid-service test** (only if Apify is connected, and only after the user's yes): one `apify~website-content-crawler` run on one public page with `maxCrawlPages: 1` and `--max-usd 0.10` (see `spatial-studio/setup.md`). Save it to `setup-test/crawl-1.json`.
9. **Create the critic:** helper Bot **Spatial Studio Critic** with the profile in `spatial-studio/critic-profile.md`. Send one test packet: plan round, ARTIFACT = `setup-test/demo-run/captures/plan.png`, BAR = `setup-test/demo-run/sample-plan.png`, OUTPUT = `setup-test/critic-test/critic.md`. Check the report lands there and starts with a verdict.
10. **Whop product (with the user's yes):** one hidden product for the chosen idea (e.g. "Interactive floor plan"). Save its id in `whop.product_ids`. Show the title and the access-period wording first.
11. **Routines:** create the routines in `spatial-studio/routines.md`, **paused**. Show the schedule in the user's timezone and enable each only on the user's yes.
12. **Done:** the summary from `_shared/setup.md` step 8. Write `setup_completed_at` and `kit_ref`.

## Check the result
- `install.sh` printed `INSTALL OK`. `check-env.sh` shows the expected secrets `set`, or the user chose the OAuth or plugin path.
- `setup-test/demo-run/captures/captures.json` lists 11 views with no `error`, and the plan render exists.
- The critic test report exists at the OUTPUT path. `config.json` has `spatial_studio.idea`, `whop.account_id`, `kit_ref`, `setup_completed_at`.
- Every routine exists and is paused, unless the user enabled it.

## Return
A short summary: the idea picked (and the 2 alternates), what's connected, the demo stills (file card) with seconds per view, the critic test verdict, any cost (Apify test at most $0.10), routines and their first run time, and "tomorrow: approve the first prospect list".

## Needs approval
- The Apify test run (state the cap, $0.10). Creating the Whop product. Enabling each routine.
- The Auto-review rules are set by the user, not the Bot.

## If nothing is found or a step fails
- Kit download or install fails: show the failing line, stop, and ask the user to retry later. Don't continue on a half-installed kit.
- The demo capture fails (no WebGL): rerun with `--gl gpu` once. If it still fails, report the `captures.json` console lines and mark 3D captures unavailable in `config.json`. Never fake stills.
- A secret is MISSING after the test: follow `_shared/setup.md` 4a (Team Bot secrets, or the OAuth and plugin paths only).
- The critic Bot can't be created: set `critic.mode = "self-review-fallback"`, tell the user that reviews are weaker without a separate critic, and retry at the next setup run.
