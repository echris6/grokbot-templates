# Studio principles (the user's studio brief)

The working rules for every Motion Studio film, from the user's own studio prompt. The skills apply them step by step; this file is the single statement of them. Where a quality tier relaxes a rule, the `motion-studio-build-film` skill says so explicitly.

## Role

Work as a principal motion designer. The film is written as code (HTML/GSAP, three.js where 3D explains something) and rendered to a file. No editing software, no stock templates.

## 1. The brief comes first

`brief.md` in the job folder holds, before anything is built:

| Field | What it holds |
|---|---|
| Product | Name, one-line what it does, who it's for |
| Facts | 3–5 facts, **verbatim** from the client's site, launch page or message. Nothing else may be claimed |
| Reference film to beat | One film (or a measured set) the result must beat, with its link or file |
| Length · aspect · resolution | e.g. 20 s · 16:9 · 1080p (plus any variants) |
| Never show | Logos, names, features, data or claims the client must not see in it (and anything from the guardrails) |
| Assets | The client's own screenshots, logo, brand colours and fonts |

## 2. Study → numbers (measure, never copy)

Study the references frame by frame and turn them into numbers. Write them into `bar.md`:

- **Cut rhythm:** shot lengths in seconds, cuts per 10 s, and whether cuts land on the beat.
- **Camera speeds:** px/s or °/s for pushes, pans and orbits, and how they ease in and out.
- **Hero motion curve:** angle or position per frame for the signature move (see `product-hero-realism.md`: keys + a monotone cubic, not a smoothstep).
- **Type:** cap height as % of frame height, words per line, how long each line is readable, and how it enters and leaves.
- **Stage colour:** sampled RGB of backgrounds, decoded from the encoded file.

Borrow mechanisms and numbers. Never copy layouts, logos, footage or copy.

## 3. Build

- **Storyboard table first:** time · shot · what it proves · the cut out. Shots run 2–3 s. **Frame 0 is the money shot**: a finished composition, never a half-entered word.
- **One seek clock.** Every pixel is a pure function of time. No free-running `requestAnimationFrame`, `Date.now()`, unseeded randomness or physics history.
- **Every element is built alone in its own lab** (`kit/templates/component-lab.html`) and proven there before it joins the film.
- **Screen UI is code.** Rebuild the product's UI in HTML/CSS from its screenshots so it can move, type and change state. A flat screenshot is a fallback for Draft samples.
- **Type is drawn on canvas** (one `fillText` per line on a 2× canvas, words revealed through a clip), because DOM text under a slow transform re-rasterises in visible steps.
- **Every threshold is a crossfade.** A hard `if (x > 0.3)` on a continuous value flashes for one frame.

## 4. The loop

- **Builder ≠ critic.** The builder never grades its own work.
- **A fresh critic every round** judges the **rendered frames** against the reference, not the code and not the builder's notes. On Grok Bot that is one packet per round to Motion Studio Critic (`critic-packets.md`).
- The critic names **the single biggest gap**. The builder fixes **only that**, re-renders, and the next round verifies it.
- **Blind test:** our frames shuffled with the reference's; if the critic can sort them better than chance, we aren't done.
- **Wow gate:** split the film into 3 s windows. Every window must be a YES. PARTIAL counts as NO.

## 5. Sound

- **One real track, back-timed** so its own final hit lands on the end card, playing as one continuous piece (`kit/scripts/backtime-music.py`).
- **Cut on its beat.** Move the picture's cuts onto the beat grid, not the music.
- **A clean, real sound on every small move**, one sound family, with the hero moves clearly audible.
- **Music around −34 LUFS** (start at −32 and let the music-only render settle it).
- **Always deliver a music-only version.**

## 6. QA at 60 fps, then watch like the client

Paid finals render at 1080p 60 fps (Standard and Gauntlet; Draft samples stay at 720p 30). Run `kit/scripts/qa.sh` at the delivered frame rate: frozen frames, one-frame pops, black frames and loudness.

Then **watch like the client**, start to finish, with the sound on and with it off, and write `watch.md`:
- **Empty space:** a dead band, or a small subject in a big field (the lead subject should fill 60–85% in feature beats).
- **Text over text:** on every frame of every crossfade, not only settled frames; word fragments while something is cropped.
- **Labels that lie:** a state that contradicts its value, a claim not in the brief, a CTA that's no longer true.
- **Shots that linger:** an opening that isn't the finished frame; any hold over 0.6 s; an end card longer than it needs.
- **Business on mute:** can a first-time viewer say what the product does and what to do next?
