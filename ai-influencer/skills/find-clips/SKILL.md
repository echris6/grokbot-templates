---
name: ai-influencer-find-clips
description: Daily trend scout. Scrape the last few days of clips from the niche's big repost pages with Apify, rank by views per hour, check candidates in batches until 3 are single takes with exactly one person, and show them as trend cards the user can remake. Never uploads or reposts the clips. Used by the daily routine and on "find clips" / "what's trending".
---

# Find today's trends

## When to use
- The **Daily trend scout** routine, and when the user asks "find clips", "what's trending", or "show me today's top 3".
- Not when `ai_influencer.repost_pages` is empty. Run the page-finding method in `/workspace/grokbot-templates/ai-influencer/references/niche-repost-pages.md` with the user first.
- Not for making the video. Once the user picks a card, hand over to `ai-influencer-make-remake`.

## Inputs and access
- `/workspace/ai-influencer/config.json` → `ai_influencer.repost_pages`, `lookback_days` (4), `reels_per_page` (12), `rank_top` (20), `check_batch` (6), `show_top` (3), `rank_by` (`velocity`), `credit_trend_source`, `secrets_path`.
- `/workspace/ai-influencer/seen.csv`: never show the same URL twice.
- Scraping, primary: `/workspace/bin/apify_run` (secret `APIFY_TOKEN`), which writes the dataset to a file. Only when `secrets_path` is `oauth-only`: the **Apify** plugin, with a field filter (step 3b).
- Kit: `/workspace/grokbot-templates/ai-influencer/kit/clips.py`, `/workspace/grokbot-templates/ai-influencer/kit/clip_check.py`, `/workspace/grokbot-templates/ai-influencer/references/trend-card.md`.
- Writes `/workspace/ai-influencer/trends/<yyyy-mm-dd>/`. Downloaded clips stay on this computer for analysis only.

## Steps
1. `D=/workspace/ai-influencer/trends/$(date +%F)` and `mkdir -p $D/clips`. Read the config. `K=/workspace/grokbot-templates/ai-influencer/kit`.
2. **Instagram** (if pages are set). Write `$D/ig-input.json`:
   `{"username": [<pages>], "resultsLimit": <reels_per_page>, "onlyPostsNewerThan": "<lookback_days> days", "skipPinnedPosts": true}`, then
   `/workspace/bin/apify_run apify~instagram-reel-scraper --input $D/ig-input.json --out $D/ig.json --max-usd 0.50`.
3. **TikTok** (if pages are set). Write `$D/tt-input.json`:
   `{"profiles": [<pages>], "resultsPerPage": <reels_per_page>, "profileSorting": "latest", "oldestPostDateUnified": "<lookback_days> days", "excludePinnedPosts": true, "shouldDownloadVideos": true}`. The value must match the actor's pattern, e.g. `"4 days"`; a bare `"4"` fails. Then
   `/workspace/bin/apify_run clockworks~tiktok-scraper --input $D/tt-input.json --out $D/tt.json --max-usd 0.50` ($0.50 is this actor's minimum cap).
   - **3b. Only on `oauth-only`:** run the same inputs with the Apify plugin (`call-actor`, `callOptions.maxTotalChargeUsd: 0.50`; poll `get-actor-run` if needed). Then call `get-dataset-items` with `fields` set to the keys `clips.py` reads. Instagram: `url,shortCode,type,productType,videoUrl,downloadedVideo,videoPlayCount,igPlayCount,videoViewCount,likesCount,commentsCount,timestamp,ownerUsername,videoDuration,dimensionsWidth,dimensionsHeight,caption,isPinned,paidPartnership,musicInfo,error`. TikTok: `webVideoUrl,mediaUrls,playCount,diggCount,commentCount,shareCount,createTimeISO,authorMeta,videoMeta,text,isPinned,isSlideshow,isAd,isSponsored,musicMeta,error`. Write the returned array to `$D/ig.json` / `$D/tt.json` with a heredoc, exactly as returned.
4. **Rank:** pass only the files that exist (an Instagram-only user has no `tt.json`; missing files are skipped and listed in `skipped_missing_files`): `python3 $K/clips.py rank --ig $D/ig.json --tt $D/tt.json --days <lookback_days> --seen /workspace/ai-influencer/seen.csv --top <rank_top> --rank-by <rank_by> --out $D/candidates.json`. This drops pinned posts, ads, slideshows, seen URLs, anything older than the window, and lengths outside 4–30 s. `velocity` = views per hour since posting (fair to fresh posts); each row also carries `outlier` (views ÷ that page's median).
5. **Check in batches until `show_top` pass** (at most 4 batches):
   1. `python3 $K/clips.py fetch --candidates $D/candidates.json --out-dir $D/clips --batch <check_batch>`. Every new download is hashed into `/workspace/ai-influencer/state/scraped-hashes.json` (output `indexed`), so the re-upload guard in make-remake still works after step 8 deletes the files. For Instagram `fetch_error`s (expired links), re-scrape just those reel URLs once per run: `{"username": [<reel urls>], "includeDownloadedVideo": true}` with `--max-usd 0.30` (charged per started MB, about $0.02/MB) → `$D/ig-dl.json`. Then `clips.py fetch ... --refresh $D/ig-dl.json`.
   2. `python3 $K/clip_check.py check <the batch's new_files> --out-dir $D/check > $D/check-<batch n>.json`.
   3. **Single take:** drop `hard_cuts > 0`. For every entry in `possible_cuts`, open its `inspect_frames` (before/after): if the framing, angle or zoom jumps, it's a jump cut, so drop the clip. Jump cuts often score only 0.15–0.3.
   4. **One person:** open each surviving `contact_sheet` (12 frames) and count people in every frame. Keep the clip only if **exactly one person** is visible throughout. Also drop clips where a minor is the main subject, or that contain nudity, violence or dangerous stunts.
   5. Stop once `show_top` clips pass, or when `not_tried_yet` is 0.
6. **Trend cards:** for the passing clips in rank order, write a card in the format of `references/trend-card.md` into `$D/trends.md`. Use only scraped numbers (views, views/hour, outlier); the `music` field feeds the audio idea. Never copy the clip's on-screen text, caption or audio, and never name the person in it.
7. **Record:** `python3 $K/clips.py seen-add --seen /workspace/ai-influencer/seen.csv --status shown --candidates $D/candidates.json --url <url>…` for the cards shown, and `--status rejected --note "<cut|people|content|download>"` for every checked clip that was dropped. Unchecked candidates aren't recorded, so they can come back tomorrow. Append to `/workspace/ai-influencer/log.md`: `<date> · find-clips · <n> scraped, <checked> checked, <shown> shown · Apify $<usage_usd sum>`.
8. **Tidy:** `find /workspace/ai-influencer/trends -path '*/clips/*' -mtime +7 -delete`. Never delete `state/scraped-hashes.json`.

## Check the result
- Every card shown has `hard_cuts == 0`, every possible cut was inspected and ruled out, and the person count of 1 was checked by you.
- The numbers on each card match `candidates.json`.
- Apify spend for the run is ≤ $1.30 (two runs capped at $0.50, plus at most $0.30 of downloads), summed from `usage_usd` in the `apify_run` outputs.
- No card repeats a URL already in `seen.csv`.

## Return
One message: for each passing clip, its contact sheet attached and its trend card. The source link is for the user to watch; nothing is re-uploaded. Then: "Pick one (1/2/3), and say **film** (you act it out in your own space, I swap the character in) or **recreate** (no footage, generated from the character sheet)." If fewer than 3 passed after 4 batches, show what passed and give the counts for why the rest were dropped.

## Needs approval
- Nothing on a normal run: each Apify run is capped below $1 (`--max-usd` / `maxTotalChargeUsd`).
- A run that would need a cap over $1 (more pages, a bigger window) needs a yes with the estimate first.
- Scraped clips are never uploaded, so there's nothing else to approve.

## If nothing is found or a step fails
- No clip passes: send one line, `Nothing new today: <n> scraped, <checked> checked, none was a single take with one person.`, and stop. Never pad with weaker clips.
- `apify_run` fails or a page returns 0 items: retry once, then report the page. The weekly review flags pages that stay empty.
- `APIFY_TOKEN` missing and no plugin: say so and stop.
- Downloads keep failing: list those clips as "not checked (download failed)", never as passed.
