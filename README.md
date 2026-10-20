# Grokbot Templates

Business-in-a-box templates for **xAI Grok Bot**. Install one, answer a few questions, and the Bot runs the daily work of a small AI business: finding clips or clients, making the product, checking its quality, and selling through **Whop**. You stay in charge of everything that leaves the building: posting, sending, pricing and delivery.

| Template | The business | Sells through Whop as |
|---|---|---|
| [Launchpad](launchpad/) | Not a business: a 10-minute interview that recommends which template fits you | n/a |
| [AI Influencer](ai-influencer/) | An AI character remakes viral clips daily; monetize with a how-it's-made guide | A guide product + a one-page `*.whop.site` |
| [Motion Studio](motion-studio/) | Promo, launch and explainer videos for any business (software launches, solar, roofing, restaurants, gyms…), written as code (HTML/GSAP + three.js) and rendered to MP4 | A checkout link per video + a portfolio page |
| [Spatial Studio](spatial-studio/) | Interactive three.js sites from a business's 2D assets (floor plans, 10 more ideas, or any custom market) | A checkout link per unit + Whop-hosted walkthroughs |

## How a template works on Grok Bot

A Grok Bot template carries one Bot's **profile, skills, routines and selected memories**. Scripts, code and secrets don't travel with it. This repo is the companion kit: each template's `setup` skill clones it to `/workspace/grokbot-templates` on the Bot's computer and installs only the tools that template needs.

```
_shared/           contracts every template follows
  guardrails.md      approvals, honesty, IP, secrets, Whop rules
  quality-tiers.md   Draft / Standard / Gauntlet (how hard the critic loop pushes)
  gauntlet.md        builder ≠ critic loop on Grok Bot (helper critic Bot, packets, ledger)
  whop.md            Whop connector + CLI recipes (products, checkout links, sites, payments)
  setup.md           first-run protocol (kit install, skill/routine recovery, secrets check)
  state.md           /workspace state files and config.json
  skill-format.md    the 6-part skill format every SKILL.md uses
  kit/bin/           install.sh, check-env.sh, Higgsfield / Gemini Omni / Grok Imagine / Apify helpers
<template>/
  TEMPLATE.md        the listing card
  profile.md         paste into the template's profile description
  memories.md        seed memories
  setup.md           plugins, secret names, human-only steps, test costs
  routines.md        routines (setup creates them paused)
  skills/<name>/SKILL.md
  references/ kit/ site/ (as needed)
```

## Publishing a template (creator steps)

You do these once per template, in your own Grok Bot account:

1. Push this repo to `https://github.com/echris6/grokbot-templates` (public). The setup skills clone from that URL.
2. In Grok Bot, create a new Bot named after the template.
3. Paste the block from `<template>/profile.md` into the Bot's instructions or profile.
4. Add each line of `memories.md` ("Remember: …").
5. Save each skill: open a chat with the Bot and say "Save this as a skill named <name>", followed by the text of `skills/<name>/SKILL.md`. Confirm they all appear in the `/` menu.
6. Create the routines in `routines.md`, **paused**.
7. Connect the plugins listed in `setup.md` (e.g. Whop, Apify), so the template declares them.
8. Run `setup` once on a test account and fix anything that breaks.
9. **Share → Create template → View template details.** Check it contains no secrets, personal memories, IDs or URLs from your own setup, then choose a public link or team-only and **Publish**.
10. Paste the link into `launchpad/references/catalog.md` and the table above.

## Installing (user steps)

Open the template link → **Add to Grok Bot** → **Add Bot** → say "set me up". The setup skill does the rest and asks you for the accounts and keys it needs.

## Quality

Every template was built with a Gauntlet loop: builder ≠ critic, a fresh critic per round judging the real files against the docs and a stated bar, fixing the single biggest gap each round. See [GAUNTLET-LEDGER.md](GAUNTLET-LEDGER.md).

## Credits

Motion Studio adapts [motion-video-kit](https://github.com/echris6/motion-video-kit) (MIT). The Gauntlet loop is from somethingbig.ai/gauntlet-loop.
