# Portfolio site (Whop website, Recipe A without a product)

A one-page site that shows the studio's three sample films and an "Ask for a quote" button. It sells nothing by itself: every order gets its own checkout link (Recipe B), so no Whop product is needed here.

The `motion-studio-build-portfolio` skill does this. By hand:

```bash
mkdir -p /workspace/motion-studio/site && cd /workspace/motion-studio/site
whop apps init --app_type website --name "<Studio name>" --domain <slug>    # permanent app type; slug only
cd <slug>
ls src/routes                                    # find the index route the scaffold made
cp /workspace/grokbot-templates/motion-studio/site/index.tsx src/routes/index.tsx
cp /workspace/motion-studio/site/portfolio.json src/routes/portfolio.json   # written by the skill
mkdir -p public/videos && cp /workspace/motion-studio/jobs/portfolio-*/delivery/*-web.mp4 /workspace/motion-studio/jobs/portfolio-*/delivery/*.jpg public/videos/
whop apps deploy --preview                       # never without --preview; send the user the preview
whop apps builds promote <abld_id>               # only after the user's yes
```

Notes:
- Unverified until the first real run: the scaffold's route file name and whether it imports JSON as written. If the build fails, read the scaffold's own index route and adapt `index.tsx` to it.
- Keep each web video small (`ffmpeg -i in.mp4 -vf scale=1280:-2 -c:v libx264 -crf 24 -an -movflags +faststart <name>-web.mp4`); Whop's size limits for website assets aren't documented in the pages this kit checked.
- Without a site, the samples still work as email attachments in each pitch; the site only adds one link the user can share.
