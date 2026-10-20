#!/usr/bin/env python3
"""Higgsfield Genjutsu: swap the main character in a clip, keeping the rest of the shot.

Uses object-swap (keeps the original shot). Motion-transfer rebuilds the scene from the
references, so it is not used for remakes.

  hf_genjutsu.py estimate --video clip.mp4 [--seconds 10] [--resolution 720p]
  hf_genjutsu.py swap --video clip.mp4 --ref sheet.png [--ref face.png ...] \
      --consent /workspace/ai-influencer/consent/<clip-id>.md \
      [--prompt "Replace the person in the grey hoodie with the character"] \
      [--resolution 720p] --out out.mp4

Consent (hard rule, _shared/guardrails.md §3): every identifiable real person in the clip must
have a consent record (basis: self / signed release / licensed stock). Higgsfield API terms §6.2
require it. The script refuses to run without a readable --consent file that names a basis.

Secrets: HF_API_KEY_ID, HF_API_KEY_SECRET.
Limits (docs.higgsfield.ai, 2026-10): source 4-30 s (longer is trimmed to 30 s), at least
409,600 px per frame (e.g. 720x576; 720x1280 is fine), 1-8 reference images, jpeg/png/webp/mp4.
"""
import argparse
import mimetypes
import os
import subprocess
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _http import download, emit, need_env, poll, request  # noqa: E402

API = "https://api.higgsfield.ai"
ENDPOINT = "higgsfield/genjutsu/object-swap/v1.0"


def auth():
    key_id, secret = need_env("HF_API_KEY_ID", "HF_API_KEY_SECRET")
    return {"Authorization": f"Key {key_id}:{secret}"}


def probe(path):
    """Return (seconds, width, height) with ffprobe, so bad inputs fail before any spend."""
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height:format=duration", "-of", "csv=p=0:s=,", path],
        capture_output=True, text=True, check=True).stdout.split()
    w, h = (int(x) for x in out[0].split(",")[:2])
    return float(out[-1]), w, h


def check_video(path):
    secs, w, h = probe(path)
    problems = []
    if secs < 4:
        problems.append(f"clip is {secs:.1f}s; Genjutsu needs at least 4s")
    if w * h < 409_600:
        problems.append(f"frame is {w}x{h} ({w*h} px); needs at least 409,600 px. Upscale first")
    if problems:
        sys.exit("; ".join(problems))
    return min(secs, 30.0), w, h


def upload(path):
    ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
    slot = request("POST", f"{API}/files/generate-upload-url", auth(), {"content_type": ctype})
    with open(path, "rb") as f:
        request("PUT", slot["upload_url"], slot.get("upload_headers", {}), raw=f.read(), timeout=600)
    return slot["public_url"]


CONSENT_BASES = {"self", "signed release", "licensed stock"}


def sha256(path):
    import hashlib
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(1 << 20):
            h.update(chunk)
    return h.hexdigest()


def check_consent(path, media=None):
    """A consent record is a small markdown file with exact `key: value` lines:
         clip: sha256:<hex of the exact file being uploaded>
         people: <who appears, e.g. "the account owner">
         basis: self | signed release | licensed stock
         confirmed_by_user: "<the user's own words, quoted from chat>"
       Write one with: consent_record.py --media <file> --people ... --basis ... --quote ...
    """
    if not path or not os.path.isfile(path):
        sys.exit("refusing: --consent <record.md> is required (see _shared/guardrails.md §3). "
                 "Never upload footage of an identifiable person without a consent record.")
    fields = {}
    for line in open(path):
        if ":" in line:
            k, v = line.split(":", 1)
            fields[k.strip().lower()] = v.strip()
    basis = fields.get("basis", "").lower()
    if basis not in CONSENT_BASES:
        sys.exit(f"refusing: {path}: 'basis' must be exactly one of {sorted(CONSENT_BASES)}")
    if not fields.get("people"):
        sys.exit(f"refusing: {path}: 'people' (who appears) is required")
    if not fields.get("confirmed_by_user", "").strip('"\' '):
        sys.exit(f"refusing: {path}: 'confirmed_by_user' must quote the user's own words")
    if media:
        want = fields.get("clip", "").removeprefix("sha256:").strip()
        if want != sha256(media):
            sys.exit(f"refusing: {path} is for a different file (clip sha256 does not match {media})")


def body(video_url, ref_urls, prompt, resolution):
    b = {"video_url": video_url, "image_urls": ref_urls, "resolution": resolution}
    if prompt:
        b["prompt"] = prompt
    return b


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["estimate", "swap"])
    ap.add_argument("--video", required=True)
    ap.add_argument("--ref", action="append", default=[])
    ap.add_argument("--prompt", default="")
    ap.add_argument("--resolution", default="720p", choices=["480p", "720p", "1080p"])
    ap.add_argument("--out")
    ap.add_argument("--consent")
    a = ap.parse_args()

    secs, w, h = check_video(a.video)
    if a.cmd == "estimate":
        # The estimate endpoint wants real URLs; a placeholder body is enough for a price check
        # only if the account accepts it. Fall back to the published list price.
        list_price = {"480p": 0.318, "720p": 0.681, "1080p": 1.632}[a.resolution]
        # The estimate endpoint takes the same body as the generation. Placeholder URLs are used
        # because nothing is uploaded for a price check; if the API rejects them, fall back to the
        # published list price. Auth errors are NOT swallowed: a bad key should surface now.
        est = {}
        if os.environ.get("HF_API_KEY_ID") and os.environ.get("HF_API_KEY_SECRET"):
            try:
                est = request("POST", f"{API}/estimate/{ENDPOINT}", auth(),
                              body("https://example.com/in.mp4", ["https://example.com/ref.png"],
                                   a.prompt, a.resolution))
            except SystemExit as e:
                if "HTTP 401" in str(e) or "HTTP 403" in str(e):
                    raise
                est = {}
        emit({"seconds_billed": int(-(-secs // 1)), "resolution": a.resolution, "frame": f"{w}x{h}",
              "estimate_api": est or None,
              "list_price_usd": round(list_price * int(-(-secs // 1)), 2),
              "note": "list price per second of input video, rounded up; promotions may lower it"})
        return

    if not a.ref or not a.out:
        sys.exit("swap needs at least one --ref and --out")
    check_consent(a.consent, a.video)
    if len(a.ref) > 8:
        sys.exit("Genjutsu takes at most 8 reference images")
    video_url = upload(a.video)
    ref_urls = [upload(p) for p in a.ref]
    headers = {**auth(), "Idempotency-Key": str(uuid.uuid4())}
    sub = request("POST", f"{API}/{ENDPOINT}", headers, body(video_url, ref_urls, a.prompt, a.resolution))
    rid = sub["request_id"]
    status_url = sub.get("status_url", f"{API}/requests/{rid}/status")
    res = poll(lambda: request("GET", status_url, auth()),
               done=lambda r: r.get("status") == "completed",
               failed=lambda r: r.get("status") in {"failed", "nsfw", "canceled"})
    download(res["video"]["url"], a.out)
    emit({"request_id": rid, "out": os.path.abspath(a.out), "seconds_billed": int(-(-secs // 1)),
          "resolution": a.resolution})


if __name__ == "__main__":
    main()
