---
name: ai-influencer-design-character
description: Suggest 5 fictional characters with a strange face and immaculate clothes for the user's niche, let the user pick one, then make and lock a multi-angle reference sheet, hero portrait and face close-up. Use for "design my character", "pick a character", or when config has no locked character.
---

# Design and lock the character

## When to use
- After setup, when `ai_influencer.character.locked_at` is empty in `/workspace/ai-influencer/config.json`.
- When the user explicitly asks for a new character or a new version. A new version gets new files (`sheet-v2.png`), and the old ones are kept.
- Not for small fixes to one video. Those belong in `ai-influencer-make-remake`.

## Inputs and access
- `/workspace/ai-influencer/config.json` (niche, direction, platforms).
- `/workspace/grokbot-templates/ai-influencer/references/character-design.md`: rules, the five-option pattern, the sheet prompt, file layout, costs.
- Image generation: the Bot's built-in image tool (Grok Bot usage), or `/workspace/bin/imagine image` (secret `XAI_API_KEY`, `grok-imagine-image-2.0`, $0.04/image) for anything that needs a reference image as input.
- Writes `/workspace/ai-influencer/character/` (sheet.png, hero.png, face.png, character.md, candidates/).

## Steps
1. Read the niche and direction. Write **5 options** following the pattern in `references/character-design.md`: name, hook, face, outfit, voice (3 rules), and why it fits the niche. Make them strange-faced and immaculately dressed, clearly fictional, adult, human-shaped, and different from each other.
2. Make one portrait per option (5 images). With the built-in tool, that's Grok Bot usage. With the script: `/workspace/bin/imagine image --prompt "<portrait prompt>" --aspect 3:4 --resolution 2k --out-dir /workspace/ai-influencer/character/candidates/<n>/` ($0.04 each). The script prints JSON whose `images` list holds the **real paths**. Files are named by their actual type, usually `img-00.jpg` because xAI returns JPEG. Always use those paths, never a guessed `img-00.png`. Say which tool you'll use and the cost before generating.
3. Send all 5 images in one message with their names and hooks. Attach them to the reply; a tool saying an image was "displayed" doesn't mean the user saw it. Ask the user to pick one (or ask for tweaks: max 2 rounds of variations before suggesting a fresh set).
4. **Look-alike check:** before locking, look at the picked portrait and ask yourself whether it resembles any real, well-known person. If it might, say so and change the face.
5. Make the **reference sheet** with the sheet prompt in `references/character-design.md`, using the picked portrait as the reference: `/workspace/bin/imagine image --prompt "<sheet prompt>" --ref <the picked portrait's path from its `images` output> --refs-generated --aspect 16:9 --resolution 2k --n 2 --out-dir /workspace/ai-influencer/character/drafts/`. `--refs-generated` affirms the reference is AI-made and shows no real person; the kit refuses `--ref` without it. If the portrait came from the built-in tool, copy it into `candidates/<n>/` first and use that path. Pick the draft where every view matches; regenerate at most twice.
6. From the chosen sheet, make `hero.png` (front, waist-up, 3:4, plain background) and `face.png` (tight face close-up, 1:1): `/workspace/bin/imagine image --prompt "<hero or face prompt>" --ref <the chosen sheet draft's path from `images`> --refs-generated --aspect 3:4 --resolution 2k --out-dir /workspace/ai-influencer/character/drafts/hero/` (and `--aspect 1:1` for the face).
7. Show the sheet, hero and face together. On the user's **"lock it"**, **convert** (don't copy) each draft to a real PNG, so the `.png` name matches the bytes. The scripts pick the upload MIME type from the extension, and a JPEG renamed `.png` gets mislabelled:
   `C=/workspace/ai-influencer/character; ffmpeg -y -i <sheet draft> $C/sheet.png && ffmpeg -y -i <hero draft> $C/hero.png && ffmpeg -y -i <face draft> $C/face.png`
   Confirm with `file $C/*.png` (or `ffprobe`; the codec must be `png`). Then write `character.md` (name, hook, the exact face/outfit description used in prompts, the 3 voice rules, 5 example caption lines). Set `ai_influencer.character.name` and `locked_at` in `config.json`, and append to `/workspace/ai-influencer/log.md`: `<date> · design-character · locked <name> · $<spent>`.

## Check the result
- `ffprobe -v error -show_entries stream=codec_name,width,height` each locked file: codec `png`. Target (2k): sheet ≥ 1536 px wide, hero and face ≥ 1024 px on the short side. The docs list `1k`/`2k` but no pixel sizes, so if 2k output comes back smaller, accept ≥ 1024 px wide for the sheet and note the real size in `character.md`.
- In the sheet, every view shows the same face, hair, outfit and colours. No text, logos or extra people.
- `character.md` has all six parts.
- `config.json` has `character.locked_at`.

## Return
- The 5 options (images plus a one-line hook each), then the sheet, hero and face for approval. After locking: "Locked: <name>. Every video will use this sheet." Then offer the next step: set up repost pages (see `references/niche-repost-pages.md`) or run today's trend scout.

## Needs approval
- Spending on `/workspace/bin/imagine` beyond about $1 in total for this skill (state the estimate first).
- Locking the character, and any later change to a locked character.

## If nothing is found or a step fails
- A generation is refused or looks like a real person: change the face description and retry once, then tell the user what was changed.
- `XAI_API_KEY` missing: use the built-in tool for the portraits. For the sheet, use the built-in tool with the description only (no reference image), and warn that consistency may be weaker.
- Never lock a character the user hasn't explicitly approved.
