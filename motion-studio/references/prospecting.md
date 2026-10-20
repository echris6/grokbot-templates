# Prospecting: finding launches that need a film

Checked 2026-10-20. Re-check the parts marked **unverified** when the first daily run happens.

## Who is a good prospect

A software product that is about to launch (or just launched) and:
- has **no launch video** on its Product Hunt page or site (the actor's `videoUrls` is empty, or there's no video in the gallery);
- has **at least 3 public screenshots** (Product Hunt gallery, its own site) and a visible brand colour or logo;
- is a real product with a website, not a "coming soon" email capture with nothing to show;
- has a public contact route (a contact email on its own site, or a maker's public profile). Product Hunt itself never publishes emails.

Skip: crypto/meme coins, gambling, adult, anything the guardrails or Whop's rules exclude, and anything already in `/workspace/motion-studio/seen.csv`.

## Sources, in order

### 1. The Bot's own browser: Product Hunt upcoming / coming-soon pages (primary)

**No Apify actor covers Product Hunt's upcoming launches**, so the Bot visits producthunt.com itself, read-only, at a polite rate (one page load every few seconds, no logins).

- **Unverified: where the upcoming list lives.** On 2026-10-20, a plain fetch of `producthunt.com/coming-soon` returned the homepage and `producthunt.com/upcoming` returned 404. Individual products scheduled to launch can still show a "launching soon" / "notify me" state on their `producthunt.com/products/<slug>` page. During setup, the Bot opens producthunt.com in its browser, looks for an upcoming / coming-soon section, and saves the working URL in `config.json` as `motion_studio.ph_upcoming_url` (or `null` if there isn't one).
- **Blocked pages.** Some services flag datacenter IP addresses, and Product Hunt refuses most datacenter IPs (an Apify actor's own docs say so). If pages fail to load or show a challenge, the user can turn on **Settings → Computer → Route traffic through this computer** in the Grok Bot desktop app, so the browser uses their desktop's network. It only works while that desktop is on, and an Enterprise admin can disable it. Never try to get past a CAPTCHA; ask the user to take over or skip the source.
- `robots.txt` (2026-10-20) blocks `/search`, `/my/`, login and comment/review query URLs, but not product or leaderboard pages. Stay off the blocked paths.

### 2. X search (built in, read-only)

Grok Bot can search public X posts without connecting an account. Makers announce launches there: search the last 48 hours for phrases like `"launching on Product Hunt"`, `"live on Product Hunt"`, `"we launch tomorrow" producthunt`, `"coming soon" producthunt.com/products`. Keep posts that link a product page or a site. Read-only: never follow, like, reply or DM.

### 3. Today's launches through Apify (fallback, costs cents)

Actor **`maximedupre~product-hunt-scraper`** ("Product Hunt Scraper for Launches"; most-used Product Hunt actor in the Store snapshot, 124 users in 30 days, build 2.1.1 of 2026-10-20).

- Pricing (pay per event): **$0.0018 per saved launch**, plus $0.0018 per launch where a public email was found on its website (only with `shouldScrapeWebsite`). 30 launches with website scraping ≈ **$0.11** at most.
- Input (verified against the actor's input schema):

```json
{
  "target": "daily",
  "maxNbItemsToScrape": 30,
  "shouldIncludePromotedListings": false,
  "shouldScrapeOnlyFeaturedLaunches": false,
  "shouldScrapeWebsite": true
}
```

  Leaving `startDate`/`endDate` blank scrapes today's California-time leaderboard. `target` is the only required field.
- Output fields used: `name`, `url` (Product Hunt), `tagline`, `description`, `categories`, `launchDate`, `imageUrls`, `videoUrls`, `website`, `team`, `xAccountHandle`, `upvotesCount`, `dayRank`.
- Run it with the **Apify** plugin when connected, otherwise `/workspace/bin/apify_run maximedupre~product-hunt-scraper --input in.json --out items.json --max-usd 0.25`.

Other Product Hunt actors seen (not used by default): `scrapesage~product-hunt-scraper` ($0.004/launch, has a `monitorMode` that returns only new launches), `danpoletaev~product-hunt-scraper` (free, top launches of a day), `fatihtahta~…`, `memo23~…`, `parseforge~…` (pricier per result).

### Not used: the official Product Hunt API

The GraphQL API v2 (`https://api.producthunt.com/v2/api/graphql`, developer token) exists, but its docs state: **"The Product Hunt API must not be used for commercial purposes."** Business use needs permission from hello@producthunt.com. Motion Studio is commercial, so it doesn't use the API unless the user gets that permission in writing.

## Writing it down

Every prospect found goes to `/workspace/motion-studio/prospects.csv` (`id, name, url, source, found_at, status, sample_path, notes`) with status `found`, and its website domain is appended to `seen.csv` so it is never shown twice.
