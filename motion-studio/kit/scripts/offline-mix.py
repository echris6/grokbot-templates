#!/usr/bin/env python3
"""offline-mix.py: mix a silent picture render with a music score and per-event sound effects, levelled in each
effect's own band. Ported from motion-video-kit (MIT) and made film-agnostic for Motion Studio.

Project layout (--project, usually /workspace/motion-studio/jobs/<job-id>/film):
  assets/music/<score>.mp3|wav      assets/sfx/<name>.mp3
  assets/sfx/plan.json  [[name, film_time_s, target_dB_over_music_in_band, note, (floor_dBFS), (peak_cap_dB)], ...]
Usage:
  offline-mix.py <picture.mp4> <out.mp4> --project <dir> --score <file in assets/music> [--no-sfx] [--music-lufs -32]
        [--hf-cap 4] [--mfloor -50] [--hfloor -50] [--pkcap 6] [--pkfloor -20]
        [--ring-at <film s> --ring-db <dB>]        lift a ring-out that sits too far under the bed (off by default)
        [--drop-dip a:b --drop-dip-db -2.5]        a post-compressor dip before a drop (off by default)
        [--build-gain 1.0] [--write-events]
Run once with --no-sfx to make the music-only version (always delivered).
Music chain: -3 dB low shelf at 90 Hz, 3:1 compression, -3 dB high shelf at 5 kHz, a second gentle compressor, then
gain to the target integrated loudness and a 1.2 s fade at the end. Effects: each placed at its time, its gain solved so
its 50 ms in-band peak sits target dB over the music's in-band peak in the same window; then the 2-8 kHz lift is capped
at --hf-cap dB and the sample peak at --pkcap dB over the local music peak (per-event caps override it for hero moves).
Writes out.mp4 (picture stream copied untouched + AAC 256k) and <project>/review/mix-<out>.txt (per-event report).
Needs ffmpeg (ebur128), numpy and scipy.
"""
import json, subprocess, sys, re, os
import numpy as np
from scipy.signal import butter, sosfilt
from pathlib import Path
SR = 48000
args = sys.argv[1:]
if len(args) < 2 or '--project' not in args or '--score' not in args: sys.exit(__doc__)
pic, out = args[0], args[1]
opt = lambda k, d: args[args.index(k) + 1] if k in args else d
P = Path(opt('--project', '.')).resolve(); (P / 'renders').mkdir(exist_ok=True)
score = opt('--score', ''); target_lufs = float(opt('--music-lufs', '-32')); HF_CAP = float(opt('--hf-cap', '4'))  # the client's rule: 2-8 kHz lift <= ~4 dB
no_sfx = '--no-sfx' in args
def load(p): return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout, np.float32).reshape(-1, 2).copy()
def lufs(x):
    tmp = P / 'renders/_lufs.wav'; write(tmp, x)
    e = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(tmp), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', e)[-1]), float((re.findall(r'Peak:\s+(-?[\d.]+) dBFS', e) or ['nan'])[-1]), float((re.findall(r'LRA:\s+([\d.]+) LU', e) or ['nan'])[-1])
def write(p, x): subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', str(p)], input=np.clip(x, -1, 1).astype(np.float32).tobytes(), check=True)
def pk(y): h = int(.05 * SR); return max(10 * np.log10((y[i:i + h] ** 2).mean() + 1e-12) for i in range(0, max(1, len(y) - h), h // 2))
FILM = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', pic], capture_output=True, text=True, check=True).stdout.strip())
N = int(FILM * SR)
# ---- music stem ----
raw = P / 'renders/_music_chain.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(P / 'assets/music' / score), '-af',
                'lowshelf=f=90:g=-3,acompressor=threshold=-24dB:ratio=3:attack=4:release=140:knee=6:makeup=1,highshelf=f=5000:g=-3,acompressor=threshold=-30dB:ratio=2.5:attack=1:release=90:knee=4',  # 2nd stage: music-critic-1 (A2 intro spikes 19/73 -> 0/73 windows >4.5 dB)
                '-ar', str(SR), '-ac', '2', '-t', f'{FILM:.3f}', str(raw)], check=True)
mus = load(raw)[:N]; mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))
L0 = lufs(mus)[0]; mg = 10 ** ((target_lufs - L0) / 20); mus *= mg
fade = np.ones(N, np.float32); f0 = int(max(0, FILM - 1.2) * SR); fade[f0:] = np.linspace(1, 0, N - f0) ** 1.5; mus *= fade[:, None]
RING = float(opt('--ring-db', '0')); RING_AT = opt('--ring-at', None)   # kit: a ring-out sat 15-25 dB under the bed; lift it (100 ms ramp)
if RING and RING_AT:
    r0 = int(float(RING_AT) * SR); ramp = np.ones(N, np.float32); ramp[r0:] = 10 ** (RING / 20); k = min(int(.1 * SR), N - r0)
    ramp[r0:r0 + k] = np.linspace(1, 10 ** (RING / 20), k); mus *= ramp[:, None]
# optional dip before a drop, applied after the compressors (before them it gets flattened out; see audio.md)
DIPW = opt('--drop-dip', None); DIP = float(opt('--drop-dip-db', '-2.5'))
if DIPW:
    a0, a1 = (float(v) for v in DIPW.split(':'))
    d0, d1, rr = int(a0 * SR), int(a1 * SR), int(.01 * SR); dg = np.ones(N, np.float32); lv = 10 ** (DIP / 20)
    dg[d0:d1] = lv; dg[d0:d0 + rr] = np.linspace(1, lv, rr); dg[d1 - rr:d1] = np.linspace(lv, 1, rr); mus *= dg[:, None]
mono_m = mus.mean(1)
# ---- effects ----
fx = np.zeros_like(mus); rep = []; ev_out = []
plan = [] if no_sfx else json.loads((P / 'assets/sfx/plan.json').read_text())
HB = butter(4, [2000, 8000], btype='band', fs=SR, output='sos')
PKCAP = float(opt('--pkcap', '6')); PKFLOOR = float(opt('--pkfloor', '-20')); MFLOOR = float(opt('--mfloor', '-50')); HFLOOR = float(opt('--hfloor', '-50'))
build_gain = float(opt('--build-gain', '1.0'))
for ev in plan:
    name, t, target, note = ev[:4]; floor = ev[4] if len(ev) > 4 else MFLOOR   # optional per-event floor (dBFS in-band peak)
    pkc = ev[5] if len(ev) > 5 else PKCAP                                     # optional per-event peak cap (dB over the local music peak)
    s = load(P / 'assets/sfx' / f'{name}.mp3'); m1 = s.mean(1)
    F = np.abs(np.fft.rfft(m1 * np.hanning(len(m1)))) ** 2; f = np.fft.rfftfreq(len(m1), 1 / SR); c = np.cumsum(F) / F.sum()
    lo = max(f[np.searchsorted(c, .2)], 60); hi = min(max(f[np.searchsorted(c, .8)], lo * 2), SR / 2 - 500); sos = butter(4, [lo, hi], btype='band', fs=SR, output='sos')
    i = int(t * SR); W = min(len(m1), int(.4 * SR)); seg_m = mono_m[max(0, i - SR // 2):i + W + SR // 2]
    mpk = pk(sosfilt(sos, seg_m)[SR // 2:SR // 2 + W]); epk = pk(sosfilt(sos, m1)[:W])
    # floors: over near-silent music (a dead stop, a sparse intro) "+N dB over the music" would make an effect inaudible, so the
    # reference never drops below MFLOOR in-band, and the 2-8 kHz cap is measured against at least HFLOOR (Duo, lib cues)
    mpk_ref = max(mpk, floor)
    if os.environ.get("MIXDBG"): print(f"DBG {t:6.2f} mpk {mpk:.1f} hf {pk(sosfilt(HB, seg_m)[SR // 2:SR // 2 + W]):.1f}")
    g = 10 ** ((mpk_ref + target - epk) / 20)
    # 2-8 kHz cap: the lift of (music + effect) over music in the ear-sensitive band
    def hf_lift(g):
        a = seg_m.copy(); k = min(W, len(seg_m) - SR // 2); a[SR // 2:SR // 2 + k] += g * m1[:k]
        return pk(sosfilt(HB, a)[SR // 2:SR // 2 + W]) - max(pk(sosfilt(HB, seg_m)[SR // 2:SR // 2 + W]), HFLOOR)
    hl = hf_lift(g)
    while hl > HF_CAP and g > 1e-4: g *= .85; hl = hf_lift(g)
    # peak cap (Duo, client: "too loud"): the effect's sample peak may sit at most PKCAP dB over the music's local peak (floored)
    k0 = min(len(m1), len(seg_m) - SR // 2); mloc = max(20 * np.log10(np.abs(seg_m[SR // 2:SR // 2 + W]).max() + 1e-9), PKFLOOR)
    while 20 * np.log10(g * np.abs(m1[:k0]).max() + 1e-9) > mloc + pkc and g > 1e-4: g *= .9
    j = min(N, i + len(s)); fx[i:j] += g * s[:j - i]
    e = np.zeros_like(seg_m); k = min(len(m1), len(seg_m) - SR // 2); e[SR // 2:SR // 2 + k] = g * m1[:k]
    inb = pk(sosfilt(sos, seg_m + e)[SR // 2:SR // 2 + W]) - mpk
    # film-critic-3: also report BODY, the 150 ms in-band RMS of (music + effect) over music alone (what a listener hears as weight)
    b0, b1 = SR // 2, SR // 2 + int(.15 * SR); rms = lambda y: 10 * np.log10((y[b0:b1] ** 2).mean() + 1e-12)
    body = rms(sosfilt(sos, seg_m + e)) - rms(sosfilt(sos, seg_m))
    rep.append(f'{t:6.2f} {name:14s} band {int(lo):5d}-{int(hi):5d} Hz  target +{target:.0f}  in-band lift {inb:+5.1f} dB  body {body:+5.1f} dB  2-8k lift {hl:+5.1f} dB  gain {g:.4f}  {note}')
    ev_out.append([name, t, round(len(s) / SR + .05, 3), round(float(g) / mg * build_gain, 4)])
mix = mus + fx
peak = np.abs(mix).max(); lim = 10 ** (-1.5 / 20)
if peak > lim: mix *= lim / peak  # safety only; the mix is quiet by design
wav = P / f'renders/_mix-{Path(out).stem}.wav'; write(wav, mix)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', pic, '-i', str(wav), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', out], check=True)
Lm, _, _ = lufs(mus); Lx, tp, lra = lufs(mix)
hdr = f'score {score}: music-only {Lm:.1f} LUFS (chain gain {20*np.log10(mg):+.1f} dB); mix {Lx:.1f} LUFS, LRA {lra}, true peak {tp} dBFS; {len(plan)} effects'
(P / 'review').mkdir(exist_ok=True); (P / f'review/mix-{Path(out).stem}.txt').write_text(hdr + '\n' + '\n'.join(rep) + '\n')
if plan and '--write-events' in args: (P / 'assets/sfx/events.json').write_text(json.dumps(ev_out, indent=0))
print(hdr); print('\n'.join(rep))
