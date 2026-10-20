---
name: motion-studio-study-references
description: For a paid order, collect launch videos in the client's style, study them frame by frame and write the bar - measured numbers for cut rhythm, camera speed, hero motion, type and stage colour - before anything is built. Use right after an order is paid, or when the user asks to study references for a job.
---

# Study references (write the bar)

## When to use
- An order just turned `paid` (the payment routine hands over here), or the user says "study references for <order>".
- Before `motion-studio-build-film`; the build never starts without `bar.md`.
- Not for samples (they use 3 entries from the kit's notes, no study).

## Inputs and access
- `/workspace/motion-studio/jobs/<order_id>/brief.md` (product, facts, reference to beat, never-show list), `config.json` (tier).
- Read: `references/studio-principles.md` §2, `references/launch-film-notes.md` (28 studied films and their mechanisms), `references/motion-grammar.md`, `references/product-hero-realism.md` §1 (measuring a hero curve).
- Tools: X search (built in), the browser, `/workspace/grokbot-templates/motion-studio/kit/scripts/measure-ref.sh`, `contact-sheet.sh`, ffmpeg.
- **Where reference films come from** (policy; no stream ripping):
  (a) the kit's measured notes on 28 launch films (`launch-film-notes.md`, numbers in `motion-grammar.md`);
  (b) files the user or the client supplies, e.g. the client's "film to beat" (`motion-studio-take-order` asks for it);
  (c) official downloads a publisher offers (a download button or press kit).
  Anything else the Bot may watch in its browser and screenshot for visual study. It never downloads or rips a stream (no yt-dlp, no screen-recording a player).

## Steps
1. **Count by tier** (`quality-tiers.md`): collect a shortlist of up to **10** candidate films in every tier; study **3** (Draft), **5 with contact sheets** (Standard) or **10 measured frame by frame** (Gauntlet). If the client named a film to beat, it is always #1.
2. **Find candidates in the client's style** (same category, similar audience, similar brand temperature): launches on X with a video posted by the company, Product Hunt launches in the same category whose gallery has a video, and the 28 films in `launch-film-notes.md`. Prefer motion-design films (not talking heads). Write `jobs/<order_id>/refs/shortlist.md`: link, company, length, why it fits, and the source type (a / b / c / browser-only).
3. **Get the frames,** for study only. Files stay in `jobs/<order_id>/refs/` (never in a delivery). Never reuse their footage, audio, logos, copy or layouts. Delete them when the order closes.
   - **File in hand (b or c):** `bash /workspace/grokbot-templates/motion-studio/kit/scripts/measure-ref.sh refs/<n>.mp4` (cut times, shot lengths, cuts per 10 s, stage colours); `contact-sheet.sh refs/<n>.mp4 refs/<n>-sheet.jpg 0.25 8 6`; and a dense 30 fps sheet around the hero move: `ffmpeg -ss <a> -t <d> -i refs/<n>.mp4 -vf "fps=30,scale=400:-2,tile=7x7" -frames:v 1 refs/<n>-hero.jpg`.
   - **Browser only:** play it in the browser, pause at each cut and take screenshots (`refs/<n>-<t>.png`), and write timings from the player's clock. Mark every number from this route **"estimated (browser)"**.
   - **Kit notes (a):** use the measured numbers as written and cite the film number.
4. **Measure (numbers, not adjectives)** per film, into `refs/<n>-notes.md`:
   - cut rhythm: shot lengths, cuts per 10 s, whether cuts sit on the beat (if audible);
   - camera: px/s or °/s of pushes and pans, and how they ease (fast exit, slow landing?);
   - hero move: angle or position keys per frame (Gauntlet: a keys table, `product-hero-realism.md` §1);
   - type: cap height as % of frame height, words per line, seconds readable, how it enters and leaves;
   - stage colour (hex, decoded), palette, and how much of the frame the subject fills;
   - frame 0, the end card, and the 2–3 mechanisms used (names from `motion-grammar.md`'s catalog).
5. **Write the bar:** `jobs/<order_id>/bar.md` with: the film to beat; a target table (each number as a range across the studied films, e.g. "shots 1.8–2.9 s; 3.5–5 cuts per 10 s; headline cap height 6–9 % of frame"); the 3 mechanisms we'll use and why; what makes the best film work, in 5 bullets; the frames the critic compares against (exact file paths of sheets and stills). Copy nothing; say what is measured.
6. Log it in `log.md`.

**Be honest about the bar's depth.** On Standard, the bar is the kit's measured numbers plus any files the user or client supplied; browser-only films add estimates, not measurements. Say exactly that in `bar.md`'s first line, e.g. "Bar: kit notes 19, 24, 25 (measured) + client file `refs/1.mp4` (measured) + 2 browser-only films (estimated)". If the client hasn't sent their "film to beat", ask through the user once; if it never comes, say the bar rests on the kit's notes.

## Check the result
- `bar.md` has numbers for cut rhythm, camera speed, hero motion, type size/timing and stage colour, each tied to named films.
- Every reference has a link and a file path; the studied count matches the tier.
- Nothing from a reference film is in the client's job outside `refs/`.

## Return
A short message: films studied (count, names, links), the target table, the 3 mechanisms, and "Storyboard next?" (`motion-studio-build-film`).

## Needs approval
- Nothing to study public films.
- If the client's reference is behind a login or paid wall, ask the user to supply the file; never sign in to someone else's account.

## If nothing is found or a step fails
- Fewer films in the client's style than the tier needs: fill from `launch-film-notes.md` and say how many are style matches.
- No file is available for a film: study it in the browser and mark its numbers "estimated (browser)". Never rip it.
- Never invent a measurement. If a number couldn't be measured, write "not measured" and why.
