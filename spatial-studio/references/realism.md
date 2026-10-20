# Realism notes for three.js interiors

Adapted from motion-video-kit `three-js-patterns.md` ("architectural-model styling reads premium and avoids uncanny fake photorealism") and from what went wrong while building the demo house in this kit. Use these when a critic names a look problem, and when writing a custom scene for an idea that isn't a house spec.

## The look we aim for

A clean **architectural model**: cream walls, believable materials, soft key light, nothing floating, sane camera. We match the client's finishes and layout. We don't fake photographic noise, lens flare or clutter. A credible model beats an uncanny near-photo.

## What the engine already does (keep it)

- **Tone and colour:** `NeutralToneMapping`, sRGB output, exposure 1.0. Neutral keeps finish colours close to their hex values, so you can match a hex measured from a photo. ACES shifts colours: measure and compensate if you switch.
- **Light:** a `RoomEnvironment` PMREM for soft image-based light, a hemisphere fill, one directional sun with a 2048 shadow map fitted to the house, and the ceiling lights of the room the camera stands in (other rooms' lights stay off, so light doesn't leak through walls). Ceilings carry a small emissive term as a stand-in for light bounced off the floor; without it they render grey.
- **Grounding:** every floor item gets a soft contact-shadow plane. Furniture casts sun shadows.
- **Plan view:** an orthographic camera, north up, a clip plane at 1.2 m and a dark cut face on walls, like a drawn plan. The scale is fixed in px/m (`captures.json` → `plan.ppm`).
- **Repeatable captures:** seeded procedural textures, pixel ratio 1, a fixed size, no animation, a ready flag after the textures load and `compileAsync`.

## Toy giveaways and their fixes

| Giveaway | Fix |
|---|---|
| Hairline vertical lines on walls | Wall pieces must overlap (head and sill pieces overlap by 2 mm), and walls stay flat colour rather than a per-box texture |
| Curtains reading as pilasters | Pleated extruded panels in a colour clearly different from the wall, with a rod |
| Floors with a visible seam every few metres | The texture must tile. Planks wrap around the row, and tiles fill the tile exactly |
| Planks or tiles at the wrong scale | Set `plank_width` / `tile_size_m` from the photo (count planks across a doorway of known width) |
| A mirror reading as a black screen | A pale, slightly glossy surface (there are no real reflections). Don't use metalness 1 |
| Z-fighting between a counter top and its carcass | The carcass top sits below the top's underside |
| Pendants huge in the frame | A realistic drop (0.75–0.85 m above the table), and keep cameras 1.5 m or more from them |
| Grey ceilings | Ceiling emissive 0.2–0.3, or the room light on |
| Black glass | Low opacity with a light tint; the sky and garden behind must exist (ground, hedge, trees) |
| Camera inside furniture, or a door leaf filling the frame edge | Move the viewpoint (the validator catches "inside furniture") |
| Dark green walls through windows | A low, lighter hedge far away, plus trees. Never a tall dark box near the house |
| Floating or sunk items | `elevation` only for wall-mounted items. The validator checks the footprint against the room's inner faces |

## Camera (photos and captures)

- Height 1.2–1.6 m, pitch within ±20° (verticals stay vertical), vertical fov 55–75 at 16:10.
- Start from the photographer's standpoint. Don't end tight on a blank wall. Keep one strong diagonal: two walls meeting in the frame.
- The dollhouse view is 35–55° from vertical, never top-down on textured floors (tiling shows). The plan view is top-down by design, with no texture problem at its scale.

## Performance (the Bot's computer has no known GPU)

- Captures run in SwiftShader (software WebGL), about 5 s per 1280×800 view on a laptop CPU. On the Bot's VM, expect slower (**unverified**). Capture at 1280×800 for rounds and 1920×1200 for delivery stills only.
- Keep a house under about 1,500 meshes, use one shadow-casting light, and avoid transmission or refraction materials (glass is plain transparency).
- Clients walk the site on their own GPU, where the frame rate is fine. Phones get tap-to-jump viewpoints and drag-to-look.

## Custom scenes (ideas that aren't a house spec)

Product configurators, booths and landing heroes need their own scene module. Keep the same contract, so `capture.mjs` and the critic loop still work:
1. The scene builds once from a JSON spec. The page reads `?view=<id>&capture=1` and sets `window.__SPATIAL_READY = true` after the textures load and `renderer.compileAsync` runs.
2. Named views are in the spec as `viewpoints` (`position`, `target`, `fov`).
3. Same renderer settings as `web/app.js`. Start by copying `web/` into the job folder and swapping `engine/engine.js` for the custom module.
4. For product hero work, read motion-video-kit's realism checklist (studio light, no floating parts, measured background colour under tone mapping).
