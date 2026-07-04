#!/usr/bin/env bash
# add-section.sh <slug> <snippet> [--fills key=val,key=val,...]
# Append a snippet to the page; update the manifest.
# Snippet HTML lives at <skill>/snippets/<snippet>.html.
# Slot fills replace {{KEY}} placeholders inside the snippet.
# NOTE: the k=v,k=v grammar has no escape for a literal comma in a value
# (comma is the pair separator) - a value containing one will be split at
# that comma. For fill values with commas, add the section with a
# placeholder and then edit .fills in the manifest directly with jq,
# followed by render.sh.

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

slug="${1:-}"
snippet="${2:-}"
[[ -n "$slug" && -n "$snippet" ]] || {
  echo "usage: add-section.sh <slug> <snippet> [--fills key=val,key=val,...]" >&2; exit 1; }
shift 2

fills=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --fills) fills="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

manifest="docs/discussions/$slug.json"
html="docs/discussions/$slug.html"
snippet_path="$SKILL_DIR/snippets/${snippet}.html"

[[ -f "$manifest" ]] || { echo "no manifest: $manifest" >&2; exit 1; }
[[ -f "$html" ]]     || { echo "no html: $html" >&2; exit 1; }
[[ -f "$snippet_path" ]] || { echo "no snippet: $snippet_path" >&2; exit 1; }

# Next section id: ${NN}-${snippet}
count=$(jq '.sections | length' "$manifest")
nn=$(printf "%02d" "$((count + 1))")
section_id="${nn}-${snippet}"

# Read snippet into a temp file; apply slot fills.
rendered=$(mktemp)
cp "$snippet_path" "$rendered"

# Parsed once here; the manifest update below reuses these same pairs
# (rather than re-parsing $fills independently) so the HTML actually
# rendered and the fills recorded in the manifest can never diverge.
keys=() vals=()
if [[ -n "$fills" ]]; then
  IFS=',' read -ra pairs <<< "$fills"
  for pair in "${pairs[@]}"; do
    key="${pair%%=*}"
    val="${pair#*=}"
    keys+=("$key")
    vals+=("$val")
    # Literal replace: value passed via ENVIRON and spliced with index/substr,
    # so &, backslashes and regex metacharacters survive untouched.
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
  done
fi

# Build the section block (with anchor comments) and inject before @insertion-point.
block=$(mktemp)
{
  echo ""
  echo "<!-- @section:id=${section_id} snippet=${snippet} -->"
  cat "$rendered"
  echo "<!-- @endsection:${section_id} -->"
} > "$block"

tmp=$(mktemp)
awk -v block_file="$block" '
  /<!-- @insertion-point -->/ {
    while ((getline line < block_file) > 0) print line
    close(block_file)
  }
  { print }
' "$html" > "$tmp"
mv "$tmp" "$html"

rm -f "$rendered" "$block"

# Update manifest. Built from the same keys[]/vals[] parsed above (not a
# fresh split of $fills) so it exactly matches what was substituted into
# the HTML above - see the parsing note at the top of this script.
fills_json="{}"
if [[ ${#keys[@]} -gt 0 ]]; then
  fills_json="{}"
  for idx in "${!keys[@]}"; do
    fills_json=$(jq --arg k "${keys[$idx]}" --arg v "${vals[$idx]}" '. + {($k): $v}' <<< "$fills_json")
  done
fi

jq --arg id "$section_id" --arg snippet "$snippet" --argjson fills "$fills_json" --arg now "$(date -u +%FT%TZ)" \
  '.sections += [{id: $id, snippet: $snippet, fills: $fills}] | .updated = $now' \
  "$manifest" > "$manifest.tmp" && mv "$manifest.tmp" "$manifest"

echo "Added: $section_id  ($snippet)"
