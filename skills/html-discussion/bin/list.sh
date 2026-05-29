#!/usr/bin/env bash
# list.sh <slug>
# Print manifest summary: section IDs, snippet types, slot-fill keys.

set -euo pipefail

slug="${1:-}"
[[ -n "$slug" ]] || { echo "usage: list.sh <slug>" >&2; exit 1; }

manifest="docs/discussions/$slug.json"
[[ -f "$manifest" ]] || { echo "no manifest: $manifest" >&2; exit 1; }

theme=$(jq -r .theme "$manifest")
created=$(jq -r .created "$manifest")
updated=$(jq -r .updated "$manifest")
count=$(jq '.sections | length' "$manifest")

echo "Page:    $slug"
echo "Theme:   $theme"
echo "Created: $created"
echo "Updated: $updated"
echo "Sections ($count):"
if [[ "$count" -eq 0 ]]; then
  echo "  (none yet — add with add-section.sh)"
else
  jq -r '.sections[] | "  \(.id)  →  \(.snippet)  \( (.fills // {}) | keys | if length>0 then "fills: " + join(", ") else "" end)"' "$manifest"
fi
