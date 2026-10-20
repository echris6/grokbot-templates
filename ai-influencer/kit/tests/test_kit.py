#!/usr/bin/env python3
"""Regression tests for the AI Influencer kit. Builds every input with ffmpeg; no network, no keys.

  python3 /workspace/grokbot-templates/ai-influencer/kit/tests/test_kit.py [--keep DIR]

Needs ffmpeg/ffprobe (ffmpeg >= 6 for -display_rotation). Chromium/Chrome is optional
(the PDF test is skipped without it). Exit code 0 = all passed.
"""
import argparse
import datetime as dt
import json
import os
import shutil
import subprocess
import sys
import tempfile

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable
RESULTS = []


class Skip(Exception):
    pass


def ffmpeg_major():
    out = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True).stdout.split()
    try:
        return int(out[2].lstrip("n").split(".")[0].split("-")[0])
    except (IndexError, ValueError):
        return 99   # git builds ("N-12345-g…") are recent


def need(path, why):
    if not os.path.exists(path):
        raise Skip(why)


def sh(*cmd, ok=(0,)):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode not in ok:
        raise AssertionError(f"{' '.join(cmd[:6])} … exited {p.returncode}: {p.stderr[-600:]}")
    return p


def ff(*args):
    sh("ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args)


def kit(script, *args, ok=(0,)):
    p = sh(PY, os.path.join(KIT, script), *args, ok=ok)
    return json.loads(p.stdout) if p.stdout.strip().startswith("{") else p


def test(name):
    def deco(fn):
        def run(d):
            try:
                fn(d)
                RESULTS.append((name, "PASS", ""))
            except Skip as e:
                RESULTS.append((name, "SKIP", str(e)))
            except Exception as e:  # report and keep going
                RESULTS.append((name, "FAIL", str(e)[:400]))
        run.__name__ = name
        return run
    return deco


def make_inputs(d):
    c = os.path.join(d, "in")
    os.makedirs(c, exist_ok=True)
    j = lambda n: os.path.join(c, n)
    # portrait single take with audio
    ff("-f", "lavfi", "-i", "testsrc2=s=720x1280:r=30:d=8", "-f", "lavfi", "-i", "sine=f=440:d=8",
       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", j("single.mp4"))
    # iPhone-style: stored 1920x1080 with a 90 / -90 degree display matrix
    ff("-f", "lavfi", "-i", "testsrc2=s=1920x1080:r=30:d=6", "-f", "lavfi", "-i", "sine=f=500:d=6",
       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", j("land.mp4"))
    if ffmpeg_major() >= 6:   # -display_rotation arrived in ffmpeg 6; older builds skip the rotation tests
        ff("-display_rotation:v:0", "90", "-i", j("land.mp4"), "-c", "copy", j("rot90.mp4"))
        ff("-display_rotation:v:0", "-90", "-i", j("land.mp4"), "-c", "copy", j("rotm90.mp4"))
    # three different shots: hard cuts at 3 s and 6 s
    ff("-f", "lavfi", "-i", "testsrc2=s=720x1280:r=30:d=3", "-f", "lavfi", "-i", "smptebars=s=720x1280:r=30:d=3",
       "-f", "lavfi", "-i", "mandelbrot=s=720x1280:r=30",
       "-filter_complex", "[2:v]trim=duration=3,setpts=PTS-STARTPTS[m];[0:v][1:v][m]concat=n=3:v=1[v]",
       "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", j("cuts.mp4"))
    # jump cut: same scene, reframed (punch-in + shift) at 3 s, the edit talking-head clips use most
    ff("-f", "lavfi", "-i", "mandelbrot=s=1080x1920:r=30", "-filter_complex",
       "[0:v]trim=duration=6,setpts=PTS-STARTPTS,split[a][b];"
       "[a]trim=0:3,crop=720:1280:180:320,setsar=1[a1];"
       "[b]trim=3:6,setpts=PTS-STARTPTS,crop=640:1138:260:400,scale=720:1280,setsar=1[b1];"
       "[a1][b1]concat=n=2:v=1[v]", "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", j("jump.mp4"))
    # HDR (HLG, 10-bit HEVC) like an iPhone default capture
    try:
        ff("-f", "lavfi", "-i", "testsrc2=s=1080x1920:r=30:d=5", "-c:v", "libx265", "-pix_fmt", "yuv420p10le",
           "-x265-params", "colorprim=bt2020:transfer=arib-std-b67:colormatrix=bt2020nc:log-level=error",
           "-color_trc", "arib-std-b67", "-color_primaries", "bt2020", "-colorspace", "bt2020nc",
           "-tag:v", "hvc1", j("hdr.mp4"))
    except AssertionError:
        pass   # no libx265 in this build: the HDR test skips
    # low resolution, needs the Genjutsu upscale
    ff("-f", "lavfi", "-i", "testsrc2=s=480x640:r=30:d=12", "-c:v", "libx264", "-pix_fmt", "yuv420p", j("lowres.mp4"))
    # a "scraped" trend clip, a disguised copy of it (trim + mirror + re-encode), and an unrelated take
    os.makedirs(os.path.join(d, "trends", "2026-10-20", "clips"), exist_ok=True)
    scraped = os.path.join(d, "trends", "2026-10-20", "clips", "c01-instagram.mp4")
    # textured, moving content (smooth content would make the hash test too easy)
    ff("-f", "lavfi", "-i", "cellauto=s=720x1280:r=30:rule=30", "-f", "lavfi", "-i", "testsrc2=s=720x1280:r=30",
       "-filter_complex", "[0:v]format=yuv420p[a];[1:v]format=yuv420p[b];[a][b]blend=all_mode=average,format=yuv420p",
       "-t", "8", "-c:v", "libx264", "-pix_fmt", "yuv420p", scraped)
    ff("-ss", "1", "-i", scraped, "-t", "6", "-vf", "hflip,scale=1080:1920", "-c:v", "libx264", "-crf", "30",
       j("disguised.mp4"))
    ff("-f", "lavfi", "-i", "cellauto=s=720x1280:r=30:rule=110", "-t", "6", "-c:v", "libx264", "-pix_fmt", "yuv420p",
       j("own_take.mp4"))
    ff("-f", "lavfi", "-i", "life=s=360x640:r=30:mold=10:ratio=0.3:death_color=#202020:life_color=#e0e0e0,scale=720:1280",
       "-t", "6", "-c:v", "libx264", "-pix_fmt", "yuv420p", j("life.mp4"))
    ff("-f", "lavfi", "-i", "gradients=s=720x1280:r=30:speed=0.02", "-t", "6", "-c:v", "libx264", "-pix_fmt", "yuv420p",
       j("grad.mp4"))
    evasions = {
        "bottom3": "crop=iw:ih*0.97:0:0,scale=1080:1920",                     # caption/watermark band removed
        "centre8": "crop=iw*0.92:ih*0.92,scale=1080:1920",                    # 8% centre crop (zoom)
        "letterbox": "scale=720:1000,pad=720:1280:0:140:black",               # letterboxed re-encode
        "speed2x": "setpts=0.5*PTS,hflip",                                     # 2x speed + mirror
    }
    for name, vf in evasions.items():
        ff("-ss", "0.5", "-i", scraped, "-t", "5", "-vf", vf, "-c:v", "libx264", "-crf", "28", j(f"ev_{name}.mp4"))
    ff("-f", "lavfi", "-i", "testsrc2=s=1200x900:d=1", "-frames:v", "1", j("sheet.png"))
    return c


@test("probe: rotation 90 reads as 1080x1920 portrait")
def t_rot(d):
    need(f"{d}/in/rot90.mp4", "ffmpeg < 6 cannot build rotated test clips (-display_rotation)")
    r = kit("clip_check.py", "check", f"{d}/in/rot90.mp4", f"{d}/in/rotm90.mp4", "--out-dir", f"{d}/chk-rot")
    for c in r["clips"]:
        assert (c["width"], c["height"], c["orientation"]) == (1080, 1920, "portrait"), c
        assert c["rotation"] in (90, 270) and c["stored_size"] == "1920x1080", c
        w, h = map(int, sh("ffprobe", "-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x",
                           c["frames"][0]).stdout.strip().split("x"))
        assert h > w, f"contact frame not portrait: {w}x{h}"


@test("prep: rotated phone take stays portrait, not squashed")
def t_prep_rot(d):
    need(f"{d}/in/rot90.mp4", "ffmpeg < 6 cannot build rotated test clips (-display_rotation)")
    for name in ("rot90", "rotm90"):
        out = f"{d}/prep-{name}.mp4"
        r = kit("clip_check.py", "prep", "--video", f"{d}/in/{name}.mp4", "--model", "genjutsu", "--out", out)
        assert (r["width"], r["height"]) == (1080, 1920) and r["rotation"] == 0, r
        assert r["source_rotation"] in (90, 270) and not r["warnings"], r
        # pixel check: testsrc2's colour bars are vertical in the source landscape frame;
        # rotated correctly they become horizontal bands, so a column varies and a row barely does
        f = f"{d}/prep-{name}.png"
        ff("-ss", "1", "-i", out, "-frames:v", "1", "-vf", "scale=108:192,format=gray", f)
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                             capture_output=True).stdout
        w, h = 108, 192
        col = [raw[y * w + w // 2] for y in range(h)]
        row = [raw[(h // 4) * w + x] for x in range(w)]
        spread = lambda v: max(v) - min(v)
        assert spread(col) > spread(row), f"bars run the wrong way: col {spread(col)} row {spread(row)}"


@test("check: single take has no cuts or flags")
def t_single(d):
    c = kit("clip_check.py", "check", f"{d}/in/single.mp4", "--out-dir", f"{d}/chk1")["clips"][0]
    assert c["hard_cuts"] == 0 and not c["possible_cuts"] and c["single_take"], c


@test("check: three-shot clip is not a single take")
def t_cuts(d):
    c = kit("clip_check.py", "check", f"{d}/in/cuts.mp4", "--out-dir", f"{d}/chk2")["clips"][0]
    assert not c["single_take"] and c["hard_cuts"] >= 1, c
    assert {round(t) for t in c["cut_times"] + c["possible_cuts"]} >= {3, 6}, c


@test("check: jump cut (punch-in on the same scene) is at least flagged")
def t_jump(d):
    c = kit("clip_check.py", "check", f"{d}/in/jump.mp4", "--out-dir", f"{d}/chk3")["clips"][0]
    flagged = c["cut_times"] + c["possible_cuts"]
    assert any(abs(t - 3.0) < 0.2 for t in flagged), c
    assert c["needs_inspection"] or c["hard_cuts"], c
    assert c["inspect_frames"], "no before/after frames for the flagged cut"


@test("check/prep: HDR (HLG) is detected and prep warns")
def t_hdr(d):
    need(f"{d}/in/hdr.mp4", "this ffmpeg has no libx265 to build an HLG clip")
    c = kit("clip_check.py", "check", f"{d}/in/hdr.mp4", "--out-dir", f"{d}/chk4")["clips"][0]
    assert c["hdr"] and c["bit_depth_10"], c
    r = kit("clip_check.py", "prep", "--video", f"{d}/in/hdr.mp4", "--model", "genjutsu", "--out", f"{d}/prep-hdr.mp4")
    assert any("HDR" in w for w in r["warnings"]), r


@test("prep: low-res upscales to >= 409,600 px; Omni trims to 10 s; short Genjutsu refused")
def t_prep(d):
    r = kit("clip_check.py", "prep", "--video", f"{d}/in/lowres.mp4", "--model", "genjutsu", "--out", f"{d}/p1.mp4")
    assert r["pixels"] >= 409_600 and r["est_usd_per_attempt"] == round(0.681 * 12, 2), r
    r = kit("clip_check.py", "prep", "--video", f"{d}/in/lowres.mp4", "--model", "gemini-omni", "--out", f"{d}/p2.mp4")
    assert r["seconds"] <= 10.05, r
    p = kit("clip_check.py", "prep", "--video", f"{d}/in/single.mp4", "--model", "genjutsu", "--start", "5",
            "--out", f"{d}/p3.mp4", ok=(1,))
    assert "at least 4s" in p.stderr, p.stderr


@test("compare: sheets made, silent output flagged, remux restores audio")
def t_compare(d):
    ff("-i", f"{d}/in/single.mp4", "-an", "-c:v", "copy", f"{d}/silent.mp4")
    r = kit("clip_check.py", "compare", "--source", f"{d}/in/single.mp4", "--video", f"{d}/silent.mp4",
            "--ref", f"{d}/in/sheet.png", "--out-dir", f"{d}/cmp")
    assert os.path.exists(r["ab_sheet"]) and os.path.exists(r["identity_sheet"]), r
    assert any("no audio" in p for p in r["auto_problems"]), r
    r = kit("clip_check.py", "compare", "--video", f"{d}/in/single.mp4", "--ref", f"{d}/in/sheet.png",
            "--out-dir", f"{d}/cmp2")
    assert r["ab_sheet"] is None and os.path.exists(r["identity_sheet"]), r
    r = kit("clip_check.py", "remux-audio", "--video", f"{d}/silent.mp4", "--audio-from", f"{d}/in/single.mp4",
            "--out", f"{d}/final.mp4")
    assert r["has_audio"], r


@test("match: disguised copies of a scraped clip are caught, also from the index after deletion")
def t_match(d):
    pat = f"{d}/trends/*/clips/*.mp4"
    idx = f"{d}/state/scraped-hashes.json"
    r = kit("clip_check.py", "index", f"{d}/trends/2026-10-20/clips/c01-instagram.mp4", "--index", idx)
    assert r["total"] == 1, r
    for name in ("disguised", "ev_bottom3", "ev_centre8", "ev_letterbox", "ev_speed2x"):
        r = kit("clip_check.py", "match", "--video", f"{d}/in/{name}.mp4", "--index", idx, "--against", pat, ok=(3,))
        assert r["matches"] and "MATCHES" in r["verdict"], (name, r)
    # unrelated clips must pass (no false positives). Not testsrc2 alone: the scraped fixture is half testsrc2
    for name in ("own_take", "jump", "life", "grad"):
        r = kit("clip_check.py", "match", "--video", f"{d}/in/{name}.mp4", "--index", idx, "--against", pat)
        assert not r["matches"], (name, r)
    # the 7-day tidy deletes scraped files; the index alone must still catch the copy
    gone = f"{d}/gone"
    os.makedirs(gone, exist_ok=True)
    shutil.move(f"{d}/trends/2026-10-20/clips/c01-instagram.mp4", f"{gone}/c01-instagram.mp4")
    try:
        r = kit("clip_check.py", "match", "--video", f"{d}/in/ev_bottom3.mp4", "--index", idx, "--against", pat, ok=(3,))
        assert r["matches"] and r["matches"][0]["on_disk"] is False, r
    finally:
        shutil.move(f"{gone}/c01-instagram.mp4", f"{d}/trends/2026-10-20/clips/c01-instagram.mp4")


@test("clips.py: filters, velocity ranking, batch fetch, seen-add")
def t_clips(d):
    now = dt.datetime.now(dt.timezone.utc)
    iso = lambda h: (now - dt.timedelta(hours=h)).isoformat().replace("+00:00", "Z")
    ig = [
        {"type": "Video", "url": "https://ig/reel/OLDBIG/", "videoPlayCount": 900_000, "timestamp": iso(90),
         "ownerUsername": "a", "videoDuration": 8},                    # 10k/h
        {"type": "Video", "url": "https://ig/reel/FRESH/", "videoPlayCount": 300_000, "timestamp": iso(6),
         "ownerUsername": "a", "videoDuration": 8, "musicInfo": {"song_name": "S", "artist_name": "A"}},  # 50k/h
        {"type": "Video", "url": "https://ig/reel/PIN/", "videoPlayCount": 9e9, "timestamp": iso(2),
         "ownerUsername": "a", "videoDuration": 8, "isPinned": True},
        {"type": "Video", "url": "https://ig/reel/STALE/", "videoPlayCount": 9e9, "timestamp": iso(24 * 9),
         "ownerUsername": "a", "videoDuration": 8},
    ]
    tt = [{"webVideoUrl": "https://tt/v/1", "mediaUrls": [], "playCount": 10, "createTimeISO": iso(3),
           "authorMeta": {"name": "b"}, "videoMeta": {"duration": 9}, "musicMeta": {"musicName": "orig"}},
          {"webVideoUrl": "https://tt/v/2", "isSlideshow": True, "createTimeISO": iso(3)}]
    json.dump(ig, open(f"{d}/ig.json", "w"))
    json.dump(tt, open(f"{d}/tt.json", "w"))
    r = kit("clips.py", "rank", "--ig", f"{d}/ig.json", "--tt", f"{d}/tt.json", "--seen", f"{d}/seen.csv",
            "--out", f"{d}/cand.json")
    assert [c["url"] for c in r["top"]][:2] == ["https://ig/reel/FRESH/", "https://ig/reel/OLDBIG/"], r
    assert r["dropped"] == {"pinned": 1, "older than 4 days": 1, "slideshow": 1}, r["dropped"]
    r = kit("clips.py", "fetch", "--candidates", f"{d}/cand.json", "--out-dir", f"{d}/dl", "--batch", "1",
            "--index", f"{d}/state/fetch-index.json")
    assert r["not_tried_yet"] == 2 and len(r["failed"]) == 1, r
    kit("clips.py", "seen-add", "--seen", f"{d}/seen.csv", "--status", "shown", "--candidates", f"{d}/cand.json",
        "--url", "https://ig/reel/FRESH/")
    # a real download (file:// stands in for the CDN) is hashed into the index at fetch time
    json.dump([{"id": "c01", "platform": "instagram", "url": "https://ig/reel/X/",
                "video_url": "file://" + os.path.abspath(f"{d}/in/single.mp4")}], open(f"{d}/cand-dl.json", "w"))
    r = kit("clips.py", "fetch", "--candidates", f"{d}/cand-dl.json", "--out-dir", f"{d}/dl2",
            "--index", f"{d}/state/fetch-index.json")
    assert r["downloaded"] == 1 and r["indexed"] and r["indexed"]["total"] == 1, r
    r = kit("clips.py", "rank", "--ig", f"{d}/ig.json", "--tt", f"{d}/no-such-tt.json", "--seen", f"{d}/seen.csv",
            "--out", f"{d}/cand2.json")   # an Instagram-only user has no tt.json
    assert r["dropped"].get("already shown") == 1 and r["skipped_missing_files"], r


@test("guide_pdf: lists split by type, 'a * b * c' not italic, PDF renders")
def t_pdf(d):
    sys.path.insert(0, KIT)
    import guide_pdf  # noqa: E402
    h = guide_pdf.builtin_md("1. one\n2. two\n- dash\n\nx is a * b * c and *ital*")
    assert "<ol><li>one</li><li>two</li></ol>" in h and "<ul><li>dash</li></ul>" in h, h
    assert "a * b * c" in h and "<em>ital</em>" in h, h
    if not guide_pdf.find_browser():
        RESULTS.append(("guide_pdf: PDF print", "SKIP", "no Chromium/Chrome"))
        return
    shutil.copy(f"{d}/in/sheet.png", f"{d}/sheet.png")
    open(f"{d}/g.md", "w").write("# T\n\n![s](sheet.png)\n\n| a | b |\n|---|---|\n| 1 | 2 |\n")
    r = kit("guide_pdf.py", "--md", f"{d}/g.md", "--out", f"{d}/pdf/g.pdf", "--cover", f"{d}/sheet.png")
    assert r["pages"] >= 2 and r["bytes"] > 10_000, r


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--keep", help="build inputs/outputs in this folder and keep them")
    a = ap.parse_args()
    d = a.keep or tempfile.mkdtemp(prefix="aiinf-tests-")
    os.makedirs(d, exist_ok=True)
    make_inputs(d)
    for t in (t_rot, t_prep_rot, t_single, t_cuts, t_jump, t_hdr, t_prep, t_compare, t_match, t_clips, t_pdf):
        t(d)
    w = max(len(n) for n, _, _ in RESULTS)
    for n, s, msg in RESULTS:
        print(f"{s:4}  {n:<{w}}  {msg}")
    if not a.keep:
        shutil.rmtree(d, ignore_errors=True)
    sys.exit(1 if any(s == "FAIL" for _, s, _ in RESULTS) else 0)


if __name__ == "__main__":
    main()
