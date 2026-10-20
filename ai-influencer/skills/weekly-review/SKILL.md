---
name: ai-influencer-weekly-review
description: Optional Sunday summary - videos made, spend by service, follower growth, guide sales if launched, repost pages that went quiet, and one suggestion for next week. Used by the weekly review routine or on "how did this week go?".
---

# Weekly review

## When to use
- The optional **Weekly review** routine, or when the user asks how the week went.
- Not for fixing anything. It reports and suggests; any change waits for the user.

## Inputs and access
- `/workspace/ai-influencer/log.md`, `/workspace/ai-influencer/jobs/*/ledger.md`, `/workspace/ai-influencer/state/followers.csv`, `/workspace/ai-influencer/seen.csv` (has the page in its `owner` column and `shown`/`rejected` status), the raw scrapes `/workspace/ai-influencer/trends/*/ig.json` and `/workspace/ai-influencer/trends/*/tt.json` (every item, before filtering), `/workspace/ai-influencer/config.json`.
- **Whop** plugin, only after launch: `payments_list` for the business, read-only. Use `/workspace/ai-influencer/state/whop-cursor.txt` as the last-seen timestamp (Recipe C in `/workspace/grokbot-templates/_shared/whop.md`).
- No paid calls.

## Steps
1. From the last 7 days of `log.md`: videos finished (pass/fail), attempts per video, and spend split into Apify / Higgsfield / Gemini / xAI, totalled.
2. From `followers.csv`: the latest number per platform and the change over 7 days (or "not recorded this week").
3. If the guide is live: from `payments_list`, sales since the cursor, gross, and refunds. Then update `whop-cursor.txt`. Report numbers only; never contact buyers.
4. Pages: count the last 7 days' raw items per page:
   `jq -r '.[].ownerUsername // empty' $(ls -d /workspace/ai-influencer/trends/*/ | tail -7 | sed 's|$|ig.json|') 2>/dev/null | sort | uniq -c` and the same with `.[].authorMeta.name` on `tt.json`. Count clips shown per page from `seen.csv` (`status == shown`). A configured page with 0 raw items, or with items but nothing shown in 7 days, gets flagged "consider replacing" (method: `/workspace/grokbot-templates/ai-influencer/references/niche-repost-pages.md`).
5. One suggestion, backed by this week's data (e.g. "recreate videos passed the identity check on the first try 4/4 times vs 2/5 for film-and-swap: try more recreates"), labelled as a suggestion.
6. Append to `log.md`: `<date> · weekly-review · <videos> videos · $<spend>`.

## Check the result
- Every number traces to a file line or a Whop payment. Spend totals equal the sum of the log lines.
- No sales section before `guide.published_at`.

## Return
At most 8 lines: videos, spend, followers, sales (if live), flagged pages, one suggestion. Then: "Brand deals: if a brand emails, forward it here and I'll draft a reply; you send it."

## Needs approval
- None. Read-only. Replies to brands, refunds and any change to routines or pages need the user.

## If nothing is found or a step fails
- A quiet week (no videos, no numbers): send one line, "Nothing to review this week: no videos or follower numbers logged.", and stop.
- Whop isn't connected after launch: report the rest and say sales couldn't be read.
