#!/usr/bin/env bash
# Sound for a starter sample: a back-timed music bed whose final hit lands on the end-card cut (8.5 s), a few UI
# sounds on the real actions (assets/sfx/plan.json), and the music-only fallback.
# Usage: sample-audio.sh <film dir> <silent picture.mp4> <out-basename>   (writes <out>.mp4 and <out>-music-only.mp4)
# Music: assets/music/track.wav if present (a licensed library track the user approved; put its final-hit time in
# assets/music/track.hit or set HIT=<s>; find it with backtime-music.py --list-hits),
# otherwise the kit's own synthesised 120 BPM bed (studio-audio.py, MIT). Needs numpy, scipy, ffmpeg.
set -euo pipefail
P="$(cd "$1" && pwd)"; pic="$2"; out="$3"
d="$(cd "$(dirname "$0")" && pwd)"
PY=/workspace/.venv-grokbot/bin/python; [ -x "$PY" ] || PY=python3
mkdir -p "$P/assets/music" "$P/assets/sfx"
if [ ! -f "$P/assets/music/track.wav" ]; then
  "$PY" "$d/studio-audio.py" track "$P/assets/music/track.wav" >/dev/null; echo 12.0 > "$P/assets/music/track.hit"
fi
[ -n "${HIT:-}" ] || { [ -f "$P/assets/music/track.hit" ] && HIT=$(cat "$P/assets/music/track.hit"); }
for s in tick click pop whoosh; do
  [ -f "$P/assets/sfx/$s.mp3" ] || { [ -f "$P/assets/sfx/$s.wav" ] || "$PY" "$d/studio-audio.py" sfx "$P/assets/sfx" >/dev/null;
    ffmpeg -v error -y -i "$P/assets/sfx/$s.wav" "$P/assets/sfx/$s.mp3"; }
done
FILM=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$pic")
"$PY" "$d/backtime-music.py" "$P/assets/music/track.wav" "$P/assets/music/backtimed.wav" \
  --film "$FILM" --card "${CARD:-8.5}" --hit "${HIT:?set HIT or assets/music/track.hit to the final-hit time from backtime-music.py --list-hits}"
"$PY" "$d/offline-mix.py" "$pic" "$out.mp4" --project "$P" --score backtimed.wav --music-lufs "${MUSIC_LUFS:--32}"
"$PY" "$d/offline-mix.py" "$pic" "$out-music-only.mp4" --project "$P" --score backtimed.wav --music-lufs "${MUSIC_LUFS:--32}" --no-sfx | head -1
