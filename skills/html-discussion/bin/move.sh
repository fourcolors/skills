#!/usr/bin/env bash
# move.sh <slug> <section-id> --before|--after <other-id>
# Reorder sections by ID. Bytes never touch Claude — pure script operation.

set -euo pipefail

slug="${1:-}"
id="${2:-}"
direction="${3:-}"
other="${4:-}"

[[ -n "$slug" && -n "$id" && -n "$direction" && -n "$other" ]] || {
  echo "usage: move.sh <slug> <section-id> --before|--after <other-id>" >&2; exit 1; }
[[ "$direction" == "--before" || "$direction" == "--after" ]] || {
  echo "direction must be --before or --after" >&2; exit 1; }

manifest="docs/discussions/$slug.json"
html="docs/discussions/$slug.html"
[[ -f "$manifest" ]] || { echo "no manifest: $manifest" >&2; exit 1; }
[[ -f "$html" ]]     || { echo "no html: $html" >&2; exit 1; }

# Validate IDs exist in manifest
jq -e --arg id "$id"   '.sections | map(.id) | index($id)   // false' "$manifest" >/dev/null || {
  echo "id not in manifest: $id" >&2; exit 1; }
jq -e --arg id "$other" '.sections | map(.id) | index($id) // false' "$manifest" >/dev/null || {
  echo "other id not in manifest: $other" >&2; exit 1; }
[[ "$id" != "$other" ]] || { echo "id and other are the same" >&2; exit 1; }

# Extract the source section block from HTML (between @section:id=<id> and @endsection:<id>).
block=$(mktemp)
awk -v sid="$id" '
  index($0, "@section:id="sid)    { capture=1 }
  capture                          { print }
  index($0, "@endsection:"sid)     { capture=0; exit }
' "$html" > "$block"
[[ -s "$block" ]] || { echo "section markers not found in html: $id" >&2; exit 1; }

# Remove the source section from the HTML
removed=$(mktemp)
awk -v sid="$id" '
  index($0, "@section:id="sid)    { skip=1 }
  !skip                            { print }
  index($0, "@endsection:"sid)     { if (skip) { skip=0; next } }
' "$html" > "$removed"

# Re-insert the block at the new position
final=$(mktemp)
if [[ "$direction" == "--before" ]]; then
  awk -v block_file="$block" -v sid="$other" '
    index($0, "@section:id="sid) {
      while ((getline line < block_file) > 0) print line
      close(block_file)
    }
    { print }
  ' "$removed" > "$final"
else
  awk -v block_file="$block" -v sid="$other" '
    { print }
    index($0, "@endsection:"sid) {
      while ((getline line < block_file) > 0) print line
      close(block_file)
    }
  ' "$removed" > "$final"
fi

mv "$final" "$html"
rm -f "$block" "$removed"

# Update the manifest: rebuild sections array in the new order
jq --arg id "$id" --arg other "$other" --arg dir "$direction" --arg now "$(date -u +%FT%TZ)" '
  .sections as $all |
  ($all | map(select(.id != $id))) as $without |
  ($without | map(.id) | index($other)) as $ref |
  ($all | map(select(.id == $id)) | .[0]) as $moving |
  (if $dir == "--after" then $ref + 1 else $ref end) as $insert_at |
  .sections = ($without[:$insert_at] + [$moving] + $without[$insert_at:]) |
  .updated = $now
' "$manifest" > "$manifest.tmp" && mv "$manifest.tmp" "$manifest"

echo "Moved $id $direction $other"
