#!/usr/bin/env bash
# scope-status.sh [<slug>]
#
# One-shot scope summary. Shows: manifest status, owned commitments,
# tagged scenarios in features/, what features_runner would execute.
#
# No arg: auto-detects the most-recently-updated active manifest.
# With slug: uses that explicit slug.
#
# Read-only. Mutates nothing. Safe to run anytime.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

slug="${1:-}"

# Auto-detect: most-recently-updated manifest with status=active
if [[ -z "$slug" ]]; then
  slug=$(
    for f in docs/discussions/*.json; do
      [[ -f "$f" ]] || continue
      status=$(jq -r '.status // "unknown"' "$f")
      if [[ "$status" == "active" ]]; then
        updated=$(jq -r '.updated // ""' "$f")
        slug_field=$(jq -r '.slug // ""' "$f")
        echo "$updated|$slug_field"
      fi
    done | sort -r | head -1 | cut -d'|' -f2
  )

  if [[ -z "$slug" ]]; then
    echo "No active scope found in docs/discussions/*.json." >&2
    echo "Pass a slug explicitly: scope-status.sh <slug>" >&2
    exit 1
  fi
  echo "(auto-detected most recent active scope)"
  echo ""
fi

json="docs/discussions/${slug}.json"
html="docs/discussions/${slug}.html"

[[ -f "$json" ]] || { echo "manifest not found: $json" >&2; exit 1; }

# Header
status=$(jq -r '.status // "unknown"' "$json")
shipped_at=$(jq -r '.shipped_at // ""' "$json")
shipped_commit_full=$(jq -r '.shipped_commit // ""' "$json")
shipped_commit="${shipped_commit_full:0:7}"
archived_reason=$(jq -r '.archived_reason // ""' "$json")
scope_owns=$(jq -r '.scope_owns // [] | join(", ")' "$json")
n_owned=$(jq -r '.scope_owns // [] | length' "$json")

status_line="$status"
case "$status" in
  shipped)
    [[ -n "$shipped_at" ]] && status_line="$status · shipped $shipped_at"
    [[ -n "$shipped_commit" ]] && status_line="$status_line · ${shipped_commit}"
    ;;
  archived)
    [[ -n "$archived_reason" ]] && status_line="$status · $archived_reason"
    ;;
esac

printf "Scope:         %s\n" "$slug"
printf "Status:        %s\n" "$status_line"
[[ -f "$html" ]] && printf "Document:      %s\n" "$html"

if (( n_owned > 0 )); then
  printf "Owns:          %s (%d commitment%s)\n" "$scope_owns" "$n_owned" "$([[ $n_owned -eq 1 ]] && echo '' || echo 's')"
fi

# Tagged scenarios
echo ""
echo "Scenarios tagged @scope:$slug:"
# grep -A1 catches the Scenario: line that follows the tag line
matches=$(grep -A1 "@scope:$slug" features/*.feature 2>/dev/null \
  | grep "Scenario:" \
  | sed 's/.*Scenario: */  • /' || true)
n_scenarios=$(printf "%s" "$matches" | grep -c "^  •" || true)

if [[ -n "$matches" ]]; then
  printf "%s\n" "$matches"
else
  echo "  (none tagged yet — run /crystallize to wire features ↔ scope)"
fi

# Stubbed/notwired gating (the 4-condition AND from features/CLAUDE.md)
echo ""
gating=$(grep -A1 "@scope:$slug" features/*.feature 2>/dev/null \
  | grep -oE "@stubbed:[a-z_]+|@notwired:[a-z_]+" \
  | sort -u || true)
if [[ -n "$gating" ]]; then
  echo "Gating tags blocking green:"
  printf "%s\n" "$gating" | sed 's/^/  ⚠  /'
else
  if (( n_scenarios > 0 )); then
    echo "Gating tags: none — scenarios are eligible for green if tests + judge pass."
  fi
fi

# Runner verdict (only meaningful if scenarios exist)
if (( n_scenarios > 0 )); then
  echo ""
  echo "Runner verdict:"
  if runner_out=$(elixir .claude/skills/features/scripts/features_runner.exs "@scope:$slug" 2>&1); then
    verdict=$(echo "$runner_out" | grep -E "scenarios \(filter:" | tail -1 || true)
    if [[ -n "$verdict" ]]; then
      echo "  $verdict"
    else
      echo "  (runner produced no summary line — check output manually)"
    fi
  else
    echo "  ⚠  runner failed; run manually:"
    echo "     elixir .claude/skills/features/scripts/features_runner.exs @scope:$slug"
  fi
fi

echo ""
echo "Next:"
case "$status" in
  draft)    echo "  /crystallize docs/discussions/${slug}.html  — flip to active + tag scenarios" ;;
  active)   echo "  Work toward green; when shipped: /discussion ship $slug" ;;
  shipped)  echo "  (terminal — /discussion ship is a no-op on already-shipped scopes)" ;;
  archived) echo "  (terminal — archived means abandoned/superseded)" ;;
esac
