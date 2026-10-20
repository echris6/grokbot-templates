# Designing the character

The brief that works: **a strange, memorable face with immaculate clothes**. The face makes people stop scrolling; the clothes make it look deliberate and premium rather than cursed. The character must be fictional.

## Hard rules

- Not a real person, and not "in the style of" a real person, a celebrity, a politician, a creator or a fictional character someone else owns. If a draft looks like someone recognisable, throw it away.
- An adult. Never childlike features.
- Human-shaped, with roughly human proportions, so a person can act its trends out and the swap model can map a body onto it. Strangeness goes in the face (proportions, eyes, skin texture, age, expression), not in extra limbs.
- No logos or brand marks on the clothes.

## Five-option prompt pattern

For each option give: a name, a one-line hook, the face, the outfit, the voice (3 rules), and why it fits the user's niche. Vary along different axes:

1. Uncanny-elegant (e.g. very long face, tiny eyes, perfect three-piece suit)
2. Ancient-dapper (an impossibly old gentleman in tailored streetwear)
3. Soft-surreal (oversized round eyes, pastel couture)
4. Stern-classic (heavy brow, severe haircut, military-cut coat)
5. Wildcard that fits the niche (e.g. a gym niche: a gaunt aristocrat in a pristine tracksuit)

## The reference sheet (one image, locked)

The prompt for the Bot's image tool or `/workspace/bin/imagine image`:

```
Character reference sheet on a plain light-grey background, studio lighting, photorealistic.
The same adult character shown 5 times in a row: front view, three-quarter left, profile left, three-quarter right, back view, full body,
plus one large head-and-shoulders close-up on the right. <face description>. <hair>. <skin>. Wearing <outfit, with fabrics and colours>.
Identical face, hair, outfit and proportions in every view. Neutral expression. No text, no labels, no logos.
```

Save these files to `/workspace/ai-influencer/character/`:

| File | What it is |
|---|---|
| `sheet.png` | The locked multi-angle sheet, reference #1 for every generation |
| `hero.png` | A front-facing, waist-up portrait made from the sheet (image edit with the sheet as reference), reference #2 |
| `face.png` | A tight face close-up, used as reference #3 when the identity check flags face drift |
| `character.md` | Name, the hook, the face/outfit description used in prompts, the voice rules, 5 example caption lines, and `locked_at` |
| `candidates/` | The rejected options, kept for the record |

"Locked" means: from now on every generation uses these exact files. A change to the character is a new version (`sheet-v2.png`), and only the user can ask for one.

## Costs

- Bot's built-in image tool: Grok Bot usage only.
- `/workspace/bin/imagine image` (`grok-imagine-image-2.0`, `XAI_API_KEY`): $0.04 per image. Five options plus 4 sheet tries plus hero and face is about 11 images, roughly $0.44 (edits with reference images may cost more; the script's estimate counts inputs too).
- Optional: Higgsfield Soul stills via the API cost about $0.09–$0.19 per image (Soul Standard, Higgsfield pricing page, 2026-10). The scripts here don't wrap it.

Known quirk reported by published Grok Bot templates (not in the official docs): the built-in image tool only reads input images from the Bot's own attachments/ and assets/ folders, not `/workspace`. When an edit needs the sheet as input, use `/workspace/bin/imagine image --ref` instead.
