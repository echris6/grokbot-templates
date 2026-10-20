#!/usr/bin/env python3
"""xAI Grok Imagine via the API (for scripted runs; inside chat the Bot can also use its
built-in image tool).

  imagine.py image --prompt "..." [--ref a.png ...] [--n 4] [--aspect 1:1] --out-dir dir/
  imagine.py video --prompt "... <IMAGE_0> ..." [--ref a.png ...] [--duration 6] \
      [--aspect 16:9] [--resolution 720p] [--image first.png] [--last-frame last.png] [--silent] \
      --out clip.mp4

--image pins the first frame (image-to-video); --last-frame pins the last (grok-imagine-video-1.5);
--silent sends generate_audio=false (videos have an audio track by default).

Secret: XAI_API_KEY. Prices (docs.x.ai, 2026-10): grok-imagine-image-2.0 $0.04/image;
grok-imagine-video-1.5 $0.08/s (up to 14 reference images, 720p in reference mode, <= 15 s).
"""
import argparse
import base64
import mimetypes
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _http import download, emit, need_env, poll, request  # noqa: E402

API = "https://api.x.ai/v1"


def auth():
    (key,) = need_env("XAI_API_KEY")
    return {"Authorization": f"Bearer {key}"}


def data_uri(path):
    if path.startswith("http"):
        return path
    ctype = mimetypes.guess_type(path)[0] or "image/png"
    with open(path, "rb") as f:
        return f"data:{ctype};base64,{base64.b64encode(f.read()).decode()}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["image", "video"])
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--ref", action="append", default=[])
    ap.add_argument("--n", type=int, default=1)
    ap.add_argument("--aspect", default=None)
    ap.add_argument("--resolution", default=None)
    ap.add_argument("--duration", type=int, default=6)
    ap.add_argument("--model", default=None)
    ap.add_argument("--out-dir")
    ap.add_argument("--out")
    ap.add_argument("--image", help="first frame for image-to-video")
    ap.add_argument("--last-frame", help="last frame (grok-imagine-video-1.5)")
    ap.add_argument("--silent", action="store_true", help="generate_audio=false")
    ap.add_argument("--consent", action="append", default=[],
                    help="consent record for an image that shows a real person; repeat once per such image. "
                         "Each record's sha256 must match one of the given images")
    ap.add_argument("--refs-no-people", "--refs-generated", dest="refs_no_people", action="store_true",
                    help="affirm no --ref/--image/--last-frame shows an identifiable real person "
                         "(e.g. the AI character sheet, a product UI screenshot, a logo)")
    a = ap.parse_args()
    pinned = [p for p in (a.image, a.last_frame) if p]
    if a.ref or pinned:
        if a.consent:
            from hf_genjutsu import check_consent, sha256
            images = list(a.ref) + pinned
            hashes = {sha256(p): p for p in images if os.path.isfile(p)}
            for rec in a.consent:
                want = next((l.split(":", 2)[-1].strip() for l in open(rec) if l.lower().startswith("clip:")), "")
                if want not in hashes:
                    sys.exit(f"refusing: consent record {rec} matches none of the given images")
                check_consent(rec, hashes[want])
            if not a.refs_no_people and len(a.consent) < len(images):
                sys.exit("refusing: give one --consent per image showing a real person, and add "
                         "--refs-no-people to affirm the remaining images show no one")
        elif not a.refs_no_people:
            sys.exit("refusing: --ref/--image/--last-frame need --refs-no-people (no identifiable real person in "
                     "any image) or --consent <record.md> for images that show real people (_shared/guardrails.md §3)")

    if a.cmd == "image":
        if not a.out_dir:
            sys.exit("image needs --out-dir")
        os.makedirs(a.out_dir, exist_ok=True)
        model = a.model or "grok-imagine-image-2.0"
        if a.ref:  # edit / reference mode: up to 5 inputs, addressed as <IMAGE_0>.. in the prompt
            if len(a.ref) > 5:
                sys.exit("image edits take at most 5 input images")
            b = {"model": model, "prompt": a.prompt, "n": a.n,
                 "images": [{"url": data_uri(p)} for p in a.ref]}
            url = f"{API}/images/edits"
        else:
            b = {"model": model, "prompt": a.prompt, "n": a.n}
            url = f"{API}/images/generations"
        if a.aspect:
            b["aspect_ratio"] = a.aspect
        if a.resolution:
            b["resolution"] = a.resolution
        res = request("POST", url, {**auth()}, b)
        paths = []
        for i, item in enumerate(res.get("data", [])):
            p = os.path.join(a.out_dir, f"img-{i:02d}")
            if item.get("url"):
                download(item["url"], p)
            elif item.get("b64_json"):
                with open(p, "wb") as f:
                    f.write(base64.b64decode(item["b64_json"]))
            else:
                continue
            with open(p, "rb") as f:
                head = f.read(4)
            ext = ".png" if head.startswith(b"\x89PNG") else ".jpg" if head[:2] == b"\xff\xd8" else ".webp"
            os.rename(p, p + ext)
            paths.append(os.path.abspath(p + ext))
        per = {"grok-imagine-image": 0.02, "grok-imagine-image-2.0": 0.04, "grok-imagine-image-quality": 0.05}
        emit({"model": model, "images": paths, "est_usd": round(per.get(model, 0.04) * len(paths), 2),
              "note": "per output image; edits may also bill the input images (docs.x.ai)"})
        return

    if not a.out:
        sys.exit("video needs --out")
    if not 1 <= a.duration <= 15:
        sys.exit("duration must be 1-15 seconds")
    if a.ref and (a.resolution or "720p") not in ("480p", "720p"):
        sys.exit("reference-to-video is capped at 720p")
    model = a.model or "grok-imagine-video-1.5"
    b = {"model": model, "prompt": a.prompt, "duration": a.duration,
         "aspect_ratio": a.aspect or "16:9", "resolution": a.resolution or "720p"}
    if a.ref:
        if len(a.ref) > 14:
            sys.exit("grok-imagine-video-1.5 takes at most 14 reference images")
        b["reference_images"] = [{"url": data_uri(p)} for p in a.ref]
    if a.image:
        b["image"] = {"url": data_uri(a.image)}
    if a.last_frame:
        b["last_frame"] = {"url": data_uri(a.last_frame)}
    if a.silent:
        b["generate_audio"] = False
    sub = request("POST", f"{API}/videos/generations", auth(), b)
    rid = sub["request_id"]
    res = poll(lambda: request("GET", f"{API}/videos/{rid}", auth()),
               done=lambda r: r.get("status") == "done",
               failed=lambda r: r.get("status") in {"failed", "expired"}, first=5, cap=15)
    download(res["video"]["url"], a.out)
    emit({"model": model, "request_id": rid, "out": os.path.abspath(a.out),
          "est_usd": round(0.08 * a.duration, 2)})


if __name__ == "__main__":
    main()
