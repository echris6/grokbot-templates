# Delivery: Whop-hosted walkthrough or a zip

Checked 2026-10-20 against Whop's developer docs ("Build a Website with the CLI", "Hosting") and `@whop/cli` 0.28.0.

## What the client gets

1. **The walkthrough** at a URL (Whop-hosted) and/or as a zip they host themselves:
   - Walk mode: WASD and mouse look, with collision against walls.
   - Dollhouse view, plan view with a 1 m grid, and the room list.
   - On phones: tap-to-jump rooms and drag to look.
2. **Stills:** every viewpoint at 1920×1200 (`capture.mjs --width 1920 --height 1200`), plus the plan view and the dollhouse.
3. **The A/B sheets** (`ab-pairs.mjs`), so they see the photo next to ours.
4. **The delivery note:** the scale checks and area match (from `validation.json`), the ledger (rounds, verdicts, what changed), and `limits.md` ("what we couldn't match").

## Package

```bash
cd /workspace/grokbot-templates/spatial-studio/kit/core
J=/workspace/spatial-studio/jobs/<job-id>
node validate-spec.mjs $J/house.json --json $J/validation.json          # must PASS
node capture.mjs --spec $J/house.json --out $J/delivery/stills --width 1920 --height 1200
node build-site.mjs --spec $J/house.json --out $J/delivery/site --zip [--index yes]
```
`build-site.mjs` writes:
- `dist/client/`: the static site (about 2.3 MB, mostly three.js), with `house.json` and any textures. Reference photos are **never** copied in.
- `whop-app/`: a minimal Vite project (`public/tour/` = the site; `index.html` redirects to `/tour/`), with `vite.config.js` using `whop()` and `build.outDir = dist/client`.
- `<slug>.zip`: the static site for self-hosting.

Pages carry `noindex` unless you pass `--index yes`. Use `yes` only when the client asks for search indexing.

## Path A: Whop website (preferred when the user wants a URL)

Verified locally: `vite build` in `whop-app/` runs, and the `whop()` plugin packs a **client-only** build (no `dist/server`) into `dist/whop-build.zip`. The plugin's code handles "no server entry". **Unverified:** that Whop's hosting accepts and serves a client-only archive. Check it on the first deploy with `--preview`.

```bash
mkdir -p /workspace/spatial-studio/site && cd /workspace/spatial-studio/site
# once per client site: permanent app type; a slug only (a full domain may trigger a purchase link)
whop apps init --app_type website --name "<Client> 3D plans" --domain <slug>     # → ./<slug>, live at <slug>.whop.site later
cd <slug>
```
Then **either**:
- **A1 (keep Whop's scaffold, safest):** copy `delivery/site/dist/client/*` into the scaffold's `public/tour/`, and make the index route redirect to `/tour/` (or render a full-screen `<iframe src="/tour/index.html">`). The scaffold's build already works with Whop.
- **A2 (our minimal project):** copy `delivery/site/whop-app/*` over the scaffold, keeping its `whop.app.json`. Then `npm install`.

Deploy for review, never straight live:
```bash
whop apps deploy --preview --format json      # NEVER without --preview: plain deploy goes live at once
# send the user the preview build; only after their explicit yes:
whop apps builds promote <abld_id>
```
One app can hold many plans: put each plan in its own folder (`public/<plan-slug>/`) with an index page that lists them. Re-deploy for new plans (the watch-new-units routine prepares the build; the user approves the promote).

**Hosting limits:** the docs fetched on 2026-10-20 state no size limit for static assets. **Unverified:** keep each plan's folder small (no 4K textures; crop texture images to 1024 px).

## Path B: zip (the client hosts it)

Send `<slug>.zip`. Any static host works: their own web server, Netlify, S3. It must be served over HTTP; opening `index.html` from disk won't load ES modules. To embed it on their site: `<iframe src="https://<their-host>/<folder>/index.html" style="width:100%;aspect-ratio:16/10;border:0" allowfullscreen></iframe>`.

## Attachments and links

The Bot's email allows 10 attachments, 10 MB each, 25 MB total (Grok Bot help docs, per motion-studio's notes). The zip and stills usually fit. If not, share the Whop preview URL plus a file link from the user's own storage.

## Approvals (always)

- The user reviews the site (a local preview: `node serve.mjs --spec $J/house.json`, then open it in the Bot's browser and take screenshots) and the stills **before** anything goes to the client.
- `whop apps init` with a new domain, `deploy --preview` and `builds promote` are Whop writes, so each one needs the user's yes in the conversation. The Auto-review "Ask first" rules back this up.
- The client email is a draft. The user presses Send.
