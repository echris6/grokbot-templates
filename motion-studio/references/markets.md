# Markets: who Motion Studio can sell to

Every video is code: HTML/GSAP motion, three.js where 3D explains something, type drawn on canvas. So the same studio works for any business with a website, photos and something to explain. The user picks one or more markets in setup (`motion_studio.markets`) and can change them any time ("add solar", "only restaurants").

Software launches are one market. Everything else is found through `motion-studio-find-businesses` (Google Maps + their websites) instead of Product Hunt.

| Market (`id`) | What to sell them | Sample is built from | Good prospect | Watch out for |
|---|---|---|---|---|
| **Software launches** (`software`) | Launch film, feature announcement, explainer | Product UI screenshots | About to launch, no video (`motion-studio-find-launches`) | No invented metrics |
| **Solar** (`solar`) | How-it-works explainer (panels → inverter → meter), install-process story, quote-request ad | Site photos of installs (no people), logo, their service list, quote form | Website + reviews, no video on the homepage | **No savings, payback or incentive numbers** unless copied verbatim from their site with its URL. Incentives change by state and year |
| **Roofing & home services** (`home-services`: roofing, HVAC, plumbing, electrical, remodeling, landscaping, pest, cleaning) | Process explainer ("what happens at your inspection"), objection-handling clip, quote follow-up, monthly ad variants | Project photos, services, service area, quote/booking page | 4★+ with 20+ reviews, a website without video | No invented jobs, warranties or "licensed & insured" unless on their site |
| **Real estate & property** (`property`: agents, brokerages, apartment operators, property managers) | Listing reels, amenity videos, floor-plan explainer, lease-up ads | Listing photos, floor plans, amenities list | Active listings, multi-property operators | Use only photos they publish; prices and availability must be current |
| **Restaurants, cafés & bars** (`food`) | Menu/special ad, new-location or event promo, 9:16 story clips | Menu, dish photos, logo, hours, order-online link | Recent reviews, an online-order or booking link | No health or "best in town" claims they don't make themselves |
| **Gyms, studios & coaches** (`fitness`) | Class-schedule promo, new-member offer, program explainer | Schedule, pricing page, studio photos (no identifiable people without consent) | Booking page, an active Instagram | No body-transformation or results claims |
| **Clinics, dental & med spas** (`clinics`) | Treatment explainer, "what to expect" visit walkthrough, booking ad | Services page, booking flow, logo | Booking page, good reviews | **No medical outcome claims.** Explain the process only. Before/after photos never, unless the client supplies them with patient consent |
| **Ecommerce & DTC brands** (`ecommerce`) | Product demo, feature animation, ad-hook variants, product-page clip | Product photos, PDP copy, variants | Shopify store, many SKUs, no product video | No invented reviews or sales numbers |
| **B2B & industrial** (`b2b`: manufacturers, logistics, agencies, SaaS services) | How-it-works explainer, capability reel, trade-show loop | Site diagrams, product/spec sheets, case-study text | Website with a complex offer, no explainer | Specs copied verbatim |
| **Events & venues** (`events`) | Venue tour, event promo, ticket-sale countdown | Venue photos, floor layout, event page | Upcoming events, ticket links | Dates and prices must be current |
| **Local services, other** (`local-other`: salons, auto, vets, schools, law and accounting firms…) | Service explainer, booking promo, "meet the business" reel | Website, Google Business photos, logo | Website, reviews, no video | Law, finance and health: process only, no outcomes or advice |
| **Custom** (`custom:<description>`) | Whatever the user describes | Their public materials | The user's own definition | Same rules |

## How the sample changes for non-software businesses

The starter's mechanics map onto any business:

| Starter beat | Software | Local / other business |
|---|---|---|
| Shot 1: the hero | Product UI screenshot | Their homepage or best project photo (no people) |
| Shot 2: something happens | Fact typed into a command bar, the cursor clicks, the UI answers | Their service typed into their own quote/booking form ("Solar install · 3-bed home"), the cursor clicks **Get a quote** / **Book**, and the form answers with a check ("Request sent") |
| Shot 3: the fan | 3 product screens | 3 project, dish, listing or service photos from their site |
| End card | "Launching <date>" / their CTA | Their phone, URL or button text, verbatim |

Facts are still **verbatim from their site** with the URL. A Grok Imagine still can fill a gap (e.g. an abstract energy-flow background for solar). It's labelled AI-generated in the brief and never presented as their real work, product or customer.

## Price anchors (public listings, 2026-09; re-check before quoting)

Roof Lens: 10 short videos for $1,500/month from client footage. Soona: $455 per 15–30 s product video plus a studio fee. A $150 property-reel add-on. A $7,500 custom roofing film including filming. The motion-video-kit's `business-offers.md` has the sources. **The Bot never sets prices.** It shows these anchors and asks the user.

## Pilot offer for local businesses

One 20–30 s film + two opening hooks + two aspect ratios (16:9 and 9:16), one revision round, from the client's own photos and facts. Monthly variants (new hooks, seasonal offers) are a natural retainer: sell them as a separate Whop checkout per month.
