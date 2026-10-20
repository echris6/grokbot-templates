---
name: spatial-studio-deliver
description: Package a finished, user-approved build for the client - delivery stills, pair sheets, the static site (Whop-hosted preview → promote on the user's yes, and/or a zip), the delivery note with scale checks, ledger and "what we couldn't match" - and draft the delivery email. Use when an order is in_review and the user approves.
---

# Deliver

## When to use
- An order's build is finished (`in_review`) and the user has looked at it, or the user says "deliver <order>".
- Not for samples (those go through `spatial-studio-draft-outreach`), and never before the user's review.

## Inputs and access
- `J=/workspace/spatial-studio/jobs/<order-id>/`: `house.json`, `validation.json`, `ledger.md`, `limits.md`, `captures/`, `ab/`.
- `/workspace/grokbot-templates/spatial-studio/references/delivery.md` (Path A Whop website, Path B zip).
- Kit core (`capture.mjs`, `build-site.mjs`, `ab-pairs.mjs`, `serve.mjs`), the `whop` CLI for site deploys (`WHOP_API_KEY` or `whop login --method oauth`), `orders.csv`.

## Steps
1. **User review first:** send the user the dollhouse, the plan view and every room's pair sheet, plus `limits.md`. Ask: "Approve for delivery?" Wait for the yes.
2. **Final checks:** `node validate-spec.mjs $J/house.json --json $J/validation.json` must PASS. The ledger has no open REJECT.
3. **Stills:** `node capture.mjs --spec $J/house.json --out $J/delivery/stills --width 1920 --height 1200`, then `node ab-pairs.mjs --spec $J/house.json --captures $J/delivery/stills --out $J/delivery/pairs`.
4. **Site:** `node build-site.mjs --spec $J/house.json --out $J/delivery/site --zip` (add `--index yes` only if the client asked for search indexing). Remove the "Unsolicited sample" label from `meta.label` for paid work, and use the client's plan name.
5. **Hosting (if the order includes it), per `delivery.md` Path A:** show the user the app name, the `<slug>.whop.site` domain and the access period. After their yes: `whop apps init` (first time for this client), copy the files in, then `whop apps deploy --preview --format json`. Send the user the preview. Only after their explicit yes: `whop apps builds promote <abld_id>`. Never deploy without `--preview`.
6. **Delivery note** `$J/delivery/README.md`: what's included, how to walk it (controls), the live URL and/or the zip, the scale checks and area match (from `validation.json`), the ledger table (rounds, verdicts, changes), `limits.md` ("what we couldn't match"), the hosting period, and how new units are handled (rerun quote).
7. **Delivery email:** a draft only (≤ 150 words) with the link or attachments within the email limits (`delivery.md`). Larger files go through the Whop URL or the user's own storage link.
8. After the user confirms they sent it: `orders.csv` → `delivered`, `delivered_at`. Add the client's domain and unit list to `config.json` → `spatial_studio.clients` for `watch-new-units`. Append a `log.md` line with rounds run and any paid spend.

## Check the result
- The promoted site loads (open the live URL in the Bot's browser and screenshot two rooms and the plan view). Or the zip opens via `node serve.mjs`.
- The deployed `house.json` has no `photo` fields. The client's reference photos aren't public.
- The delivery note's numbers match `validation.json` and `ledger.md` exactly.

## Return
Live URL (or zip), stills and pair sheets with the file card, the delivery note, and the email draft. "Press Send when ready."

## Needs approval
- The user's review before anything goes to the client. `whop apps init` (domain), `deploy --preview` and `builds promote` (each is a Whop write). Sending the email.

## If nothing is found or a step fails
- `whop apps deploy --preview` fails: show the error. Fall back to the zip (Path B) and tell the user. Never promote an unreviewed build.
- A client-only build isn't accepted by Whop hosting (unverified path): use A1 (Whop's own scaffold, with the site copied into `public/tour/`), and note it in `NOTES-for-lead.md`.
- Files are over the email limits: send the URL, or ask the user for a storage link.
