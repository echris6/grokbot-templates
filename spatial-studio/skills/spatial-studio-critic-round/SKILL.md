---
name: spatial-studio-critic-round
description: Run one Gauntlet round with the helper Bot "Spatial Studio Critic" - write a self-contained packet (plan/scale, room A/B vs photo, whole-house, verification or blind) listing exact file paths, send it, read the report, then record the round in the ledger. Use whenever build-spatial or build-sample needs an independent review.
---

# Critic round

## When to use
- Called by `spatial-studio-build-spatial` (plan, room, verify, whole-house, blind rounds) and `spatial-studio-build-sample` (one review per room), or when the user asks "get the critic on this".
- Not to argue with a report, and never to pass the builder's reasoning or fix list to the critic.

## Inputs and access
- `/workspace/grokbot-templates/spatial-studio/references/critic-criteria.md` (packet types, criteria, report format), `references/ideas/<idea>.md` → "Critic criteria", `_shared/gauntlet.md`.
- The job's exact files: `captures/r<n>/<view>.png`, `ab/r<n>/<view>-ab.jpg`, `photos/<photo>`, `plan/plan.png`, `plan/ours.png`, `validation.json`, the previous `round-<m>/critic.md` (verify rounds only).
- The helper Bot **Spatial Studio Critic** (`config.json` → `critic.bot_name`). It's on the same computer, so files go by path.

## Steps
1. `R=/workspace/spatial-studio/jobs/<job-id>/round-<n>-<piece>`; `mkdir -p $R/critic-work`. Check `<n>` against the cap in `ledger.md`.
2. **Write `$R/packet.md`** from the matching packet type in `critic-criteria.md`:
   ```
   ROLE: You are an independent critic in a Gauntlet loop. You did not build this. Judge the artifact, not intentions.
   JOB: <piece> of <client/prospect>'s <unit name>, a to-scale three.js walkthrough built from their plan and photos.
   BAR: <exact photo path(s)> ; plan facts: <exact path to plan/facts.md> ; builder's plan: <exact path>
   ARTIFACT: <exact capture path(s)> ; pair sheet: <exact path> (left = reference, right = ours)
   CRITERIA: <the room criteria from critic-criteria.md, plus the idea's extra criteria, pasted as text>
   PREVIOUS REPORT (verify rounds only): <exact path>
   OUTPUT: Write your report to $R/critic.md:
     1. Verdict: SHIP / ONE MORE PASS / REJECT
     2. A/B: reference vs ours, which is better and why (one paragraph)
     3. The single biggest gap: what, where (screen region), and a concrete fix in spec terms
     4. Up to 4 smaller gaps, ranked
     5. Verify rounds only: each previous item FIXED / PARTLY / STILL PRESENT, plus new regressions
   ```
   Exact file paths only: never a folder, never `ledger.md`, `brief.md` or `limits.md`. For blind rounds, list the 12 `A01…A12.jpg` paths and ask for "Axx: reference|ours" lines. The seed stays out of every file.
3. **Send one message** to Spatial Studio Critic: the packet path plus its full text, and nothing else (every inter-Bot message costs usage).
4. Wait for the one-line reply, then open `$R/critic.md`.
5. **Record only after the report lands:** append one row to `ledger.md`: round · piece · artifact · verdict · biggest gap · change made (filled after the fix) · measured before → after (e.g. "floor hex #c29a6b → #a88760", "window offset 3.20 → 3.05 m", "area −0.4%"). For blind rounds, now run `blind-test.mjs reveal` and `score`, and add the score.
6. **Decide:** SHIP with a cosmetic top gap → the piece is done. Otherwise, hand the single biggest gap to the builder. At the cap → show the user the remaining top 3 and ask.

## Check the result
- `critic.md` exists at the OUTPUT path, opens with a verdict, has an A/B paragraph and names one biggest gap with a screen region and a fix.
- The packet lists only files (no folders), has no builder reasoning, and the ledger row was written after the report.

## Return
To the caller: verdict, biggest gap, report path. To the user (when asked directly): verdict · biggest gap · next fix · rounds used of the cap.

## Needs approval
- Nothing within the tier's cap. Rounds past the cap: the user decides.

## If nothing is found or a step fails
- No reply: check the critic Bot exists, then re-send the same packet once. Still nothing → tell the user and record no round.
- The report is missing sections or judges files not in the packet: one short message pointing at the OUTPUT format. It doesn't count as a round.
- The critic Bot is gone (e.g. after a reset): run `spatial-studio-setup` step 9.
