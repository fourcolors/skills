---
description: Open the discussion index (no args), scaffold a new thread (topic slug), or ship an existing one (`ship <slug>`).
argument-hint: [topic-slug] | ship <slug>
---

A one-step entrypoint for the discussion lifecycle. Three modes based on `$ARGUMENTS`:

**Mode 1 — no arguments:** open `docs/discussions/INDEX.html` in the browser. That's the morning landing page; most-recent threads are at the top (active work). Use this when the user just wants to see what's going on.

```
open docs/discussions/INDEX.html
```

Then say: "Opened INDEX. Top of the list = most active threads. Click into one to continue, or invoke `/discussion <topic>` to start something new."

**Mode 2 — topic slug provided:** scaffold a new discussion thread at `docs/discussions/<YYYY-MM-DD>-<slug>.html` and open it. The html-discussion skill's `new-page.sh` handles date prefixing automatically.

```
.claude/skills/html-discussion/bin/new-page.sh "$ARGUMENTS"
```

Capture the printed slug (the line beginning `Slug for subsequent commands:`). Then open the file:

```
open docs/discussions/<that-slug>.html
```

Then say: "New thread scaffolded at `docs/discussions/<slug>.html` and opened in browser. Manifest initialized with `status: \"draft\"`. Tell me what you want to think through — I'll add sections as we go using the html-discussion skill (add-section.sh, render.sh, move.sh). When the discussion's decisions crystallize, run `/crystallize docs/discussions/<slug>.html` to sync the catalog (and flip the manifest to `active`), then `/goal complete docs/discussions/<slug>.html` to dispatch implementation. When the work ships, run `/discussion ship <slug>` to flip the manifest to `shipped` and stamp the commit."

**Mode 3 — `ship <slug>` (the work shipped):** flip the manifest to `status: "shipped"`, stamp `shipped_at` + `shipped_commit` from `git rev-parse HEAD`, append a merged-banner to the HTML if absent, and rebuild INDEX. Tags on features (`@scope:<slug>`) stay in place as permanent provenance.

`$ARGUMENTS` for this mode is the literal string `ship <slug>`. Parse it: if the first whitespace-separated word is `ship`, take the remainder as the slug.

```
.claude/skills/html-discussion/bin/ship-page.sh "<slug>"
```

The script is idempotent — re-running on an already-shipped slug warns and exits 0. Optional flags (rarely needed): `--commit <sha>` to override HEAD, `--no-banner` to skip the visual marker, `--no-rebuild` to skip the INDEX regeneration.

Then say: "`<slug>` is shipped. Manifest stamped with date + commit, banner appended, INDEX rebuilt. Verify at `open docs/discussions/INDEX.html` — should be in the **Shipped** section now. `@scope:<slug>` tags on features stayed in place for future revalidation via your project's test runner filtering by the tag (e.g., `elixir .claude/skills/features/scripts/features_runner.exs @scope:<slug>` if using Elixir feature runners)."

## Conflict handling

If `$ARGUMENTS` is provided AND a file at `docs/discussions/$(date +%Y-%m-%d)-<slug>.html` already exists (same slug, same day), do NOT overwrite. Instead:
- Tell the user the file exists
- Ask: "continue this existing thread (open it) OR create a sibling with a different slug?"
- Act on their answer

## Don't

- Don't add sections to the new doc on creation — that happens through conversation, driven by the user's intent.
- Don't run custom traceability build scripts (e.g., `python3 scripts/traceability/build.py`) for scaffolding (Mode 2) — `/crystallize` (and `ship` Mode 3) handles that when needed. A fresh draft has nothing to show in INDEX yet, which is fine.
- Don't suggest theme choice unless the user asks; default `warm-paper` matches the existing threads.
- Don't strip `@scope:<slug>` tags from features during ship — they stay forever as provenance. The ship script honors this; don't override it.
- Don't manually edit the manifest fields that `ship-page.sh` writes (`status`, `shipped_at`, `shipped_commit`). Use the script — it's idempotent and writes the canonical shape.
