#!/usr/bin/env bash
# Four checks on the public surface. Fails when a country-specific term is back,
# when a line frames the product as circumvention (second check), when the old
# product name "Burrow" is used (third check), or on the word "bypass" (fourth check).
# The lists and the approved vocabulary live in CONTRIBUTING.md ("Wording rules").
# Case-insensitive, Latin and Cyrillic; the Cyrillic terms are stems, so every case
# ending matches. Language labels ("the panel is in Russian", lang/ru.md) are
# allowed on purpose: only geographic / positioning uses are banned.
# Excluded from the scan: this script and CONTRIBUTING.md (they quote the lists),
# .git, images.
#
# Third check: the product is Homeport. The old name "Burrow" (whole word, any case)
# fails outside the allow-list below: CHANGELOG.md (history), the rename spec (the
# rename record) and this script. Lines that contain an allowed fixed string are skipped.
set -u
export LC_ALL=C.UTF-8
ROOT="${1:-.}"
FAIL=0
PATTERN='\bRKN\b|Roskomnadzor|Роскомнадзор|Sberbank|Сбербанк|\bСбер(а|у|ом|е)?\b|обход[а-яё]* блокиров[а-яё]*|бел[а-яё]+ спис|whitelist|Russian (sites?|exit|banks?|IPs?|address(es)?|cards?|hosting|hosters?|providers?|laws?|carriers?|networks?|users?|households?)|VPN for Russians|works in Russia|\bin Russia\b|\bРосси[яиюе]|российск|\bРФ\b'
HITS=$(grep -rniE "$PATTERN" \
  --exclude-dir=.git --exclude='*.png' --exclude='*.jpg' --exclude='*.pyc' \
  --exclude='wording-guard.sh' --exclude='CONTRIBUTING.md' \
  "$ROOT" || true)
if [ -n "$HITS" ]; then
  echo "banned wording found (see CONTRIBUTING.md, Wording rules):"
  echo "$HITS"
  FAIL=1
fi

# Circumvention framing. Narrow patterns on purpose: "apps that refuse VPN connections
# keep working" passes; the six phrasings below fail. The word "bypass" fails in any
# form on its own, in the fourth check.
CIRCUMVENTION="evad(e|es|ing) (block|censor|detect|filter)|circumvent|get around (the )?block|when (it'?s |you'?re )?blocked|unblock|keeps? working when"
FRAMING_HITS=$(grep -rniE "$CIRCUMVENTION" \
  --exclude-dir=.git --exclude='.git' --exclude='*.png' --exclude='*.jpg' --exclude='*.pyc' \
  --exclude='wording-guard.sh' --exclude='CONTRIBUTING.md' \
  "$ROOT" || true)
if [ -n "$FRAMING_HITS" ]; then
  echo "circumvention framing found (see CONTRIBUTING.md, Wording rules):"
  echo "$FRAMING_HITS"
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

# Fourth check: the word "bypass" (bypasses, bypassed, bypassing), whole word, any case.
# The skill's panel has a word for each thing the skill's docs used it for: a device's
# route goes "through the tunnel" or "direct", and the domains that skip the tunnel are
# the "exceptions". Nothing is allowed here. (homeport-skill's guard allows one name, the
# relay's nftables set `bypass`, which this site has no reason to mention.)
BYPASS='\bbypass(es|ed|ing)?\b'
BYPASS_HITS=$(grep -rniEI "$BYPASS" \
  --exclude-dir=.git --exclude='.git' --exclude='*.png' --exclude='*.jpg' --exclude='*.webp' --exclude='*.pyc' \
  --exclude='wording-guard.sh' --exclude='CONTRIBUTING.md' \
  "$ROOT" || true)
if [ -n "$BYPASS_HITS" ]; then
  echo '"bypass" found: say "through the tunnel" or "exceptions" (see CONTRIBUTING.md, Wording rules):'
  echo "$BYPASS_HITS"
  FAIL=1
fi

[ "$FAIL" -eq 0 ] || exit 1
echo "wording guard: 0 hits"
