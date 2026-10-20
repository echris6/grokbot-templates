---
name: spatial-studio-build-sample
description: Make the unsolicited sample for one qualified prospect - fetch their plan and photos, build ONE unit on the Draft tier (plan view, dollhouse, up to 3 matched rooms), label it "Unsolicited sample", run one critic review, and stage stills (and optionally a Whop preview) for outreach. Use when the user picks a prospect or the daily routine's top pick.
---

# Build the sample

## When to use
- The user picks a prospect from `spatial-studio-find-prospects` ("make a sample for #2"), or the daily routine's top pick.
- Not for paid orders (`spatial-studio-build-spatial` at the order's tier) or for sending (`spatial-studio-draft-outreach`).

## Inputs and access
- `/workspace/spatial-studio/prospects.csv` (row with the unit, plan URL and photo URLs in `notes`), `config.json` (`tier.samples`, default `draft`).
- `references/ideas/<idea>.md` → "Sample scope". `references/plan-to-spec.md`. `skills/spatial-studio-build-spatial`.
- Kit core scripts (`/workspace/grokbot-templates/spatial-studio/kit/core/`). Only the public pages already found. No logins.

## Steps
1. **Job folder:** `J=/workspace/spatial-studio/jobs/ss-sample-<yyyy-mm-dd>-<prospect-id>`, with `mkdir -p $J/{plan,photos,captures,ab,outreach}`. Write `brief.md`: the prospect, the unit, the sources (URLs + date), and the sample scope from the idea file.
2. **Fetch the inputs** (browser download or `curl -fsSL`, public URLs only): the plan image or PDF → `plan/` (record the URL in `plan/source.txt`); up to 8 photos of **that unit** (or the closest built example) → `photos/`. Skip or crop photos showing identifiable people unless there's a consent record.
3. **Build on the Draft tier** with `spatial-studio-build-spatial`, limited to the sample scope:
   - the full plan as a spec (all rooms, walls and openings, so the plan view and dollhouse are complete)
   - furniture and finishes matched for **up to 3 rooms** with the best photos; the other rooms get neutral defaults (noted in `limits.md`)
   - `meta.label = "Unsolicited sample · made from your public materials"`
   - 1 critic review per matched room, no verify (Draft cap); the plan/scale gate still has to pass
4. **Stills:** `node capture.mjs --spec $J/house.json --out $J/captures/final --views <3 room views>,dollhouse,plan`. Pair sheets for the 3 rooms with `ab-pairs.mjs`.
5. **Site package (no deploy):** `node build-site.mjs --spec $J/house.json --out $J/site` (`noindex` by default).
6. **Optional preview link:** only if the user asks for a link rather than stills. Prepare the commands to add this sample to the samples app under `/workspace/spatial-studio/site/` and deploy with `--preview` (`references/delivery.md`). Run them only after the user's yes.
7. Update `prospects.csv`: `status = sample_ready`, `sample_path = $J`. Append a `log.md` line: date · build-sample · prospect · rounds · paid spend $0.

## Check the result
- `validation.json` passes (0 errors). `house.json` → `meta.label` is exactly "Unsolicited sample · made from your public materials" (the page header shows it).
- The 3 room stills exist, each with one critic report in the ledger. Plan and dollhouse stills exist.
- No reference photo was copied into `site/dist/client`. `build-site.mjs` strips them; check that `house.json` there has no `photo` fields.

## Return
The 3 pair sheets (photo | ours), the plan still and the dollhouse still with the file card. Then one line each: scale check result, the critic's verdicts, what we couldn't match. Ask: "Draft the email to <prospect>?"

## Needs approval
- A Whop preview deploy (a Whop write). Any paid generation. Neither is used by default.

## If nothing is found or a step fails
- The plan link is dead or the image is too small to read dimensions: mark the prospect `skip` with the reason, tell the user, and offer the next prospect. Don't build from a guess.
- Fewer than 2 usable photos: build the plan, dollhouse and 1 room. Tell the user the sample is weaker and why.
- The critic is unavailable: do the self-check only, label the stills "not yet reviewed" in your message, and don't call the sample ready for outreach until a review runs.
