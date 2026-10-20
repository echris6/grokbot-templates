# The Spatial Studio menu: 11 three.js businesses, one principle

Checked 2026-10-20.

## The shared principle

Every idea here is the same business with a different buyer:

1. **Find a business that has a 2D asset but no 3D version.** A floor plan with no model home, a unit-type PDF with no tour, a product with only flat photos.
2. **Build *their* asset as an interactive three.js site.** It has to be to scale and match their real photos. It's never a generic demo.
3. **Have a critic compare ours with their real photos until ours wins.** The helper Bot "Spatial Studio Critic" compares each screenshot with the matching photo and names the biggest gap. The builder fixes that gap only, and the loop repeats (`_shared/gauntlet.md`, `references/critic-criteria.md`).
4. **Send the sample before pitching.** The prospect sees their own plan or product working before anyone asks for money. It's labelled "Unsolicited sample · made from your public materials".
5. **Charge per unit**: per plan, per unit type, per product, per layout.
6. **Rerun on every new unit.** When a new plan or product appears, `spatial-studio-watch-new-units` finds it and the client gets a quote.

## The menu

"Kit fit" says how much of the job the kit at `/workspace/grokbot-templates/spatial-studio/kit/core/` does today:
- **ready:** the house-spec engine covers it. You write a spec, then validate, capture and package it.
- **ready with custom scene:** the walkthrough page, capture and packaging work, but the Bot writes a custom three.js scene module for the object itself (`references/realism.md`).
- **kit gap:** it needs an engine addition that doesn't exist yet. The idea file says what's missing.

| # | Slug | Buyer | Their 2D asset | What we build | Kit fit |
|---|---|---|---|---|---|
| 1 | [floor-plan-walkthroughs](floor-plan-walkthroughs.md) **(flagship)** | Home builders (sales / marketing lead) | Floor-plan images or PDFs + model-home or rendering photos | Walkable house, to scale, every room, finishes matched to photos | ready |
| 2 | [unit-type-tours](unit-type-tours.md) | Apartment operators, property managers | Unit-type floor plans (studio, 1BR, 2BR) + a few unit photos | One walkable tour per unit type | ready |
| 3 | [adu-configurators](adu-configurators.md) | Modular / ADU / tiny-home builders | Model plans + option sheets (finishes, layouts) | Walkable model with switchable finish and layout options | ready (tours) / kit gap (option switching UI) |
| 4 | [remodel-previews](remodel-previews.md) | Kitchen and bath contractors | Measured sketch + "before" photos + chosen finishes | Before/after walkable room | ready |
| 5 | [backyard-pool-designs](backyard-pool-designs.md) | Landscape and pool builders | 2D site / pool plan + yard photos | Walkable yard with pool, deck, planting | kit gap (terrain, water, planting) |
| 6 | [product-configurators](product-configurators.md) | DTC furniture, bike, sneaker brands | Product photos, spec sheet, colourways | Orbitable product with colour/material switcher | ready with custom scene |
| 7 | [venue-layout-planners](venue-layout-planners.md) | Wedding and event venues | Room diagram / capacity chart + room photos | Walkable hall with swappable table layouts | ready (room) + custom scene (layout presets) |
| 8 | [office-fitout-tours](office-fitout-tours.md) | CRE brokers and landlords | Suite floor plans, test-fit plans + building photos | Walkable fitted-out suite | ready |
| 9 | [trade-show-booths](trade-show-booths.md) | Booth builders and exhibitors | Booth drawings / renderings + brand assets | Orbit + walk booth preview | ready with custom scene |
| 10 | [retail-buildout-previews](retail-buildout-previews.md) | Franchise brands, restaurant buildout firms | Prototype store plan + photos of open locations | Walkable prototype store | ready |
| 11 | [landing-heroes](landing-heroes.md) | Startups (founder / growth lead) | Product screenshots, logo, brand colours | An interactive 3D hero section for their landing page | ready with custom scene |

## Matching a user to 3 ideas (setup interview)

`spatial-studio-setup` runs the interview (`_shared/setup.md` step 3), then `spatial-studio-match-idea` scores every idea against the answers. Score each factor 0–2 and add them up (12 max).

| Factor | 0 | 1 | 2 |
|---|---|---|---|
| **Background / trade match**: does the user's work touch this buyer's world? | No link | Adjacent (e.g. real-estate photographer → apartments) | Direct (e.g. ex-builder, architect, drafter → floor plans) |
| **Existing network**: do they already know buyers? | Nobody | A few loose contacts | Current clients or colleagues in that trade |
| **Outreach comfort**: will they send cold emails? | Won't | Will send a few a week | Comfortable sending daily |
| **Budget fit**: monthly tools + generation budget vs. the idea's needs | Idea needs paid crawls or imagery they can't afford | Fits with care | Easily fits (Apify crawls are cents to a few dollars) |
| **Hours fit**: the idea's per-unit build effort vs. their hours/week | Units too big for their hours | Tight | Comfortable |
| **3D comfort**: can they judge a 3D scene and talk about it? | Never used 3D | Has looked at 3D tours / games | Uses SketchUp, Blender, CAD, or three.js |

Per-idea weights:
- **Ideas 5 (pools), 6 (products), 9 (booths), 11 (heroes)** need custom scenes. Halve their score unless 3D comfort = 2. Idea 5 is also a kit gap, so show it only when the user's trade is landscape or pools.
- **Hours fit:** a whole house (1, 3, 10) is larger than a unit type (2), a single room (4) or one product (6). Score hours against that.

Tie-breakers, in order:
1. **Floor-plan walkthroughs** (the flagship) wins ties. It's the most complete kit path and the clearest "your own plan, already built" pitch.
2. Prefer the idea with a **direct rerun trigger** (new plans, new unit types, new products). Recurring revenue beats one-offs.
3. Prefer the idea whose prospects publish **public photos** (the critic needs a bar).

Present the top 3 as a table (idea, why it fits them in one line, kit fit, what the first sample would be), with floor plans included unless it scored 0 on trade match **and** network. Save the pick in `config.json` → `spatial_studio.idea`, and the other two in `spatial_studio.alternates`. The user can switch any time with `spatial-studio-match-idea`.
