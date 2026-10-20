---
name: motion-studio-build-film
description: Build a paid launch film, feature announcement or explainer as code (HyperFrames, GSAP, three.js) from the client's screenshots and brand, through storyboard, labs, render, sound and the Gauntlet critic loop at the order's tier. Use when an order is paid and bar.md exists, or the user says "build the film" or "continue <order>".
---

# Build the film

## When to use
- A paid order with `jobs/<order_id>/brief.md` and `bar.md` (from `motion-studio-study-references`), or "continue <order>" mid-build.
- Not for 10 s prospect samples (`motion-studio-make-sample`). Not before payment unless the user says so.

## Inputs and access
- `jobs/<order_id>/brief.md`, `bar.md`, `refs/`, the client's assets, `orders.csv` (tier), `config.json`.
- Read per step: `references/studio-principles.md` (always), `motion-grammar.md` + `launch-film-notes.md` (storyboard), `three-js-patterns.md` + `product-hero-realism.md` (3D and hero moves), `rendering.md` (render), `audio.md` (sound), `grok-imagine.md` (generated media), `quality-bar.md` (checks), `critic-packets.md` (rounds).
- Kit: `/workspace/grokbot-templates/motion-studio/kit/templates/` (component lab, projected overlays), `kit/scripts/` (qa.sh, measure-ref.sh, contact-sheet.sh, backtime-music.py, sfx-candidates.py, soften-sfx.sh, solve-sfx-gains.py, offline-mix.py, blind-test.py).
- Secrets: `XAI_API_KEY` only if a generated still or clip is approved.

## Steps

**0. Tier → what this build does** (from `config.json`/`orders.csv`; write the cap as the first line of `ledger.md` before anything else):

| | Draft | Standard (default) | Gauntlet |
|---|---|---|---|
| References studied | 3, from the kit's notes | 5, with contact sheets | 10, measured frame by frame |
| Storyboard critic round | no | yes | yes |
| Labs (component rounds) | none | the hero element only, up to 2 rounds | every element, until KEEP, up to 3 rounds each |
| Full-film rounds (cap) | 1 review, no verify | up to 3 + 1 verify | until it meets the bar, cap 8 + verify |
| Blind test | no | no | yes, after the film passes |
| Wow gate (every 3 s window YES) | no | no | yes, in every full-film packet |
| Critic-round renders | 720p 30 fps `draft` | 720p 30 fps `draft` | 1080p **60** fps `looks` |
| Final render + QA | 720p 30, `qa.sh` | **1080p 60** `delivery`, `qa.sh` at 60 fps | 1080p 60 `delivery`, `qa.sh` at 60 fps + determinism check |
| Sound | optional | one back-timed track, effects, music-only version | same, plus 3–5 track options at equal loudness |

1. **Storyboard first:** `jobs/<order_id>/storyboard.md`, one table: time · shot · what it proves · cut out (what carries across). 2–3 s shots, numbers inside `bar.md`'s ranges. **Frame 0 is the money shot.** Name 3 signature transformations without effect names. Every claim is a verbatim fact from `brief.md`. Standard/Gauntlet: run `motion-studio-critic-round` with the storyboard packet and fix its biggest problem.
2. **Assets:** the client's screenshots are the source of truth. **Rebuild each screen as code** (HTML/CSS in `film/compositions/`), so it can type, click and change state; only the Draft tier may use a flat screenshot. Generated stills/clips only for backdrops or textures, never the product UI: state the cost (`grok-imagine.md`) and ask once for the job. Log every call in `generations.md`.
3. **Labs:** for each element the tier requires, copy `kit/templates/component-lab.html` (as `index.html`), `projected-overlays.js` and `assets/` to `jobs/<order_id>/labs/<element>/`, build the element alone, render a 3–4 s proof (`hyperframes render --fps 30 --output proof.mp4`), and run `motion-studio-critic-round` with the component packet (its round folder is `round-<n>-lab-<element>/`). Integrate only on KEEP (or at the lab's round cap, noting what's left).
4. **Assemble** in `jobs/<order_id>/film/` (`hyperframes init film --non-interactive`, or start from `kit/starter`):
   - one seek clock: every visual a pure function of time; three.js scenes render on `hf-seek`; register `window.__hf.buildReady` for heavy builds; freeze pixel ratio;
   - type drawn on a 2× canvas (the starter's `line()` helper), fonts preloaded from a local file;
   - every threshold a crossfade; carried objects hand over at exact pixel coordinates;
   - aspect variants as separate roots (`data-width/height`), re-laid-out, not cropped.
5. **Check and render:** `hyperframes check --json` (0 errors; lint errors mean nothing else ran), snapshots on the last frame before and the first frame after each cut, then the tier's critic-round render to `renders/r<n>.mp4`. Run `bash /workspace/grokbot-templates/motion-studio/kit/scripts/qa.sh renders/r<n>.mp4 <cut times>`.
6. **Sound** (Standard/Gauntlet, `audio.md`). Run the numpy/scipy scripts (`backtime-music.py`, `sfx-candidates.py`, `solve-sfx-gains.py`, `offline-mix.py`) with `/workspace/.venv-grokbot/bin/python`. Screen licensed library tracks near the film's tempo whose ending is a clean button (record each licence and credit); `backtime-music.py <track> --list-hits`, confirm the final hit, then back-time it so the hit lands on the end-card cut; move the picture's cuts onto the beat grid. Effects: one clean family, a sound on every small move and audible hero moves (`sfx-candidates.py`, `soften-sfx.sh`, `assets/sfx/plan.json`). Mix with `offline-mix.py <picture> <out> --project film --score <file> --music-lufs -32`, settle the music near −34 LUFS, and always render the music-only version with `--no-sfx`.
7. **Critic loop:** run `motion-studio-critic-round` with the full-film packet; fix **only the biggest gap**; re-render; the next round is a verification packet. Stop when the critic says SHIP and the top gap is cosmetic, at the cap (show the remaining top 3 and ask: ship, or N more rounds?), or when the user says stop.
8. **Gauntlet only:** wow-gate table in every full-film report (all 3 s windows YES); then the blind test (`blind-test.py make`, blind packet, then `reveal` + `score` after the report). 9+/12 correct → the most common tell is the next biggest gap. Final render at 60 fps; render two frames twice in different seek orders and compare (determinism).
9. **Watch like the client** before handing over: a 0.5 s contact sheet of the final plus frames around every cut, written up in `jobs/<order_id>/watch.md`. Go through `quality-bar.md` → "Checks critics missed":
   - **Empty space:** a dead band or a small subject in a big field; the lead subject should fill 60–85% in feature beats.
   - **Text over text:** check every frame of every crossfade, not only settled frames.
   - **Labels that lie:** a state label that contradicts its value, a claim not in `brief.md`, a CTA that's no longer true.
   - **Shots that linger:** an opening that should start on the finished frame; any hold over 0.6 s.
   - **Sound:** each small move has a clean sound, the hero moves are audible over the music, and nothing spikes.
   Anything found is fixed (and re-verified if it changes motion) before the user sees the film.
10. **Hand over** to `motion-studio-deliver`: final render(s), music-only version, ledger. Set the order to `in_review`.

## Check the result
- `ledger.md` starts with the cap; one row per round that happened, written after each report. `watch.md` exists for the final.
- Final: duration and resolution as briefed; `hyperframes check` 0 errors; `qa.sh` exit 0; frozen time ≤ about 1 s per 30 s (end card excepted); true peak ≤ −1 dBFS; music-only version exists.
- Every on-screen claim is in `brief.md`; nothing from `refs/` appears in the film.
- Paid spend matches `generations.md`.

## Return
To the user (never the client): the final render with its file card, the music-only version, the contact sheet, the ledger table (rounds, verdicts, changes, before → after numbers) and the paid spend. Ask: "Want changes, or shall I prepare the delivery?"

## Needs approval
- Each paid generation (cost first, once per job).
- Going past the tier's cap.
- Any cloud render (`hyperframes cloud`/lambda/cloudrun): extra account and cost.
- Showing anything to the client: only after the user's review (`motion-studio-deliver`).

## If nothing is found or a step fails
- Missing assets or facts: email draft to the client asking for them (user sends); pause the order with a note in `orders.csv`.
- Renders too slow on the CPU-only computer: render critic rounds at 30 fps or draft quality, simplify the WebGL scene, and tell the user before suggesting a cloud render.
- A generated clip warps twice: build that shot in code instead.
- The critic doesn't reply: re-send the packet once; never write a ledger row for a round that didn't happen.
