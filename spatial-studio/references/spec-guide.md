# House spec: field guide

Schema: `/workspace/grokbot-templates/spatial-studio/kit/core/schema/house.schema.json`. Worked example: `/workspace/grokbot-templates/spatial-studio/demo/sample-house.json` (fictional, 3 bed 2 bath, 140 m²). Copy the example and edit it. Don't start from a blank file.

## Conventions

| Thing | Convention |
|---|---|
| Units | metres everywhere |
| Plan axes | x → right (east), **y → down the plan** (south), as in the plan image; wall centrelines |
| Heights | above the level's floor (`levels[].elevation` is added) |
| Wall normal | for a wall `a → b`, the `+` side is `(-dy, dx)`. Clockwise exterior loops make `+` point inside |
| Opening `offset` | from the wall's `a` end to the **centre** of the opening |
| Furniture | `position` = centre of its footprint; `size` = [width, depth, height] in its own frame; its **front** is the side you face it from (foot of a bed, seat of a sofa, doors of a cabinet) |
| Furniture rotation | `facing: "N" \| "S" \| "E" \| "W"` = the direction its front faces. Or `rotation` in degrees clockwise on the plan, where 0 = front faces down the plan (S) |
| Viewpoints | `position` and `target` are `[x, y, height]`. `fov` is **vertical**, in degrees |

## Top-level blocks

- `meta`: `name`, `stated_area_m2` / `stated_area_sqft` / `stated_area_basis`, `source_plan`, `north_deg`, plus `label`, the header badge. Unpaid samples use `"Unsolicited sample · made from your public materials"`. `fictional: true` is only for demo houses.
- `defaults`: `wall_height`, `wall_thickness`, `exterior_wall_thickness`, `eye_height`, and default `floor` / `wall` / `ceiling` materials.
- `materials`: named materials (`color`, `roughness`, `metalness`, `pattern`, `texture`). Built-ins you can use by name: `cream_wall`, `white_ceiling`, `oak_floor`, `grey_tile`, `white_tile_wall`, `beige_carpet`, `exterior_render`, `trim_white`, `quartz`, `lawn`, `paving`.
  - `pattern`: `planks` (`plank_width`, `plank_length`, `tone_var`), `tiles` (`tile_size_m`, `grout_color`, `stagger`), `carpet`, `stone`, `plaster`, `grass`, `fabric`. These are procedural and seeded, so captures are repeatable.
  - `texture`: an image next to the spec plus `texture_size_m: [w, h]`, the real-world size the image covers. **This is the closest match to a photo:** crop a flat, evenly lit patch of the client's floor, tile or counter from their photo (`ffmpeg -i photo.jpg -vf crop=…`), square it, and set its size in metres from a known object (a 0.6 m tile, a 0.19 m plank). Note the crop in `limits.md`, because photo perspective and lighting stay baked in.
- `render`: the sun (`sun_azimuth_deg` as a compass bearing, `sun_elevation_deg`, `sun_intensity`), `env_intensity`, `hemi_intensity`, `exposure`, and the sky colours. Match the photos' time of day: warm low sun → elevation 20–30°. Overcast → sun_intensity 1.0, env 0.8.
- `levels[]`: `rooms`, `walls`, `openings`, `furniture`, `lights`. **The current engine and capture handle one level well. Treat a second storey as a kit gap:** build each level as its own spec until stairs and level switching exist (see `NOTES-for-lead.md`).
- `viewpoints[]`: one per reference photo, `photo` pointing at it.
- `scale_checks[]`: `{label, plan_value_m, measure: {kind, room|wall|opening}}`. The kinds are `overall_x`, `overall_y`, `room_x`, `room_y`, `room_clear_x`, `room_clear_y`, `wall_length` and `opening_width`.

## Rooms, walls, openings

- Room: `id` (kebab), `name` (shown on the plan view), `polygon` (centrelines, clockwise), plus optional `floor`, `wall` (per-room wall finish, e.g. tile in baths, applied to that room's side of each wall), `ceiling` (`"none"` = open to the sky), `ceiling_height`, `label_at`, `skirting: false`.
- Wall: `id`, `a`, `b`, `exterior`, optional `thickness`, `height`.
- Opening: `type` `door` | `window` | `opening` | `sliding`, plus `offset`, `width`, `height`, `sill`.
  - Doors: `hinge` a/b, `swing` +/-, `open_deg` (default 85; 0 for exterior doors), `color`, `panels`.
  - Windows: `panes`, `frosted`, `curtains` (default on), `curtain_color`, `frame_color`.

## Furniture library (`type`)

| type | size defaults to think in | options |
|---|---|---|
| `bed` | queen 1.6×2.1, king 1.85–1.95×2.15, double 1.4×1.9, single 0.95×2.0; h = headboard height | `color` (frame), `accent` (duvet), `throw` |
| `nightstand` | 0.45×0.4×0.55 | `lamp: false` |
| `sofa` / `armchair` | 2.2×0.95×0.82 / 0.85×0.85×0.8 | `material`, `accent` (cushions), `arms: false` |
| `coffee_table`, `table`, `desk`, `console`, `bench` | table 1.8×0.9×0.75 | `table.chairs: n` (adds chairs on both long sides), `chair_color` |
| `chair`, `stool` | 0.46×0.5×0.86 / 0.38×0.38×0.66 | |
| `counter` | a straight run, L × 0.62 × 0.9 | `sink_at`, `cooktop_at` (from the run's left end), `hood`, `uppers`, `upper_gaps: [[from,to]]`, `top`, `backsplash_material` |
| `island` | 2.4×1.05×0.92 | `overhang` (seating side = front), `stools: n`, `top` |
| `cabinet`, `dresser`, `wardrobe`, `shelving` | | `drawers` |
| `fridge` | 0.9×0.7×1.85 | |
| `bathtub`, `shower`, `toilet`, `vanity` | 1.7×0.75×0.56 / 0.9×0.9×2.0 / 0.38×0.68 / 0.9×0.48×0.85 | `vanity.mirror: false`; toilet/vanity backs sit at -z (against the wall) |
| `rug`, `art`, `lamp`, `plant`, `media_unit`, `box` | | `art.elevation` (bottom edge), `media_unit.tv` (TV width, 0 = none) |

L-shaped kitchen runs are two `counter` items. Corners: end one run at the other's depth.

## After every edit

```bash
cd /workspace/grokbot-templates/spatial-studio/kit/core
node validate-spec.mjs <house.json>                       # 0 errors before any capture
node capture.mjs --spec <house.json> --out <dir> --views kitchen-01,plan   # just the views you changed
```
Look at your own captures before sending anything to the critic. Fix the obvious problems first: floating items, furniture inside walls, black or blown-out frames.
