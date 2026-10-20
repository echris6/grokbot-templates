# Spatial Studio routines

Setup creates all three **paused**, shows the schedule in the user's timezone, and turns each one on only when the user says so. Routines prepare and notify. Approvals from a routine expire after about 10 minutes, so nothing here waits on one.

## 1. Daily prospecting (for the chosen idea)

- **When:** every weekday at 8:00 AM in the user's timezone.
- **Instruction:**

> Run spatial-studio-find-prospects for the idea in config.json (spatial_studio.idea). Then, for the top pick only (up to spatial_studio.samples_per_day), run spatial-studio-build-sample on the Draft tier with no paid generations and no deploys. Post the shortlist table and the sample's pair sheets, plan view and dollhouse in this conversation, then stop. Do not draft or send outreach, create checkout links, deploy anything or spend money; the user asks for those. If nothing qualifies, post one line, "Nothing new today: <reason>", and stop. Never reuse yesterday's results as today's.

- **Cost:** Grok Bot usage for one browse pass, one Draft sample (3 critic reviews) and about 1 minute of local captures. Apify only when the browser comes up short, capped at $1 per run (logged).

## 2. Payment check

- **When:** every day at 9:00 AM and 5:00 PM in the user's timezone. Once a day saves usage.
- **Instruction:**

> Run spatial-studio-check-payments. For each newly paid order, post "Paid: <order> · $<amount>. Ready to build at <tier> tier." Post quotes older than 30 days and paid payments with no matching order as a list. Do not start a paid build, refund, delete or change anything on Whop. If nothing changed, post one line, "Nothing new today: no new payments", and stop.

- **Cost:** Grok Bot usage for one read-only Whop pass. No paid services.

## 3. Weekly new-units watch (clients)

- **When:** every Monday at 10:00 AM in the user's timezone.
- **Instruction:**

> Run spatial-studio-watch-new-units for every client in config.json (spatial_studio.clients). Post the table of new or revised units with plan links and each client's last per-unit price, and prepare a rerun brief per client. Do not draft quotes, create checkout links or email anyone. If there's nothing new, post one line, "Nothing new today: <reason>", and stop.

- **Cost:** Grok Bot usage for one browse pass per client. Apify incremental crawls only when a listing needs it (`onlyCrawlPagesModifiedSince`), capped at $0.50 per client.

## Not routines (on demand only)

Outreach drafts, quotes and checkout links, paid builds and their critic rounds, site deploys and deliveries all need the user in the conversation, so they run only when asked.
