---
name: ai-influencer-write-guide
description: Write the "How <Character> is made" guide from the user's real workflow, logs and character files, then render it to a print-ready PDF. Use when the milestone is reached and the user says go, or on "write the guide". Does not publish anything.
---

# Write the guide

## When to use
- After `ai-influencer-check-milestone` reports the follower threshold is passed and the user says "make the guide", or whenever the user asks for it.
- Before `ai-influencer-launch-guide` (which sells it). Not for editing an already-published guide's price or page; that belongs to launch-guide.

## Inputs and access
- `/workspace/grokbot-templates/ai-influencer/references/guide-outline.md` (sections and rules), `/workspace/grokbot-templates/ai-influencer/references/trend-card.md`, `/workspace/grokbot-templates/ai-influencer/references/caption-playbook.md`, `/workspace/grokbot-templates/ai-influencer/references/character-design.md`.
- The user's real data: `/workspace/ai-influencer/log.md`, `/workspace/ai-influencer/jobs/*/ledger.md`, `/workspace/ai-influencer/state/followers.csv`, `/workspace/ai-influencer/character/` (sheet, hero, face, card), and finished videos' stills.
- Kit: `/workspace/grokbot-templates/ai-influencer/kit/guide_pdf.py` (needs Chromium: `sudo apt-get install -y chromium`), `/workspace/grokbot-templates/ai-influencer/kit/clip_check.py` (for stills).
- Writes `/workspace/ai-influencer/guide/` (guide.md, images/, guide.html, guide.pdf).

## Steps
1. Ask 3 quick questions: the price they have in mind (they set it; suggest $19–$49 for a PDF guide), the access period (default "12 months of access, including updates"; never lifetime), and anything they do differently from the template's defaults.
2. Gather the facts: total videos made, average cost per video by route (from `log.md`), time per video, and follower growth (from `followers.csv`). Copy numbers exactly. Where a number doesn't exist, leave it out.
3. Make the images: `mkdir -p /workspace/ai-influencer/guide/images`. Copy the sheet. Pull 3–4 stills from the user's own finished videos (`ffmpeg -ss <t> -i /workspace/ai-influencer/jobs/<id>/final.mp4 -frames:v 1 /workspace/ai-influencer/guide/images/<id>.jpg`). Never use frames from scraped clips.
4. Write `/workspace/ai-influencer/guide/guide.md` following the outline, with images referenced as `images/<file>`. Include the prompt templates, the shot list, the consent rule, the AI-label steps, and a dated price table.
5. Render: `python3 /workspace/grokbot-templates/ai-influencer/kit/guide_pdf.py --md /workspace/ai-influencer/guide/guide.md --out /workspace/ai-influencer/guide/guide.pdf --title "How <Name> is made" --subtitle "<access period>" --cover /workspace/ai-influencer/character/hero.png`.
6. Save `guide.price_usd` and `guide.access_period` to `config.json`, and append to `log.md`.

## Check the result
- The PDF exists and the script reports 12–30 pages. Open `guide.html` or the PDF and check that the images loaded (no broken-image boxes) and that tables fit the page.
- Search the markdown for third-party handles or URLs from `/workspace/ai-influencer/trends/`. There must be none.
- Every number in the guide can be found in `log.md`, `followers.csv` or a dated price source. No income promises; the first page says what it teaches and the access period.

## Return
The PDF attached, plus a one-paragraph summary (sections, page count, which numbers came from their logs), and: "Read it all. Tell me what to change, or say 'launch it' to set up Whop."

## Needs approval
- Nothing is published here. The user approves the content before `ai-influencer-launch-guide` uses it.

## If nothing is found or a step fails
- Chromium is missing and won't install: deliver `guide.html` and say the PDF step failed (with the error line). Ask to retry after `sudo apt-get install -y chromium`.
- Too little real data (e.g. under 10 videos): say so and suggest waiting, or write the guide without the results section. Never fill it with estimates presented as results.
