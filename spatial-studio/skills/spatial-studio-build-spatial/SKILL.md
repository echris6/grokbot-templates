---
name: spatial-studio-build-spatial
description: Build a unit (house, apartment, room, product) as a to-scale three.js site from the client's plan and photos, piece by piece - plan to spec, scale check, then one room at a time through a builder/critic loop against the matching photo until ours wins or the tier cap is hit, then a whole-house round. Use for paid orders and, on the Draft tier, inside build-sample.
---

# Build spatial (the builder side of the Gauntlet)

## When to use
- A paid order (`orders.csv` status `paid` → `building`), or `spatial-studio-build-sample` (Draft tier, 3 rooms).
- The user says "continue the build" or "fix <room>".
- Not for delivery (`spatial-studio-deliver`) or for judging (the critic does that through `spatial-studio-critic-round`).

## Inputs and access
- The job folder `J=/workspace/spatial-studio/jobs/<job-id>/`: `brief.md`, `plan/plan.png` (and the PDF), `photos/*.jpg`, `ledger.md`.
- Kit: `CORE=/workspace/grokbot-templates/spatial-studio/kit/core` (`validate-spec.mjs`, `plan-svg.mjs`, `capture.mjs`, `ab-pairs.mjs`, `serve.mjs`, `schema/house.schema.json`).
- `references/plan-to-spec.md`, `references/spec-guide.md`, `references/realism.md`, `references/critic-criteria.md`, `references/ideas/<idea>.md` (extra criteria).
- The tier from `orders.csv` (or `config.json` → `tier.samples` for samples) and `_shared/quality-tiers.md`.

## Steps
1. **Cap first.** Write to `ledger.md`: the tier, the round cap per room (Draft 1 with no verify, Standard 3 + 1 verify, Gauntlet 8 + verify, plus the blind test) and the list of pieces. Pieces = one per viewpoint/photo, plus a `plan` piece, plus a final `whole` piece.
2. **Bar.** Write `bar.md`: each photo → the viewpoint id it will be matched to, the plan facts (`plan/facts.md`, see `plan-to-spec.md` §1), and the idea's extra criteria. Photos showing identifiable people: crop them out, or get a consent record before using them (`_shared/guardrails.md` §3).
3. **Spec.** Copy `/workspace/grokbot-templates/spatial-studio/demo/sample-house.json` to `$J/house.json` as a template (delete its rooms and furniture, keep the structure; set `meta.fictional` to false). Rewrite it from the plan (`plan-to-spec.md` §2–4): walls, rooms, openings, fixtures, then furniture and finishes from the photos. Set `meta.label` ("Unsolicited sample · made from your public materials" for samples; for orders, the client's name and plan). Add one viewpoint per photo with `photo` set.
4. **Plan piece (scale gate):**
   ```bash
   cd $CORE
   node validate-spec.mjs $J/house.json --json $J/validation.json
   node plan-svg.mjs --spec $J/house.json --out $J/plan/ours.svg --png $J/plan/ours.png
   node capture.mjs --spec $J/house.json --out $J/captures/r1 --views plan,dollhouse
   ```
   Fix every validator error before going on. Then run `spatial-studio-critic-round` with the **plan/scale** packet. Fix only its biggest gap, and repeat up to the cap.
5. **Room pieces, one at a time,** largest and most-photographed first (kitchen, living, primary):
   1. Capture just that view: `node capture.mjs --spec $J/house.json --out $J/captures/r<n> --views <view-id>`. Then `node ab-pairs.mjs --spec $J/house.json --captures $J/captures/r<n> --out $J/ab/r<n>`.
   2. **Self-check before the critic** (it saves usage): look at the capture. Fix the obvious problems from `realism.md` (floating items, a camera in a wall, black glass, grey ceiling) without counting a round.
   3. Run `spatial-studio-critic-round` (room packet) with the capture, the pair sheet and the photo.
   4. Fix **only the single biggest gap** in `house.json`, by measured values (the hex picked from the photo, plank width, the window's offset).
   5. Run `validate-spec.mjs` again, recapture, and send a verify round (Standard and up) with the previous report.
   6. Stop the piece when the critic says SHIP and the top gap is cosmetic, or the cap is hit (then ask the user: ship, or N more rounds?).
6. **Whole-house round:** capture all views (`--views all`) and run the whole-house packet to catch seams (finishes that change between rooms, mismatched trim, lighting jumps). Fix the biggest gap only.
7. **Gauntlet tier only:** the blind test. `node blind-test.mjs make --ours <6 captures> --ref <6 photos> --out-dir $J/round-<n>/blind`. Put the printed seed in your message to the user, never in a file. After the report: `reveal` and `score`. If the critic scores 9 or more of 12, run another round on the room it found easiest to spot.
8. **Limits.** Write `limits.md`: everything we couldn't match (with the room and the reason), every plan compromise (`plan-to-spec.md` §6), and anything assumed (window heights, an unseen room's finishes).
9. Set the order to `in_review` (or the prospect's sample to ready) and hand over to `spatial-studio-deliver` (orders) or back to `build-sample`.

## Check the result
- `validation.json` → `ok: true`, area within 3% (or the basis explained), every scale check OK.
- Every viewpoint with a photo has a capture and a pair sheet. Every round in `ledger.md` has a `critic.md` written by the critic, and every ledger row was written **after** its report.
- `limits.md` exists, even if short. There are no rounds past the cap without the user's yes.

## Return
To the user, per piece as it finishes: the pair sheet (photo | ours) with the file card, then the verdict, rounds used of the cap, and the remaining top gap in one line. At the end: the dollhouse and plan views, the scale numbers, and the `limits.md` summary.

## Needs approval
- Rounds past the tier's cap. Any paid generation (e.g. Grok Imagine for a missing texture): state the cost and ask. Using photos that show people without a consent record: not allowed.

## If nothing is found or a step fails
- The plan is unreadable (low resolution, no dimensions): ask the user for a better plan or the PDF. Don't guess a scale. If the stated area is the only number, scale to it and say so in `limits.md`.
- No photos for a room: build the finishes from the nearest photographed room, mark it in `limits.md`, and don't send it to the critic as matched.
- The capture fails or times out: rerun the single view with `--timeout 240`. If it still fails, report the console lines from `captures.json`. Never hand-pick or edit screenshots.
- The critic can't be reached: see `spatial-studio-critic-round`. Don't self-approve paid work.
