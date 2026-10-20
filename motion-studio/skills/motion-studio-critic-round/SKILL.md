---
name: motion-studio-critic-round
description: Run one Gauntlet round with the helper Bot "Motion Studio Critic" - write a self-contained packet (storyboard, component, full-film, verification or blind test) listing exact file paths, send it, read the report, and record the round in the ledger. Use whenever make-sample or build-film needs an independent review.
---

# Critic round

## When to use
- Called by `motion-studio-make-sample` (one review) and `motion-studio-build-film` (storyboard, lab, full-film, verification and blind rounds), or when the user asks "get a critic on this".
- Not to argue with a report, and never to send the critic the builder's reasoning.

## Inputs and access
- `references/critic-packets.md` (the five packet types), `references/quality-bar.md`, `/workspace/grokbot-templates/_shared/gauntlet.md`.
- The job's `brief.md`, `bar.md`, the artifact path, the previous `critic.md` (verify rounds), `ledger.md` (written by you, never sent).
- The helper Bot **Motion Studio Critic** (`config.json` → `critic.bot_name`). Same computer, so files are passed by path.

## Steps
1. **Round folder:** `R=/workspace/motion-studio/jobs/<job-id>/round-<n>` (`round-<n>-lab-<element>` for labs); `mkdir -p $R/critic-work`. Check the round number against the cap in `ledger.md`.
2. **Pick the packet** from `critic-packets.md`: storyboard, component, full-film, verification (includes PREVIOUS REPORT) or blind test. Fill every `<>` slot with concrete values: real hex colours, the bar's numbers, cut times, the client's own words. List **exact file paths only**, never a folder, never the ledger or builder notes. For a blind test, list all 12 frame paths and keep the seed out of every file.
3. **Write** `$R/packet.md` and **send one message** to Motion Studio Critic: the packet path plus its full text. Nothing else. (Every inter-Bot message costs usage.)
4. **Wait for the reply** (one line: verdict + biggest gap) and open `$R/critic.md`.
5. **Record after the report lands:** append one row to `jobs/<job-id>/ledger.md`: round · piece · artifact · verdict · biggest gap · change made (filled after the fix) · measured before → after (qa.sh numbers, frozen seconds, LUFS). Blind tests: now run `blind-test.py reveal` and `score`, and add the score.
6. **Decide:** SHIP with a cosmetic top gap → stop. Otherwise hand the single biggest gap back to the builder step. At the tier's cap → show the user the remaining top 3 and ask.

## Check the result
- `critic.md` exists at the OUTPUT path, starts with a verdict, names one biggest gap with a timestamp or region, and (verify rounds) marks every previous item FIXED / PARTLY / STILL PRESENT.
- The packet contains no builder reasoning, no list of fixes, no folder paths.
- The ledger row matches the report and the round really happened.

## Return
To the calling skill: the verdict, the biggest gap and the report path. To the user (when they asked directly): verdict · biggest gap · the next fix · rounds used of the cap.

## Needs approval
- Nothing within the tier's cap.
- Rounds past the cap: the user decides.

## If nothing is found or a step fails
- No reply: check the critic Bot exists; re-send the same packet once. If it still doesn't answer, tell the user and don't record a round.
- The report is missing sections or judges something not in the packet: send one short message pointing at the OUTPUT format; don't count it as a new round.
- The critic Bot is missing (e.g. after a reset): run `motion-studio-setup` step 9.
