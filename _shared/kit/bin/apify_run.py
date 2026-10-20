#!/usr/bin/env python3
"""Run an Apify actor and save its dataset items. Use the Apify plugin when it's connected;
this script is the fallback for routines and for runs longer than the plugin waits.

  apify_run.py <user~actor> --input input.json --out items.json [--max-usd 1.00] [--max-items 200]

Secret: APIFY_TOKEN. Uses the async run API (run-sync times out at 300 s with HTTP 408).
--max-usd caps the run's spend on Apify's side (maxTotalChargeUsd) for pay-per-result actors.
"""
import argparse
import json
import os
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _http import emit, need_env, poll, request  # noqa: E402

API = "https://api.apify.com/v2"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("actor", help="e.g. apify~instagram-reel-scraper")
    ap.add_argument("--input", required=True, help="path to a JSON file with the actor input")
    ap.add_argument("--out", required=True)
    ap.add_argument("--max-usd", type=float, default=1.0)
    ap.add_argument("--max-items", type=int, default=None)
    ap.add_argument("--timeout", type=int, default=900)
    a = ap.parse_args()

    (token,) = need_env("APIFY_TOKEN")
    h = {"Authorization": f"Bearer {token}"}
    with open(a.input) as f:
        actor_input = json.load(f)
    q = {"maxTotalChargeUsd": a.max_usd}
    if a.max_items:
        q["maxItems"] = a.max_items
    run = request("POST", f"{API}/acts/{a.actor}/runs?{urllib.parse.urlencode(q)}", h, actor_input)["data"]
    run = poll(lambda: request("GET", f"{API}/actor-runs/{run['id']}?waitForFinish=60", h, timeout=90)["data"],
               done=lambda r: r["status"] == "SUCCEEDED",
               failed=lambda r: r["status"] in {"FAILED", "ABORTED", "TIMED-OUT"},
               timeout_s=a.timeout, first=1, cap=2)
    items = request("GET", f"{API}/datasets/{run['defaultDatasetId']}/items?clean=true&format=json", h, timeout=300)
    if isinstance(items, dict) and "_text" in items:
        items = json.loads(items["_text"])
    with open(a.out, "w") as f:
        json.dump(items, f, indent=1)
    usage = run.get("usageTotalUsd")
    emit({"actor": a.actor, "run_id": run["id"], "items": len(items), "out": os.path.abspath(a.out),
          "usage_usd": usage})


if __name__ == "__main__":
    main()
