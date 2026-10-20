---
name: ai-influencer-make-remake
description: Turn the trend card the user picked (or their own concept) into a vertical video of the locked character. Route film-and-swap - the user films themselves, Higgsfield Genjutsu object-swap (or Gemini Omni) replaces them with the character, keeping everything else. Route recreate - Grok Imagine reference-to-video from the character sheet, no footage. Checks identity, retries within attempts_per_clip, and hands back the file. Never posts.
---

# Make the remake

## When to use
- The user picked a trend card from `ai-influencer-find-clips` ("2, film" / "1, recreate"), or brought their own concept ("original concept").
- The user uploaded footage of themselves for a picked card.
- Not for scraped clips. **A scraped or downloaded third-party clip is never an input here.** If the user uploads a clip that isn't them, ask for the basis (signed release or licensed stock). Without one, stop and offer the recreate route.

## Inputs and access
- `/workspace/ai-influencer/config.json` → `ai_influencer.route` (`film-and-swap` | `recreate`), `video_model` (`genjutsu` | `gemini-omni`), `resolution` (`720p`), `attempts_per_clip` (default 2), `omni_blocked_region`, `character.*`.
- Character: `/workspace/ai-influencer/character/sheet.png`, `hero.png`, `face.png`, `character.md`. Stop if `character.locked_at` is empty.
- Trend card: `/workspace/ai-influencer/trends/<date>/trends.md`. Prompt templates and the shot list: `/workspace/grokbot-templates/ai-influencer/references/trend-card.md`.
- Kit: `/workspace/grokbot-templates/ai-influencer/kit/clip_check.py`; shims `/workspace/bin/consent_record`, `/workspace/bin/hf_genjutsu` (secrets `HF_API_KEY_ID`, `HF_API_KEY_SECRET`), `/workspace/bin/omni_edit` (`GEMINI_API_KEY`), `/workspace/bin/imagine` (`XAI_API_KEY`).
- Writes `/workspace/ai-influencer/jobs/<job-id>/` with job id `ai-<yyyy-mm-dd>-<slug>`, the consent record `/workspace/ai-influencer/consent/<job-id>.md`, and `log.md`.

## Steps
1. **Open the job.** `J=/workspace/ai-influencer/jobs/<job-id>`, then `mkdir -p $J/footage`. Copy the trend card to `$J/trend.md`, add a `ledger.md` row `attempt · route · model · cost · verdict · note`, and mark the URL `picked` in `seen.csv` (`clips.py seen-add --status picked`).

### Route A: film-and-swap (default)
2. Send the **shot list** from `references/trend-card.md`, filled in from the card. It asks for **1080p, 30 fps, HDR off**, because Grok Bot accepts video attachments up to **200 MB** and a 4K/60 take can be bigger. Remind the user: "This will be your own take, in your room with your light and sound. It won't be the original viral clip."
   **Get the upload onto the computer:** when the user attaches the take, copy the attachment into the job folder (`cp "<path of the attachment on this computer>" $J/footage/take-1.mp4`, or the Bot's copy-to-computer tool if the attachment isn't on disk yet). Then confirm it with `ffprobe -v error -show_entries format=duration,size -of csv=p=0 $J/footage/take-1.mp4`. If the file is over 200 MB or didn't arrive, ask for a 1080p/30 re-export (on iPhone the options live under Settings → Camera → Record Video: pick 1080p at 30 fps and switch HDR Video off; menus vary by iOS version).
3. **Check the take:** `python3 /workspace/grokbot-templates/ai-influencer/kit/clip_check.py check $J/footage/take-1.mp4 --out-dir $J/check`. Width and height are the **display** size, with the phone's rotation flag already applied (`rotation`, `stored_size` show the raw values). Requirements:
   - `orientation == "portrait"` and ≥ 720×1280 (≥ 409,600 px is the hard floor, and prep upscales, but say quality will suffer)
   - at least 4 s
   - `hard_cuts == 0`, and every `possible_cuts` entry ruled out by looking at its `inspect_frames`
   - `hdr` false. If true, ask for a re-take with HDR off; HLG/PQ footage comes out washed out.
   - contact sheet: exactly one person, face visible, no other people on screens, no logos

   If anything fails, say exactly what to change and ask for a new take.
   **Not a scraped clip:** `python3 /workspace/grokbot-templates/ai-influencer/kit/clip_check.py match --video $J/footage/take-1.mp4`. It checks the hash index `/workspace/ai-influencer/state/scraped-hashes.json` (every clip ever downloaded, kept after the 7-day deletion) plus any scraped files still on disk. If it exits 3, the "take" matches a scraped trend clip (same file, or re-encoded, trimmed, sped-up, mirrored, band- or centre-cropped up to ~10%, or letterboxed): stop, say so, and don't ask for consent or spend. The guard can't catch a re-filmed screen, heavy crops or big overlays. If the contact sheet looks like a repost (watermark, page handle, captions burned in), stop too.
4. **Consent.** Ask: "Is the only person in this clip you?" On a clear yes in the user's own words, the basis is `self`. Otherwise the basis must be `signed release` (the user uploads the signed release; save it to `/workspace/ai-influencer/consent/releases/`) or `licensed stock` (the licence document, saved the same way). No basis means stop here. Never write the user's answer for them.
5. **Pick the model.** Genjutsu by default. Use Gemini Omni only if `video_model` is `gemini-omni`, the take is ≤ 10 s, and `omni_blocked_region` is false. **Prep:** `python3 .../clip_check.py prep --video $J/footage/take-1.mp4 --model <genjutsu|gemini-omni> --resolution <res> --out $J/prep.mp4 [--start S --end E]`. Then record consent on the exact file that will be uploaded:
   `/workspace/bin/consent_record --media $J/prep.mp4 --people "the account owner" --basis self --quote "<the user's exact words from chat>" --out /workspace/ai-influencer/consent/<job-id>.md`
   (for `signed release` / `licensed stock` add `--release <path to the document>`). The record is tied to the file's SHA-256, so re-prepping means a new record; `hf_genjutsu` and `omni_edit` refuse without a matching one.
   Check prep's output before going on: `orientation` is portrait and `warnings` is empty. A non-empty `warnings` means don't upload; fix the take first.
6. **Price and ask once.** Use `est_usd_per_attempt` from prep (Genjutsu: list $0.318/$0.681/$1.632 per input second at 480p/720p/1080p, rounded up; promotions may lower it. Omni: about $0.10/s). Ask: "Up to <attempts_per_clip> attempts at about $<x> each, max $<x × attempts>. Go?" One yes covers this job's attempts.
7. **Generate** (attempt *n*):
   - Genjutsu: `/workspace/bin/hf_genjutsu swap --video $J/prep.mp4 --ref /workspace/ai-influencer/character/sheet.png --ref /workspace/ai-influencer/character/hero.png [--ref .../face.png] --prompt "<swap prompt from references/trend-card.md>" --resolution <res> --consent /workspace/ai-influencer/consent/<job-id>.md --out $J/out-<n>.mp4`
   - Omni: `/workspace/bin/omni_edit --video $J/prep.mp4 --ref .../sheet.png --ref .../hero.png --prompt "Replace the person in <VIDEO_0> with the character shown in <IMAGE_REF_0> and <IMAGE_REF_1> …Keep everything else the same." --aspect 9:16 --consent /workspace/ai-influencer/consent/<job-id>.md --out $J/out-<n>.mp4`
8. **Identity check:** `python3 .../clip_check.py compare --source $J/prep.mp4 --video $J/out-<n>.mp4 --ref /workspace/ai-influencer/character/sheet.png --out-dir $J/compare-<n>`. Look at `identity.jpg` and `ab.jpg` against the `look_for` questions. **Pass** only if the face, hair, skin and outfit match the sheet in every sampled frame, no trace of the user's own face remains, the background and timing match the take, and there are no artifacts. Fix any `auto_problems` (missing audio → `clip_check.py remux-audio --video $J/out-<n>.mp4 --audio-from $J/prep.mp4 --out $J/final.mp4`; otherwise copy the passing output to `$J/final.mp4`).
9. **Retry** only while `n < attempts_per_clip` and within the approved amount. Change one thing named by the check (add `face.png`, or name the drifting feature in the prompt), and log the attempt in `ledger.md`.

### Route B: recreate (no footage)
2. Write the prompt from the card with the recreate template in `references/trend-card.md`: `<IMAGE_0>` = sheet, `<IMAGE_1>` = hero. Duration is the trend's length rounded up, max 15 s.
3. Price: $0.08/s × duration (e.g. 8 s = $0.64). Ask once for up to `attempts_per_clip` attempts.
4. `/workspace/bin/imagine video --prompt "<prompt>" --ref /workspace/ai-influencer/character/sheet.png --ref /workspace/ai-influencer/character/hero.png --refs-generated --duration <s> --aspect 9:16 --resolution 720p --out $J/out-<n>.mp4`. No real person is involved, so no consent record is needed.
5. Identity check: `python3 .../clip_check.py compare --video $J/out-<n>.mp4 --ref .../sheet.png --out-dir $J/compare-<n>` (no `--source`). Also check that the beats and hook of the card actually happen. Retry as in A9, then copy the pass to `$J/final.mp4`.

### Original concept
Same as Route B (or Route A if the user films it), with the user's own idea in place of a trend card. Write a card for it first, so the caption and the log work the same way.

### Finish (both routes)
10. Append to `/workspace/ai-influencer/log.md`: `<date> · make-remake · <job-id> · <route>/<model> · <n> attempts · $<total> · <pass|fail>`. Then hand over to `ai-influencer-write-caption`.

## Check the result
- `$J/final.mp4` exists. `ffprobe` shows portrait (9:16 or close), ≥ 720 px wide, has audio, and duration within 0.5 s of the take (Route A).
- Route A: `/workspace/ai-influencer/consent/<job-id>.md` exists, quotes the user, and its `clip: sha256:` matches `sha256sum $J/prep.mp4`.
- Identity check passed on `final.mp4`'s attempt, and `ledger.md` has one row per attempt with real costs.

## Return
The video attached (`final.mp4`), plus one line: route, model, attempts, and real cost. Then the captions from `ai-influencer-write-caption`, and the reminder: "You post it. Turn on the AI label when you do." If the identity check failed on every allowed attempt, send the best attempt marked **FAILED CHECK**, saying what's off, and ask whether to spend on another attempt.

## Needs approval
- Every paid generation: one yes per job covering up to `attempts_per_clip` attempts, with the per-attempt and maximum cost stated first. More attempts than that, or a higher resolution, need a new yes.
- Uploading anything: only footage with a consent record, and only after the yes above.
- Posting is never done by the Bot.

## If nothing is found or a step fails
- The user's take fails the checks: say exactly what to change, and don't spend.
- `hf_genjutsu` or `omni_edit` refuses (missing consent, content policy, recognisable-person refusal): show the reason. Don't retry a policy refusal; offer the recreate route.
- Omni unavailable in the user's region or the clip is > 10 s: use Genjutsu, re-priced, and ask again.
- A generation times out: check the request status once before resubmitting (Genjutsu's Idempotency-Key prevents double billing only for the same request).
- Never present a failed attempt as finished, and never write a ledger row for an attempt that didn't run.
