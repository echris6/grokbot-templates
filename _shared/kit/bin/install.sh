#!/usr/bin/env bash
# Idempotent tool install for one template on the Grok Bot computer (Debian, sudo available).
# Re-run after a computer Update / Recover / Reset: those wipe installed packages,
# node_modules and Python venvs. Prints one line per tool: ok / installed / FAILED.
#
#   bash install.sh <ai-influencer|motion-studio|spatial-studio|launchpad>
set -u
T="${1:-}"
[ -n "$T" ] || { echo "usage: install.sh <template>"; exit 2; }
KIT="$(cd "$(dirname "$0")/../../.." && pwd)"
VENV=/workspace/.venv-grokbot
FAIL=0

say() { printf '%-14s %s\n' "$1" "$2"; }
have() { command -v "$1" >/dev/null 2>&1; }
apt_get() { sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$@" >/dev/null 2>&1; }

need_apt() {  # need_apt <command> <package>
  if have "$1"; then say "$1" ok
  else
    { [ -f /tmp/.grokbot-apt-updated ] || { sudo apt-get update -qq >/dev/null 2>&1; touch /tmp/.grokbot-apt-updated; }; }
    if apt_get "$2" && have "$1"; then say "$1" installed; else say "$1" FAILED; FAIL=1; fi
  fi
}

need_node22() {
  if have node && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ]; then say node "ok ($(node -v))"; return; fi
  if curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - >/dev/null 2>&1 && apt_get nodejs && have node; then
    say node "installed ($(node -v))"
  else say node FAILED; FAIL=1; fi
}

need_npm_global() {  # need_npm_global <command> <package>
  if have "$1"; then say "$1" ok
  elif sudo npm install -g "$2" >/dev/null 2>&1 && have "$1"; then say "$1" installed
  else say "$1" FAILED; FAIL=1; fi
}

need_venv() {  # python packages live in one venv under /workspace (wiped by Recover: rebuilt here)
  if [ ! -x "$VENV/bin/pip" ]; then   # test pip, not python: a venv made without ensurepip has no pip
    need_apt python3 python3
    rm -rf "$VENV"
    python3 -m venv "$VENV" >/dev/null 2>&1 || { apt_get python3-venv; rm -rf "$VENV"; python3 -m venv "$VENV" >/dev/null 2>&1; }
  fi
  [ -x "$VENV/bin/pip" ] || { say venv FAILED; FAIL=1; return; }
  if [ $# -gt 0 ]; then
    if "$VENV/bin/pip" install -q "$@" >/dev/null 2>&1; then say "py:$*" ok; else say "py:$*" FAILED; FAIL=1; fi
  fi
}

# Every template sells through Whop and keeps state in git-friendly files.
need_apt git git
need_apt curl curl
need_apt jq jq
need_node22
need_npm_global whop @whop/cli

case "$T" in
  ai-influencer)
    need_apt ffmpeg ffmpeg
    need_apt chromium chromium        # guide_pdf.py prints the guide PDF with headless Chromium
    need_venv google-genai
    ;;
  motion-studio)
    need_apt ffmpeg ffmpeg
    need_npm_global hyperframes hyperframes
    if have hyperframes; then   # hyperframes needs its own headless Chrome; ensure it, then verify
      hyperframes browser ensure >/dev/null 2>&1
      hyperframes doctor --json >/tmp/hf-doctor.json 2>/dev/null   # always exits 0; read the payload
      # Top-level .ok is false whenever an OPTIONAL check fails (Kokoro, MusicGen, Docker), so gate
      # only on what rendering needs.
      if jq -e '[.checks[] | select(.name|test("^(Node.js|FFmpeg|FFprobe|Chrome)"))] | (length>=4 and all(.ok))' \
           /tmp/hf-doctor.json >/dev/null 2>&1; then say hf-doctor "ok (node, ffmpeg, ffprobe, chrome)"
      else say hf-doctor "FAILED (see /tmp/hf-doctor.json)"; FAIL=1; fi
    fi
    need_venv numpy scipy
    ;;
  spatial-studio)
    need_apt ffmpeg ffmpeg
    need_apt pdftoppm poppler-utils   # renders PDF floor plans to images
    # three.js core is plain ES modules served locally; the capture script uses Playwright.
    if [ -d "$KIT/spatial-studio/kit/core/node_modules/playwright" ]; then say playwright ok
    elif (cd "$KIT/spatial-studio/kit/core" && npm install --silent >/dev/null 2>&1 \
          && npx playwright install --with-deps chromium >/dev/null 2>&1); then say playwright installed
    else say playwright FAILED; FAIL=1; fi
    ;;
  launchpad) ;;
  *) echo "unknown template: $T"; exit 2 ;;
esac

# Shims in /workspace/bin pick the venv python at RUN time, so a Recover that wipes the venv gives
# a clear "run install.sh" message instead of a broken path.
mkdir -p /workspace/bin
for s in "$KIT"/_shared/kit/bin/*.py; do
  n="$(basename "$s" .py)"; [ "$n" = "_http" ] && continue
  cat > "/workspace/bin/$n" <<SHIM
#!/usr/bin/env bash
V="$VENV/bin/python"
if [ -x "\$V" ]; then exec "\$V" "$s" "\$@"; fi
if grep -q "google import genai" "$s"; then echo "kit venv missing (computer was reset?): run bash $KIT/_shared/kit/bin/install.sh <this template>" >&2; exit 3; fi
exec python3 "$s" "\$@"
SHIM
  chmod +x "/workspace/bin/$n"
done
grep -q '/workspace/bin' "$HOME/.bashrc" 2>/dev/null || echo 'export PATH="/workspace/bin:$PATH"' >> "$HOME/.bashrc"
say kit-shims "ok (/workspace/bin, added to PATH in ~/.bashrc)"

[ $FAIL -eq 0 ] && echo "INSTALL OK" || { echo "INSTALL INCOMPLETE: re-run, or tell the user which line FAILED"; exit 1; }
