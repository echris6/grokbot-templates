#!/usr/bin/env python3
"""Write a consent record for one exact media file (guardrails §3).

  consent_record.py --media clip.mp4 --people "the account owner" --basis self \
      --quote "yes that's me in the video, go ahead" --out /workspace/ai-influencer/consent/<id>.md

Only run this with the user's OWN words from the chat as --quote. Never fill it in yourself.
"""
import argparse
import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hf_genjutsu import CONSENT_BASES, sha256  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--media", required=True)
ap.add_argument("--people", required=True)
ap.add_argument("--basis", required=True, choices=sorted(CONSENT_BASES))
ap.add_argument("--quote", required=True, help="the user's own words, verbatim")
ap.add_argument("--release", default="", help="path to a signed release or stock license, if any")
ap.add_argument("--out", required=True)
a = ap.parse_args()
if a.basis != "self" and not (a.release and os.path.isfile(a.release)):
    sys.exit("basis 'signed release' / 'licensed stock' needs --release <path to the document>")
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
with open(a.out, "w") as f:
    f.write(f"# Consent record\n\nclip: sha256:{sha256(a.media)}\nfile: {os.path.abspath(a.media)}\n"
            f"people: {a.people}\nbasis: {a.basis}\nrelease: {a.release or 'n/a'}\n"
            f"confirmed_by_user: \"{a.quote}\"\ndate: {datetime.date.today().isoformat()}\n")
print(os.path.abspath(a.out))
