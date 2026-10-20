#!/usr/bin/env bash
# Measured QA for one render: frozen time, lone black frames, one-frame pops, loudness.
# Usage: qa.sh film.mp4 [cuts="2.5,5,7.5"] [frozen_threshold=0.35]
# Render at the delivery frame rate (60 fps for paid work) before running it. Needs ffmpeg/ffprobe and python3.
set -uo pipefail
f="$1"; cuts="${2:-}"; th="${3:-0.35}"
d="$(cd "$(dirname "$0")" && pwd)"
echo "== $(basename "$f")"
ffprobe -v error -show_entries stream=codec_type,width,height,avg_frame_rate:format=duration -of compact=p=0 "$f"
echo "== frozen time (10 fps samples, luma diff < $th)"
bash "$d/frozen-time.sh" "$f" "$th"
echo "== per-frame"
python3 "$d/qa_frames.py" "$f" ${cuts:+--cuts "$cuts"}; frames_ok=$?
if ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$f" | grep -q .; then
  echo "== loudness"
  bash "$d/loudness.sh" "$f"
else
  echo "== loudness: no audio stream"
fi
exit $frames_ok
