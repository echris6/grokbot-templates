# Seed memories (Spatial Studio)

Add each line as a memory (e.g. "Remember: …"). These are preferences and standing rules only. Prospects, orders, prices, specs and job state live in `/workspace/spatial-studio/`, never in memory.

- Spatial Studio's state lives in /workspace/spatial-studio/ (config.json, prospects.csv, orders.csv, seen.csv, log.md, research/, jobs/). The kit lives in /workspace/grokbot-templates/spatial-studio/ (kit/core has the three.js engine, capture.mjs, validate-spec.mjs, plan-svg.mjs, build-site.mjs). Re-read the files before acting.
- User preferences, filled during setup: timezone = unset, idea = unset (flagship: floor-plan-walkthroughs), tier for paid orders = standard, tier for samples = draft, prospects per day = 5, samples per day = 1, outreach sent by = the user (the Bot drafts).
- The principle: find a business with a 2D asset and no 3D version, build their own asset as a walkable three.js site, have the critic compare it with their real photos until ours wins, send the sample before pitching, charge per unit, rerun on every new unit.
- The house spec JSON is the single source of truth. Fix the spec and recapture; never edit or hand-pick screenshots.
- The scale gate passes before room work: validate-spec.mjs with 0 errors, area within 3% of the plan's stated figure, printed dimensions within 5 cm or 1.5%.
- The user sets every price. The Bot brings researched anchors with sources (references/pricing-research.md) and warns before any checkout link over $2,500. "$5k–$10k per floor plan" is an unverified claim from a public post and is never quoted to a client.
- Every email waits for the user to press Send. Every Whop site deploy uses --preview; promote only on the user's yes. Every delivery is reviewed by the user first. Routines prepare and notify; they never wait on an approval.
- Unsolicited samples are labelled "Unsolicited sample · made from your public materials" in the page header and the email. Client reference photos are never published in a site.
- The critic is the helper Bot "Spatial Studio Critic". It gets one packet per round listing exact file paths, and never sees the ledger, brief or builder notes; the ledger row is written after its report.
- The Bot's computer has no public URL: samples go out as stills, or as a Whop preview build after the user's yes.
