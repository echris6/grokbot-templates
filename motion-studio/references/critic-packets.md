# Critic packets

Adapted from motion-video-kit's `critic-prompts.md` (MIT) to the packet format in `_shared/gauntlet.md`. The Lead fills the `<>` slots, writes the packet to `/workspace/motion-studio/jobs/<job-id>/round-<n>/packet.md`, and sends Motion Studio Critic **one message**: the packet path plus the packet text. The critic writes its report to the OUTPUT path and replies with one line (verdict + biggest gap).

Rules for every packet:
- Keep the builder's reasoning out. Never list what you think you fixed. The critic must find things itself.
- **Exact file paths only, never a folder.** The critic opens only the paths listed in the packet (all Bots share one computer, so isolation is by instruction). ARTIFACT is the real render, never stills the builder picked.
- The critic writes its extracted frames and measurements to `critic-work/` inside the packet's own round folder (`round-<n>/` or `round-<n>-lab-<element>/`), and nothing else besides its report.
- Write the ledger row and any builder notes **after** the report lands, never before a round.
- BAR is concrete: reference files and the measured numbers from `bar.md`, or entries from `launch-film-notes.md`.
- Paste the client's own words verbatim when there are any.

Tools the critic uses (same computer, kit at `/workspace/grokbot-templates/motion-studio/kit/scripts/`): `contact-sheet.sh`, `frozen-time.sh`, `qa.sh`, `loudness.sh`, and plain `ffmpeg`.

---

## 1. Storyboard packet

```
ROLE: You are an independent critic in a Gauntlet loop. You did not write this storyboard. Judge it, not intentions.
JOB: Storyboard for a <length> s <launch film / feature announcement / explainer> for <product>, <one line: what it does, for whom>.
BAR: Facts allowed (verbatim): <3–5 facts>. Never show: <list>. Reference mechanisms: <entries from launch-film-notes.md or bar.md>.
ARTIFACT: /workspace/motion-studio/jobs/<job-id>/storyboard.md (+ rough frames, each listed by full path, if any)
CRITERIA:
- Is frame 0 a finished money-shot composition?
- Does every shot run 2–3 s, prove one thing, and have a distinct composition (vary scale: macro, wide, UI close-up, type impact)?
- Does every cut name what carries across it (an object, a direction, a pre-positioned destination)?
- Is every claim one of the verbatim facts? Anything invented?
- Which beats are filler? Is the product and the next action unmistakable on mute?
OUTPUT: Write your report to /workspace/motion-studio/jobs/<job-id>/round-<n>/critic.md:
  1. Verdict: SHIP / ONE MORE PASS / REJECT
  2. The single biggest problem and one concrete fix
  3. Up to 4 smaller problems, ranked, one fix each
```

## 2. Component packet (one element in its lab)

Lab rounds live in their own folder, `round-<n>-lab-<element>/`, so a lab report never lands in a film round.

```
ROLE: You are an independent visual critic in a Gauntlet loop. You did not build this. Judge only rendered pixels.
JOB: <component, e.g. "the hero dashboard rebuilt as code" / "the three.js device turn"> for a launch film for <product>. It must communicate: <one sentence>. It replaces: <previous version and why it was rejected, in the client's words, or "first version">.
BAR: <reference frames or film + timestamps>; measured numbers from bar.md: <curve keys, speeds, type size>. Brand: <hex values>, <typeface>.
ARTIFACT: <absolute path to proof.mp4> (<duration> s, <WxH>, <fps> fps). Extract your own stills at <times>.
CRITERIA:
- Extract a contact sheet every 0.1 s and native frames at <key times>; crop into details.
- Materials and realism, camera, readability, label/pin accuracy, collisions, one-frame pops, holds.
- Does it match the reference numbers (curve, speed, type size)? What information does it add?
OUTPUT: Write your report (under 450 words) to /workspace/motion-studio/jobs/<job-id>/round-<n>-lab-<element>/critic.md:
  1. Verdict: KEEP / REVISE / REJECT
  2. A/B: reference vs ours, which is better and why (one paragraph)
  3. The single biggest gap: what, where (timestamp, screen region), and a fix implementable in code
  4. Up to 4 smaller gaps, ranked
```

## 3. Full-film packet

```
ROLE: You are an independent, harsh film critic in a Gauntlet loop. You did NOT build this. Judge rendered pixels and measured audio, not intentions.
JOB: <length> s <launch film> for <product>: <what it does, who buys it>. Brand: <hex values>, <typeface>.
BAR: Reference film(s): <paths/links + timestamps>. Measured bar: <bar.md numbers>. Client's criteria, verbatim: <paste or "none yet">. Quality bar: /workspace/grokbot-templates/motion-studio/references/quality-bar.md
ARTIFACT: /workspace/motion-studio/jobs/<job-id>/renders/<name>.mp4 (<WxH>, <fps> fps, with audio)
CRITERIA:
- Contact sheets every 0.2 s, native frames at key moments, dense 1/30 s windows around every cut at <list of cut times>.
- Run kit/scripts/qa.sh on the file (frozen time, one-frame pops, black frames, loudness) and report the numbers.
- Per shot: time range, what's on screen, % empty frame, seconds it could lose.
- Frame 0 finished? Text collisions on every frame of every crossfade? Lead subject 60–85% of frame in feature beats?
- Business on mute: can a first-time viewer say what the product does and the one next action? Every claim one of the verbatim facts?
- Sound: does each small move have a clean sound, are the hero moves audible, does the music's final hit land on the end card?
- Wow gate (Gauntlet tier only): split into 3 s windows; YES / PARTIAL / NO per window with one reason each.
OUTPUT: Write your report (under 900 words) to /workspace/motion-studio/jobs/<job-id>/round-<n>/critic.md:
  1. Verdict: SHIP / ONE MORE PASS / REJECT
  2. A/B: reference vs ours, which is better and why (one paragraph)
  3. The single biggest gap: what, where (timestamp, screen region), and a concrete fix
  4. Up to 4 smaller gaps, ranked
  5. The qa.sh numbers, and the wow-gate table when asked
```

## 4. Verification packet

```
ROLE: You are an independent critic. You did NOT build this. Verify, don't assume.
JOB: Verification round for <job-id>: <one line>.
BAR: Same as the previous round: <bar.md path>, <reference paths>.
ARTIFACT: <new render path>. Section timings moved by about <x> s: <new shot map>.
PREVIOUS REPORT: /workspace/motion-studio/jobs/<job-id>/round-<n-1>/critic.md
CRITERIA:
- For every item in the previous report: FIXED / PARTLY / STILL PRESENT, with a timestamp.
- New defects: glitch frames, overlaps, clipped text, awkward transitional frames, regressions caused by the fix (z-order, collisions moved elsewhere).
- Re-run kit/scripts/qa.sh and compare with the previous numbers. Check the audio hit at <time>.
OUTPUT: Write your report (under 500 words) to /workspace/motion-studio/jobs/<job-id>/round-<n>/critic.md:
  1. Verdict: SHIP / ONE MORE PASS (at most 3 fixes) / REJECT
  2. The item-by-item table
  3. The single biggest remaining gap, if any
  4. New regressions, ranked
```

## 5. Blind-test packet (Gauntlet tier)

The Lead runs `kit/scripts/blind-test.py make` first. It pulls 6 frames from our encoded render and 6 from the reference, passes both sets through the same encode, and shuffles them as `A01.png`…`A12.png` in a fresh `round-<n>/blind/` folder. **No mapping file exists yet:** the script prints a seed, and the Lead puts it only in its own message to the user ("blind seed: 4821"). After the report lands, `blind-test.py reveal` writes `blind/mapping.md` and `blind-test.py score` scores it.

```
ROLE: You are an independent judge. Some of these frames come from a professionally produced reference launch film and some from our new film. You do not know which.
JOB: Sort 12 frames into "reference" and "ours".
BAR: none; judge craft only (materials, light, type, motion blur, composition, colour).
ARTIFACT: /workspace/motion-studio/jobs/<job-id>/round-<n>/blind/A01.png, …/A02.png, …/A03.png, …/A04.png, …/A05.png, …/A06.png, …/A07.png, …/A08.png, …/A09.png, …/A10.png, …/A11.png, …/A12.png (write out all 12 full paths)
CRITERIA: Sort every frame. For each, one sentence on the tell that decided it.
OUTPUT: Write /workspace/motion-studio/jobs/<job-id>/round-<n>/critic.md:
  1. A table: frame, your call (reference / ours), confidence (low / medium / high), the tell
  2. The tells that came up most often
```

The Lead then runs `blind-test.py reveal` and `blind-test.py score` with the seed. 9 or more correct out of 12 means the critic can tell, so we aren't done: the most common tell becomes the next round's biggest gap.
