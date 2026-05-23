---
name: scratch
description: Use when the user asks what a project `.scratch/` folder is for, wants a safe place for temporary scripts/artifacts, or needs guidance on promoting ad-hoc work into committed project code.
---

# scratch

A lightweight convention for a project's `.scratch/` folder.

Use `.scratch/` for temporary, project-local work that is useful during development but should not yet live in the main codebase.

## What belongs in `.scratch/`

- One-off scripts for investigation or migration
- Review notes and spike notes
- Generated reports or pipeline outputs
- Screenshots, HTML prototypes, JSON dumps, and other temporary artifacts
- Failed-run evidence that is useful while debugging

## Rules

1. **Idempotent by default** — scripts should be safe to rerun.
2. **Clean on green** — delete one-off scripts after they succeed, unless the output is useful evidence.
3. **Keep failed evidence while debugging** — failed scripts/logs can stay until the issue is resolved.
4. **Promote reused work** — if a script or artifact becomes useful twice, move it to `bin/`, `scripts/`, `docs/`, tests, or a real module.
5. **No secrets** — never put `.env`, credentials, tokens, private keys, or customer data in `.scratch/`.

## How to use it

When working in a project:

1. Put throwaway scripts and generated outputs under `.scratch/`.
2. Give files descriptive names.
3. Make scripts rerunnable from the project root where practical.
4. Before finishing, decide whether each artifact should be deleted, kept as evidence, or promoted.

## Bootstrap

If `.scratch/README.md` is missing, create it from this skill's template if available:

```bash
mkdir -p .scratch
cp .claude/skills/scratch/templates/README.md .scratch/README.md
```

If the skill is installed globally instead of project-locally, copy the template manually from the installed skill directory or write the rules above into `.scratch/README.md`.

## Output style

When applying this skill, be practical and concise:

- state whether `.scratch/` exists,
- say what should go there,
- recommend what to delete, keep, or promote,
- and call out any secrets or long-lived decisions that should not be in `.scratch/`.
