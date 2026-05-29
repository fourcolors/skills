#!/usr/bin/env bash
# new-page.sh <slug> [--theme <name>]
# Create docs/discussions/<YYYY-MM-DD>-<slug>.html + matching .json from the
# _shell.html template and chosen theme. If <slug> already starts with a date
# (YYYY-MM-DD-), it's used as-is; otherwise today's date is prepended.

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="docs/discussions"
mkdir -p "$OUT_DIR"

raw_slug="${1:-}"
[[ -n "$raw_slug" ]] || { echo "usage: new-page.sh <slug> [--theme <name>]" >&2; exit 1; }
shift

theme="warm-paper"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --theme) theme="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

# Auto-prepend today's date if slug doesn't already start with YYYY-MM-DD-
if [[ "$raw_slug" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}- ]]; then
  slug="$raw_slug"
else
  slug="$(date +%Y-%m-%d)-$raw_slug"
fi

shell_path="$SKILL_DIR/snippets/_shell.html"
theme_path="$SKILL_DIR/themes/${theme}.css"

[[ -f "$shell_path" ]] || { echo "missing shell: $shell_path" >&2; exit 1; }
[[ -f "$theme_path" ]] || { echo "missing theme: $theme_path" >&2; exit 1; }

out_html="$OUT_DIR/$slug.html"
out_json="$OUT_DIR/$slug.json"

# Substitute {{THEME_CSS}} and {{TITLE}} in shell. Read theme into a file
# so awk doesn't choke on multi-line values via -v.
tmp=$(mktemp)
{
  awk -v slug="$slug" '
    /\{\{THEME_CSS\}\}/ { while ((getline line < theme) > 0) print line; close(theme); next }
    { gsub(/\{\{TITLE\}\}/, slug); print }
  ' theme="$theme_path" "$shell_path"
} > "$tmp"
mv "$tmp" "$out_html"

# Initialize manifest
# - status starts as "draft"; /crystallize flips to "active" once decisions
#   land in canon, /discussion ship flips to "shipped" at terminal commit.
# - shipped_at / shipped_commit / archived_reason populated by lifecycle commands.
# - scope_owns is a convenience list of §X.Y-NNN commitments this scope owns
#   (source of truth for scenario membership is the @scope:<slug> tag set).
# See docs/WORKFLOW.md "Scope lifecycle" for the full schema.
jq -n --arg slug "$slug" --arg theme "$theme" --arg now "$(date -u +%FT%TZ)" \
  '{
     slug: $slug,
     theme: $theme,
     status: "draft",
     shipped_at: null,
     shipped_commit: null,
     archived_reason: null,
     scope_owns: [],
     sections: [],
     created: $now,
     updated: $now
   }' > "$out_json"

echo "Created: $out_html"
echo "         $out_json (theme: $theme)"
echo "Slug for subsequent commands: $slug"
