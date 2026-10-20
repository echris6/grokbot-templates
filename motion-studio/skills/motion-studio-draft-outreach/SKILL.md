---
name: motion-studio-draft-outreach
description: Draft a short, honest pitch email to a prospect with their labelled sample video, in the Bot's own email or a Gmail draft, for the user to review and send. Use when the user says "pitch them", "draft the email" or "send the sample" for a prospect whose sample is ready.
---

# Draft outreach

## When to use
- A prospect has `status = sample_ready` and the user has watched the sample and asks for a pitch.
- Also for one polite follow-up, 4–6 days after a pitch with no reply, if the user asks.
- Not before the user has seen the sample. Not for clients who already replied (answer their email instead). Never from a routine without the user present.

## Inputs and access
- `/workspace/motion-studio/prospects.csv` row, `jobs/<id>/brief.md` (facts and sources), `jobs/<id>/delivery/<slug>-sample-720p.mp4`.
- `config.json` → `motion_studio.outreach_from` (`bot-email` or `gmail`), the user's name and studio name if given, `portfolio.site_slug` if live.
- The Bot's `@mail.grokbot.com` address, or the **Gmail** plugin if the user connected it.

## Steps
1. **Find the contact** on the prospect's own site: a published contact or founder email, or their contact form. Product Hunt never publishes emails; for local businesses, use the email on their site or their contact form (never phone them). If the only route is a form or an X DM, prepare the text and hand it to the user; the Bot doesn't submit forms or send DMs.
2. **Write the email** (under 120 words, plain text, no tracking, no attachments other than the sample):
   - Subject: `<Product> launch film: a 10 s sample` (software), or `A 10-second video for <Business>` (every other market)
   - Line 1: what you made and why, **true for this prospect's `source` and launch date** (`prospects.csv`):
     - `ph-upcoming` / `x` with a launch date still ahead: "You're launching on <date>; I made a 10-second sample from your public screenshots."
     - launched today (`apify-daily`, or the date is today): "Congrats on today's launch. I made a 10-second sample from your public screenshots."
     - launched earlier: "I made a 10-second sample of <product> from your public screenshots", pitched for their next feature announcement. Never imply a launch that already happened is still coming.
     - `gmaps:<market>` (local and other businesses): "I made a 10-second video for <Business> from your website, the kind you can run as an ad or put on your homepage." No launch language. Line 2 offers the pilot from `references/markets.md` (a 20–30 s film + 2 hooks + 16:9 and 9:16), and monthly variants if they run ads.
   - Line 2: what the full film would be (length, aspects; "delivered before launch day" only when the launch is ahead).
   - Line 3: the ask ("Want a quote for the full film?"). No price unless the user set one for this pitch.
   - Footer: the user's name and studio, and the line "Unsolicited sample · made from your public materials. Reply 'no thanks' and I won't write again."
   - Never: invented results, view or revenue claims, the template's income figures, "we've worked with" names, urgency tricks.
3. **Attach** the sample if it's under 10 MB (Bot email limit per attachment); otherwise link the portfolio page if live.
4. **Create the draft:** Bot email draft (the user sees it with **Send**), or a Gmail draft (Send / Discard card). Grok Bot sends first-contact email from the Bot's address to one recipient per message, with a one-click unsubscribe link.
5. **Log:** note the draft in the prospect's `notes` ("draft <date>"). After the user says they sent it, set `status = pitched`.

## Check the result
- One recipient, a real address found on their own site today, and the source URL noted.
- Every claim in the email is a fact from `brief.md` or about the user's own offer. The opener matches the launch date: no "you're launching" for a product that already launched.
- The sample label line is present. The attachment opens and is the user-approved file.

## Return
The draft card (recipient, subject, body, attachment) and one line: "Press Send when you're happy, or tell me what to change."

## Needs approval
- Sending: always the user, by pressing **Send**. The Bot never sends, never submits forms and never DMs.
- A price in the email only if the user gave it for this prospect.

## If nothing is found or a step fails
- No public contact: say "No public contact for <product>: <what you checked>" and suggest the X post or form text for the user to send themselves.
- The prospect asked not to be contacted, or already replied "no": set `status = lost` and don't draft.
- Draft creation fails: show the email text in chat so the user can send it from their own client.
