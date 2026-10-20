# Motion Studio references and kit

Read only the file your current step needs. Kit root on the Bot's computer: `/workspace/grokbot-templates/motion-studio/`.

| Step | Read |
|---|---|
| The rules every film follows | `studio-principles.md` |
| Finding prospects | `prospecting.md` |
| Offer, scope, pricing context, honesty | `business-offers.md` |
| Studying references, storyboarding | `motion-grammar.md`, `launch-film-notes.md` |
| 3D components | `three-js-patterns.md`, `kit/templates/component-lab.html`, `kit/templates/projected-overlays.js` |
| A hero object that must move like the real thing | `product-hero-realism.md` |
| Generated stills and clips | `grok-imagine.md` |
| Rendering on the Bot's computer | `rendering.md` |
| Any review round | `gauntlet.md`, `critic-packets.md`, `quality-bar.md` |
| Music, effects, mix | `audio.md` |
| Worked examples | `case-study-alder.md`, `case-study-duo.md`, `case-study-home-display.md` |

## Kit

| Path | What it does |
|---|---|
| `kit/starter/` | A 10 s HyperFrames sample filled by `fill.py` from `brief.json`: the real UI lifts out, fact 1 types into a command bar, a cursor clicks, the UI answers; one seek clock, type on canvas. `STORYBOARD.md` documents it; `demo/brief.json` is the setup test; `assets/fonts/display.ttf` is Inter (SIL OFL, `OFL-Inter.txt`); `assets/sfx/plan.json` places the UI sounds |
| `kit/scripts/studio-audio.py`, `sample-audio.sh` | Original 120 BPM bed with a real ending plus a UI sound family (MIT), and the one-command sample sound pass: back-time, mix, music-only version |
| `kit/templates/component-lab.html`, `projected-overlays.js`, `assets/my-scene.js` | Isolated lab for one element, with an example three.js scene and projected labels |
| `kit/scripts/fill.py` | Fills the starter: crops screenshots to the UI, font, readable colour roles (dark and monochrome brands too), contrast check, resolution |
| `kit/scripts/palette.py` | Brand colours from screenshots and WCAG contrast |
| `kit/scripts/qa.sh` (+ `qa_frames.py`) | Frozen time, lone black frames (relative to the film's own luma, so dark brands work), one-frame pops, loudness |
| `kit/scripts/measure-ref.sh` | Cut times, shot lengths, cuts per 10 s, stage colours of a film |
| `kit/scripts/contact-sheet.sh`, `frozen-time.sh`, `loudness.sh` | Critic and QA measurements (from motion-video-kit) |
| `kit/scripts/blind-test.py` | Blind-test frames with a seeded shuffle; no mapping file until `reveal` |
| `kit/scripts/backtime-music.py` | Back-times a real track so its final hit lands on the end card (needs numpy + scipy) |
| `kit/scripts/sfx-candidates.py`, `soften-sfx.sh`, `solve-sfx-gains.py`, `offline-mix.py` | Effect screening, softening, in-band levels and the offline mix (need numpy + scipy) |

## Credits

The craft rules, case studies, critic prompts (now `critic-packets.md`), measurement scripts and lab templates come from **motion-video-kit** by echris6, MIT licence (`kit/LICENSE-motion-video-kit`), adapted for Grok Bot: the critic is a helper Bot instead of a fresh model session, paths live under `/workspace`, and the scripts were made film-agnostic. New in this template: `studio-principles.md`, `prospecting.md`, `grok-imagine.md`, `rendering.md`, `critic-packets.md`, the starter, `fill.py`, `palette.py`, `qa.sh`/`qa_frames.py`, `measure-ref.sh`, `blind-test.py`, `studio-audio.py` and `sample-audio.sh`. The starter ships the Inter typeface (SIL Open Font License 1.1, The Inter Project Authors). The 28 launch films in `launch-film-notes.md` belong to their owners; only written analysis and links are included.
