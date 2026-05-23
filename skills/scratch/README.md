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

## Hooks

Hooks can be a good fit for this skill, especially if you want every Claude Code session to start with a predictable `.scratch/` convention already in place.

For example, a project can use a Claude Code `SessionStart` hook to ensure `.scratch/README.md` exists whenever a session starts, resumes, clears, or compacts.

That said, hooks are project/user environment setup, not the core skill instruction. This skillpack keeps the agent-facing `SKILL.md` focused on the `.scratch/` convention. If you want hook automation, add it in your project or package it later as part of a Claude Code plugin.

Example hook command shape:

```json
{
  "type": "command",
  "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/ensure-scratch.sh"
}
```

A future plugin version of this skill could ship the hook as a first-class installable component.

## Manual bootstrap

If `.scratch/README.md` is missing, create it manually:

```bash
mkdir -p .scratch
cp .claude/skills/scratch/templates/README.md .scratch/README.md
```

If the skill is installed globally rather than project-locally, copy the template from your global Claude Code skills directory or paste the rules above into `.scratch/README.md`.
