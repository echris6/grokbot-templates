# First-run setup protocol (all templates)

Each template's `skills/setup/SKILL.md` follows these steps in order. Every step is **idempotent**: run it again and it only fixes what's missing. Setup runs again after a computer **Update / Recover / Reset**, because those wipe installed packages.

## 0. Before anything
Tell the user, in one message:
- what the template does
- what they'll need: accounts, about 15 minutes, and a rough monthly cost
- that the Bot never posts, sends or charges without their yes
- the consent rule (`guardrails.md` §3): no footage or photo of a real person goes to any generation API without a consent record, which the Bot writes only from the user's own quoted words (`/workspace/bin/consent_record`)

Create `/workspace/<template>/consent/`.

## 1. Install the kit
The template link carries only the Bot's profile, skills, routines and memories. The scripts live in the companion repo:

The kit is pinned to a **release tag** (`KIT_REF`, from the template's `setup.md`), so a template never changes under its users and setup never runs unreviewed code with `sudo`. To update, the user changes the tag on purpose.

```bash
set -e
KIT=/workspace/grokbot-templates
KIT_REF=v1.0.0     # from the template's setup.md
REPO=https://github.com/echris6/grokbot-templates
if [ -d "$KIT/.git" ]; then
  git -C "$KIT" fetch -q --depth 1 origin tag "$KIT_REF" || { echo "KIT FETCH FAILED for $KIT_REF: stop and tell the user"; exit 1; }
  git -C "$KIT" checkout -q "$KIT_REF"
elif [ -f "$KIT/.kit-ref" ] && [ "$(cat "$KIT/.kit-ref")" = "$KIT_REF" ] && [ -f "$KIT/_shared/kit/bin/install.sh" ]; then
  :   # tarball copy already at this tag
else
  rm -rf "$KIT"
  git clone -q --depth 1 --branch "$KIT_REF" "$REPO" "$KIT" 2>/dev/null \
  || { mkdir -p "$KIT" && curl -fsSL "$REPO/archive/refs/tags/$KIT_REF.tar.gz" | tar -xz --strip-components=1 -C "$KIT"; } \
  || true
  if [ ! -f "$KIT/_shared/kit/bin/install.sh" ]; then
    rm -rf "$KIT"; echo "KIT DOWNLOAD FAILED for $KIT_REF: stop and tell the user"; exit 1
  fi
  [ -d "$KIT/.git" ] || echo "$KIT_REF" > "$KIT/.kit-ref"   # marker written only after a verified download
fi
bash "$KIT/_shared/kit/bin/install.sh" <template>      # installs tools for this template only
export PATH="/workspace/bin:$PATH"                      # kit shims; skills also call them by absolute path
```

## 2. Check the skills arrived
A known Grok Bot bug: skills shown in a template's preview can be missing after install. For every skill folder in `$KIT/<template>/skills/`:
1. Check the skill is listed in the Bot's `/` menu.
2. If it's missing, save it again from the file. Ask the Bot to "save this as a skill" using the file's text.
3. If saving fails, copy the file to `/home/box/agent-data/workflows/<name>/SKILL.md`.

Report which skills were restored.

## 3. Interview
Run the template's interview: 5–8 questions, one message at a time, multiple-choice where possible. Every template asks:
1. what the user is already good at, or does for work
2. whether they have an audience or clients already, and where
3. their monthly budget for tools and generations
4. hours per week
5. whether they're comfortable sending outreach themselves
6. their quality tier for paid work (`quality-tiers.md`)

The answers go into `/workspace/<template>/config.json` (`state.md`). The template then suggests **3 directions** that fit those answers, and the user picks one.

## 4. Connect apps, secrets and approval rules
List only what this template needs, with why each one is needed. Then:

**a. Test how secrets reach the shell, before asking for any real key.**
- Ask the user to save a dummy secret named `GROKBOT_TEST` (value `hello-test`) with the secure secret card, then run `bash $KIT/_shared/kit/bin/check-env.sh GROKBOT_TEST`.
- Grok Bot documents named, env-var secrets only for Team Bots (Bot details → **Secrets**). For personal Bots the card's behaviour in the shell isn't documented, so this test decides the path:
  - **`set`:** use the card for every key.
  - **`MISSING`:** tell the user plainly. Their options are (1) turn this Bot into a Team Bot (even a team of one) and add the keys under **Secrets**, or (2) use plugin and OAuth paths only: the Whop connector, or `whop login --method oauth`, plus the Apify plugin. Scripts that need a key, such as Higgsfield, stay unavailable until (1) is done. Never put a key in a file as a workaround.

**b. Plugins.**
- Connect each one in **Connect apps** (Whop, Apify, …).
- Ask each connector for its tool list, save the names to `config.json`, and call one read-only tool to confirm it works. For Whop, list the businesses and confirm `account_id` with the user.

**c. Secrets.** The user saves each key under the exact env var name in the template's `setup.md`. Then run `check-env.sh <NAMES…>`, which prints `set` / `MISSING` and **never the value**.

**d. Whop.** Confirm the selected business: connector → list businesses; CLI → `whop auth status`. If the user went the API-key route, walk them through creating the key with the custom permission set in `guardrails.md` §1.

**e. Approval rules (a second line of defence).** The user does this, not the Bot. Rule creation from chat isn't documented.
1. Open **Settings → General → Auto-review** and check that Auto-review is **on**. The rules only apply when it is.
2. Add these **Ask first** rules, phrased by effect so they apply "by any path" (shell, a shim, `python3 …`, or a connector):
   - creating, updating, publishing, deleting, refunding or deploying anything on Whop, by any path. Read-only list/get calls are fine.
   - starting a paid generation (Higgsfield Genjutsu, Gemini Omni, Grok Imagine video), by any path
   - an Apify run with a spend cap above $1, by any path
   - sending any email or message. The Bot's own email already requires the user to press Send.

Auto-review is a model's judgement, not a hard lock. The hard limits are the **scoped Whop key** (no payouts, transfers or refunds) and the user pressing Send.

**Team Bot warning:** in chats where nobody can answer an approval, Team Bots run without Auto-review unless an Enterprise admin turns on **Enforce Auto-review** (Grok Bot teams docs). If the user chose a Team Bot in step 4a, keep its routines prepare-only. Every routine in these templates already only prepares and notifies.

Read the list back to the user and confirm it.

## 5. Paid-service test (only for templates that need one)
One tiny real call per paid service, with its cost stated and approved first. Examples: one Apify run with `maxItems: 3`, one 4-second Higgsfield object-swap at 480p, one Grok Imagine image. Save the outputs under `/workspace/<template>/setup-test/`.

## 6. Create the critic (Motion Studio, Spatial Studio)
Create the helper Bot **"<Template> Critic"** with the profile in the template's `critic-profile.md`. Send it one test packet, and check the report lands where the packet said it should.

## 7. Routines
A known Grok Bot bug: routines in a template may not materialize on import. Create each routine from `routines.md` **paused**, show the user the schedule and timezone, and enable each one only when the user says so.

## 8. Done
Send a short summary:
- what's connected
- what was tested, and what it cost
- the first daily run time
- the one thing to do tomorrow

Write `setup_completed_at` to `config.json`.
