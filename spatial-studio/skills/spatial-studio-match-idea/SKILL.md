---
name: spatial-studio-match-idea
description: Score the 11 Spatial Studio three.js business ideas against the user's interview answers, show the top 3 with why each fits and what the first sample would be, and save the pick. Use in setup, or when the user asks "which idea should I do?" or wants to switch ideas.
---

# Match the user to an idea

## When to use
- Called by `spatial-studio-setup` after the interview.
- The user asks "what else could I do with this?", "switch to product configurators", or wants a fresh recommendation.
- Not for finding prospects (`spatial-studio-find-prospects`).

## Inputs and access
- `/workspace/spatial-studio/config.json` → `owner.*`, `spatial_studio.trade`, `spatial_studio.three_d_comfort`.
- `/workspace/grokbot-templates/spatial-studio/references/ideas/README.md` (rubric, weights, tie-breakers) and the 11 `ideas/<slug>.md` files (sample scope, kit fit).

## Steps
1. Read the answers. Anything missing: ask only that question (one message).
2. Score all 11 ideas on the 6 factors in `ideas/README.md` (0–2 each). Apply the weights: halve the custom-scene ideas unless 3D comfort is 2, and show pools only for landscape or pool trades. Apply the tie-breakers.
3. Write the scoring table to `/workspace/spatial-studio/research/idea-match-<yyyy-mm-dd>.md` (all 11 rows, factor scores, total), so the choice can be audited.
4. Show the top 3 as a table: idea · why it fits *them* (one line, from their answers) · kit fit (ready / custom scene / kit gap) · first sample (from the idea's "Sample scope") · rerun trigger. Include floor-plan walkthroughs unless it scored 0 on both trade match and network.
5. Ask the user to pick one. Save `spatial_studio.idea` (slug) and `spatial_studio.alternates` (the other two) in `config.json` (temp file + rename), and append a `log.md` line.
6. If the pick is a **kit gap** idea, say exactly what's missing (from the idea file's "Kit notes") and that the first job will include building that piece, at higher usage.

## Check the result
- The table has exactly 3 rows, each with a reason tied to the user's own answers (not generic).
- No price or income figure appears. Ideas are compared on fit, not on claimed earnings.
- `config.json` has the slug of an existing `ideas/<slug>.md`.

## Return
The 3-row table, one line recommending the top pick, and the question "Which one?". After the pick: "Saved: <idea>. Next: find prospects (I'll show you the list before making any sample)."

## Needs approval
- Nothing. It only writes `config.json` and a research note.

## If nothing is found or a step fails
- The user's answers fit nothing well (all totals ≤ 4): recommend floor-plan walkthroughs as the flagship, with the reason ("the most complete kit path; you learn the craft on it"), and suggest re-running after their first sample.
- `ideas/` files are missing: the kit isn't installed. Run `spatial-studio-setup` step 2.
