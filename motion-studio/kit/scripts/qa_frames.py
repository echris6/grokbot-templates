#!/usr/bin/env python3
"""Per-frame QA at the render's native frame rate: lone black frames and one-frame pops.

  qa_frames.py film.mp4 [--cuts 2.5,5.0,7.5] [--black 18] [--pop 6] [--json]

- Black: a lone frame that is much darker than both neighbours AND than the film's own typical luma (a NaN, a dip
  into a bore, a texture that wasn't loaded). The threshold is relative: min(--black, 45 % of the film's median luma),
  so a dark-brand film (stage #08090a) still gets a meaningful check instead of 300 "near-black" frames.
- Pops: frames whose difference from the previous frame is a lone spike: over --pop and over 3x both neighbours'
  differences. A hard cut is also a lone spike, so pass the storyboard's cut times with --cuts and they are
  reported as cuts instead. A ramp over several frames is motion, not a pop (product-hero-realism.md).
Exit code 1 when any lone black frame or unplanned pop is found. Needs ffmpeg/ffprobe only (no Python packages).
"""
import argparse
import json
import re
import subprocess
import sys


def series(path, vf):
    """Return [(t, YAVG)] for every output frame of a filter chain."""
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-an", "-vf",
         vf + ",metadata=print:key=lavfi.signalstats.YAVG:file=-", "-f", "null", "-"],
        capture_output=True, text=True, check=True).stdout
    rows, t = [], None
    for line in out.splitlines():
        m = re.search(r"pts_time:([0-9.]+)", line)
        if m:
            t = float(m.group(1))
            continue
        m = re.search(r"YAVG=([0-9.]+)", line)
        if m and t is not None:
            rows.append((t, float(m.group(1))))
    return rows


def fps_of(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=avg_frame_rate", "-of", "csv=p=0", path],
                       capture_output=True, text=True, check=True).stdout.strip()
    n, d = (r.split("/") + ["1"])[:2]
    return float(n) / float(d or 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("film")
    ap.add_argument("--cuts", default="", help="planned cut times in seconds, comma separated")
    ap.add_argument("--black", type=float, default=18.0)
    ap.add_argument("--pop", type=float, default=6.0)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    fps = fps_of(a.film)
    frame = 1.0 / fps
    cuts = [float(c) for c in a.cuts.split(",") if c.strip()]
    luma = series(a.film, "scale=320:-2,format=gray,signalstats")
    diff = series(a.film, "scale=320:-2,format=gray,tblend=all_mode=difference,signalstats")

    ys = sorted(y for _, y in luma)
    median = ys[len(ys) // 2] if ys else 0.0
    black = min(a.black, 0.45 * median) if median else a.black
    dark_stage = median < 2.5 * a.black
    lone_black, dark = [], 0
    for i, (t, y) in enumerate(luma):
        if y < black:
            dark += 1
        prev_y = luma[i - 1][1] if i > 0 else 255
        next_y = luma[i + 1][1] if i + 1 < len(luma) else 255
        # a lone drop: darker than the threshold, or (on a dark stage) less than half of both neighbours
        drop = y < black or (dark_stage and y < 0.5 * min(prev_y, next_y) and min(prev_y, next_y) - y > 4)
        if drop and prev_y > y + 4 and next_y > y + 4:
            lone_black.append(round(t, 3))

    pops, planned = [], []
    for i, (t, d) in enumerate(diff):
        prev_d = diff[i - 1][1] if i > 0 else 0.0
        next_d = diff[i + 1][1] if i + 1 < len(diff) else 0.0
        if d > a.pop and d > 3 * max(prev_d, 0.5) and d > 3 * max(next_d, 0.5):
            near_cut = any(abs(t - c) <= 1.5 * frame for c in cuts)
            (planned if near_cut else pops).append({"t": round(t, 3), "diff": round(d, 2)})

    res = {"film": a.film, "fps": round(fps, 3), "frames": len(luma), "median_luma": round(median, 1),
           "black_threshold": round(black, 1), "dark_stage": dark_stage,
           "near_black_frames": dark, "lone_black_frames": lone_black,
           "unplanned_pops": pops, "planned_cuts_seen": planned,
           "ok": not lone_black and not pops}
    if a.json:
        print(json.dumps(res, indent=1))
    else:
        print(f"frames {res['frames']} at {res['fps']} fps")
        if dark_stage:
            print(f"note: dark stage (median luma {median:.0f}); black frames are judged relative to it")
        print(f"black threshold {black:.1f} (median luma {median:.0f}); frames under it: {dark}; "
              f"lone black frames: {lone_black or 'none'}")
        print("unplanned one-frame pops: " + (", ".join(f"{p['t']}s (diff {p['diff']})" for p in pops) or "none"))
        print("planned cuts seen: " + (", ".join(f"{p['t']}s" for p in planned) or "none"))
        print("QA FRAMES OK" if res["ok"] else "QA FRAMES: CHECK THE TIMES ABOVE (look at +/-5 frames before fixing)")
    sys.exit(0 if res["ok"] else 1)


if __name__ == "__main__":
    main()
