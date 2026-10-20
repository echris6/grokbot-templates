---
name: spatial-studio-draft-outreach
description: Draft the first email to a prospect that leads with their own unit already built (stills or a preview link), labelled as an unsolicited sample, to their published contact - the user reviews and presses Send. Also drafts the one allowed follow-up. Use after build-sample, or when the user says "pitch them".
---

# Draft outreach

## When to use
- A prospect is `sample_ready` and the user says "pitch them" or "draft the email".
- A follow-up 5–7 days after `pitched` with no reply, only when the user asks.
- Not for replies from interested prospects (`spatial-studio-take-order`), and never to send anything.

## Inputs and access
- `/workspace/spatial-studio/prospects.csv` (contact route, unit) and the job folder `jobs/ss-sample-…/` (stills, `limits.md`, `validation.json`).
- `/workspace/grokbot-templates/spatial-studio/references/outreach.md` (rules and email shape) and `references/ideas/<idea>.md` (nouns, sample scope).
- The Bot's own email address (Connect apps → Email), or the **Gmail** connector if the user connected it (drafts only).

## Steps
1. Re-read the prospect row and check the contact route is one the business published itself (contact page or public email). If there's no email, draft the text for their contact form and give it to the user to paste. Never guess an address.
2. Pick the attachments: at most 3 stills (two rooms plus the plan view), each under 1 MB. Re-encode if needed: `ffmpeg -i x.png -q:v 4 x.jpg`. Or one preview link if the user approved a preview deploy. Not both a big zip and a link.
3. Write the email in the shape in `outreach.md` (≤ 120 words, plain text): their plan name, area and beds/baths from *their* page, 1–2 finishes we matched, "unsolicited sample made from your public materials", "what I couldn't match is listed on the page" (true, from `limits.md`), and one line offering the rest of the catalog. No price, no claims, no testimonials. Sign with the user's name from `config.json`.
4. Save it to `jobs/<id>/outreach/email-1.md` (subject, to, body, attachment paths). Create the draft in the Bot's email (or a Gmail draft) **without sending**.
5. Tell the user it's ready. After they say they sent it: `prospects.csv` → `pitched`, plus a note with the date. Append a `log.md` line.
6. **Follow-up** (only when asked, once, 5–7 days later): 2–3 lines, with a new still or the link again. Save it as `email-2.md`. Draft only.

## Check the result
- The recipient is the business's own published contact. There's exactly one recipient, and the label sentence is present.
- Every fact in the email (plan name, sq ft, beds) matches their page. Every finish claimed as matched has a critic report saying so.
- No price and no income or results claims.

## Return
The draft in full (subject, to, body) plus the attachment thumbnails, and "It's in your drafts. Press Send when you're happy."

## Needs approval
- **Sending:** always the user. The Bot never sends.
- A Whop preview deploy for a link: the user's yes first.

## If nothing is found or a step fails
- No public contact route: tell the user, set the prospect's `notes` to "no contact route", and suggest the next prospect.
- The email connector isn't set up: put the full text in the chat for the user to paste, and say so.
- The prospect replied "not interested" or asked not to be contacted: set it to `lost`, never draft again, and keep the domain in `seen.csv`.
