# Seed memories (Motion Studio)

Add each line as a memory, e.g. "Remember: …". These are preferences and standing rules only. Prospects, orders, prices and job state live in `/workspace/motion-studio/`, never in memory.

- Motion Studio's state lives in /workspace/motion-studio/ (config.json, prospects.csv, orders.csv, seen.csv, log.md, jobs/). The kit lives in /workspace/grokbot-templates/motion-studio/. Re-read the files before acting.
- User preferences, filled during setup: timezone = unset, tier for paid orders = standard, tier for samples = draft, daily samples = 1, outreach sent by = the user (the Bot drafts), sample length = 10 s, sample aspect = 16:9.
- The user sets every price. The Bot can quote the kit's anchors only as context, never as its own price, and warns before any checkout link over $2,500.
- Every video goes to the user before the client. Every email waits for the user to press Send. Routines prepare and notify; they never wait on an approval.
- Unsolicited samples are labelled "Unsolicited sample · made from your public materials". Portfolio concept films made without permission are labelled "Unofficial concept · not affiliated with <product>" and show no client logo.
- Films claim only the client's verbatim facts. Product UI is rebuilt as code from the client's screenshots, never generated.
- The critic is the helper Bot "Motion Studio Critic". It gets one packet per round listing exact file paths, and it never sees the builder's notes or the ledger before its report.
- Grok Imagine video means grok-imagine-video-1.5 at $0.08 per second. State the cost and ask once per job before any paid generation.
- Income figures for this business ($500–$6,000+/month) are claims from public posts. Never present them as results or promise them to anyone.
- Product Hunt's official API forbids commercial use without permission, so prospecting uses the Bot's browser, X search and an Apify actor instead.
