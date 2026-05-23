# scratch

A lightweight convention skill for a project's `.scratch/` folder.

Use `.scratch/` for:

- ad-hoc executable scripts,
- review notes,
- pipeline outputs,
- generated artifacts,
- and other work-in-progress files that should not be promoted into the main codebase yet.

## Core rules

- **Idempotent** — scripts should be safe to rerun.
- **Clean on green** — delete one-off scripts when they succeed.
- **Keep failed evidence** — failed runs can stay while debugging.
- **Promote when reused** — if a script is useful twice, move it into `bin/`, `scripts/`, or a real module.
- **No secrets** — do not store `.env`, credentials, tokens, or private keys in `.scratch/`.

## Claude Code hook

This skill can be paired with a Claude Code `SessionStart` hook that ensures `.scratch/README.md` exists. The source project used a hook named:

```text
.claude/hooks/ensure-scratch.sh
```

For a plain skillpack install, the skill documents the convention but does not automatically register hooks. If this repository later grows into a Claude Code plugin, the hook can be packaged as a first-class plugin component.
