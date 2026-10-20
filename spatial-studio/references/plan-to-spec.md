# Reading a floor plan into a house spec

The Bot can view images, so it reads the plan itself. There's no OCR pipeline. This file is the procedure, and `spec-guide.md` is the field reference. The spec is the single source of truth: the walkthrough, the plan render, the captures and the validator all read it.

## 0. Get the plan as an image

- **PNG or JPG on the builder's site:** download the largest version (look for `srcset`, or a "download" or "print" link).
- **PDF** (a crawl with `saveContentTypes: "application/*, text/csv"`, or a link): convert page 1 to PNG at 150–200 dpi:
  `pdftoppm -png -r 170 -f 1 -l 1 plan.pdf /workspace/spatial-studio/jobs/<id>/plan/plan` (poppler-utils: `sudo apt-get install -y poppler-utils` if missing).
  No poppler? Use `ffmpeg -i plan.pdf` only if ffmpeg was built with PDF support. Otherwise ask the user to send a screenshot.
- Save everything under `jobs/<id>/plan/`: `plan.png`, plus `source.txt` holding the URL and the date.
- **Many plans per page:** crop each to its own file (`ffmpeg -i page.png -vf crop=w:h:x:y plan-a.png`).

## 1. Read the facts first (write them to `jobs/<id>/plan/facts.md`)

Copy them verbatim from the plan or the plan page:
- name, beds, baths, garage, **stated area** and its basis ("1,850 sq ft living", "heated", "total under roof"), storeys, ceiling height if printed ("9' ceilings")
- every **printed room dimension**, exactly as written (e.g. `Great Room 16'0" x 18'4"`), and which axis it runs along
- overall dimensions, if printed along the edges
- the scale bar or note ("1/8" = 1'-0""), if any. Web plans are usually *not to scale*: trust the dimension strings, not the pixels.

Convert to metres: `ft*0.3048 + in*0.0254`. Keep 3 decimals.

**Which side do printed room sizes measure?** Most US builder plans print **clear interior** sizes (wall face to wall face), often rounded to the inch. Check one room that touches two exterior walls against the overall size: overall ≈ sum of clear widths + wall thicknesses. If it doesn't add up, the plan is to wall centrelines; note which in `facts.md`.

## 2. Pick the grid and the walls

1. **Origin:** the top-left exterior wall **centreline** corner. Plan up = `-y`, so the image orientation is kept. If the plan has a north arrow, set `meta.north_deg` to the bearing of plan-up.
2. **Wall thicknesses:** exterior 0.15–0.20 m for US wood frame (2x4 or 2x6 plus finishes); about 0.25–0.35 m for masonry or brick veneer; interior 0.12 m (2x4 plus drywall). Pick one exterior and one interior value and put them in `defaults`.
3. **Exterior walls first**, as a clockwise loop `a → b` (north wall left→right, east wall top→bottom, south wall right→left, west wall bottom→top). That way every exterior wall's `+` normal points into the house. Split a wall where the footprint steps.
4. **Interior walls:** one wall per straight run between junctions. Place each from the clear room sizes: a wall centreline = previous wall centreline + previous half-thickness + room clear size + this half-thickness.
5. **Room polygons** run on wall centrelines and go clockwise. Open-plan zones (kitchen/dining/living with no wall between) are separate rooms that **share an edge**. The validator accepts a shared edge in place of a wall.

## 3. Openings

- `offset` = distance from the wall's `a` end to the **centre** of the opening. Read it off the plan relative to the nearest corner, then add the corner's half-thickness.
- **Doors:** default 0.82 m wide (2'8") and 2.04 m high, unless printed (e.g. 3'0" = 0.914 m). Read the swing arc from the plan: `hinge` is the end where the arc starts (`a` or `b`), and `swing` is the side the door opens into (`+` = the wall's left normal, `(-dy, dx)`). Exterior doors take `exterior_door: true` and are shown closed.
- **Windows:** width from the plan if printed. Otherwise measure against a known room size. Sill height and window height usually come from the photos (US default: sill 0.9 m, head 2.1 m). Kitchen windows over a sink: sill about 1.05 m, `curtains: false`.
- Cased openings (`opening`) and sliders (`sliding`) as drawn.

## 4. Fixtures, furniture, lights, viewpoints

- **Fixtures drawn on the plan** (counters, island, tub, shower, toilet, vanity, fridge space, wardrobes) go in at their drawn positions and sizes. Counters are 0.62 m deep (0.60 + overhang) and 0.9 m high.
- **Furniture comes from the photos** (and the brief), not the plan. Builders' plans show only some furniture. Match the photo: what's there, its colour, its material.
- **Lights:** one ceiling fixture per room, pendants over islands and tables as photographed.
- **Viewpoints:** one per reference photo. Stand where the photographer stood (usually a doorway or corner, camera at 1.2–1.6 m), aim at the same point, and set `fov` (vertical) so the same walls frame the picture. Most listing photos are wide: vertical fov 55–70 at 16:10. Put the photo's path in `photo`.

## 5. Scale check (mandatory before any 3D)

1. Add `scale_checks` to the spec: **at least** the overall width and depth (if the plan prints them, or use the sum of the printed sizes) plus 2 printed room sizes, using `room_clear_x` / `room_clear_y` when the plan prints clear sizes.
2. Set `meta.stated_area_m2` / `stated_area_sqft` and `stated_area_basis`.
3. Run:
   ```bash
   cd /workspace/grokbot-templates/spatial-studio/kit/core
   node validate-spec.mjs /workspace/spatial-studio/jobs/<id>/house.json --json /workspace/spatial-studio/jobs/<id>/validation.json
   node plan-svg.mjs --spec …/house.json --out …/plan/ours.svg --png …/plan/ours.png
   ```
4. Look at `ours.png` next to the builder's `plan.png`: the same rooms in the same places, the same door swings, the same windows per wall. Fix the spec, not the drawing.
5. **Pass:** 0 errors. The area is within 3% of the stated figure (or the basis is explained in `facts.md`), and every scale check is within max(5 cm, 1.5%). Record the numbers in the job's `brief.md`. They go into the delivery note.

## 6. When the plan disagrees with itself

Printed sizes that don't add up to the overall size are common (rounding, or marketing plans). Keep the **overall size** and the **stated area** right. Spread the difference across the rooms whose sizes are least visible in the photos. List each compromise in `jobs/<id>/limits.md`. It goes to the client as "what we couldn't match".
