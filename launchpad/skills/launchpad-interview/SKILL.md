---
name: launchpad-interview
description: Interview the user and recommend which business template (AI Influencer, Motion Studio, Spatial Studio) fits them, with a first-week plan. Use when someone asks which AI business to start or opens Launchpad.
---

# Launchpad interview

## When to use
- The user opens Launchpad, or asks "which business should I start", "what fits me", or "help me pick a template".
- Not for running a business. Once they've picked, they install that template and its own setup takes over.

## Inputs and access
- Catalog: `/workspace/grokbot-templates/launchpad/references/catalog.md`. If the kit isn't cloned, use the catalog saved in memory. Don't clone just for this.
- Saves: `/workspace/launchpad/answers.json` (create the folder if needed).
- No plugins and no secrets.

## Steps
1. Say what this is in one line: "A few questions, then I'll recommend one of three business templates and tell you honestly what it takes."
2. Ask one question at a time, offering choices plus "other":
   1. What are you already good at, or do for work? (design / video / software / real estate or construction / retail or ecommerce / social media / sales / other)
   2. Do you already reach people? (social following + platform + size / clients or industry contacts / no)
   3. Monthly budget for tools and AI generations? (under $50 / $50–200 / $200+)
   4. Hours per week? (under 5 / 5–15 / 15+)
   5. How do you feel about outreach, i.e. emailing businesses that didn't ask? (fine / OK if the Bot drafts it / rather not)
   6. Which sounds most fun? (making a character people follow / making launch videos for startups / making 3D spaces and products people can explore)
   7. Optional, only if two templates are tied: anything you already have to sell to, such as a client list, an industry, or an audience?
3. Score each template with the "Signals to match on" table: +2 for a strong signal, +1 for a weak one, −2 for a dealbreaker (e.g. "rather not" outreach counts against Motion and Spatial). Note the reasons.
4. Recommend:
   - **Top pick:** template + a specific direction, e.g. "Spatial Studio → remodel previews for kitchen contractors, because you already work in renovations".
   - **Two alternatives:** one line each on why they come second.
   - **Honest costs:** startup cost and time to launch from the catalog. Income only as "public posts claim …".
   - **The hard part:** one sentence on what will be hard for this person specifically.
   - **First week:** 5 bullets.
   - **Install:** the template link from the catalog.
5. Save the answers and the recommendation to `/workspace/launchpad/answers.json`.

## Check the result
- Every recommendation cites at least one of the user's own answers.
- No numbers that aren't in the catalog. Income is labelled as a claim.
- If a dealbreaker applies to the top pick (e.g. "rather not" outreach and Motion Studio), you either picked something else or said so explicitly.

## Return
A single message: top pick (bold), two alternatives, costs, the hard part, a first-week checklist, and the install link.

## Needs approval
Nothing. Launchpad takes no actions outside this chat.

## If nothing is found or a step fails
- If none of the three fits (e.g. under 5 hours a week, no budget, no outreach, and no audience), say so and suggest the smallest version of the closest template.
- If the catalog file is missing, use the memory copy and say the links may be out of date.
