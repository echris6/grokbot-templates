#!/usr/bin/env bash
# Report whether each named secret is visible to the shell. Never prints values.
#   bash check-env.sh WHOP_API_KEY APIFY_TOKEN HF_API_KEY_ID HF_API_KEY_SECRET
missing=0
for n in "$@"; do
  if [ -n "${!n:-}" ]; then printf '%-22s set\n' "$n"
  else printf '%-22s MISSING\n' "$n"; missing=1; fi
done
exit $missing
