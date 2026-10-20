# Rendering on the Grok Bot computer

HyperFrames turns an HTML composition into an MP4 with headless Chrome and FFmpeg. `_shared/kit/bin/install.sh motion-studio` installs Node 22, FFmpeg and the `hyperframes` CLI globally, runs `hyperframes browser ensure` and checks `hyperframes doctor`. Commands below use the global `hyperframes`; `npx hyperframes …` works the same. This file covers what's different on the Bot's computer: a Linux cloud VM with no GPU.

## The commands

```bash
cd /workspace/motion-studio/jobs/<job-id>/film
hyperframes doctor                 # first run on a fresh computer: Node, FFmpeg, Chrome
hyperframes browser ensure         # if doctor says the bundled Chrome is missing
hyperframes lint                   # fast static check while building
hyperframes check --json           # the gate: lint + runtime + layout + motion + contrast
hyperframes snapshot --at 0,2.5,5,7.5   # stills for a quick look or a storyboard packet
hyperframes render --quality draft --fps 30 --output ../renders/draft-r1.mp4
hyperframes render --quality delivery --fps 60 --output ../renders/<name>-1080p60.mp4
```

- `--quality` takes `draft`, `looks` (default), `delivery` (same as `high`), `standard`, `high`. `--fps` takes 24, 30 or 60.
- Resolution comes from the root's `data-width` / `data-height`. For a 720p Draft sample, set the root to 1280×720 (the starter does this from `sample.config.js`).
- `check` skips the browser when lint has errors and then reports `0 sample(s)`. That means nothing ran, not that it passed. Clear lint errors first.
- Use `--output` every time, so files have stable names.

## No GPU: what to expect

- After a render, read the summary's second line. `beginframe capture` is the fast path. `screenshot capture · software gpu` on Linux is the slow path: BeginFrame didn't run (it needs `chrome-headless-shell`). Run `hyperframes browser ensure` to fetch HyperFrames' pinned Chrome, then `hyperframes doctor` and render again. (Unverified on the Grok Bot computer: whether the pinned build gets BeginFrame there. Record which path ran in the job's `log.md`.)
- **WebGL (three.js) runs in software** on a GPU-less VM. It works, but heavy scenes render slowly. Keep three.js out of Draft samples; on paid orders, keep scenes lean (low poly counts, no per-frame environment rebuilds, a few lights) and render a 3–4 s lab proof before the whole film.
- Lower `--workers` if memory runs short (each worker is a Chrome of about 256 MB).
- If a full 60 fps render is too slow, render 30 fps for critic rounds and 60 fps only for the final.

## Cloud rendering (optional)

HyperFrames can render on HeyGen's cloud (`hyperframes cloud render`, billed in HeyGen credits, needs `hyperframes auth login`), or on your own AWS Lambda or Google Cloud Run. This template doesn't depend on any of them. Mention them to the user only if local renders are too slow, and get a yes for the extra account and cost first.

## Determinism gotchas (from the kit's case studies)

See `product-hero-realism.md` §5 for the full list. The ones that bite most:
- Register `window.__hf.buildReady` early, in the same script that starts a heavy build.
- Freeze `devicePixelRatio` at load; never read it per frame.
- Preload every font weight before laying out type; headless Chrome renders `-apple-system` as Times, so ship a font file with `@font-face`.
- Scan every render for lone black frames (`kit/scripts/qa.sh`).
- `--experimental-fast-capture=false` if a WebGL canvas goes missing at high resolutions.
