"""Tiny stdlib HTTP helpers shared by the kit scripts. No third-party packages."""
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request


def need_env(*names):
    """Return env values; exit with a clear message (never the value) if one is missing."""
    missing = [n for n in names if not os.environ.get(n)]
    if missing:
        sys.exit(f"missing secret(s): {', '.join(missing)}. Save them with the secure secret card "
                 f"under exactly these names, then run check-env.sh.")
    return [os.environ[n] for n in names]


def request(method, url, headers=None, body=None, raw=None, timeout=120):
    """JSON in, JSON out. `raw` sends bytes as-is (for presigned uploads)."""
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    h = dict(headers or {})
    if body is not None and raw is None:
        h.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            text = r.read().decode() or "{}"
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return {"_text": text}
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:800]
        sys.exit(f"HTTP {e.code} from {url.split('?')[0]}: {detail}")


def download(url, path, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=600) as r, open(path, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    return path


def poll(fetch, done, failed, timeout_s=1200, first=2.0, cap=10.0):
    """Back off from `first` to `cap` seconds with jitter until done(result) or failed(result)."""
    delay, start = first, time.time()
    while True:
        result = fetch()
        if done(result):
            return result
        if failed(result):
            sys.exit(f"generation ended without output: {json.dumps(result)[:600]}")
        if time.time() - start > timeout_s:
            sys.exit(f"timed out after {timeout_s}s; last status: {json.dumps(result)[:300]}")
        time.sleep(delay + random.uniform(0, 0.5))
        delay = min(delay * 1.5, cap)


def emit(obj):
    """Scripts print one JSON object on stdout so skills can parse the result."""
    print(json.dumps(obj, indent=2))
