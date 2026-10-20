---
name: ai-influencer-write-caption
description: Write 3 caption options in the character's voice for a finished video, with hashtags, an optional trend credit and the AI-label reminder. Use right after make-remake, or when the user asks for a caption.
---

# Write the caption

## When to use
- Right after `ai-influencer-make-remake` produces `final.mp4`, or when the user asks "caption this" for a job.
- Not for the guide or the Whop page copy. Those belong to `ai-influencer-write-guide` and `ai-influencer-launch-guide`.

## Inputs and access
- `/workspace/ai-influencer/jobs/<job-id>/trend.md` (hook, caption pattern, the page for an optional credit).
- `/workspace/ai-influencer/character/character.md` (voice rules, example lines).
- `/workspace/ai-influencer/config.json` → `ai_influencer.platforms`, `credit_trend_source`.
- `/workspace/grokbot-templates/ai-influencer/references/caption-playbook.md` (shape, three styles, the never-list, the AI-label reminder).
- No plugins, secrets or paid calls.

## Steps
1. Read the trend card, the character card and the playbook.
2. Write 3 options (A deadpan, B question/comment bait, C in-character one-liner), each with a first line ≤ 60 characters and 3–5 hashtags. Add "trend from @<page>" only if `credit_trend_source` is true.
3. If both platforms are used, note any change per platform (e.g. a shorter TikTok version). Don't write separate sets unless asked.
4. Save to `/workspace/ai-influencer/jobs/<job-id>/caption.md` with the options and the AI-label reminder from the playbook.

## Check the result
- No sentence copied from the source clip's caption or on-screen text (compare with `trend.md` and the scrape's `caption` field in `/workspace/ai-influencer/trends/<date>/candidates.json`).
- No claims about money, results or real people. The voice rules from `character.md` are followed.
- First lines ≤ 60 characters. 3–5 hashtags each.

## Return
The 3 options in one message, ready to copy, then the reminder: "Before posting: turn on the AI label (Instagram: AI info; TikTok: AI-generated content). You post it; I never do."

## Needs approval
- None. Nothing is published. The user copies the caption and posts it themselves.

## If nothing is found or a step fails
- No character card: write in a neutral deadpan voice and say the character's voice rules are missing.
- No trend card (an original concept): write from the user's description of the video.
