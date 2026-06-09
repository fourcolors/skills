#!/usr/bin/env bash
# ship-page.sh <slug> [--commit <sha>] [--no-banner] [--no-rebuild]
#
# Mechanical "this scope shipped" action:
#   1. Flip manifest status → "shipped"
#   2. Stamp shipped_at (UTC ISO date) + shipped_commit (HEAD or --commit)
#   3. Append a <div class="merged-banner"> to the HTML (unless --no-banner
#      or one already exists)
#   4. Rebuild INDEX.html via the project's INDEX builder, if one exists
#      (unless --no-rebuild)
#
# @scope:<slug> tags on features are NOT stripped — they stay permanently
# as provenance.
#
# Idempotent: re-running on an already-shipped slug is a no-op (warns and
# exits 0), so it's safe in scripted flows.
#
# The INDEX builder is project-specific and OPTIONAL. Point
# DISCUSSION_INDEX_BUILDER at yours; when the file doesn't exist the rebuild
# step is skipped with a note. When present, the rebuild runs both before the
# early-exit (recovering a stale INDEX from a prior crashed run) and after
# the mutation — so the builder must be idempotent.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

INDEX_BUILDER="${DISCUSSION_INDEX_BUILDER:-scripts/traceability/build.py}"
rebuild_index() {
  if [[ -f "$INDEX_BUILDER" ]]; then
    case "$INDEX_BUILDER" in
      *.py) python3 "$INDEX_BUILDER" > /dev/null ;;
      *)    "$INDEX_BUILDER" > /dev/null ;;
    esac
    echo "✓ INDEX rebuilt"
  else
    echo "  (no INDEX builder at $INDEX_BUILDER — skipping INDEX rebuild)"
  fi
}

slug="${1:-}"
[[ -n "$slug" ]] || { echo "usage: ship-page.sh <slug> [--commit <sha>] [--no-banner] [--no-rebuild]" >&2; exit 1; }
shift

commit=""
do_banner=1
do_rebuild=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --commit) commit="$2"; shift 2 ;;
    --no-banner) do_banner=0; shift ;;
    --no-rebuild) do_rebuild=0; shift ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

json="docs/discussions/${slug}.json"
html="docs/discussions/${slug}.html"

[[ -f "$json" ]] || { echo "manifest missing: $json" >&2; exit 1; }
[[ -f "$html" ]] || { echo "html missing: $html" >&2; exit 1; }

# Always attempt the rebuild first: it costs nothing in the happy case and
# recovers a stale INDEX if a prior run crashed between the manifest flip
# and the rebuild step.
if [[ "$do_rebuild" == "1" ]]; then
  echo "↻ rebuilding INDEX (pre-flight recovery pass)..."
  rebuild_index
fi

current_status=$(jq -r '.status // "active"' "$json")
if [[ "$current_status" == "shipped" ]]; then
  echo "warn: $slug already shipped (status=shipped) — no-op" >&2
  exit 0
fi

[[ -n "$commit" ]] || commit=$(git rev-parse HEAD)
shipped_at=$(date -u +%F)

tmp=$(mktemp)
jq --arg sa "$shipped_at" --arg sc "$commit" --arg now "$(date -u +%FT%TZ)" \
  '.status = "shipped" | .shipped_at = $sa | .shipped_commit = $sc | .updated = $now' \
  "$json" > "$tmp"
mv "$tmp" "$json"
echo "✓ manifest: $json → status=shipped, shipped_at=$shipped_at, shipped_commit=${commit:0:7}"

if [[ "$do_banner" == "1" ]]; then
  if grep -q 'class="merged-banner"' "$html"; then
    echo "  (banner already present in $html — skipping append)"
  else
    short_sha="${commit:0:7}"
    banner="<div class=\"merged-banner\" style=\"background: rgba(120, 140, 93, 0.12); border-left: 4px solid var(--olive, #788C5D); padding: 12px 18px; margin: 0 0 24px 0; border-radius: 6px; font-size: 14px;\">✓ Shipped ${shipped_at} · commit <code>${short_sha}</code></div>"
    # Insert immediately after the opening <body> tag (or <body ...>).
    awk -v banner="$banner" '
      /<body[^>]*>/ && !inserted {
        print
        print banner
        inserted = 1
        next
      }
      { print }
    ' "$html" > "$tmp"
    mv "$tmp" "$html"
    echo "✓ banner appended to $html"
  fi
fi

if [[ "$do_rebuild" == "1" ]]; then
  echo "↻ rebuilding INDEX (post-mutation)..."
  rebuild_index
fi

echo ""
echo "Done. $slug is shipped."
echo "Verify: open docs/discussions/INDEX.html"
