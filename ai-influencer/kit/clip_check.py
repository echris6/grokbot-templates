#!/usr/bin/env python3
"""AI Influencer clip tools (stdlib + ffmpeg/ffprobe only).

  clip_check.py check  CLIP.mp4 [CLIP2.mp4 ...] --out-dir DIR [--threshold 0.4] [--soft 0.12] [--frames 12]
      Probe each clip, count hard cuts (ffmpeg scene score), and write a contact sheet plus
      single frames for the Bot to look at. Used twice: on scraped trend clips (local analysis
      only, never uploaded anywhere) and on the user's own footage before a swap.
  clip_check.py prep   --video IN.mp4 --model genjutsu|gemini-omni --out OUT.mp4
                       [--start S] [--end E] [--crop W:H:X:Y] [--resolution 720p]
      Trim, crop, upscale to Genjutsu's 409,600 px minimum, re-encode, and price the job.
      Only for footage with a consent record (the user's own clip, a signed release, licensed stock).
  clip_check.py compare [--source SRC.mp4] --video OUT.mp4 --ref SHEET.png --out-dir DIR
      identity.jpg (reference sheet beside output frames) and ab.jpg (the user's footage above
      the swapped output at the same timestamps; skipped without --source), plus duration/size/audio checks.
  clip_check.py index CLIP.mp4 [...] [--index /workspace/ai-influencer/state/scraped-hashes.json]
      Store scraped clips' frame hashes (full + centre 80%). clips.py fetch calls this, so the
      guard below keeps working after the 7-day clip deletion.
  clip_check.py match --video TAKE.mp4 [--index ...] [--against '/workspace/ai-influencer/trends/*/clips/*.mp4']
      Guard: exits 3 if the "own take" is one of the scraped clips (same file, or re-encoded,
      trimmed, sped-up, mirrored, band/centre-cropped or letterboxed copies). Run before any
      consent record.
  clip_check.py remux-audio --video OUT.mp4 --audio-from SRC.mp4 --out FINAL.mp4
      Put the user's own clip audio back on a swapped clip that came back silent.

Every command prints one JSON object. Nothing here calls a paid API.
"""
import argparse
import datetime as dt
import glob
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile

GENJUTSU_MIN_PX = 409_600          # docs.higgsfield.ai, object-swap usage notes
GENJUTSU_SECONDS = (4.0, 30.0)     # shorter fails; longer is trimmed to 30 s by Higgsfield
OMNI_MAX_SECONDS = 10.0            # ai.google.dev, Gemini Omni limitations (uploaded clips)
GENJUTSU_USD_PER_S = {"480p": 0.318, "720p": 0.681, "1080p": 1.632}   # list price, input seconds rounded up
OMNI_USD_PER_S = 0.10              # approximate, 720p output


def run(cmd, check=True):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if check and p.returncode != 0:
        sys.exit(f"command failed: {' '.join(cmd[:4])} ...\n{p.stderr[-1200:]}")
    return p


def emit(obj):
    print(json.dumps(obj, indent=2))


HDR_TRANSFERS = {"arib-std-b67", "smpte2084"}   # HLG (iPhone default) and PQ


def probe(path):
    """Width/height are the DISPLAY size: phone video is often stored landscape with a
    rotation flag (display matrix side data, or the legacy `rotate` tag). ffmpeg auto-rotates
    frames on decode, so every filter in this script works in display orientation."""
    if not os.path.exists(path):
        sys.exit(f"no such file: {path}")
    out = run(["ffprobe", "-v", "error", "-show_entries",
               "format=duration:stream=codec_type,width,height,avg_frame_rate,pix_fmt,color_transfer"
               ":stream_tags=rotate:stream_side_data=rotation",
               "-of", "json", path]).stdout
    d = json.loads(out)
    v = next((s for s in d.get("streams", []) if s.get("codec_type") == "video"), None)
    if not v:
        sys.exit(f"{path}: no video stream")
    num, _, den = (v.get("avg_frame_rate") or "0/1").partition("/")
    fps = float(num) / float(den or 1) if float(den or 1) else 0.0
    rot = 0
    for sd in v.get("side_data_list") or []:
        if "rotation" in sd:
            rot = int(round(float(sd["rotation"])))
    if not rot and (v.get("tags") or {}).get("rotate"):
        rot = int(v["tags"]["rotate"])
    rot %= 360
    sw, sh = int(v["width"]), int(v["height"])
    w, h = (sh, sw) if rot in (90, 270) else (sw, sh)
    transfer = v.get("color_transfer") or "unknown"
    pix = v.get("pix_fmt") or ""
    return {
        "path": os.path.abspath(path),
        "seconds": round(float(d.get("format", {}).get("duration") or 0), 3),
        "width": w, "height": h, "pixels": w * h,
        "orientation": "portrait" if h > w else ("landscape" if w > h else "square"),
        "stored_size": f"{sw}x{sh}", "rotation": rot,
        "fps": round(fps, 3),
        "hdr": transfer in HDR_TRANSFERS,
        "bit_depth_10": "10" in pix or "p010" in pix,
        "color_transfer": transfer,
        "has_audio": any(s.get("codec_type") == "audio" for s in d.get("streams", [])),
    }


def scene_scores(path):
    """One pass over a downscaled copy: (pts_time, scene_score) for every frame after the first."""
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as t:
        meta = t.name
    try:
        run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", path, "-an",
             "-vf", f"scale=320:-2,select='gte(scene,0)',metadata=print:file={meta}",
             "-f", "null", "-"])
        scores, t_now = [], None
        with open(meta) as f:
            for line in f:
                m = re.search(r"pts_time:([0-9.]+)", line)
                if m:
                    t_now = float(m.group(1))
                m = re.search(r"lavfi\.scene_score=([0-9.]+)", line)
                if m and t_now is not None:
                    scores.append((t_now, float(m.group(1))))
        return scores
    finally:
        os.unlink(meta)


def grab(path, t, out, width=480):
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{t:.3f}", "-i", path,
         "-frames:v", "1", "-vf", f"scale={width}:-2", "-q:v", "3", out])
    return out


def image_size(path):
    out = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
               "-of", "csv=p=0:s=x", path]).stdout.strip()
    w, h = out.split("x")[:2]
    return int(w), int(h)


def tile(images, out, cols, height=480):
    """Tile frames into one sheet with ffmpeg (no drawtext, so it works on any ffmpeg build).
    One row: cells keep their own aspect at a shared height. Several rows: every cell is
    letterboxed into the first image's box so the rows line up."""
    rows = math.ceil(len(images) / cols)
    inputs, parts = [], []
    for p in images:
        inputs += ["-i", p]
    if rows == 1:
        for i in range(len(images)):
            parts.append(f"[{i}:v]scale=-2:{height},setsar=1[c{i}]")
        cells = [f"[c{i}]" for i in range(len(images))]
    else:
        w0, h0 = image_size(images[0])
        bw, bh = even(height * w0 / h0), even(height)
        for i in range(len(images)):
            parts.append(f"[{i}:v]scale={bw}:{bh}:force_original_aspect_ratio=decrease,"
                         f"pad={bw}:{bh}:(ow-iw)/2:(oh-ih)/2,setsar=1[c{i}]")
        cells = [f"[c{i}]" for i in range(len(images))]
        for j in range(rows * cols - len(images)):   # black filler cells for a short last row
            parts.append(f"color=c=black:s={bw}x{bh}:d=1,format=yuvj420p,setsar=1[f{j}]")
            cells.append(f"[f{j}]")
    row_labels = []
    for r in range(rows):
        rc = cells[r * cols:(r + 1) * cols]
        parts.append((f"{rc[0]}null" if len(rc) == 1 else "".join(rc) + f"hstack=inputs={len(rc)}") + f"[r{r}]")
        row_labels.append(f"[r{r}]")
    parts.append(f"{row_labels[0]}null[out]" if rows == 1 else "".join(row_labels) + f"vstack=inputs={rows}[out]")
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *inputs,
         "-filter_complex", ";".join(parts), "-map", "[out]", "-frames:v", "1", "-q:v", "3", out])
    return out


def cmd_check(a):
    os.makedirs(a.out_dir, exist_ok=True)
    results = []
    for clip in a.clips:
        info = probe(clip)
        name = os.path.splitext(os.path.basename(clip))[0]
        d = os.path.join(a.out_dir, name)
        os.makedirs(d, exist_ok=True)
        scores = scene_scores(clip)
        cuts = [round(t, 2) for t, s in scores if s >= a.threshold]
        soft = [round(t, 2) for t, s in scores if a.soft <= s < a.threshold]
        n = max(2, a.frames)
        times = [round((i + 0.5) * info["seconds"] / n, 2) for i in range(n)]
        frames = [grab(clip, t, os.path.join(d, f"f{i + 1:02d}.jpg")) for i, t in enumerate(times)]
        sheet = tile(frames, os.path.join(d, "contact.jpg"), cols=min(4, n))
        inspect = []
        for t in (cuts + soft)[:10]:   # frames either side of each (possible) cut
            for k, dt in (("before", -0.12), ("after", 0.12)):
                tt = max(0.0, min(info["seconds"] - 0.05, t + dt))
                inspect.append(grab(clip, tt, os.path.join(d, f"cut-{t:.2f}-{k}.jpg")))
        secs = info["seconds"]
        results.append({
            **info,
            "hard_cuts": len(cuts), "cut_times": cuts, "possible_cuts": soft,
            "max_scene_score": round(max((s for _, s in scores), default=0.0), 3),
            "single_take": len(cuts) == 0,
            "genjutsu_ok": GENJUTSU_SECONDS[0] <= secs and info["pixels"] >= GENJUTSU_MIN_PX,
            "genjutsu_notes": ([f"{secs:.1f}s is under 4s"] if secs < 4 else []) +
                              ([f"over 30s: Higgsfield bills and keeps only the first 30s"] if secs > 30 else []) +
                              ([f"{info['pixels']} px/frame is under 409,600: prep will upscale"]
                               if info["pixels"] < GENJUTSU_MIN_PX else []),
            "omni_ok": secs <= OMNI_MAX_SECONDS,
            "contact_sheet": os.path.abspath(sheet),
            "frame_times": times, "frames": [os.path.abspath(f) for f in frames],
            "inspect_frames": [os.path.abspath(f) for f in inspect],
            "needs_inspection": bool(soft),
            "look_for": "Open inspect_frames for EVERY possible cut: if the shot, angle or framing jumps, it is a "
                        "cut (jump cuts often score only 0.15-0.3). Count people in every frame (exactly 1 visible person, the same one, for a "
                        "trend the user can film in one take). For the user's own footage also check: "
                        "9:16, at least 720x1280, face visible, no other people, no third-party logos.",
        })
    emit({"threshold": a.threshold, "clips": results})


def even(x):
    return int(x) // 2 * 2


def cmd_prep(a):
    src = probe(a.video)
    start = a.start or 0.0
    end = a.end if a.end else src["seconds"]
    limit = GENJUTSU_SECONDS[1] if a.model == "genjutsu" else OMNI_MAX_SECONDS
    if end - start > limit:
        end = start + limit
    secs = end - start
    if a.model == "genjutsu" and secs < GENJUTSU_SECONDS[0]:
        sys.exit(f"segment is {secs:.2f}s; Genjutsu needs at least 4s")
    vf = []
    w, h = src["width"], src["height"]   # display size: ffmpeg auto-rotates before these filters
    if a.crop:
        cw, ch, cx, cy = (int(v) for v in a.crop.split(":"))
        vf.append(f"crop={cw}:{ch}:{cx}:{cy}")
        w, h = cw, ch
    if a.model == "genjutsu" and w * h < GENJUTSU_MIN_PX:
        k = math.sqrt(GENJUTSU_MIN_PX / (w * h)) * 1.01
        w, h = even(math.ceil(w * k) + 1), even(math.ceil(h * k) + 1)
        vf.append(f"scale={w}:{h}:flags=lanczos")
    else:
        w, h = even(w), even(h)
        vf.append(f"scale={w}:{h}")
    vf.append("setsar=1")
    if src["hdr"]:
        # Without a tonemapper (zscale isn't in every build) HLG/PQ goes washed out in yuv420p.
        # Prefer re-filming with HDR off; this only keeps the job moving.
        vf.append("format=yuv420p")
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{start:.3f}", "-i", a.video,
           "-t", f"{secs:.3f}", "-vf", ",".join(vf), "-c:v", "libx264", "-preset", "medium", "-crf", "18",
           "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
    cmd += ["-c:a", "aac", "-b:a", "160k"] if src["has_audio"] else ["-an"]
    run(cmd + [a.out])
    out = probe(a.out)
    billed = math.ceil(out["seconds"] - 1e-6)
    est = (round(GENJUTSU_USD_PER_S[a.resolution] * billed, 2) if a.model == "genjutsu"
           else round(OMNI_USD_PER_S * min(out["seconds"], OMNI_MAX_SECONDS), 2))
    warnings = []
    if src["hdr"]:
        warnings.append("source is HDR: colours will look washed out. Ask for a re-take with HDR off")
    if out["orientation"] != src["orientation"]:
        warnings.append("orientation changed during prep; do not upload")
    emit({**out, "warnings": warnings, "source_rotation": src["rotation"], "model": a.model, "resolution": a.resolution, "trimmed_from": [round(start, 3), round(end, 3)],
          "cropped": bool(a.crop), "upscaled": out["pixels"] > src["pixels"] and not a.crop,
          "seconds_billed": billed if a.model == "genjutsu" else None,
          "est_usd_per_attempt": est,
          "price_basis": ("Higgsfield list price per input second, rounded up; promotions may lower it"
                          if a.model == "genjutsu" else "about $0.10 per output second at 720p")})


def cmd_compare(a):
    """With --source (film-and-swap): ab.jpg + identity.jpg. Without (recreate): identity.jpg only."""
    os.makedirs(a.out_dir, exist_ok=True)
    o = probe(a.video)
    s = probe(a.source) if a.source else None
    n = a.frames
    span = min(s["seconds"], o["seconds"]) if s else o["seconds"]
    times = [round((i + 0.5) * span / n, 2) for i in range(n)]
    tmp = tempfile.mkdtemp(dir=a.out_dir, prefix=".frames-")
    out_f = [grab(a.video, t, os.path.join(tmp, f"o{i}.jpg"), 360) for i, t in enumerate(times)]
    ab = None
    if s:
        src_f = [grab(a.source, t, os.path.join(tmp, f"s{i}.jpg"), 360) for i, t in enumerate(times)]
        ab = os.path.abspath(tile(src_f + out_f, os.path.join(a.out_dir, "ab.jpg"), cols=n, height=420))
    ident_frames = [out_f[i] for i in sorted({0, n // 3, (2 * n) // 3, n - 1})]
    ref = os.path.join(tmp, "ref.jpg")
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", a.ref, "-vf", "scale=-2:640", ref])
    ident = tile([ref] + ident_frames, os.path.join(a.out_dir, "identity.jpg"), cols=1 + len(ident_frames),
                 height=640)
    shutil.rmtree(tmp, ignore_errors=True)
    problems = []
    dur_diff = None
    if s:
        dur_diff = round(o["seconds"] - s["seconds"], 2)
        if abs(dur_diff) > 0.5:
            problems.append(f"output is {dur_diff:+.2f}s different from the source")
        if not o["has_audio"] and s["has_audio"]:
            problems.append("output has no audio: run remux-audio with the user's clip")
    elif not o["has_audio"]:
        problems.append("output has no audio")
    if o["width"] > o["height"]:
        problems.append("output is landscape; Reels and TikTok want 9:16")
    look = {"identity_sheet": "Left is the locked reference sheet. Same face shape, features, skin, hair, "
                              "outfit and colors in every output frame? Any drift between frames? "
                              "Extra people, melted hands, warped text or flicker?"}
    if s:
        look["ab_sheet"] = ("Top row is the user's footage, bottom row the output at the same times. "
                            "Background, props, camera move, framing and timing unchanged? Only the person replaced? "
                            "No trace of the user's own face left in any frame?")
    emit({"source": s, "output": o, "duration_diff_s": dur_diff, "sample_times": times,
          "ab_sheet": ab, "identity_sheet": os.path.abspath(ident),
          "auto_problems": problems, "look_for": look})


DEFAULT_INDEX = "/workspace/ai-influencer/state/scraped-hashes.json"
CENTRE = "crop=iw*0.8:ih*0.8"          # centre 80%: robust to watermark/caption band crops and small zooms


def ahashes(path, fps=2, pre=""):
    """8x8 grey average-hash per frame as [hash, mirrored hash], via ffmpeg raw output.
    `pre` is an optional filter run first (e.g. a centre crop or a border crop)."""
    vf = (pre + "," if pre else "") + f"fps={fps},scale=8:8:flags=area,format=gray"
    raw = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", path, "-an",
                          "-vf", vf, "-f", "rawvideo", "-"], capture_output=True).stdout
    out = []
    for i in range(0, len(raw) - 63, 64):
        px = raw[i:i + 64]
        mean = sum(px) / 64
        bits = [1 if p > mean else 0 for p in px]
        mirror = [bits[r * 8 + (7 - c)] for r in range(8) for c in range(8)]
        out.append([int("".join(map(str, bits)), 2), int("".join(map(str, mirror)), 2)])
    return out


def border_crop(path):
    """Crop filter that removes black bars (letterbox/pillarbox), or '' if there are none."""
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-an", "-vf", "fps=2,cropdetect=limit=24:round=2:reset=0",
                        "-f", "null", "-"], capture_output=True, text=True)
    found = re.findall(r"crop=(\d+):(\d+):(\d+):(\d+)", p.stderr)
    if not found:
        return ""
    w, h, x, y = (int(v) for v in found[-1])
    info = probe(path)
    if w * h >= 0.97 * info["width"] * info["height"]:
        return ""
    return f"crop={w}:{h}:{x}:{y}"


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(1 << 20):
            h.update(chunk)
    return h.hexdigest()


def signature(path):
    return {"file": os.path.abspath(path), "sha256": sha256(path), "seconds": probe(path)["seconds"],
            "full": ahashes(path), "centre": ahashes(path, pre=CENTRE),
            "added": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")}


def load_index(path):
    if path and os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {"version": 1, "clips": {}}


def cmd_index(a):
    """Remember scraped clips' frame hashes so `match` works after the clips are deleted."""
    idx = load_index(a.index)
    added = 0
    for f in a.clips:
        sig = signature(f)
        if sig["sha256"] not in idx["clips"]:
            added += 1
        idx["clips"][sig["sha256"]] = sig
    os.makedirs(os.path.dirname(os.path.abspath(a.index)), exist_ok=True)
    tmp = a.index + ".tmp"
    with open(tmp, "w") as f:
        json.dump(idx, f)
    os.replace(tmp, a.index)
    emit({"index": os.path.abspath(a.index), "added": added, "total": len(idx["clips"])})


def dist(a, b):
    return bin(a ^ b).count("1")


def cmd_match(a):
    """Is this 'own take' really one of the scraped trend clips? Checks the persistent index
    (survives the 7-day clip deletion) plus any scraped files still on disk. Exact sha256, then
    per-frame hashes of the full frame, the centre 80% and the de-bordered frame, each also
    mirrored. Catches re-encodes, trims, speed changes, flips, band/centre crops up to ~10%
    and letterboxing. Not: re-filming a screen, heavy crops, or overlays covering the frame."""
    take_sha = sha256(a.video)
    variants = {"full": ahashes(a.video), "centre": ahashes(a.video, pre=CENTRE)}
    bc = border_crop(a.video)
    if bc:
        variants["deborder"] = ahashes(a.video, pre=bc)
        variants["deborder-centre"] = ahashes(a.video, pre=bc + "," + CENTRE)
    if not variants["full"]:
        sys.exit("could not read frames from the take")
    n = len(variants["full"])
    idxs = [min(n - 1, round((i + 0.5) * n / 8)) for i in range(8)] if n >= 8 else list(range(n))

    idx = load_index(a.index)
    cands = dict(idx["clips"])
    files = sorted({f for pat in a.against for f in glob.glob(pat, recursive=True) if f.endswith(".mp4")})
    known = {c.get("file") for c in cands.values()}
    for f in files:
        if os.path.abspath(f) != os.path.abspath(a.video) and os.path.abspath(f) not in known:
            sig = signature(f)
            cands[sig["sha256"]] = sig
    # (take variant, candidate variant, max distance): exact-geometry pairs are strict,
    # cropped/scaled pairs get the looser threshold
    pairs = [("full", "full", a.max_distance), ("centre", "centre", a.loose_distance),
             ("full", "centre", a.loose_distance), ("centre", "full", a.loose_distance),
             ("deborder", "full", a.loose_distance), ("deborder-centre", "centre", a.loose_distance)]
    hits = []
    for sha, c in cands.items():
        if c.get("file") and os.path.abspath(c["file"]) == os.path.abspath(a.video):
            continue
        if sha == take_sha:
            hits.append({"file": c.get("file"), "reason": "identical file"})
            continue
        near, how = 0, set()
        for i in idxs:
            ok = False
            for tv, cv, lim in pairs:
                if tv not in variants or i >= len(variants[tv]) or not c.get(cv):
                    continue
                h = variants[tv][i][0]
                best = min(min(dist(h, x), dist(h, m)) for x, m in c[cv])
                if best <= lim:
                    ok = True
                    how.add(f"{tv}~{cv}")
                    break
            near += ok
        if near >= math.ceil(0.75 * len(idxs)):
            hits.append({"file": c.get("file"), "reason": f"{near}/{len(idxs)} sampled frames match ({', '.join(sorted(how))})",
                         "on_disk": bool(c.get("file") and os.path.exists(c["file"]))})
    emit({"take": os.path.abspath(a.video), "compared": len(cands), "index": a.index,
          "take_borders_removed": bc or None, "matches": hits,
          "verdict": "MATCHES A SCRAPED CLIP: do not upload" if hits else "no match with scraped clips"})
    if hits:
        sys.exit(3)


def cmd_remux(a):
    s = probe(a.audio_from)
    if not s["has_audio"]:
        sys.exit("the source clip has no audio either")
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", a.video, "-i", a.audio_from,
         "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
         "-shortest", "-movflags", "+faststart", a.out])
    emit(probe(a.out))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("check")
    c.add_argument("clips", nargs="+")
    c.add_argument("--out-dir", required=True)
    c.add_argument("--threshold", type=float, default=0.4, help="scene score counted as a hard cut")
    c.add_argument("--soft", type=float, default=0.12, help="scene score flagged as a possible cut (jump cuts often score 0.15-0.3)")
    c.add_argument("--frames", type=int, default=12)
    c.set_defaults(fn=cmd_check)
    p = sub.add_parser("prep")
    p.add_argument("--video", required=True)
    p.add_argument("--model", required=True, choices=["genjutsu", "gemini-omni"])
    p.add_argument("--out", required=True)
    p.add_argument("--start", type=float, default=None)
    p.add_argument("--end", type=float, default=None)
    p.add_argument("--crop", default=None, help="W:H:X:Y in DISPLAY pixels (after the phone rotation is applied), e.g. to remove a watermark band")
    p.add_argument("--resolution", default="720p", choices=["480p", "720p", "1080p"])
    p.set_defaults(fn=cmd_prep)
    m = sub.add_parser("compare")
    m.add_argument("--source", default=None, help="the footage that was swapped; omit for recreated clips")
    m.add_argument("--video", required=True)
    m.add_argument("--ref", required=True)
    m.add_argument("--out-dir", required=True)
    m.add_argument("--frames", type=int, default=6)
    m.set_defaults(fn=cmd_compare)
    x = sub.add_parser("index")
    x.add_argument("clips", nargs="+")
    x.add_argument("--index", default=DEFAULT_INDEX)
    x.set_defaults(fn=cmd_index)
    k = sub.add_parser("match")
    k.add_argument("--video", required=True)
    k.add_argument("--index", default=DEFAULT_INDEX, help="hash index written at fetch time")
    k.add_argument("--against", action="append",
                   default=["/workspace/ai-influencer/trends/*/clips/*.mp4"], help="glob(s) of scraped clips still on disk")
    k.add_argument("--max-distance", type=int, default=6, help="Hamming distance (of 64) for same-geometry frames")
    k.add_argument("--loose-distance", type=int, default=10, help="Hamming distance for cropped/de-bordered frames")
    k.set_defaults(fn=cmd_match)
    r = sub.add_parser("remux-audio")
    r.add_argument("--video", required=True)
    r.add_argument("--audio-from", required=True)
    r.add_argument("--out", required=True)
    r.set_defaults(fn=cmd_remux)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
