---
name: ai-influencer-check-milestone
description: Record the account's follower counts (from the user, or from the public profile via Apify) and tell the user when the follower threshold for launching the guide is passed. Used by the weekly milestone routine and when the user reports their follower count.
---

# Check the follower milestone

## When to use
- The **Weekly milestone check** routine.
- When the user replies with follower numbers ("IG 8.2k, TikTok 3k"), or asks "are we there yet?".
- Not after `ai_influencer.guide.published_at` is set. From then on, the weekly review only tracks growth.

## Inputs and access
- `/workspace/ai-influencer/config.json` → `ai_influencer.accounts.instagram`, `.tiktok` (the user's own public handles), `follower_threshold`, `follower_source` (`ask` | `apify`), `milestone_reached_at`.
- `/workspace/ai-influencer/state/followers.csv` (`date,platform,followers,source`, append only).
- Only if `follower_source` is `apify`: `/workspace/bin/apify_run` (secret `APIFY_TOKEN`) with `apify~instagram-scraper` (profile details: `followersCount`, about $0.0027) and `clockworks~tiktok-scraper` (`authorMeta.fans`). The **Apify** plugin is used only on `secrets_path: oauth-only`.
- The Bot never logs into the user's Instagram or TikTok.

## Steps
1. If `follower_source` is `ask` (and this is a routine run): send "Weekly check: how many followers on <platforms> right now?" and stop. The routine doesn't wait for the reply. When the user replies, run steps 3–5 with `source=user`.
2. If `follower_source` is `apify`, write each input to `/workspace/ai-influencer/state/` and run `/workspace/bin/apify_run` (it writes the result to disk). On `secrets_path: oauth-only`, run the same inputs through the Apify plugin instead; the result is one small item.
   - Instagram: `/workspace/bin/apify_run apify~instagram-scraper --input /workspace/ai-influencer/state/ig-profile.json --out /workspace/ai-influencer/state/ig-profile-out.json --max-usd 0.10`, with input `{"directUrls": ["https://www.instagram.com/<handle>/"], "resultsType": "details"}` → `followersCount`.
   - TikTok: `/workspace/bin/apify_run clockworks~tiktok-scraper --input /workspace/ai-influencer/state/tt-profile.json --out /workspace/ai-influencer/state/tt-profile-out.json --max-usd 0.50` (its minimum cap; the actual charge is about $0.005), with input `{"profiles": ["<handle>"], "resultsPerPage": 1, "profileSorting": "latest"}` → `authorMeta.fans` of the first item.
3. Append one row per platform to `/workspace/ai-influencer/state/followers.csv` (create the header if missing): `<date>,<platform>,<number>,<user|apify>`.
4. Compare with `follower_threshold`. Default rule: **any one platform** reaches it. Use the combined total only if the user chose that in setup (`threshold_rule: "combined"`).
5. If it's passed and `milestone_reached_at` is empty: set it, append to `log.md`, and tell the user: "<platform> passed <threshold> (<number>). Ready to make the guide? It's about 20 minutes of your review time. Say **make the guide** to start." Don't start `ai-influencer-write-guide` without that yes.
6. If it isn't passed yet: one line with this week's number, the change since last week, and the gap ("8,240 on IG, +1,130 this week, 1,760 to go").

## Check the result
- Each number is either typed by the user or read from that platform's own profile field in the dataset. Never estimated.
- `followers.csv` gained exactly one row per platform checked.

## Return
One line (progress) or the milestone message. Never more.

## Needs approval
- None for recording numbers (Apify runs are capped well under $1).
- Starting the guide needs the user's "make the guide".

## If nothing is found or a step fails
- The handle isn't set: ask for it once, then save it to `accounts`.
- Apify returns no profile (private account or a typo): say so, switch this week to asking the user, and don't record a number.
- The user doesn't answer: nothing to record. Next week's routine asks again.
