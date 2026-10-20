# Critic criteria: 3D rooms vs the client's photos

Adapted from motion-video-kit's critic prompts and quality bar for still 3D captures instead of film frames. The critic gets these lines in the packet's CRITERIA, plus the idea-specific items from `references/ideas/<slug>.md`.

## The bar

**The client's own photos are the bar.** For a plan with no photos (to be built), the bar is the closest built home in the same collection or community, or the builder's renderings. The bar is written in the job's `bar.md` before round 1: which photo matches which viewpoint, plus the plan facts (`plan/facts.md`). A capture is never judged against our own earlier capture.

## Packet types

| Round | ARTIFACT | BAR | Critic focus |
|---|---|---|---|
| **Room** (one piece) | `captures/<view>.png` (capture.mjs output, never a hand-picked frame) and `ab/<view>-ab.jpg` | `photos/<photo>` for that view, plus `plan/facts.md` | A/B: which is better and why; the biggest gap |
| **Plan / scale** | `captures/plan.png`, `plan/ours.png`, `validation.json` | `plan/plan.png` (the builder's plan) | rooms, doors, windows, fixtures in the same places; scale and area numbers |
| **Whole house** | every capture plus `dollhouse.png` | all photos | seams between rooms: consistent finishes, light, trim, doors |
| **Verification** | new captures plus the previous `critic.md` | same | FIXED / PARTLY / STILL PRESENT for each item; regressions |
| **Blind** (Gauntlet) | `blind/A01.jpg … A12.jpg` | none (that's the test) | sort into reference / ours; say what gave each one away |

## Room criteria (always)

1. **Geometry matches the plan:** room proportions, ceiling height, window count and position on each wall, door positions and swings. A wrong window count is a REJECT-level gap.
2. **Finishes match the photo:** floor material, colour and plank or tile scale; wall colour; cabinet colour and door style; counter colour and veining; trim colour. Name the hex you measured from the photo against ours where it matters.
3. **Furniture matches the photo:** the same pieces in the same places, at believable scale (door 2.04 m, counter 0.9 m, seat 0.45 m). Missing hero pieces (island, bed, sofa) count before small decor.
4. **Light reads like the photo:** time of day (sun patches, warm or cool), no black corners, no blown-out windows, ceilings not grey, shadows that ground the furniture (no floating items).
5. **Camera matches the photo:** the same standpoint and framing, verticals vertical (pitch within ±20°), no clipping into walls or furniture, nothing filling the frame edge (an open door leaf or a wardrobe 20 cm from the lens).
6. **No toy giveaways** (from `realism.md`): coplanar flicker (z-fighting), hairline cracks at wall joins, curtains or trim that read as wall panels, glass that reads as a black hole, repeating texture seams on floors, stretched textures, gaps under skirting, items floating or sunk into the floor.
7. **Honesty:** anything we couldn't match is listed in `limits.md`, not hidden by the camera angle.

## Report (what the critic writes)

1. Verdict: **SHIP / ONE MORE PASS / REJECT**
2. A/B: reference vs ours, which is better and why (one paragraph). "Ours wins" is allowed only if it's true for this criterion set. Photographic noise and lens character don't count against us. Wrong finishes do.
3. **The single biggest gap:** what, where (a screen region such as "left third, floor"), and a concrete fix in spec terms (e.g. `oak_floor.color #bf9d74 → #a88760, plank_width 0.19 → 0.14`).
4. Up to 4 smaller gaps, ranked.
5. Verify rounds only: each previous item marked FIXED / PARTLY / STILL PRESENT, plus new regressions.

## Stop rules (from `_shared/quality-tiers.md`)

- SHIP with a cosmetic top gap → stop the piece.
- Draft (samples): 1 room round, no verify. The sample shows plan, dollhouse and up to 3 rooms.
- Standard: up to 3 rounds per room + 1 verify, then a whole-house round.
- Gauntlet: up to 8 rounds per room + verify, then the blind test with 6 of our captures and 6 photos. 9 or more of 12 sorted correctly means not done.
