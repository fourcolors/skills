---
name: html-discussion
description: Use when the user wants an HTML discussion artifact — a page generated and revised over the life of a conversation. Best for planning a feature, comparing options, surfacing decisions with options grids, recapping analysis, dogfooding a design. Pages save to docs/discussions/<YYYY-MM-DD>-<slug>.html with a sibling .json manifest as source of truth. Sections are byte-addressable by ID via shell scripts in bin/, so revisions cost ~10 tokens each instead of re-reading a 30KB file. Not a build system; not a replacement for visual-explainer.
license: MIT
---

# html-discussion

A script-driven HTML discussion skill. Pages live as `docs/discussions/<YYYY-MM-DD>-<slug>.html` plus a sibling `.json` manifest. **Always mutate via `bin/` scripts; never re-read the full HTML file.** The manifest is source of truth; HTML is rendered from it. `new-page.sh` auto-prepends today's date if you don't include one; the resulting date-prefixed slug is what subsequent commands take.

**Scope lifecycle**: The manifest carries a `status` field (`draft` / `active` / `shipped` / `archived`) that can be used to track the progress of design or system discussions. Lifecycle transitions: `new-page.sh` creates a `draft` status, which can be updated to `active` during planning, and finally flipped to `shipped` using `ship-page.sh` (which stamps `shipped_at` and `shipped_commit` SHA). Optionally, you can configure your project's custom traceability scripts to auto-generate an `INDEX.html` index list of all discussion files.

## When to invoke

- User asks for a discussion page, planning artifact, comparison, recap, or "explain X visually"
- The conversation would benefit from a single visual artifact that gets revised multiple times
- You're about to emit a 4+ row / 3+ col ASCII table — generate HTML instead
- A decision needs to be teed up with options and a recommendation
- A user-invoked `/html-discussion` command

## Workflow (4 steps)

1. **Add the template** — `bin/new-page.sh <slug> [--theme <name>]`. Default theme is `warm-paper`.
2. **Design the parts** — sketch the section list with the user in chat
3. **Load in elements** — call `bin/add-section.sh <slug> <snippet> --fills key=val,...` for each section
4. **Modify** — call `bin/move.sh`, `bin/swap.sh`, `bin/replace.sh` as the discussion evolves; never re-read the file

After every creation or mutation, tell the user the file path so they can open it in a browser.

## Command surface

All scripts live in `./bin/` and operate on `docs/discussions/<slug>.html` + `docs/discussions/<slug>.json` (where `<slug>` is the full date-prefixed name, e.g., `2026-05-24-my-spike`).

| Command                                             | Purpose                                                       |
| --------------------------------------------------- | ------------------------------------------------------------- | ---------------------- |
| `new-page.sh <slug> [--theme name]`                 | Create page + manifest (initial `status: "draft"` + lifecycle fields). Theme defaults to `warm-paper`. |
| `list.sh <slug>`                                    | Print manifest summary (section IDs + snippet types)          |
| `add-section.sh <slug> <snippet> [--fills k=v,...]` | Append a snippet to the page; update manifest                 |
| `move.sh <slug> <id> --before                       | --after <other>`                                              | Reorder sections by ID |
| `render.sh <slug>`                                  | Re-emit HTML from manifest + snippets + active theme          |
| `ship-page.sh <slug> [--commit sha] [--no-banner] [--no-rebuild]` | Flip manifest `status → "shipped"`, stamp `shipped_at` + `shipped_commit` (HEAD or override), append merged-banner, rebuild INDEX. Idempotent. Used by `/discussion ship <slug>`. |

More scripts (swap, copy, paste, delete, replace, clip, save-snippet) will be added by promotion as needs surface.

## Themes (in `./themes/`)

- **`plex-paper.css`** (default) — IBM Plex Serif/Sans/Mono via Google Fonts. Warm editorial paper palette with distinctive Plex letterforms.
- **`warm-paper.css`** — system fonts only (Georgia / system-ui / ui-monospace). Thariq-inspired ivory/clay/olive palette. Zero network round-trips.
- **`dark-blueprint.css`** — dark-first, system mono primary, cool blue accent. For technical / system-state pages.
- **`liquid-glass.css`** — Dark-first; gold-accented; Cormorant Garamond display + DM Sans body + JetBrains Mono. Use for high-contrast brand-aligned modern system design and technical pages.
- **`tactile.css`** — dark neomorphism. Surfaces share bg color; depth comes from a consistent two-shadow pair (no borders). Orange accent, mono labels. Use when the artifact should feel like a physical control surface.

Themes define CSS custom properties only; the shell snippet defines the layout/component CSS using those variables. Swapping themes recolors without reflow.

## Snippets (in `./snippets/`)

- **`_shell.html`** — the page shell + sticky-sidebar TOC + main column + all component CSS. Always present.
- Additional snippets are added by promotion. No usage tracking — promotion is manual when the user signals a pattern is worth keeping.

## Conventions

**Section anchors.** Every section is wrapped in HTML comments the scripts use as byte addresses:

```html
<!-- @section:id=<NN>-<slug> snippet=<name> -->
<section>...</section>
<!-- @endsection:<NN>-<slug> -->
```

**Manifest format.** JSON. Read/write with `jq`. Shape:

```json
{
  "slug": "auth-rework",
  "theme": "warm-paper",
  "sections": [
    {
      "id": "01-header",
      "snippet": "header",
      "fills": { "eyebrow": "...", "h1": "..." }
    }
  ],
  "created": "2026-05-15T...Z",
  "updated": "2026-05-15T...Z"
}
```

**Slot fills.** Snippets use `{{KEY}}` placeholders. The scripts substitute these from `--fills` arguments at insertion / render time.

**Insertion point.** The shell contains a `<!-- @insertion-point -->` marker inside `<main>`. New sections are inserted _before_ this marker so it stays in place for subsequent additions.

## Hard rules

- **No ASCII-art diagrams.** Wireframe with HTML/CSS, or use inline SVG.
- **No runtime renderers** (Mermaid, D3, Chart.js). Inline SVG is first-class.
- **Snippets ship as structural shells.** Data values are slot-fills, not baked into geometry.
- **Never re-read the full HTML during mutation.** Use scripts. If you find yourself reaching for `Read docs/discussions/<slug>.html`, you're using the wrong tool.
- **Pages are durable** (committed to `docs/discussions/`). Old pages stay as a historical record of design discussions. Don't treat existing pages as ephemeral.
- **Source attribution.** When implementing a snippet derived from Thariq's `html-effectiveness` gallery, cite the demo number in an HTML comment at the top of the snippet file (the gallery has no license declared; implement patterns, never copy code verbatim).

## Output

- HTML: `docs/discussions/<YYYY-MM-DD>-<slug>.html`
- Manifest: `docs/discussions/<YYYY-MM-DD>-<slug>.json`
- Stash (future, cross-page clipboard): `.scratch/.stash/<name>.html` (stays ephemeral — cross-page clipboard isn't user-facing)

## Other

After every iteration open the HTML file in the default browser
