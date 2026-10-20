# Motion Studio: promo and launch videos for any business, written as code

**What it is:** a Bot that runs a small video studio for whatever market you pick: software companies launching on Product Hunt, or local and other businesses (solar, roofing and home services, real estate, restaurants, gyms, clinics, ecommerce, B2B, venues, or anything you describe). Most of them have a website but no video. Motion Studio makes that video as code (HTML/GSAP motion, three.js where 3D explains something) and renders it to an MP4. No editing software.

**What it sells:** one video per order, through a Whop checkout link made for that order. For software: launch films (15–30 s), feature announcements (10–15 s) and explainers (30–45 s). For local businesses: how-it-works explainers (e.g. solar panels → inverter → meter), process and quote-request ads, menu and class promos, listing reels, and monthly ad variants. All in 16:9, 1:1 and 9:16. See `references/markets.md`.

**What it does every day**
1. Finds prospects in your markets. Software: Product Hunt launches (its own browser, X search, Apify as a fallback). Every other market: Google Maps businesses in your area that have a website but no video (Apify, about $0.16 per search).
2. Picks the best fit and makes a 10-second sample from their public screenshots, photos and brand colours. For software, their real UI lifts out, their own words type into a command bar, and a cursor clicks and the UI answers. For a local business, their service types into their own quote or booking form and the form answers "Request sent". It's scored with a back-timed bed and UI sounds, and labelled "Unsolicited sample · made from your public materials".
3. Shows you the sample and drafts the pitch email. **You press Send.**
4. Checks Whop for payments on open quotes.

**What it does for each paid order**
1. Collects launch videos in the client's style and studies them frame by frame: cut rhythm, camera speeds, the hero move, type size and timing. That becomes the bar.
2. Storyboards, then builds the film in code from the client's screenshots and brand colours. Stills come from Grok Imagine; a short clip, when a shot needs one, from Grok Imagine video.
3. Renders, then runs a builder-vs-critic loop (the Gauntlet) with a helper Bot, "Motion Studio Critic", that judges the render against the bar and names the single biggest gap each round.
4. Shows **you** every video before the client sees it, then prepares the delivery.

**What stays with you:** choosing prospects, pressing Send, setting every price, approving every video and every paid generation, and talking to clients.

| | |
|---|---|
| **Startup cost** | Well under $1 on Apify to start (about $0.11 per day of fallback scraping). Then Grok Bot usage (most of it in the critic loop), plus Grok Imagine when used: $0.04 per image, $0.08 per second of video |
| **Accounts** | Grok Bot, Whop (free to start; fees per sale), xAI API key for scripted Grok Imagine, Apify (optional, fallback) |
| **Time to launch** | 1–2 weeks |
| **Income** | $500–$6,000+/month. **This is a claim from public posts, not a result we measured or a promise.** |
| **Quality tiers** | Samples on Draft; paid orders on Standard by default; Gauntlet for flagship work (see `quality-tiers.md`) |

**How to start:** make three sample videos for products you like before pitching anyone. The `motion-studio-build-portfolio` skill does that and puts them on a one-page Whop site.

Credits: the craft rules, scripts and lab templates are ported from [motion-video-kit](https://github.com/echris6/motion-video-kit) (MIT). The Gauntlet loop is from somethingbig.ai/gauntlet-loop.
