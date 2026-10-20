---
name: motion-studio-build-portfolio
description: Make the studio's first three sample films for products the user likes, labelled as unofficial concepts, and put them on a one-page Whop website (preview first, promote on the user's yes). Use before pitching anyone, or when the user says "build my portfolio" or "update the portfolio page".
---

# Build the portfolio

## When to use
- Week one, before any outreach: "make three sample videos for products you like before pitching anyone".
- Later, to swap in a stronger film (only real client work the client agreed to show, or new concepts).
- Not for pitching a specific prospect (`motion-studio-make-sample` + `motion-studio-draft-outreach`).

## Inputs and access
- Three products the user picks (Product Hunt pages or sites), or ask `motion-studio-find-launches` for ideas.
- `motion-studio-make-sample` (does the film), `/workspace/grokbot-templates/motion-studio/site/` (page, data example, README), `/workspace/grokbot-templates/_shared/whop.md` (Recipe A, site steps).
- Whop CLI (`WHOP_API_KEY` or `whop login --method oauth`), `config.json` → `motion_studio.portfolio`.

## Steps
1. **Pick three** with the user: varied (e.g. a dev tool, an AI app, a consumer app) and with strong public screenshots. Ask which they'd rather have: permission first (the Bot drafts a short note to each maker; the user sends it) or labelled unofficial concepts.
2. **Make each film** with `motion-studio-make-sample`, job id `portfolio-<slug>`, on the tier the user picks (Draft by default; Standard looks better and costs about 3–4× the usage). Changes from a prospect sample: the label is "Unofficial concept · not affiliated with <product>" unless the maker gave permission; **no client logo** on concepts (the name in type only).
3. **Show the user all three** and fix what they ask.
4. **Web copies:** for each, `ffmpeg -i <final>.mp4 -vf scale=1280:-2 -c:v libx264 -crf 24 -movflags +faststart <slug>-web.mp4` and a poster `<slug>.jpg` from the money shot.
5. **Page data:** write `/workspace/motion-studio/site/portfolio.json` from `portfolio.example.json`: studio name, headline, contact (the user's chosen address), the three films with their labels. No invented clients, numbers or testimonials.
6. **Site** (Whop CLI, Recipe A step 5, no product needed): show the user the name and slug, then `whop apps init --app_type website --name "<Studio>" --domain <slug>` in `/workspace/motion-studio/site/` (the app type is permanent), wire the page as in `site/README.md`, and `whop apps deploy --preview`. Send the user the preview link.
7. **Promote** with `whop apps builds promote <abld_id>` only after the user's yes. Save `portfolio.site_slug` in `config.json`; log it.

## Check the result
- Each film passes `qa.sh`, carries its label on every frame, and shows only the product's own public facts.
- The preview page plays all three videos, the labels are visible under each, and the button opens an email to the user's address.
- Nothing is live until the user said promote.

## Return
The three films with file cards, the preview link, and after promotion the live `<slug>.whop.site` link with one line: "Share this in pitches."

## Needs approval
- Each film's tier (usage) and any paid generation (cost first).
- Notes to makers asking permission: drafts; the user presses Send.
- `whop apps init` (permanent app type, domain slug) and `whop apps builds promote`. Never `whop apps deploy` without `--preview`.

## If nothing is found or a step fails
- A maker says no: drop that product and pick another; never publish it.
- The site build fails: read the scaffold's own index route, adapt `site/index.tsx`, and retry once; then show the user the error. The films are still usable as email attachments.
- The slug is taken: offer two alternatives; never let Whop buy a full domain without the user doing it themselves.
