# Spatial Studio kit core

A plain ES-module three.js engine (three 0.186.1 vendored in `web/vendor/three/`, so it runs offline and needs no CDN) that turns a **house spec JSON** (`schema/house.schema.json`) into a walkable site, plus the tools around it. Node 22+, with Playwright (`npm install && npx playwright install chromium`).

| File | What it does |
|---|---|
| `web/index.html`, `app.js`, `style.css` | The walkthrough: Walk (WASD + PointerLock mouse look, collision, 1.6 m eye height), Dollhouse (orbit), Plan (to-scale orthographic view with a 1 m grid). There's a room list to jump between viewpoints, and on phones: tap-to-jump plus drag-to-look. `?spec=…&view=…&capture=1&w=&h=` gives deterministic capture. |
| `web/engine/engine.js` | spec → scene: walls split around openings, per-side room finishes, floors, ceilings, skirting, doors, windows, curtains, sliders, lights, furniture, site |
| `web/engine/furniture.js` | the procedural library: bed, nightstand, sofa, armchair, tables, chairs, stools, counter runs (sink, cooktop, hood, uppers), island, cabinets, wardrobe, shelving, fridge, bathtub, shower, toilet, vanity, rug, lamp, media unit, plant, art |
| `web/engine/materials.js` | named materials and seeded procedural textures (planks, tiles, carpet, stone, plaster, grass, fabric) or image textures |
| `web/engine/geom.js` | pure 2D geometry, shared by the browser and Node |
| `validate-spec.mjs` | schema + geometry checks: closed, non-overlapping rooms; openings inside walls; furniture inside rooms and not colliding; door swings; viewpoints; area vs stated sq ft; `scale_checks` |
| `plan-svg.mjs` | a dimensioned 2D plan (SVG/PNG) drawn from the spec |
| `capture.mjs` | PNG per viewpoint, plus `dollhouse` and `plan` (SwiftShader by default), and `captures.json` |
| `ab-pairs.mjs`, `blind-test.mjs` | critic helpers: photo vs ours sheets, and the Gauntlet blind test (no mapping file) |
| `build-site.mjs` | `dist/client` static site + a `whop-app/` Vite project (`whop()` plugin; client-only build verified locally) + an optional zip |
| `serve.mjs` | local static server (`/spec/` = the spec's folder) |
| `scripts/run-demo.mjs` | demo end to end; `scripts/smoke.mjs` runs the interactive checks (collision, modes, phone) |

Quick start: `node scripts/run-demo.mjs`, then `node serve.mjs --spec ../../demo/sample-house.json` and open the printed URL.
