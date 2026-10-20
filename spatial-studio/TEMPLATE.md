# Spatial Studio: walkable three.js sites from a business's own 2D plans

**What it is:** a Bot that runs a small 3D studio. Lots of businesses sell from a 2D asset that has no 3D version: home builders sell unbuilt houses from floor-plan drawings, apartment operators from unit plans, furniture brands from product photos. Spatial Studio takes **their own** asset and builds it as an interactive three.js site: to scale, every room, finishes matched to their photos. It sends them the result before pitching, then charges per unit.

**The flagship:** floor-plan walkthroughs for home builders. The Bot reads the builder's plan, writes it as a house spec (metres, walls, doors, windows, furniture), checks the scale against the plan's printed dimensions and square footage, and builds a site you can walk through (WASD), view as a dollhouse or as a to-scale plan, and tap through on a phone. Ten more ideas share the same machinery: unit-type tours, ADU configurators, remodel previews, backyard and pool designs, product configurators, venue layouts, office fit-outs, trade-show booths, retail buildouts, and 3D landing heroes (`references/ideas/`). Setup matches you to 3.

**What it does every day**
1. Finds businesses for your idea that publish plans or products and photos but have no 3D version (its own browser and X search, with Apify as a fallback).
2. For the best one, builds a sample of **one** of their units: plan view, dollhouse and 3 rooms matched to their photos. It's labelled "Unsolicited sample · made from your public materials".
3. Shows you the sample and drafts the email. **You press Send.**
4. Checks Whop for payments on open quotes. Weekly, it checks your clients' sites for new units to quote.

**What it does for each paid order**
1. Splits the house into pieces: the plan (scale gate), then each room.
2. For each room, a builder/critic loop: the helper Bot "Spatial Studio Critic" compares our screenshot with the client's matching photo, says which is better and names the single biggest gap. The builder fixes only that gap. This repeats until ours wins or the tier's cap is reached. Then one whole-house round.
3. Tells you and the client what it couldn't match.
4. Delivers a Whop-hosted walkthrough (preview first, live only on your yes) and/or a zip, with stills, photo-vs-ours sheets and the round ledger.

**What stays with you:** choosing prospects, pressing Send, setting every price, approving every deploy and every delivery, and talking to clients.

| | |
|---|---|
| **Startup cost** | $0 to start: the 3D engine is local (three.js + Playwright). Apify crawls are optional, from cents to about $1 per site (capped per run). Then Grok Bot usage, most of it in the critic loop. |
| **Accounts** | Grok Bot, Whop (free to start; fees per sale), Apify (optional), xAI API key (optional, for imagery) |
| **Time to launch** | 1–2 weeks (your first 3 samples are the portfolio) |
| **Pricing** | Per unit (per plan, per unit type, per product). **You set it.** The kit has a research method, not numbers. The original post's "$5k–$10k per floor plan" is an unverified claim from a public post: never quote it to a client. |
| **Quality tiers** | Samples on Draft (1 review per room); paid orders on Standard (3 rounds + verify per room); Gauntlet for flagship work (up to 8 rounds + a blind test against their photos) |

**How to start:** say "set me up". Setup runs a fictional demo house end to end on the Bot's computer (plan → spec → 3D → screenshots), so you can see the output before you pitch anyone.

**Honest limits:** single-storey houses are the tested path. Multi-storey, pools/terrain, client `.glb` models and in-page option switchers are kit gaps (see `NOTES-for-lead.md`). The Bot's computer has no public URL, so samples go out as stills or a Whop preview build. Captures use software WebGL: about 5 s per view on a laptop; slower on the Bot's computer (**unverified**).

Credits: realism and critic rules adapted from [motion-video-kit](https://github.com/echris6/motion-video-kit) (MIT). The Gauntlet loop is from somethingbig.ai/gauntlet-loop. three.js r186 (MIT) is vendored in `kit/core/web/vendor/three/`.
