# Trend cards, shot lists and recreate prompts

A scraped viral clip is a **trend source**, not raw material. The Bot studies it on its own computer: metadata from Apify, plus frames from `clip_check.py check`. Then it writes a trend card. The clip itself is never uploaded to Higgsfield, Gemini or xAI, never reposted, and never edited.

## Trend card (one per clip shown to the user)

```markdown
## <id> · <one-line description> · <platform> @<page>
Source: <url> · posted <date> · <views> views (<outlier>× this page's usual) · <seconds>s · single take, 1 person
- **Hook (0–2 s):** what happens first that stops the scroll
- **Shot type:** framing (close-up / waist-up / full body), static or handheld, eye level, location type
- **Beats:** 0.0–1.5 s <action> · 1.5–4.0 s <action> · 4.0–<end> s <payoff>
- **Camera:** locked off / slow push-in / follows the subject
- **Audio idea:** the kind of sound (e.g. "a trending slowed song", "the performer's voice-over", "silence, then a bass drop").
  Source track per the scrape: "<music field or 'unknown'>". Pick a sound from the platform's own library when posting.
  Never copy the clip's audio file.
- **On-screen text pattern:** the structure only, e.g. "POV: <situation>". Never the original words.
- **Caption pattern:** e.g. "a question + 2 niche hashtags"
- **Why it went viral (evidence):** views vs the page's median, comments/shares if scraped, the hook. Label any guess as a guess.
- **Fit for <character>:** how the character makes it funnier or stranger. Filming difficulty: easy / medium / hard
```

Rules:

- Describe the clip, but don't transcribe it. Never copy text, jokes, voice-over lines or audio word for word.
- Numbers come only from the scrape. If a field is missing, write "not in the scrape".
- Never say who the person in the source clip is, and never guess.
- Crediting the trend is optional (`ai_influencer.credit_trend_source`). It's always "trend from @page", never "remake of @person".

## Shot list (film-and-swap route)

Send this when the user picks a trend, filled in from the card:

```
Film yourself (only you in frame) acting out this trend:
1. Phone vertical (9:16), camera set to 1080p at 30 fps with HDR video OFF (HDR comes out washed out, and 4K/60 files can pass the 200 MB upload limit). 720x1280 is the minimum.
2. One continuous take, no cuts or zooms in the app. <seconds> s (at least 4 s; 10 s or less if you want the cheaper Gemini Omni route).
3. Framing: <framing from card>. Camera: <locked off on a surface/tripod | slow push-in | ...>.
4. Beats: <beat list with timings>.
5. Light from the front; face visible the whole time; don't cover your face with your hands or hair.
6. Wear plain, fitted clothes with roughly <character>'s silhouette (e.g. dark jacket for a suit). No logos, no brand names, no other people, and no screens showing other people.
7. Record sound only if it's yours (your voice, room tone). Add music later from the platform's library.
Upload the clip here (attach it in this chat, under 200 MB). I'll check it before anything is spent.
This will be YOUR take, in your space with your light and sound; the character replaces you. It won't be the original viral clip.
```

## Recreate prompt (Grok Imagine video, no footage)

`grok-imagine-video-1.5` reference-to-video takes up to 14 reference images, **≤ 15 s**, **720p max**, at **$0.08/s**. Reference images are addressed as `<IMAGE_0>`, `<IMAGE_1>`, … in list order (docs.x.ai, reference-to-video). The output has generated audio unless it's turned off.

```
Vertical 9:16 single continuous shot, no cuts. <setting from card, written fresh>.
The character from <IMAGE_0> (same face, hair, skin and outfit as <IMAGE_1>) <beat 1>, then <beat 2>, then <payoff>.
Camera: <camera from card>. Lighting: <lighting>. Sound: <audio idea, generic, e.g. "quiet room tone, a soft whoosh on the payoff">.
Keep the character identical in every frame. No other people. No text on screen. No logos.
```

`<IMAGE_0>` = `/workspace/ai-influencer/character/sheet.png`; `<IMAGE_1>` = `/workspace/ai-influencer/character/hero.png`.

## Swap prompts (film-and-swap)

- **Genjutsu object-swap** (prompt optional, ≤ 10,000 chars; refs in order): `Replace the person with the character in the reference images. Same face, hair, skin tone and outfit as the references. Keep the background, props, camera motion, lighting and timing exactly the same.`
- **Gemini Omni** (`<VIDEO_0>` is the clip being edited; `<IMAGE_REF_0>`, `<IMAGE_REF_1>` are the references, counted from zero): `Replace the person in <VIDEO_0> with the character shown in <IMAGE_REF_0> and <IMAGE_REF_1>: same face, hair, skin and outfit. Keep everything else the same.` (Google's guide recommends "Keep everything else the same" for targeted edits.)
- On a second attempt, change one thing only, named from the identity check: add the close-up face crop as an extra reference, or name the feature that drifted ("keep the long narrow nose and the grey three-piece suit").
