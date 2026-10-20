#!/usr/bin/env python3
"""Gemini Omni (gemini-omni-1.1-flash): edit an uploaded clip with reference images.

  omni_edit.py --video clip.mp4 --ref sheet.png --consent consent/<clip-id>.md \
      --prompt "In <VIDEO_0>, replace the person with the character from <IMAGE_REF_0>; keep everything else." \
      --out out.mp4 [--aspect 9:16]

Prompt tags (ai.google.dev omni page): <VIDEO_0> is the uploaded source clip to edit; reference
images are <IMAGE_REF_0>, <IMAGE_REF_1>, ... in the order given (zero-based). <VIDEO_REF_n> is
for video *references* and must not be used for the clip being edited.
Consent: same hard rule as hf_genjutsu.py (_shared/guardrails.md §3).

Secret: GEMINI_API_KEY. Needs `pip install google-genai` (install.sh does it).
Limits (ai.google.dev, 2026-10): uploaded clip <= 10 s; editing uploaded video is unavailable
in the EEA, Switzerland and the UK; "certain recognizable people" can't be edited; output
carries a SynthID watermark. About $0.10 per output second at 720p.
The preview id gemini-omni-flash-preview is scheduled for shutdown (Google changelog); use the GA id.
"""
import argparse
import os
import re
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _http import emit, need_env  # noqa: E402

MODEL = "gemini-omni-1.1-flash"


def seconds(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", path], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def wait_active(client, f):
    while getattr(f.state, "name", f.state) == "PROCESSING":
        time.sleep(5)
        f = client.files.get(name=f.name)
    if getattr(f.state, "name", f.state) == "FAILED":
        sys.exit(f"Gemini file processing failed for {f.name}")
    return f


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--ref", action="append", default=[])
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--aspect", default="9:16", choices=["9:16", "16:9"])
    ap.add_argument("--resolution", default="720p", choices=["360p", "720p", "1080p", "4k"])
    ap.add_argument("--out", required=True)
    ap.add_argument("--consent")
    a = ap.parse_args()

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from hf_genjutsu import check_consent
    check_consent(a.consent, a.video)
    if "<VIDEO_0>" not in a.prompt:
        sys.exit("prompt must refer to the source clip as <VIDEO_0>")
    used = {int(n) for n in re.findall(r"<IMAGE_REF_(\d+)>", a.prompt)}
    if a.ref and not used:
        sys.exit("prompt must refer to the reference images as <IMAGE_REF_0>, <IMAGE_REF_1>, ...")
    if any(n >= len(a.ref) for n in used):
        sys.exit(f"prompt refers to <IMAGE_REF_{max(used)}> but only {len(a.ref)} --ref given")

    secs = seconds(a.video)
    if secs > 10.0:
        sys.exit(f"clip is {secs:.1f}s; Gemini Omni edits uploaded clips of 10 s or less. Trim it first "
                 f"(ffmpeg -i in.mp4 -t 10 -c copy trimmed.mp4)")
    (key,) = need_env("GEMINI_API_KEY")
    try:
        from google import genai
    except ImportError:
        sys.exit("google-genai is not installed; run install.sh ai-influencer")
    client = genai.Client(api_key=key)

    video = wait_active(client, client.files.upload(file=a.video))
    parts = [{"type": "video", "uri": video.uri}]
    for p in a.ref:
        ref = wait_active(client, client.files.upload(file=p))
        parts.append({"type": "image", "uri": ref.uri})
    parts.append({"type": "text", "text": a.prompt})

    it = client.interactions.create(
        model=MODEL, input=parts,
        response_format={"type": "video", "aspect_ratio": a.aspect,
                         "resolution": a.resolution, "delivery": "uri"})
    out_video = it.output_video
    name = "files/" + out_video.uri.split("/")[-1].split(":")[0]
    while True:
        info = client.files.get(name=name)
        state = getattr(info.state, "name", info.state)
        if state == "ACTIVE":
            break
        if state == "FAILED":
            sys.exit("Gemini Omni generation failed")
        time.sleep(5)
    client.files.download(file=out_video.uri, destination=a.out)
    emit({"interaction_id": it.id, "out": os.path.abspath(a.out), "input_seconds": round(secs, 2),
          "model": MODEL,
          "est_usd_720p": round(0.10 * min(secs, 10), 2),
          "note": "about $0.10 per output second at 720p (5,792 tokens/s at $17.50/1M); "
                  "check ai.google.dev pricing for other resolutions"})


if __name__ == "__main__":
    main()
