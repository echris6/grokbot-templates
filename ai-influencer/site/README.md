# Guide site (one page on `<slug>.whop.site`)

Two files go into the project that `whop apps init --app_type website` scaffolds. Whop's CLI (0.28.0) runs `@tanstack/cli create --framework React --deployment cloudflare …` and adds the `whop()` Vite plugin, so the project is TanStack Start with file routes in `src/routes/`.

| File here | Goes to | What it is |
|---|---|---|
| `src/routes/index.tsx` | `<project>/src/routes/index.tsx` (replaces the scaffold's "Welcome to TanStack Start" page) | The page. Inline styles, no Tailwind classes needed. |
| `src/site.config.ts` | `<project>/src/site.config.ts` | Every word, the price, the access period and the BUY link. |
| (the hero image) | `<project>/public/hero.jpg` | A still of the character. Vite copies `public/` to `dist/client/`, which Whop serves directly. |

## Steps (the `ai-influencer-launch-guide` skill runs these)

```bash
cd /workspace/ai-influencer/site
whop apps init --app_type website --name "<Character> Guide" --domain <slug>     # --app_type is permanent
P=$(dirname "$(ls -d /workspace/ai-influencer/site/*/whop.app.json | head -1)")   # the folder init created
cp /workspace/grokbot-templates/ai-influencer/site/src/routes/index.tsx "$P/src/routes/index.tsx"
cp /workspace/grokbot-templates/ai-influencer/site/src/site.config.ts   "$P/src/site.config.ts"
mkdir -p "$P/public" && ffmpeg -y -i /workspace/ai-influencer/character/hero.png -vf "scale=900:-2" "$P/public/hero.jpg"
# edit $P/src/site.config.ts: replace CHARACTER_NAME, PRICE, PAGE_COUNT, PURCHASE_URL (no placeholder may remain)
grep -nE "CHARACTER_NAME|PRICE|PAGE_COUNT|PURCHASE_URL" "$P/src/site.config.ts" && echo "placeholders left"
# optional: change the title in $P/src/routes/__root.tsx from "TanStack Start Starter"
cd "$P" && npm install && npm run build      # dist/client + dist/server, packed to dist/whop-build.zip
whop apps deploy --preview                    # show the user the preview; nothing goes live
whop apps builds promote <abld_id>            # only after the user's yes
```

## Tested

On 2026-10-20 this page was dropped into a fresh scaffold made with the same `@tanstack/cli create` flags `@whop/cli` 0.28.0 uses, with `whop()` added to `vite.config.ts`:

- `tsc --noEmit` passed under the scaffold's strict settings.
- `vite build` produced `dist/client` (with `hero.jpg`) and `dist/server`, and the plugin packed `dist/whop-build.zip`.
- `vite preview` served the page. It was checked at 1280 px and 375 px wide.

`whop apps deploy` itself was not run, because it needs a real Whop account.

## Rules for the copy

- The page states what the guide **teaches** and its **access period** ("12 months of access, including updates"). Never "lifetime".
- No follower counts, view counts, income figures or testimonials. The only exception is the account's own current numbers, and only if the user asks for them and they can be checked. Whop requires earnings claims to be substantiated.
- The character is labelled as AI-generated in the FAQ and the footer.
- No logos, clips or screenshots from other creators or repost pages.
