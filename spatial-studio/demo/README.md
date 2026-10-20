# Demo: "The Larch" (FICTIONAL sample house)

**Not a real property.** It's a 3 bed / 2 bath single storey, 14.25 × 9.85 m outside, 140.4 m² (1,511 sq ft) gross.

- `sample-house.json`: the spec (the single source of truth).
- `sample-plan.png` / `.svg`: the "builder's plan", **drawn from the spec** (`plan-svg.mjs`), so the plan → spec → 3D → screenshots flow can run with no client material. In real jobs the arrow goes the other way: the Bot reads the builder's plan and writes the spec (`references/plan-to-spec.md`).
- `validation.json`: 0 errors, 0 warnings. The area matches the stated figure, and 4 scale checks are exact.
- `captures/`: 9 room viewpoints, `dollhouse.png`, `plan.png` (62 px = 1 m) and `captures.json`. Rendered in headless Chromium with SwiftShader at about 5–7 s per view (on a Mac).
- `captures/ui/`: desktop walk, dollhouse and plan UI screenshots, the phone layout, and `smoke.json` (collision against a wall and through a doorway both pass).
- There are no reference photos, because the house is fictional. A critic round on the demo can only be a plan/scale round.

Rebuild: `cd ../kit/core && node scripts/run-demo.mjs`.
