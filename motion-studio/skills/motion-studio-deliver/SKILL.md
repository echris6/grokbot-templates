---
name: motion-studio-deliver
description: Package a finished film for the client after the user has reviewed it - masters, aspect variants, music-only version, poster, contact sheet, Gauntlet ledger, credits and honest limits - and draft the delivery email for the user to send; then handle one client revision round by timestamp. Use when the user approves a film or says "deliver <order>".
---

# Deliver

## When to use
- The user has watched the final render from `motion-studio-build-film` and said it's ready, or "deliver <order>".
- A client's revision notes on a delivered film (one consolidated round, unless the brief says otherwise).
- Not before the user's review. Never straight from a routine.

## Inputs and access
- `orders.csv` (status `in_review`), `jobs/<order_id>/` (brief.md, renders/, ledger.md, generations.md, music licences), `config.json`.
- Kit: `/workspace/grokbot-templates/motion-studio/kit/scripts/qa.sh`, `contact-sheet.sh`.
- The Bot's email address or the **Gmail** plugin for the draft.

## Steps
1. **Confirm the user's review:** the user has seen the exact files being delivered in this conversation. If they asked for changes, go back to `motion-studio-build-film` first.
2. **Build `jobs/<order_id>/delivery/`** with project-unique names (`<client>-<type>-<len>s-<WxH>p<fps>.mp4`):
   - the master(s) and each aspect variant in the brief;
   - the music-only version;
   - a poster frame (`ffmpeg -ss <money-shot time> -i <master> -frames:v 1 poster.png`) and a contact sheet;
   - `ledger.md` (rounds, verdicts, what changed, measured before → after) and `generations.md` (any AI media);
   - `credits.md`: music and sound sources with their licences; "AI-generated imagery" lines where used;
   - `NOTES.md`: what was measured vs. listened to, what the critic sampled, anything not re-verified after the last change, and how revisions work.
   - the editable source (`film/` without `refs/`, zipped) only if the brief includes it.
3. **Re-run `qa.sh`** on every delivered MP4 and check duration, resolution and fps against the brief.
4. **Transfer:** if each file is under 10 MB and the total under 25 MB, attach them to the email. Otherwise zip the folder and ask the user to share it from their own storage, then put that link in the email. Never upload client files to a public generation or hosting service.
5. **Draft the email** (user presses Send): what's attached, the length/aspects, the one consolidated revision round and how to give notes ("by timestamp, e.g. 0:07 the title lands late"), and the ledger as proof of the work. No new claims.
6. **After the user says it's sent:** `orders.csv` → `status = delivered`, `delivered_at`; prospect → `won`. Log it.
7. **Client revisions:** put their notes verbatim in `jobs/<order_id>/round-<n>-client/notes.md`, fix them by timestamp in `motion-studio-build-film` (one change per note, verified by a critic round when it changes motion), and repeat steps 1–6 with `-v2` file names; keep v1 in `delivery/older versions/`. When they disliked a sound, replace it with a cleaner one; don't just delete it (`audio.md`).
8. **Close:** when the client confirms, set `status = closed` and delete `jobs/<order_id>/refs/` (reference films are kept only for study).

## Check the result
- Every delivered file passes `qa.sh` and matches the brief.
- The user saw these exact files. The ledger has no row for a round that didn't happen.
- The email has the right recipient, attachments under the limits, and no claims outside `brief.md`.

## Return
The delivery folder listing, the email draft card, and one line: "Press Send when ready." After revisions: what changed, by timestamp.

## Needs approval
- The user's review of the final files (before anything goes to the client).
- Sending: the user presses **Send**.
- Refunds: never here. If the client asks, draft the reply and tell the user which payment to refund in the Whop dashboard.

## If nothing is found or a step fails
- A file fails `qa.sh`: fix and re-render before delivering; tell the user what changed.
- Too large to email and the user has no storage link: offer a smaller H.264 copy (`-crf 23`, 30 fps) for preview, and keep the master for when they have a link.
- The client is unhappy beyond the agreed revision: draft a reply for the user that restates the scope; the user decides on extra work or a refund.
