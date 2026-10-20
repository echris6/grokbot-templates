#!/usr/bin/env bash
# Measure a reference (or our) film for the bar: cut times, shot lengths, cuts per 10 s, and sampled stage colours.
# Usage: measure-ref.sh film.mp4 [scene_threshold=0.20] [colour_times="1,5,9"]
# Cuts come from ffmpeg's scene score plus lone one-frame luma spikes; fast whips can read as cuts, so confirm each on the contact sheet.
# Colours are averaged over a 64x64 patch 40 px in from the top-left corner (the stage, in most launch films),
# decoded from the encoded file, which is what the client sees.
set -euo pipefail
f="$1"; th="${2:-0.20}"; ct="${3:-}"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
d0="$(cd "$(dirname "$0")" && pwd)"
scene=$(ffmpeg -hide_banner -i "$f" -an -vf "select='gt(scene,$th)',metadata=print:file=-" -f null - 2>/dev/null \
  | { grep -o 'pts_time:[0-9.]*' || true; } | cut -d: -f2)
# lone one-frame luma spikes (qa_frames.py) catch cuts between similar-brightness colours that the scene score misses
spikes=$(python3 "$d0/qa_frames.py" "$f" --json 2>/dev/null | python3 -c "import json,sys; print('\n'.join(str(p['t']) for p in json.load(sys.stdin)['unplanned_pops']))" || true)
cuts=$(printf '%s\n%s\n' "$scene" "$spikes" | awk 'NF' | sort -n | awk 'NR==1||$1-p>0.1{printf "%s ",$1} {p=$1}')
echo "duration ${dur}s"
echo "cuts (scene > $th): ${cuts:-none}"
awk -v d="$dur" -v c="$cuts" 'BEGIN{n=split(c,a," "); prev=0; printf "shot lengths:"; for(i=1;i<=n;i++){printf " %.2f",a[i]-prev; prev=a[i]} printf " %.2f\n",d-prev;
  printf "shots %d, mean %.2fs, cuts per 10 s %.1f\n", n+1, d/(n+1), n/d*10}'
[ -z "$ct" ] && ct=$(awk -v d="$dur" 'BEGIN{printf "%.2f,%.2f,%.2f", d*0.1, d*0.5, d*0.9}')
IFS=, read -ra ts <<< "$ct"
for t in "${ts[@]}"; do
  rgb=$(ffmpeg -v error -ss "$t" -i "$f" -frames:v 1 -vf "crop=64:64:40:40,scale=1:1:flags=area,format=rgb24" -f rawvideo - | od -An -tu1 | tr -s ' ')
  set -- $rgb; printf "stage colour at %ss: #%02x%02x%02x\n" "$t" "$1" "$2" "$3"
done
