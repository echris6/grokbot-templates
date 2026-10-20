#!/usr/bin/env python3
"""Brand colours from a client's public screenshots and logo, plus WCAG contrast for the type pairs.

  palette.py shot1.png shot2.png logo.png ... [--top 8] [--json]

Downscales each image with ffmpeg, buckets pixels (4 bits per channel), merges near buckets and reports the most
common colours with their share. Suggests roles:
  stage  = the most common colour (usually the product's background)
  accent = the most saturated colour with at least 0.5 % share (usually the brand colour)
  ink    = whichever of near-black / near-white / the darkest common colour reads best on the stage
and the WCAG contrast ratio of ink-on-stage and accent-on-stage (AA needs 4.5 for body text, 3.0 for large type).
These are suggestions: confirm against the client's site or logo before building. Needs ffmpeg only.
"""
import argparse
import colorsys
import json
import subprocess
import sys
from collections import Counter


def pixels(path, size=96):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-frames:v", "1", "-vf",
                          f"scale={size}:{size}:force_original_aspect_ratio=decrease", "-f", "rawvideo",
                          "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return [tuple(raw[i:i + 3]) for i in range(0, len(raw) - 2, 3)]


def lum(rgb):
    def ch(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return round((la + 0.05) / (lb + 0.05), 2)


def hexc(rgb):
    return "#%02x%02x%02x" % rgb


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("images", nargs="+")
    ap.add_argument("--top", type=int, default=8)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    buckets, sums = Counter(), {}
    for p in a.images:
        for px in pixels(p):
            k = tuple(c >> 4 for c in px)
            buckets[k] += 1
            s = sums.setdefault(k, [0, 0, 0])
            for i in range(3):
                s[i] += px[i]
    total = sum(buckets.values())
    if not total:
        sys.exit("no pixels read")
    colours = []
    for k, n in buckets.most_common():
        mean = tuple(round(sums[k][i] / n) for i in range(3))
        for c in colours:  # merge near colours
            if sum(abs(mean[i] - c["rgb"][i]) for i in range(3)) < 36:
                c["n"] += n
                break
        else:
            colours.append({"rgb": mean, "n": n})
    colours.sort(key=lambda c: -c["n"])
    for c in colours:
        c["share"] = round(c["n"] / total, 4)
        h, l, s = colorsys.rgb_to_hls(*(v / 255 for v in c["rgb"]))
        c["sat"] = round(s * (1 - abs(2 * l - 1)), 3)
        c["hex"] = hexc(c["rgb"])
    top = colours[:max(a.top, 3)]
    stage = top[0]["rgb"]
    accents = [c for c in colours if c["share"] >= 0.005]
    accent = max(accents, key=lambda c: c["sat"])["rgb"] if accents else top[1]["rgb"]
    candidates = [(12, 12, 14), (250, 250, 250)] + [c["rgb"] for c in top[1:]]
    ink = max(candidates, key=lambda c: contrast(c, stage))
    res = {
        "colours": [{"hex": c["hex"], "share": c["share"], "saturation": c["sat"]} for c in top],
        "suggested": {"stage": hexc(stage), "accent": hexc(accent), "ink": hexc(ink)},
        "contrast": {"ink_on_stage": contrast(ink, stage), "accent_on_stage": contrast(accent, stage)},
        "note": "AA: 4.5 for body text, 3.0 for large type. Confirm colours against the client's own site.",
    }
    if a.json:
        print(json.dumps(res, indent=1))
    else:
        for c in res["colours"]:
            print(f"{c['hex']}  {c['share'] * 100:5.1f} %  sat {c['saturation']}")
        print("suggested:", res["suggested"], "contrast:", res["contrast"])


if __name__ == "__main__":
    main()
