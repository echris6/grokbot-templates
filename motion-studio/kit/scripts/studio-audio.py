#!/usr/bin/env python3
"""Original, licence-clean audio for Draft samples: a 120 BPM warm bed with a real ending, and a small UI sound family.

  studio-audio.py track out.wav [--seed 7]       14 s: 6 bars (Cmaj7 Am7 Fmaj7 G6 Cmaj7 G6), then a final hit at 12.000 s
                                                  ringing out ~1.8 s. Back-time it with backtime-music.py --hit 12.0.
  studio-audio.py sfx <dir>                       tick.wav (key/selection), click.wav (button press), pop.wav (state
                                                  change), whoosh.wav (soft air pass, little energy under 150 Hz)

Everything is synthesised by this script, so the output is covered by the kit's MIT licence and can ship anywhere.
It is a decent bed for an unsolicited 10 s sample, not a substitute for a real library track on paid work: the kit's
clients rejected synthesised scores and effects as "not professional" (references/audio.md). For paid films, use
licensed library tracks the user approves. Needs numpy and ffmpeg.
"""
import argparse
import os
import subprocess

import numpy as np

SR = 48000
BPM = 120.0
BEAT = 60.0 / BPM


def write(path, x):
    x = np.asarray(x, np.float32)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", path],
                   input=np.clip(x, -1, 1).tobytes(), check=True)


def env(n, attack, decay):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)


def keys(freqs, dur, decay=0.9, bright=0.35):
    """Electric-piano-ish chord: a few decaying harmonics per note, slightly detuned."""
    n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros(n)
    for f in freqs:
        for h, a in ((1, 1.0), (2, bright), (3, bright * 0.35), (4, bright * 0.12)):
            out += a * np.sin(2 * np.pi * f * h * t * (1 + 0.0007 * h)) * np.exp(-t * (1 + h * 0.8) / decay)
    return out * env(n, 0.004, 10) / max(1, len(freqs))


def kick(rng):
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 52 + 70 * np.exp(-t * 28)
    return 0.9 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def noise_hit(rng, dur, lo, hi, decay, amp):
    n = int(dur * SR); x = rng.standard_normal(n)
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(n, 1 / SR); X[(fr < lo) | (fr > hi)] = 0
    return amp * np.fft.irfft(X, n) * env(n, 0.002, decay)


def note(name):
    names = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    return 440.0 * 2 ** ((names[name[0]] + 12 * (int(name[-1]) + 1) - 69) / 12)


def track(out, seed):
    rng = np.random.RandomState(seed)
    chords = [["C4", "E4", "G4", "B4"], ["A3", "C4", "E4", "G4"], ["F3", "A3", "C4", "E4"],
              ["G3", "B3", "D4", "E4"], ["C4", "E4", "G4", "B4"], ["G3", "B3", "D4", "E4"]]
    roots = ["C2", "A1", "F1", "G1", "C2", "G1"]
    bars, hit_t = len(chords), 12.0
    n = int(14.0 * SR); mix = np.zeros((n, 2))

    def add(sig, t0, pan=0.0, gain=1.0):
        i = int(round(t0 * SR)); j = min(n, i + len(sig))
        if i >= n:
            return
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        mix[i:j, 0] += gain * l * sig[:j - i] * 1.41; mix[i:j, 1] += gain * r * sig[:j - i] * 1.41

    for b in range(bars):
        t0 = b * 4 * BEAT
        fr = [note(x) for x in chords[b]]
        for k, off in enumerate((0.0, 1.5, 2.5)):            # keys: on 1, the and of 2, and 3.5 (a gentle push)
            add(keys(fr, 1.6, 0.8 if k == 0 else 0.5), t0 + off * BEAT, pan=-0.15, gain=0.32 if k == 0 else 0.2)
        rf = note(roots[b])
        for off in (0.0, 1.5, 2.0, 3.5):                      # bass
            m = int(0.45 * SR); tt = np.arange(m) / SR
            add(0.5 * np.sin(2 * np.pi * rf * tt) * env(m, 0.006, 0.35), t0 + off * BEAT, gain=0.55)
        for beat in range(4):
            add(kick(rng), t0 + beat * BEAT, gain=0.55 if beat in (0, 2) else 0.32)
            if beat in (1, 3):
                add(noise_hit(rng, 0.25, 900, 6000, 0.07, 0.35), t0 + beat * BEAT, pan=0.1)
            for e in (0.0, 0.5):
                add(noise_hit(rng, 0.06, 7000, 14000, 0.018, 0.12 if e else 0.07), t0 + (beat + e) * BEAT, pan=0.3)
    # the ending: kick + a wide Cmaj9 stab + low C, ringing out under the end card
    add(kick(rng), hit_t, gain=0.8)
    add(keys([note(x) for x in ["C3", "G3", "B3", "D4", "E4"]], 2.0, 1.4, 0.45), hit_t, pan=-0.2, gain=0.55)
    add(keys([note(x) for x in ["C3", "G3", "B3", "D4", "E4"]], 2.0, 1.4, 0.45), hit_t + 0.012, pan=0.2, gain=0.45)
    m = int(1.9 * SR); tt = np.arange(m) / SR
    add(0.6 * np.sin(2 * np.pi * note("C2") * tt) * env(m, 0.005, 0.7), hit_t, gain=0.6)
    mix *= 10 ** (-3 / 20) / (np.abs(mix).max() + 1e-9)
    write(out, mix)
    print(f"{out}: 14.0 s, 120 BPM, final hit at {hit_t:.3f} s (use backtime-music.py --hit {hit_t})")


def sfx(d, seed=11):
    rng = np.random.RandomState(seed); os.makedirs(d, exist_ok=True)
    m = int(0.05 * SR); t = np.arange(m) / SR
    tick = noise_hit(rng, 0.05, 2500, 7000, 0.006, 0.5) + 0.25 * np.sin(2 * np.pi * 1700 * t) * env(m, 0.001, 0.01)
    write(os.path.join(d, "tick.wav"), tick)
    m = int(0.09 * SR); t = np.arange(m) / SR
    click = 0.6 * np.sin(2 * np.pi * (900 + 600 * np.exp(-t * 60)) * t) * env(m, 0.001, 0.018) \
        + noise_hit(rng, 0.09, 1500, 5000, 0.008, 0.25)
    write(os.path.join(d, "click.wav"), click)
    m = int(0.22 * SR); t = np.arange(m) / SR
    pop = 0.5 * (np.sin(2 * np.pi * 784 * t) + 0.5 * np.sin(2 * np.pi * 1175 * t)) * env(m, 0.003, 0.07)
    write(os.path.join(d, "pop.wav"), pop)
    m = int(0.45 * SR); t = np.arange(m) / SR
    w = noise_hit(rng, 0.45, 300, 5000, 10, 0.5) * np.sin(np.pi * t / 0.45) ** 2
    write(os.path.join(d, "whoosh.wav"), w)
    print(f"{d}: tick.wav click.wav pop.wav whoosh.wav")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["track", "sfx"])
    ap.add_argument("out")
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()
    track(a.out, a.seed) if a.cmd == "track" else sfx(a.out)


if __name__ == "__main__":
    main()
