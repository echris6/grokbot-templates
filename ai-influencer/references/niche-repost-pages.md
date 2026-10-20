# Finding the big repost pages in a niche

A repost page collects the best clips in one niche (gym, cooking, office humour, dating, cars …) from many creators. Their reels and TikToks give a daily, pre-filtered feed of what is working right now. This template does **not** ship a list of handles: pages change hands, get banned and rename themselves, and nobody here has checked a list for your niche. The Bot finds and checks them with the method below, and the user approves the list.

## 1. Collect candidates (free or near free)

- Ask the user which pages they already watch in the niche. This is the best source.
- Search on Instagram and TikTok for `<niche> memes`, `<niche> clips`, `<niche> daily`, `<niche>tok`, and the niche's slang. Note accounts whose grid is all other people's clips with credits in the captions ("🎥: @…", "via @…", "credit: …").
- Apify, Instagram (about $0.0027 per result on the free plan): `apify~instagram-scraper` with `{"search": "<niche> memes", "searchType": "user", "searchLimit": 10, "resultsType": "details"}`. Confirm the run returns profiles with `followersCount`; if the search mode returns something else, use the profile URLs with `directUrls` and `resultsType: "details"` instead.
- Apify, TikTok (about $0.0037 per result, plus add-ons): `clockworks~tiktok-scraper` with `{"searchQueries": ["<niche> clips"], "searchSection": "/user", "maxProfilesPerQuery": 10}`. Profile results carry `authorMeta.fans`.

Discovery searches return a handful of profiles, so the **Apify plugin** is fine here (the Bot reads the results in chat). Keep each run under $0.50 with `maxTotalChargeUsd` (TikTok's actor needs at least $0.50 as its cap).

## 2. Check each candidate (one cheap scrape)

Scrape each candidate's last 7 days with `/workspace/bin/apify_run <actor> --input <file> --out <file> --max-usd 0.50`, which writes the items to disk: `apify~instagram-reel-scraper` with `{"username": ["<page>"], "resultsLimit": 12, "onlyPostsNewerThan": "7 days", "skipPinnedPosts": true}`, or `clockworks~tiktok-scraper` with `{"profiles": ["<page>"], "resultsPerPage": 12, "profileSorting": "latest", "oldestPostDateUnified": "7 days", "excludePinnedPosts": true}` (the actor's pattern needs the unit; a bare `"7"` fails). Then keep pages that:

| Check | Keep if |
|---|---|
| Posts per week | ≥ 5 (fresh clips every day) |
| Median views per clip | ≥ 50,000 (IG `videoPlayCount`; `videoViewCount` is deprecated / TikTok `playCount`) |
| Mostly reposts | Most captions credit another creator |
| Single-person clips | At least a few of the last 12 are one person, one take: the kind the user can film |
| Niche fit | The clips match the chosen direction and the character's angle |
| Clean | No adult content, no violence, no minors as the main subject |

## 3. Save the list

Show the user a table (page, platform, followers, posts/week, median views, why it fits). Save the approved handles to `/workspace/ai-influencer/config.json` → `ai_influencer.repost_pages.instagram[]` / `.tiktok[]`. Aim for 5–10 pages. More pages mean more clips per run, and Apify bills per result.

Re-check the list monthly (the weekly review flags pages that returned nothing for 7 days).
