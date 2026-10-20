# Grok Imagine for Motion Studio

Checked against docs.x.ai on 2026-10-20. Most of a Motion Studio film is code: the product's UI, the type, the 3D. Grok Imagine fills the gaps code can't, such as an atmospheric backdrop, a texture, a lifestyle still, or one short establishing clip. Every generation is a paid call, so the Bot states the cost and asks once per job (`_shared/guardrails.md` §1).

## Models and prices

| Use | Model | Price | Limits that matter |
|---|---|---|---|
| Still images, backdrops, textures | `grok-imagine-image-2.0` | $0.04 / image | Edits take up to 5 input images, addressed as `<IMAGE_0>`… in the prompt |
| Video clips | **`grok-imagine-video-1.5`** (the only video model this template uses) | **$0.08 / second** | 1–15 s; text-to-video and image-to-video up to native 1080p; reference mode up to 14 images, 15 s, **720p** |

A 4 s clip costs $0.32, and three tries at it cost about $1. Say so before asking.

## How to call it

The kit shim (from `_shared/kit/bin/imagine.py`, secret `XAI_API_KEY`). Every call that sends an image needs a people flag: `--refs-no-people` (alias `--refs-generated`) when no input image shows an identifiable real person, or `--consent <record.md>` when one does (`_shared/guardrails.md` §3). Without it the script refuses.

```bash
J=/workspace/motion-studio/jobs/<id>
# 1. a still (text only, no input image, no flag needed)
/workspace/bin/imagine image --prompt "..." --n 2 --aspect 16:9 --out-dir $J/assets/gen/
# 2. animate the approved still: it becomes the exact first frame (image-to-video, native 1080p), silent
/workspace/bin/imagine video --prompt "slow 25 cm dolly in, preserve the exact geometry, no morphing" \
  --image $J/assets/gen/img-00.png --refs-no-people --silent --duration 4 --resolution 1080p --out $J/assets/gen/clip-01.mp4
# 3. optional: also pin the last frame
#    ... --image first.png --last-frame last.png --refs-no-people --silent ...
```

- **Image-to-video from an approved generated still is the default.** It keeps the composition you approved and can be native 1080p. Reference mode (`--ref`, up to 14 images) is 720p and only frames the style; use it rarely.
- **Client screenshots and logos** contain no people, so the flag technically allows them. Use them as `--ref` only on a paid order, with the client's OK to send their material to xAI, and only to match a backdrop's look. Never to regenerate their UI. Unsolicited samples make no paid generations at all.
- Inside chat, the Bot may also use its own built-in image tool for stills. Log those in the generation ledger the same way.

## Rules

- **Key frame first, then motion.** Generate and approve the still, then animate it. Prompt like a production brief: lens, light, exposure ("bright, airy, nothing crushed to black"), negative space reserved for type, and "no text, no logos, no people, no watermark".
- **Short, restrained clips:** 3–5 s with one small camera move ("a steady dolly, about 25 cm of travel, preserve the exact geometry, no morphing").
- **Never generate the product's UI.** Screens are rebuilt as code from the client's screenshots. A generated screen invents features, and that breaks the "nothing invented" rule.
- **No real people's faces**, no client logos or competitor logos in prompts.
- **No generated audio.** Pass `--silent` (`generate_audio: false`). For an old clip that has a soundtrack, strip it (`ffmpeg -i in.mp4 -an -c:v copy out.mp4`), so the film's music and effects stay in charge.
- **Reject warped geometry** and regenerate rather than hiding it. Two failed tries on one shot: build the shot in code instead.
- **Ledger.** Append every call to `/workspace/motion-studio/jobs/<id>/generations.md`: model, prompt, refs, seconds, cost, request id, accepted window, kept or rejected.
- **Label.** A film with realistic AI footage says so wherever the platform asks for an AI label.
