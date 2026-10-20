# The Gauntlet loop on Grok Bot

Adapted from the Gauntlet Loop (somethingbig.ai/gauntlet-loop) and from motion-video-kit's review loop. The idea: whoever builds a piece never judges it. A fresh critic compares the real output against a concrete bar and names the single biggest gap. The builder fixes only that gap, and the loop repeats until the remaining gaps are too small to matter, the tier's cap is hit, or the user says stop.

## Roles

| Role | Who | Sees |
|---|---|---|
| **Lead** | The template's main Bot | Everything. It splits the job into pieces, keeps the ledger and talks to the user. |
| **Builder** | The main Bot, working on one piece at a time | The brief, the piece's files and the critic's last top gap |
| **Critic** | The helper Bot **"<Template> Critic"**, created on first run (`setup.md`, step 6) | Only the **critic packet** below. Never the builder's reasoning, never the list of fixes the builder made. |

**Why a separate Bot?** Grok Bot lets a Bot create a helper Bot and message it. Every message between Bots counts against usage, so the critic gets one self-contained packet per round and answers with one report.

**Keeping the critic fresh.** Grok Bot has no fresh-context switch, so the critic's profile holds two rules:
1. "Judge only the packet in front of you. Do not use memory or earlier rounds unless the packet includes a previous report to verify."
2. "Never save memories about jobs."

**Optional, Cursor users only:** a Cursor Cloud Agent gives a truly clean context per round. Set `critic.mode = "cloud-agent"` in `config.json`. The default is `"helper-bot"`.

## The critic packet

The Lead writes it to `/workspace/<template>/jobs/<job-id>/round-<n>/packet.md` and sends the critic that path plus the packet text:

```
ROLE: You are an independent critic in a Gauntlet loop. You did not build this. Judge the artifact, not intentions.
JOB: <one line: what the piece is and who it is for>
BAR: <the concrete reference: file paths of reference frames/photos, or the measured numbers from the study step>
ARTIFACT: <absolute paths to the actual render, frames or screenshots, never ones the builder picked as its best>
CRITERIA: <checklist for this piece, copied from the template's quality bar>
PREVIOUS REPORT (verify rounds only): <path>
OUTPUT: Write your report to /workspace/<template>/jobs/<job-id>/round-<n>/critic.md:
  1. Verdict: SHIP / ONE MORE PASS / REJECT
  2. A/B: reference vs ours, which is better and why (one paragraph)
  3. The single biggest gap: what, where (timestamp or screen region), and a concrete fix
  4. Up to 4 smaller gaps, ranked
  5. Verify rounds only: each previous item marked FIXED / PARTLY / STILL PRESENT, plus any new regressions
```

The critic opens the files itself. For video it extracts frames with `ffmpeg`, using the kit's `contact-sheet.sh` and `frozen-time.sh` where the template ships them. For 3D sites it uses screenshots from the kit's capture script.

## The loop

1. **Bar.** Write the bar before building: reference files, measured numbers, or the client's own photos. If the user gave none, the study step finds one.
2. **Split.** Break the job into pieces that can be judged on their own (a 3D scene, a UI card, the audio, one room).
3. **Per piece:** build → render → critic packet → read the report → fix **only the biggest gap** → next round.
4. **Verify.** After a fix round, send a packet that includes the previous report. The critic marks each item and looks for regressions.
5. **Whole-job pass.** Once the pieces pass, run one full-artifact round to catch seams between pieces.
6. **Stop** when one of these is true:
   - the critic says SHIP and the top gap is cosmetic
   - the tier's cap is reached (ask the user before going on)
   - the user says stop

## The ledger

`/workspace/<template>/jobs/<job-id>/ledger.md` is one table, appended to every round:

| Round | Piece | Artifact | Verdict | Biggest gap | Change made | Measured before → after |
|---|---|---|---|---|---|---|

The ledger goes to the client with the delivery. It is the proof of craft, so it must be accurate. Never write a row for a round that didn't happen.

## Isolation is by instruction only

All Bots on an account share one computer: "Bots can read files other Bots save in `/workspace`." The critic *could* open the ledger or the builder's notes. So:
- The critic profile forbids it: "Open only the paths listed in the packet."
- Packets list exact file paths and never point at a folder.
- The ledger, the builder's notes and the change log are written **after** the critic's report lands, never before a round.

## Blind test (Gauntlet tier)

1. Mix 6 of our frames or screenshots with 6 from the reference, shuffled and named `A01`…`A12` in a fresh `round-<n>/blind/` folder.
2. **Write no mapping file.** The Lead keeps the shuffle seed in its own message to the user ("blind seed: 4821"), and writes `blind/mapping.md` only after the critic's report lands.
3. The critic sorts the frames into "reference" and "ours".
4. If it sorts better than chance (9 or more correct out of 12), we aren't done.
