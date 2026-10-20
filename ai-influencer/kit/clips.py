#!/usr/bin/env python3
"""Rank scraped clips, download the best ones, and keep seen.csv (stdlib only).

  clips.py rank  [--ig ITEMS.json ...] [--tt ITEMS.json ...] --out CANDIDATES.json
                 [--days 4] [--seen /workspace/ai-influencer/seen.csv] [--top 20]
                 [--min-seconds 4] [--max-seconds 30] [--rank-by velocity|outlier|views]
      Normalize Apify items from apify~instagram-reel-scraper (--ig) and (missing files are skipped)
      clockworks~tiktok-scraper (--tt), drop pinned/old/seen/ads/slideshows, and rank by
      views per hour since posting (default), outlier (views / the page's median) or raw views.
  clips.py fetch --candidates CANDIDATES.json --out-dir DIR [--batch 6] [--refresh ITEMS.json]
      Download each candidate's video file (local analysis only). Writes `file` or
      `fetch_error` into the JSON. --refresh takes a re-scrape (e.g. Instagram with
      includeDownloadedVideo) and retries the failed ones with its links. New downloads are
      hashed into /workspace/ai-influencer/state/scraped-hashes.json (--index) for the
      re-upload guard in clip_check.py match.
  clips.py seen-add --seen SEEN.csv --status shown|picked|skipped|rejected --url URL [--url ...]
                    [--candidates CANDIDATES.json] [--note TEXT]
      Append rows (never rewrites the file).

Field names were checked against each actor's dataset schema (Apify, 2026-10):
  Instagram: url, videoUrl, downloadedVideo, videoPlayCount (videoViewCount is deprecated),
             igPlayCount, likesCount, commentsCount, timestamp, ownerUsername, videoDuration,
             dimensionsWidth/Height, caption, isPinned, type/productType, musicInfo
  TikTok:    webVideoUrl, mediaUrls (filled when shouldDownloadVideos is on), playCount,
             diggCount, commentCount, shareCount, createTimeISO, authorMeta.name, musicMeta,
             videoMeta.duration/width/height, text, isPinned, isSlideshow, isAd, isSponsored
"""
import argparse
import csv
import datetime as dt
import json
import os
import statistics
import subprocess
import sys
import urllib.request

SEEN_HEADER = ["date", "platform", "url", "owner", "status", "note"]


def emit(obj):
    print(json.dumps(obj, indent=2))


def parse_time(s):
    if not s:
        return None
    try:
        return dt.datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except ValueError:
        return None


def first(*vals):
    for v in vals:
        if v not in (None, "", []):
            return v
    return None


def norm_ig(it):
    if it.get("error"):
        return None, "error"
    if (it.get("type") not in (None, "Video")) and it.get("productType") != "clips":
        return None, "not a video"
    return {
        "platform": "instagram",
        "url": it.get("url") or (f"https://www.instagram.com/reel/{it['shortCode']}/" if it.get("shortCode") else None),
        "video_url": first(it.get("downloadedVideo"), it.get("videoUrl")),
        "views": first(it.get("videoPlayCount"), it.get("igPlayCount"), it.get("videoViewCount")) or 0,
        "likes": it.get("likesCount"), "comments": it.get("commentsCount"), "shares": it.get("sharesCount"),
        "posted_at": it.get("timestamp"), "owner": it.get("ownerUsername"),
        "seconds": it.get("videoDuration"),
        "width": it.get("dimensionsWidth"), "height": it.get("dimensionsHeight"),
        "caption": (it.get("caption") or "")[:300], "pinned": bool(it.get("isPinned")),
        "sponsored": bool(it.get("paidPartnership")),
        "music": " - ".join(x for x in ((it.get("musicInfo") or {}).get("song_name"),
                                        (it.get("musicInfo") or {}).get("artist_name")) if x) or None,
    }, None


def norm_tt(it):
    if it.get("error") or it.get("errorCode"):
        return None, "error"
    if it.get("isSlideshow"):
        return None, "slideshow"
    vm = it.get("videoMeta") or {}
    media = it.get("mediaUrls") or []
    return {
        "platform": "tiktok",
        "url": it.get("webVideoUrl"),
        "video_url": media[0] if media else None,
        "views": it.get("playCount") or 0,
        "likes": it.get("diggCount"), "comments": it.get("commentCount"), "shares": it.get("shareCount"),
        "posted_at": it.get("createTimeISO"), "owner": (it.get("authorMeta") or {}).get("name"),
        "seconds": vm.get("duration"), "width": vm.get("width"), "height": vm.get("height"),
        "caption": (it.get("text") or "")[:300], "pinned": bool(it.get("isPinned")),
        "sponsored": bool(it.get("isAd") or it.get("isSponsored")),
        "music": " - ".join(x for x in ((it.get("musicMeta") or {}).get("musicName"),
                                        (it.get("musicMeta") or {}).get("musicAuthor")) if x) or None,
    }, None


SKIPPED_FILES = []


def load(paths):
    """Missing files are skipped (an Instagram-only user has no tt.json), and reported."""
    items = []
    for p in paths or []:
        if not os.path.exists(p):
            SKIPPED_FILES.append(p)
            continue
        with open(p) as f:
            data = json.load(f)
        items += data if isinstance(data, list) else data.get("items", [])
    return items


def read_seen(path):
    if not path or not os.path.exists(path):
        return set()
    with open(path, newline="") as f:
        return {row.get("url") for row in csv.DictReader(f)}


def cmd_rank(a):
    now = dt.datetime.now(dt.timezone.utc)
    cutoff = now - dt.timedelta(days=a.days)
    seen = read_seen(a.seen)
    dropped, rows, urls = {}, [], set()

    def drop(reason):
        dropped[reason] = dropped.get(reason, 0) + 1

    for fn, items in ((norm_ig, load(a.ig)), (norm_tt, load(a.tt))):
        for it in items:
            r, why = fn(it)
            if not r:
                drop(why)
                continue
            t = parse_time(r["posted_at"])
            if not r["url"]:
                drop("no url")
            elif r["url"] in urls:
                drop("duplicate")
            elif r["url"] in seen:
                drop("already shown")
            elif r["pinned"]:
                drop("pinned")
            elif r["sponsored"]:
                drop("ad or paid partnership")
            elif not t or t < cutoff:
                drop(f"older than {a.days} days")
            elif r["seconds"] and not (a.min_seconds <= float(r["seconds"]) <= a.max_seconds):
                drop(f"length outside {a.min_seconds:g}-{a.max_seconds:g}s")
            else:
                urls.add(r["url"])
                rows.append(r)
    # outlier = views / median views of the same page in this batch (how far above its usual)
    by_owner = {}
    for r in rows:
        by_owner.setdefault((r["platform"], r["owner"]), []).append(r["views"] or 0)
    for r in rows:
        med = statistics.median(by_owner[(r["platform"], r["owner"])]) or 1
        r["outlier"] = round((r["views"] or 0) / med, 2)
        hours = max(1.0, (now - parse_time(r["posted_at"])).total_seconds() / 3600)
        r["hours_old"] = round(hours, 1)
        r["views_per_hour"] = round((r["views"] or 0) / hours)
    keys = {
        "velocity": lambda r: (r["views_per_hour"], r["outlier"]),   # fair to fresh posts
        "outlier": lambda r: (r["outlier"], r["views_per_hour"]),    # fair to small pages
        "views": lambda r: (r["views"], r["outlier"]),
    }
    key = keys[a.rank_by]
    rows.sort(key=key, reverse=True)
    top = rows[: a.top]
    for i, r in enumerate(top, 1):
        r["id"] = f"c{i:02d}"
    with open(a.out, "w") as f:
        json.dump(top, f, indent=1)
    if not any(os.path.exists(p) for p in (a.ig or []) + (a.tt or [])):
        sys.exit("none of the --ig/--tt files exist; did the scrape run?")
    emit({"kept": len(rows), "returned": len(top), "dropped": dropped, "skipped_missing_files": SKIPPED_FILES,
          "out": os.path.abspath(a.out),
          "rank_by": a.rank_by, "top": [{k: r[k] for k in ("id", "platform", "owner", "views", "views_per_hour",
                                                           "outlier", "seconds", "url")}
                                         for r in top]})


def cmd_fetch(a):
    with open(a.candidates) as f:
        cands = json.load(f)
    if a.refresh:  # e.g. a re-run with includeDownloadedVideo for links that expired
        fresh = {}
        for it in load(a.refresh):
            r, _ = (norm_tt if "webVideoUrl" in it else norm_ig)(it)
            if r and r.get("url") and r.get("video_url"):
                fresh[r["url"]] = r["video_url"]
        for c in cands:
            if not c.get("file") and c.get("url") in fresh:
                c["video_url"] = fresh[c["url"]]
    os.makedirs(a.out_dir, exist_ok=True)
    ok, tried, new_files = 0, 0, []
    for c in cands:
        if c.get("file") and os.path.exists(c["file"]):
            ok += 1
            continue
        if a.batch and tried >= a.batch:
            continue
        if c.get("fetch_error") and not a.refresh:
            continue   # already failed once; only a --refresh retries it
        tried += 1
        if not c.get("video_url"):
            c["fetch_error"] = "no video URL in the scrape (TikTok needs shouldDownloadVideos: true)"
            continue
        path = os.path.join(a.out_dir, f"{c['id']}-{c['platform']}.mp4")
        try:
            req = urllib.request.Request(c["video_url"], headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=120) as r, open(path, "wb") as out:
                while chunk := r.read(1 << 20):
                    out.write(chunk)
            if os.path.getsize(path) < 10_000:
                raise ValueError("file too small, probably an error page")
            c["file"] = os.path.abspath(path)
            c.pop("fetch_error", None)
            new_files.append(c["file"])
            ok += 1
        except Exception as e:  # expired CDN links are common on Instagram
            c["fetch_error"] = f"{type(e).__name__}: {str(e)[:160]}"
            if os.path.exists(path):
                os.unlink(path)
    tmp = a.candidates + ".tmp"
    with open(tmp, "w") as f:
        json.dump(cands, f, indent=1)
    os.replace(tmp, a.candidates)
    indexed = None
    if new_files and a.index != "none":   # remember frame hashes so the re-upload guard outlives the files
        p = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "clip_check.py"),
                            "index", "--index", a.index, *new_files], capture_output=True, text=True)
        indexed = json.loads(p.stdout) if p.returncode == 0 else {"error": p.stderr[-300:]}
    left = sum(1 for c in cands if not c.get("file") and not c.get("fetch_error"))
    emit({"downloaded": ok, "new_files": new_files, "indexed": indexed, "not_tried_yet": left, "failed": [{"id": c["id"], "url": c["url"], "error": c["fetch_error"]}
                                       for c in cands if c.get("fetch_error")]})


def cmd_seen_add(a):
    meta = {}
    if a.candidates:
        with open(a.candidates) as f:
            meta = {c["url"]: c for c in json.load(f)}
    new = not os.path.exists(a.seen) or os.path.getsize(a.seen) == 0
    today = dt.date.today().isoformat()
    with open(a.seen, "a", newline="") as f:
        w = csv.writer(f)
        if new:
            w.writerow(SEEN_HEADER)
        for u in a.url:
            c = meta.get(u, {})
            w.writerow([today, c.get("platform", ""), u, c.get("owner", ""), a.status, a.note or ""])
    emit({"appended": len(a.url), "seen": os.path.abspath(a.seen)})


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("rank")
    r.add_argument("--ig", action="append")
    r.add_argument("--tt", action="append")
    r.add_argument("--out", required=True)
    r.add_argument("--days", type=float, default=4)
    r.add_argument("--seen", default="/workspace/ai-influencer/seen.csv")
    r.add_argument("--top", type=int, default=20, help="candidates to keep; the checks then backfill down this list")
    r.add_argument("--min-seconds", type=float, default=4)
    r.add_argument("--max-seconds", type=float, default=30)
    r.add_argument("--rank-by", choices=["velocity", "outlier", "views"], default="velocity")
    r.set_defaults(fn=cmd_rank)
    f = sub.add_parser("fetch")
    f.add_argument("--candidates", required=True)
    f.add_argument("--out-dir", required=True)
    f.add_argument("--refresh", action="append", help="items JSON whose video links replace expired ones")
    f.add_argument("--index", default="/workspace/ai-influencer/state/scraped-hashes.json",
                   help="hash index for clip_check.py match ('none' to skip)")
    f.add_argument("--batch", type=int, default=0, help="download at most N not-yet-tried candidates (in rank order)")
    f.set_defaults(fn=cmd_fetch)
    s = sub.add_parser("seen-add")
    s.add_argument("--seen", required=True)
    s.add_argument("--status", required=True, choices=["shown", "picked", "skipped", "rejected"])
    s.add_argument("--url", action="append", required=True)
    s.add_argument("--candidates")
    s.add_argument("--note")
    s.set_defaults(fn=cmd_seen_add)
    a = ap.parse_args()
    if a.cmd == "rank" and not (a.ig or a.tt):
        sys.exit("rank needs at least one --ig or --tt items file")
    a.fn(a)


if __name__ == "__main__":
    main()
