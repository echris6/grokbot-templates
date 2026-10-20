# Motion Studio routines

Setup creates both **paused**, shows the schedule in the user's timezone (Settings → Bot → Timezone), and turns each on only when the user says so. Routines prepare and notify: approvals from a routine expire after about 10 minutes, so nothing here waits on one.

## 1. Daily prospects

- **When:** every day at 8:00 AM in the user's timezone.
- **Instruction:**

> For each market in `motion_studio.markets`: run motion-studio-find-launches if it is `software`, otherwise motion-studio-find-businesses for that market in `motion_studio.area`. Then, across all markets, for the top pick only (up to `motion_studio.samples_per_day` in config.json), run motion-studio-make-sample on the Draft tier with no paid generations. Post the shortlist table and the sample video in this conversation, then stop. Do not draft or send outreach, create checkout links or spend money; the user asks for those. If every source fails or nothing passes the filters, post one line, "Nothing new today: <reason>", and stop. Never reuse yesterday's results as today's.

- **Cost:** Grok Bot usage for one browse pass and one Draft sample (one critic review). Apify: about $0.11 for the software fallback, and about $0.16 per local market (40 Google Maps places at about $0.004 each). Both are under the $1 approval line.

## 2. Payment check

- **When:** every day at 9:00 AM and 5:00 PM in the user's timezone. (Twice a day, because a client who pays expects the work to start. Change it to once a day to save usage.)
- **Instruction:**

> Run motion-studio-check-payments. For each newly paid order, post "Paid: <order> · $<amount>. Starting the build at <tier> tier." and start motion-studio-study-references for it. Post quotes older than 30 days and paid payments with no matching order as a list for the user. Do not refund, delete or change anything on Whop. If nothing changed, post one line, "Nothing new today: no new payments", and stop.

- **Cost:** Grok Bot usage for one read-only Whop pass per run. No paid services.

## Not routines (on demand only)

Outreach drafts, checkout links, critic rounds on paid films and deliveries all need the user in the conversation, so they run only when asked.
