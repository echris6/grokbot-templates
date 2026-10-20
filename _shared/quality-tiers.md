# Quality tiers

The builder-and-critic loop (`gauntlet.md`) is where most of the usage goes. A tier sets how hard the loop pushes. The user chooses a tier per job; it is saved in `/workspace/<template>/config.json` as `tier.default` and `tier.samples`.

| | **Draft** | **Standard** | **Gauntlet** |
|---|---|---|---|
| Use for | Prospecting samples, tests | Most paid orders | Flagship work, high-ticket clients |
| References studied | 3, from the kit's notes | 5, with contact sheets | 10, measured frame by frame |
| Isolated component labs | None | The hero element only | Every element |
| Critic rounds (cap) | 1 review, no verify | Up to 3 + 1 verify | Until it meets the bar, cap 8 + verify |
| Blind test vs reference | No | No | Yes |
| "Wow gate" (every 3 s window must be a yes) | No | No | Yes |
| Render | 720p, 30 fps | Iterations at 720p/30; **final at 1080p/60**, with frozen-frame, pop, black-frame and loudness QA at 60 fps | 1080p/60 for every round, plus measured QA |
| Rough usage, relative | 1× | about 3–4× | about 10×, up to the cap |

Defaults: `tier.samples = draft`, `tier.default = standard`. Samples always run on Draft unless the user changes that setting on purpose. Paid orders never fall below Standard without the user agreeing.

## Rules for every tier

1. **Cap first.** Before starting, the Bot writes the round cap into the job's ledger.
2. **Stop early.** Stop when the critic's top gap is cosmetic: sub-frame, under 2 px, or a matter of taste the brief doesn't cover. The Gauntlet has no fixed final round.
3. **Ask before going past the cap.** At the cap the Bot shows the critic's remaining top 3 and asks: ship, or run N more rounds?
4. **Report the cost.** Every delivery says how many rounds ran, the verdict of each, and what changed.

## The AI Influencer exception

AI Influencer has no builder loop. Its quality setting is `attempts_per_clip` (1–3, default 2): the number of paid regenerations allowed when the identity check fails. This costs video credits, not Grok Bot usage.
