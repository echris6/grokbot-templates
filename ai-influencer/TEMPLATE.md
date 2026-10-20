# AI Influencer: a fictional character that posts daily trends

**What it is:** a Grok Bot that runs an AI-character account with you on Instagram and/or TikTok. You and the Bot design a character that isn't a real person: a strange face, immaculate clothes. Every morning it finds what's going viral on the big repost pages in your niche, and turns the trend you pick into a vertical video of your character. Once the account has an audience, it writes a how-it's-made guide and puts it on a one-page Whop site.

**How a video gets made (two routes):**
- **Film and swap (default):** you act out the trend yourself in one vertical take on your phone. Higgsfield Genjutsu replaces you with the character and keeps the room, the camera and the timing. Gemini Omni is the cheaper option for clips of 10 s or less, outside the EEA/UK/Switzerland.
- **Recreate (no footage):** Grok Imagine generates the clip from the character sheet and a prompt written from the trend.

**Different from the original post, on purpose:** your video is **not** the viral clip with your character pasted into it. It's either **your own take** of the trend (your room, your light, your sound) with you swapped for the character, or a **generated approximation** of the trend. "Keeps everything else the same" means the same as *your* take, not the original clip. That's what the consent rules and the platforms' copyright rules allow.

Viral clips are used as **trend references only**. The Bot studies them on its own computer and never uploads, reposts or copies them. It only uploads footage of you, or of people who signed a release, and keeps a consent record for each upload (Higgsfield's API terms require it).

## The Bot does / you do

| The Bot | You |
|---|---|
| Suggests 5 characters and makes the locked reference sheet | Pick the character |
| Finds and checks the big repost pages in your niche (method, not a list) | Approve the page list |
| Scrapes the last 4 days daily, keeps single takes with one person, shows the top 3 as trend cards | Pick one each day |
| Writes the shot list; swaps the character in (or recreates it); checks the identity against the sheet; retries within your limit | Film a 4–30 s take of yourself (film route); approve each video's cost |
| Writes 3 captions in the character's voice and reminds you about the AI label | **Post it yourself.** The Bot never posts. |
| Tracks followers weekly. At your threshold, writes the guide (PDF) and sets up the Whop product, checkout and one-page site | Read the guide, set the price, approve the page, complete Whop KYC |

## Startup costs (real prices, 2026-10)

| Item | Cost |
|---|---|
| Grok Bot | Included on The X Subscription Premium ($30/mo) and up. Bots draw on the plan's weekly usage pool. |
| Character design | About $0.45 via the xAI API ($0.04/image), or only Grok Bot usage with the built-in image tool |
| Apify scraping | Instagram $0.0026/reel + $0.001/run; TikTok $0.0037/result + add-ons (date filter $0.0013, video download $0.0013), free-plan prices. 5 IG pages × 12 reels ≈ **$0.16/day**; adding 5 TikTok pages ≈ $0.54/day. The free Apify plan includes $5/month of credit. |
| Per video, film and swap, Genjutsu 720p | **$0.681 per second** at list price: a 10 s clip is about **$6.81**, about **$3.40** at the current 50% promo. 480p is $0.318/s ($3.18 for 10 s). |
| Per video, film and swap, Gemini Omni | About $0.10/s: about **$1.00** for 10 s (≤ 10 s clips only) |
| Per video, recreate, Grok Imagine | $0.08/s: **$0.80** for 10 s (≤ 15 s, 720p) |
| Retries | Up to `attempts_per_clip` (default 2) per video, so at most 2× the above, and only with your yes |
| Whop | No upfront fee; 2.7% + $0.30 per domestic card sale; free `<name>.whop.site` address |

Example month, one 10 s video a day, first attempt passes: about **$24** (recreate) / **$30** (Gemini Omni) / **$102–$204** (Genjutsu 720p, promo vs list), plus about $5–$16 of Apify.

**Claimed startup cost** in the original post: "under 30 cents on Apify" (a claim, before any video generation).

## Time to launch

**1–2 weeks** (claim from the original post). Setup and character take about an hour; after that it's about 15–20 minutes a day to pick, film and post.

## Income (claims, not promises)

- The original post claims **$0–$5,000+/month**, almost all of it **after** the audience exists, from selling the how-it's-made guide, plus brand deals and UGC.
- Example accounts named in that post (follower counts as reported there, not checked by us): Jean Phil, 240k followers in under 3 weeks; Archibald Brown, 132k; Benjamin Stachio, 99k. All reportedly started in late September.
- Many accounts never reach an audience. The guide sold on Whop states what it teaches and makes no earnings claims.

## Not included

No meme coin, crypto or token of any kind (Whop prohibits crypto sales). No posting automation. No fake engagement. No logging into your social accounts.
