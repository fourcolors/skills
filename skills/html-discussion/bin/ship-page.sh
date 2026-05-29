#!/usr/bin/env bash
# ship-page.sh <slug> [--commit <sha>] [--no-banner] [--no-rebuild]
#
# Mechanical "this scope shipped" action:
#   1. Flip manifest status → "shipped"
#   2. Stamp shipped_at (UTC ISO date) + shipped_commit (HEAD or --commit)
#   3. Append a <div class="merged-banner"> to the HTML (unless --no-banner
#      or one already exists)
#   4. Rebuild INDEX.html via build.py (unless --no-rebuild)
#
# @scope:<slug> tags on features are NOT stripped — they stay permanently
# as provenance. See docs/WORKFLOW.md "Tags as provenance".
#
# Idempotent: re-running on an already-shipped slug is a no-op (warns and
# exits 0), so it's safe in scripted flows.
#
# Rebuild runs unconditionally so a stale INDEX from a prior crashed run
# (e.g., manifest mutation succeeded but build.py was SIGKILL'd / OOM'd)
# gets recovered on re-run. build.py is idempotent — zero diff on
# unchanged input — so re-running it is cheap.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

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

# Always rebuild INDEX first. build.py is idempotent (zero diff on unchanged
# input per its docstring), so running it before the early-exit costs nothing
# in the happy case and recovers a stale INDEX if a prior run crashed between
# the manifest flip and the rebuild step.
if [[ "$do_rebuild" == "1" ]]; then
  echo "↻ rebuilding INDEX (pre-flight recovery pass)..."
  python3 scripts/traceability/build.py > /dev/null
  echo "✓ INDEX rebuilt"
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
  python3 scripts/traceability/build.py > /dev/null
  echo "✓ INDEX rebuilt"
fi

echo ""
echo "Done. $slug is shipped."
echo "Verify: open docs/discussions/INDEX.html"
