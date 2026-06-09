#!/usr/bin/env bash
# scope-lint.sh — detect orphaned @scope: tags and scope_owns/tag-set drift.
#
# Two cheap consistency checks (read-only, mutates nothing):
#
#   1. Orphaned tag — a scenario tagged @scope:<slug> whose <slug>.json
#      manifest doesn't exist. Means the discussion was deleted but tags
#      weren't cleaned up, OR the tag is a typo.
#
#   2. scope_owns / tag-set drift — for manifests with a populated
#      scope_owns array, every scenario tagged @scope:<slug> should
#      reference at least one §X.Y-NNN listed in scope_owns. Mismatch
#      means the convenience list is stale relative to the source of
#      truth (the tags).
#
# Exit 0 if clean, 1 if any orphans or drift found.
#
# Optional helper — only useful in projects that tag Gherkin scenarios in
# features/*.feature with @scope:<slug> for discussion↔test traceability.
#
# Compatible with bash 3.2 (macOS default) — no associative arrays.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

findings=0

# 1. Enumerate manifest slugs on disk → sorted list.
manifest_slugs=$(
  for f in docs/discussions/*.json; do
    [[ -f "$f" ]] || continue
    basename "$f" .json
  done | sort -u
)

# 2. Enumerate unique @scope:<slug> tags across features/*.feature.
scope_slugs=$(grep -ohE "@scope:[A-Za-z0-9_-]+" features/*.feature 2>/dev/null \
  | sed 's/^@scope://' | sort -u || true)

# 3. Orphan check: scope_slugs not in manifest_slugs.
echo "== Orphan check (tag → manifest) =="
orphans=$(comm -23 <(printf "%s\n" "$scope_slugs") <(printf "%s\n" "$manifest_slugs") | grep -v '^$' || true)
orphan_count=0
if [[ -n "$orphans" ]]; then
  while IFS= read -r slug; do
    [[ -n "$slug" ]] || continue
    locations=$(grep -lE "@scope:${slug}([[:space:]]|$)" features/*.feature 2>/dev/null | tr '\n' ' ')
    echo "  ORPHAN  @scope:${slug}  (no manifest at docs/discussions/${slug}.json; tagged in: ${locations})"
    orphan_count=$((orphan_count + 1))
  done <<< "$orphans"
fi
if (( orphan_count == 0 )); then
  echo "  ok — every @scope: tag resolves to a manifest"
fi
findings=$((findings + orphan_count))

# 4. Drift check: per manifest with scope_owns populated, every tag-line
#    matching @scope:<slug> must contain an @ref:§X.Y-NNN listed in scope_owns.
echo ""
echo "== Drift check (scope_owns ↔ scenario @ref tags) =="
drift_count=0
for f in docs/discussions/*.json; do
  [[ -f "$f" ]] || continue
  slug=$(jq -r '.slug // ""' "$f")
  [[ -n "$slug" ]] || continue
  n_owned=$(jq -r '.scope_owns // [] | length' "$f")
  (( n_owned > 0 )) || continue

  owns_list=$(jq -r '.scope_owns[]' "$f" | sort -u)
  owns_inline=$(echo "$owns_list" | tr '\n' ' ' | sed 's/ $//')

  # For every tag-line carrying @scope:<slug>, extract its @ref:§X.Y-NNN
  # tokens and confirm at least one is in owns_list.
  while IFS= read -r tag_line; do
    [[ -n "$tag_line" ]] || continue
    refs=$(echo "$tag_line" | grep -oE "@ref:§[0-9]+\.[0-9]+-[0-9]+" | sed 's/^@ref://' | sort -u || true)
    if [[ -z "$refs" ]]; then
      preview=$(echo "$tag_line" | sed 's/^ *//; s/  */ /g' | cut -c1-160)
      echo "  DRIFT   scope=${slug}: tagged line carries no @ref tokens"
      echo "          line: ${preview}"
      drift_count=$((drift_count + 1))
      continue
    fi
    # Intersection of refs ∩ owns_list — non-empty means at least one match.
    overlap=$(comm -12 <(printf "%s\n" "$refs") <(printf "%s\n" "$owns_list") | grep -v '^$' || true)
    if [[ -z "$overlap" ]]; then
      refs_inline=$(echo "$refs" | tr '\n' ' ' | sed 's/ $//')
      echo "  DRIFT   scope=${slug}: scenario @refs (${refs_inline}) not in scope_owns (${owns_inline})"
      drift_count=$((drift_count + 1))
    fi
  done < <(grep -hE "@scope:${slug}([[:space:]]|$)" features/*.feature 2>/dev/null || true)
done
if (( drift_count == 0 )); then
  echo "  ok — every tagged scenario references a §X.Y-NNN in its scope_owns"
fi
findings=$((findings + drift_count))

echo ""
if (( findings == 0 )); then
  echo "scope-lint: clean (0 orphans, 0 drift)"
  exit 0
else
  echo "scope-lint: ${findings} finding(s)"
  exit 1
fi
