#!/usr/bin/env python3
"""Fill the Motion Studio starter (kit/starter) with one product's public materials.

  fill.py --project <job>/film --brief <job>/brief.json [--res 720|1080]

Copy the starter first:  cp -r /workspace/grokbot-templates/motion-studio/kit/starter <job>/film
brief.json (the make-sample skill writes it; every text field is verbatim from the product's own pages):
  {
    "name": "Acme", "tagline": "...", "facts": ["...", "..."], "cta": "Launching Oct 28 on Product Hunt",
    "url": "acme.com", "label": "Unsolicited sample · made from your public materials",
    "shots": ["/abs/path/shot1.png", {"path": "/abs/path/page.png", "crop": [0.15, 0.2, 0.7, 0.8]}, ...],
             (1-3 images; crop = [x, y, w, h] as fractions, to cut a page capture down to the product UI)
    "logo": "/abs/path/logo.png" | null,
    "colors": {"stage": "#...", "ink": "#...", "accent": "#..."}  (optional: palette.py fills gaps),
    "focus": {"x": 0.3, "y": 0.25, "w": 0.4, "h": 0.35}   (the region of shot 1 that lifts out in shot 2, 0..1;
                                                          pick the product's key UI, wider than tall),
    "font": "/abs/path/BrandFont.ttf" | null              (optional: else the shipped Inter, SIL OFL)
  }
Relative paths in brief.json are resolved from the brief's own folder. Capture screenshots at 2x (e.g. 2880x1800):
shot 2 zooms into the focus region, so low-res captures turn soft.
What it does: copies shots to assets/shot-1..3.png (max 3200 px wide), the logo to assets/logo.png (or a blank),
sets the font, derives readable colour roles (action = accent if it reads on the stage at 3:1, else ink; onAction,
panel, glow, cta), checks ink on stage >= 4.5, writes sample.config.js and sets the size (1280x720 Draft, else 1080p).
Prints one JSON object. Needs ffmpeg and python3 only.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
INTER = "https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf"


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def contrast(a, b):
    def lum(rgb):
        def ch(c):
            c /= 255
            return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
        r, g, b_ = (ch(c) for c in rgb)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b_
    la, lb = sorted((lum(hex_rgb(a)), lum(hex_rgb(b))), reverse=True)
    return round((la + 0.05) / (lb + 0.05), 2)


def mix(a, b, k):
    return "#%02x%02x%02x" % tuple(round(x + (y - x) * k) for x, y in zip(hex_rgb(a), hex_rgb(b)))


def light(h):
    r, g, b = hex_rgb(h)
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.5


def to_png(src, dst, max_w=3200, crop=None):
    vf = f"scale='min({max_w},iw)':-2"
    if crop:
        x, y, w, h = crop
        vf = f"crop=iw*{w}:ih*{h}:iw*{x}:ih*{y}," + vf
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-frames:v", "1", "-vf", vf, dst], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--brief", required=True)
    ap.add_argument("--res", choices=["720", "1080"], default="720")
    a = ap.parse_args()
    P = os.path.abspath(a.project)
    if not os.path.exists(os.path.join(P, "index.html")):
        sys.exit(f"{P}/index.html not found: copy kit/starter there first")
    b = json.load(open(a.brief))
    base = os.path.dirname(os.path.abspath(a.brief))
    rel = lambda p: p if (not p or os.path.isabs(p)) else os.path.join(base, p)
    b["shots"] = [{"path": rel(p), "crop": None} if isinstance(p, str) else {"path": rel(p["path"]), "crop": p.get("crop")}
                  for p in b.get("shots", [])]
    b["logo"] = rel(b.get("logo"))
    b["font"] = rel(b.get("font"))
    notes = []

    for k in ("name", "tagline", "cta"):
        if not str(b.get(k, "")).strip():
            sys.exit(f"brief.json needs '{k}'")
    facts = [f for f in b.get("facts", []) if str(f).strip()]
    if len(facts) < 2:
        sys.exit("brief.json needs at least 2 verbatim facts")
    shots = [s for s in b.get("shots", []) if os.path.exists(s["path"])]
    if not shots:
        sys.exit("brief.json needs at least 1 existing screenshot path")
    if len(shots) < 3:
        notes.append(f"only {len(shots)} screenshot(s); reusing them for the missing shots")

    assets = os.path.join(P, "assets")
    os.makedirs(os.path.join(assets, "fonts"), exist_ok=True)
    for i in range(3):
        sh = shots[min(i, len(shots) - 1)]
        to_png(sh["path"], os.path.join(assets, f"shot-{i + 1}.png"), crop=sh["crop"])
    logo = b.get("logo")
    if logo and os.path.exists(logo):
        to_png(logo, os.path.join(assets, "logo.png"), 1200)
        has_logo = True
    else:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "color=c=black@0.0:s=4x4,format=rgba",
                        "-frames:v", "1", os.path.join(assets, "logo.png")], check=True)
        has_logo = False

    font_dst = os.path.join(assets, "fonts", "display.ttf")
    font = b.get("font")
    if font and os.path.exists(font):
        shutil.copyfile(font, font_dst)
        font_src = os.path.basename(font)
    elif os.path.exists(font_dst):
        font_src = "Inter (SIL Open Font License, shipped with the kit)"
    else:
        try:
            urllib.request.urlretrieve(INTER, font_dst)
            font_src = "Inter (SIL Open Font License, downloaded)"
        except Exception as e:  # offline: fall back to the system sans
            fc = subprocess.run(["fc-match", "-f", "%{file}", "sans-serif:bold"], capture_output=True, text=True)
            if fc.returncode == 0 and os.path.exists(fc.stdout):
                shutil.copyfile(fc.stdout, font_dst)
                font_src = f"system font {os.path.basename(fc.stdout)} (Inter download failed: {e})"
            else:
                font_src = "none: the render falls back to sans-serif"
                notes.append("no font file; install one or pass brief.font")

    colors = dict(b.get("colors") or {})
    if not all(colors.get(k) for k in ("stage", "ink", "accent")):
        pal = json.loads(subprocess.run([sys.executable, os.path.join(HERE, "palette.py"), "--json"]
                                        + [os.path.join(assets, f"shot-{i + 1}.png") for i in range(3)]
                                        + ([logo] if has_logo else []), capture_output=True, text=True,
                                        check=True).stdout)["suggested"]
        for k in ("stage", "ink", "accent"):
            colors.setdefault(k, pal[k])
        notes.append(f"colours from palette.py: {pal}; confirm them against the product's site")
    c_ink = contrast(colors["ink"], colors["stage"])
    if c_ink < 4.5:
        notes.append(f"ink on stage is {c_ink}:1 (< 4.5); pick a darker or lighter ink")
    # action: the colour of the cursor's target, the outline and the CTA. Dark, monochrome brands often have no accent
    # that reads on their own stage; then the ink colour does the job.
    if contrast(colors["accent"], colors["stage"]) >= 3.0:
        colors["action"] = colors["accent"]
    else:
        notes.append(f"accent {colors['accent']} is {contrast(colors['accent'], colors['stage'])}:1 on the stage (< 3.0); "
                     "using the ink colour for the action, outline and CTA")
        colors["action"] = colors["ink"]
    colors["cta"] = colors["action"]
    colors["onAction"] = max([colors["stage"], colors["ink"], "#ffffff", "#000000"], key=lambda c: contrast(c, colors["action"]))
    colors["panel"] = "#ffffff" if light(colors["stage"]) else mix(colors["stage"], colors["ink"], 0.10)
    mono = colors["action"] == colors["ink"]          # monochrome brand: a grey cloud looks dirty, keep the glow faint
    colors["glow"] = colors["action"] + ("10" if mono else ("2e" if light(colors["stage"]) else "24"))
    c_cta = contrast(colors["cta"], colors["stage"])

    cfg = {
        "name": b["name"].strip(), "tagline": b["tagline"].strip(), "facts": facts[:3], "cta": b["cta"].strip(),
        "url": b.get("url", "").strip(), "label": b.get("label", ""), "colors": colors, "logo": has_logo,
        "focus": b.get("focus") or {"x": 0.22, "y": 0.18, "w": 0.56, "h": 0.42},
    }
    with open(os.path.join(P, "sample.config.js.tmp"), "w") as f:
        f.write("// Written by kit/scripts/fill.py from brief.json. Edit brief.json and re-run instead of editing this.\n")
        f.write("window.SAMPLE = " + json.dumps(cfg, indent=2, ensure_ascii=False) + ";\n")
    os.replace(os.path.join(P, "sample.config.js.tmp"), os.path.join(P, "sample.config.js"))

    w, h = (1280, 720) if a.res == "720" else (1920, 1080)
    idx = os.path.join(P, "index.html")
    s = open(idx).read()
    s = re.sub(r'data-width="\d+"', f'data-width="{w}"', s, count=1)
    s = re.sub(r'data-height="\d+"', f'data-height="{h}"', s, count=1)
    s = re.sub(r'<meta name="viewport" content="width=\d+, height=\d+" />',
               f'<meta name="viewport" content="width={w}, height={h}" />', s, count=1)
    with open(idx + ".tmp", "w") as f:
        f.write(s)
    os.replace(idx + ".tmp", idx)

    print(json.dumps({"project": P, "size": f"{w}x{h}", "font": font_src, "colors": colors,
                      "contrast": {"ink_on_stage": c_ink, "cta_on_stage": contrast(colors['cta'], colors['stage'])},
                      "logo": has_logo, "notes": notes,
                      "next": f"cd {P} && hyperframes check && hyperframes render --quality draft "
                              f"--fps 30 --output ../renders/sample-r1.mp4"}, indent=1))


if __name__ == "__main__":
    main()
