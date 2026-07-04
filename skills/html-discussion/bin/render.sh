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

# Start from shell with theme substituted. @import lines are hoisted to
# {{THEME_IMPORTS}} (top of <style>) because CSS discards @import rules that
# appear after other rules; the rest stays at {{THEME_CSS}} (end of <style>).
out_html="docs/discussions/$slug.html"
tmp_shell=$(mktemp)
awk -v slug="$slug" '
  /\{\{THEME_IMPORTS\}\}/ { while ((getline line < theme) > 0) if (line ~ /^[ \t]*@import/) print line; close(theme); next }
  /\{\{THEME_CSS\}\}/ { while ((getline line < theme) > 0) if (line !~ /^[ \t]*@import/) print line; close(theme); next }
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

  # Apply fills. Newline-safe (iterate keys, fetch each value whole) and
  # literal (value passed via ENVIRON and spliced with index/substr, so &,
  # backslashes and regex metacharacters survive untouched).
  while IFS= read -r key; do
    [[ -z "$key" ]] && continue
    val=$(echo "$section" | jq -r --arg k "$key" '.fills[$k]')
    tmp=$(mktemp)
    RV_KEY="{{$key}}" RV_VAL="$val" awk '
      BEGIN { k = ENVIRON["RV_KEY"]; v = ENVIRON["RV_VAL"] }
      {
        out = ""; s = $0
        while (i = index(s, k)) { out = out substr(s, 1, i - 1) v; s = substr(s, i + length(k)) }
        print out s
      }
    ' "$rendered" > "$tmp"
    mv "$tmp" "$rendered"
  done < <(echo "$section" | jq -r '.fills // {} | keys[]')

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

# Preserve the shipped banner: render rebuilds from shell + manifest, which
# would otherwise silently drop the banner ship-page.sh appended. The manifest
# carries everything needed to reconstruct it.
status=$(jq -r '.status // "draft"' "$manifest")
if [[ "$status" == "shipped" ]] && ! grep -q 'class="merged-banner"' "$out_html"; then
  shipped_at=$(jq -r '.shipped_at // ""' "$manifest")
  short_sha="$(jq -r '.shipped_commit // ""' "$manifest")"
  short_sha="${short_sha:0:7}"
  banner="<div class=\"merged-banner\" style=\"background: rgba(120, 140, 93, 0.12); border-left: 4px solid var(--olive, #788C5D); padding: 12px 18px; margin: 0 0 24px 0; border-radius: 6px; font-size: 14px;\">✓ Shipped ${shipped_at} · commit <code>${short_sha}</code></div>"
  tmp=$(mktemp)
  awk -v banner="$banner" '
    /<body[^>]*>/ && !inserted { print; print banner; inserted = 1; next }
    { print }
  ' "$out_html" > "$tmp"
  mv "$tmp" "$out_html"
fi

echo "Rendered: $out_html"
