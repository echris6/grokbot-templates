#!/usr/bin/env python3
"""Blind test (Gauntlet tier): can a critic tell our frames from the reference film's?

  blind-test.py make   --ours ours.mp4 --ref reference.mp4 --out-dir <round>/blind [--n 6] [--seed N]
  blind-test.py reveal --ours ours.mp4 --ref reference.mp4 --out-dir <round>/blind --seed N      (after the report)
  blind-test.py score  --ours ours.mp4 --ref reference.mp4 --seed N --report <round>/critic.md  (after the report)

make: takes N evenly spaced frames from each film (skipping the first and last 8 %), scales both sets to 1280 px wide
and passes every frame through the SAME JPEG round trip, so encode and colour differences are not a tell
(product-hero-realism.md: "blind tests on encoded frames only"). Shuffles them as A01.png ... with a seeded shuffle.
**It writes no mapping file** (_shared/gauntlet.md): it prints the seed. The Lead puts the seed in its own message to
the user ("blind seed: 4821") and keeps it out of every file the critic can open. The same seed reproduces the
mapping later.
reveal: writes <out-dir>/mapping.md. Run it only after the critic's report has landed.
score: rebuilds the mapping from the seed, reads the critic's report (each Axx with "reference" or "ours"/"new" on the
same line) and prints the score. 9 or more correct out of 12 = the critic can tell; we aren't done. Needs ffmpeg only.
"""
import argparse
import json
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile


def duration(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                                capture_output=True, text=True, check=True).stdout.strip())


def plan(ours, ref, n, seed):
    """The shuffled list of (name, label, source, t). Deterministic for a given seed and pair of films."""
    items = []
    for src, label in ((ours, "ours"), (ref, "reference")):
        dur = duration(src)
        for i in range(n):
            items.append((label, src, round(dur * (0.08 + 0.84 * (i + 0.5) / n), 3)))
    random.Random(seed).shuffle(items)
    return [(f"A{k:02d}", *it) for k, it in enumerate(items, 1)]


def grab(path, t, out_png, tmp):
    jpg = os.path.join(tmp, "rt.jpg")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", path, "-frames:v", "1",
                    "-vf", "scale=1280:-2:flags=lanczos", "-q:v", "4", jpg], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", jpg, out_png], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["make", "reveal", "score"])
    ap.add_argument("--ours", required=True)
    ap.add_argument("--ref", required=True)
    ap.add_argument("--out-dir")
    ap.add_argument("--n", type=int, default=6)
    ap.add_argument("--seed", type=int)
    ap.add_argument("--report")
    a = ap.parse_args()
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found; run install.sh motion-studio")

    if a.cmd == "make":
        if not a.out_dir:
            sys.exit("make needs --out-dir")
        seed = a.seed if a.seed is not None else random.SystemRandom().randint(1000, 9999)
        os.makedirs(a.out_dir, exist_ok=True)
        if any(f.startswith("mapping") for f in os.listdir(a.out_dir)):
            sys.exit("out-dir already holds a mapping file; use a fresh round folder")
        rows = plan(a.ours, a.ref, a.n, seed)
        with tempfile.TemporaryDirectory() as tmp:
            for name, _label, src, t in rows:
                grab(src, t, os.path.join(a.out_dir, name + ".png"), tmp)
        print(json.dumps({"frames": [os.path.join(os.path.abspath(a.out_dir), r[0] + ".png") for r in rows],
                          "seed": seed, "note": "keep the seed out of every file until the critic's report lands"},
                         indent=1))
        return

    if a.seed is None:
        sys.exit(f"{a.cmd} needs --seed")
    rows = plan(a.ours, a.ref, a.n, a.seed)
    if a.cmd == "reveal":
        if not a.out_dir:
            sys.exit("reveal needs --out-dir")
        with open(os.path.join(a.out_dir, "mapping.md"), "w") as f:
            f.write(f"# Blind test mapping (seed {a.seed}), written after the critic's report\n\n| Frame | Source | Time s |\n|---|---|---|\n")
            for name, label, src, t in rows:
                f.write(f"| {name} | {label} ({os.path.basename(src)}) | {t} |\n")
        print(os.path.join(os.path.abspath(a.out_dir), "mapping.md"))
        return

    if not a.report:
        sys.exit("score needs --report")
    calls = {}
    for line in open(a.report, encoding="utf-8", errors="replace"):
        low = line.lower()
        has_ref = "reference" in low
        has_ours = re.search(r"\b(ours|new)\b", low) is not None
        if has_ref == has_ours:
            continue
        for m in re.finditer(r"\bA(\d{2})\b", line):
            calls.setdefault("A" + m.group(1), "reference" if has_ref else "ours")
    right = sum(1 for name, label, _s, _t in rows if calls.get(name) == label)
    total = len(rows)
    can_tell = right >= 9 if total == 12 else right > total * 0.7
    print(json.dumps({"correct": right, "of": total, "unanswered": [r[0] for r in rows if r[0] not in calls],
                      "verdict": "critic CAN tell (not done)" if can_tell else "critic could not tell (pass)"},
                     indent=1))


if __name__ == "__main__":
    main()
