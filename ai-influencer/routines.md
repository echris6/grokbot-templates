# Routines (AI Influencer)

A known Grok Bot bug: routines in a template may not materialize on import. The setup skill creates each one below **paused**, shows the schedule and timezone (Settings → Bot → Timezone), and enables it only when the user says so. Approvals given during an unattended run expire after about 10 minutes, so every routine **prepares and notifies**. None of them generates video, publishes or spends beyond the capped Apify runs. Each run spends Grok Bot weekly usage, so schedules stay daily or weekly.

| Routine | Schedule (default) | Instruction to give the Bot |
|---|---|---|
| **Daily trend scout** | Every day at 8:00 AM (`ai_influencer.daily_time`) | "Run the ai-influencer-find-clips skill. Post today's top 3 trend cards in this chat with their contact sheets. Only run the Apify scrapes capped by the skill, with /workspace/bin/apify_run (each ≤ $0.50, downloads ≤ $0.30). Do not generate any video, upload any clip or spend anything else. If nothing passes the filters, post one line: 'Nothing new today: <reason>'. If a source fails, report it instead of using old data." |
| **Weekly milestone check** | Mondays at 9:00 AM | "Run the ai-influencer-check-milestone skill. If follower_source is 'ask', ask me for my follower counts and stop. If the threshold is passed, tell me and wait for 'make the guide'; don't start it yourself. Pause this routine once the guide is published." |
| **Weekly review** (optional) | Sundays at 6:00 PM | "Run the ai-influencer-weekly-review skill and post at most 8 lines here. Read-only: no spending, no messages to anyone else." |

## Test before enabling

Use **Test** on each routine once. A test does real work: the scout spends its capped Apify amount (well under $1). Check that it:

- read the current config and pages
- produced cards whose numbers match `candidates.json`
- stopped without generating video
- said plainly when something failed

## When the user wants more

- Two scouts a day (e.g. 8 AM and 6 PM): fine, but say it doubles Apify spend and Grok Bot usage.
- Hourly schedules: advise against. They burn a week of usage fast, and repost pages don't post that often.
