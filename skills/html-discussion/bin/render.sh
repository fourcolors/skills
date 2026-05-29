#!/usr/bin/env bash
# render.sh <slug>
# Re-emit HTML from manifest + snippets + active theme.
# Use when manifest is the source of truth (e.g., after editing manifest directly,
# or after a snippet definition changes).

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

slug="${1:-}"
[[ -n "$slug" ]] || { echo "usage: render.sh <slug>" >&2; exit 1; }

manifest="docs/discussions/$slug.json"
[[ -f "$manifest" ]] || { echo "no manifest: $manifest" >&2; exit 1; }

theme=$(jq -r .theme "$manifest")
shell_path="$SKILL_DIR/snippets/_shell.html"
theme_path="$SKILL_DIR/themes/${theme}.css"

[[ -f "$shell_path" ]] || { echo "missing shell: $shell_path" >&2; exit 1; }
[[ -f "$theme_path" ]] || { echo "missing theme: $theme_path" >&2; exit 1; }

# Start from shell with theme substituted
out_html="docs/discussions/$slug.html"
tmp_shell=$(mktemp)
awk -v slug="$slug" '
  /\{\{THEME_CSS\}\}/ { while ((getline line < theme) > 0) print line; close(theme); next }
  { gsub(/\{\{TITLE\}\}/, slug); print }
' theme="$theme_path" "$shell_path" > "$tmp_shell"

# Build the sections block
sections_block=$(mktemp)
echo "" > "$sections_block"

jq -c '.sections[]' "$manifest" | while IFS= read -r section; do
  sid=$(echo "$section" | jq -r .id)
  snippet=$(echo "$section" | jq -r .snippet)
  snippet_path="$SKILL_DIR/snippets/${snippet}.html"

  if [[ ! -f "$snippet_path" ]]; then
    echo "warning: snippet missing, skipping: $snippet_path" >&2
    continue
  fi

  rendered=$(mktemp)
  cp "$snippet_path" "$rendered"

  # Apply fills
  while IFS= read -r kv; do
    [[ -z "$kv" ]] && continue
    key="${kv%%=*}"
    val="${kv#*=}"
    tmp=$(mktemp)
    awk -v k="{{$key}}" -v v="$val" '{gsub(k,v); print}' "$rendered" > "$tmp"
    mv "$tmp" "$rendered"
  done < <(echo "$section" | jq -r '.fills // {} | to_entries[] | "\(.key)=\(.value)"')

  {
    echo ""
    echo "<!-- @section:id=${sid} snippet=${snippet} -->"
    cat "$rendered"
    echo "<!-- @endsection:${sid} -->"
  } >> "$sections_block"

  rm -f "$rendered"
done

# Insert sections block before @insertion-point
final=$(mktemp)
awk -v block_file="$sections_block" '
  /<!-- @insertion-point -->/ {
    while ((getline line < block_file) > 0) print line
    close(block_file)
  }
  { print }
' "$tmp_shell" > "$final"

mv "$final" "$out_html"
rm -f "$tmp_shell" "$sections_block"

echo "Rendered: $out_html"
