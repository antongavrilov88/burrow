#!/usr/bin/env bash
# Fails when a country-specific term is back in the public surface.
# The list and the approved vocabulary live in CONTRIBUTING.md ("Wording rules").
# Case-insensitive, Latin and Cyrillic. Language labels ("the panel is in Russian",
# lang/ru.md) are allowed on purpose: only geographic / positioning uses are banned.
# Excluded from the scan: this script and CONTRIBUTING.md (they quote the list),
# .git, images.
#
# Second check: the product is Homeport. The old name "Burrow" (whole word, any case)
# fails outside the allow-list below: CHANGELOG.md (history), the rename spec (the
# rename record) and this script. Lines that contain an allowed fixed string are skipped.
set -u
export LC_ALL=C.UTF-8
ROOT="${1:-.}"
FAIL=0
PATTERN='\bRKN\b|Roskomnadzor|Роскомнадзор|Sberbank|Сбербанк|\bСбер\b|обход блокировок|белы[йе] спис|whitelist|Russian (sites?|exit|banks?|IPs?|address(es)?|cards?|hosting|hosters?|providers?|laws?|carriers?|networks?|users?|households?)|VPN for Russians|works in Russia|\bin Russia\b|\bРосси[яию]|российск|\bРФ\b'
HITS=$(grep -rniE "$PATTERN" \
  --exclude-dir=.git --exclude='*.png' --exclude='*.jpg' --exclude='*.pyc' \
  --exclude='wording-guard.sh' --exclude='CONTRIBUTING.md' \
  "$ROOT" || true)
if [ -n "$HITS" ]; then
  echo "banned wording found (see CONTRIBUTING.md, Wording rules):"
  echo "$HITS"
  FAIL=1
fi

# Fixed strings allowed to keep the old name. The Telegram bot keeps its handle
# until #85 decides it; CONTRIBUTING.md names the old name once to state this rule.
# A line containing one of these is skipped whole, so keep each on a line of its own.
OLD_NAME_ALLOWED='t.me/burrow_vpn_bot
@burrow_vpn_bot
The old name `Burrow` fails the same guard'
OLD=$(grep -rniEI '\bburrow\b' \
  --exclude-dir=.git --exclude='.git' --exclude='*.png' --exclude='*.jpg' --exclude='*.webp' --exclude='*.pyc' \
  --exclude='wording-guard.sh' --exclude='CHANGELOG.md' --exclude='2026-09-26-homeport-rename.md' \
  "$ROOT" | grep -v -F -f <(printf '%s\n' "$OLD_NAME_ALLOWED") || true)
if [ -n "$OLD" ]; then
  echo "old name found: the product is Homeport (see CONTRIBUTING.md, Wording rules):"
  echo "$OLD"
  FAIL=1
fi

[ "$FAIL" -eq 0 ] || exit 1
echo "wording guard: 0 hits"
