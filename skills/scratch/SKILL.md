---
name: scratch
description: Convention for the project's `.scratch/` folder (ad-hoc executable scripts, review notes, pipeline outputs). Use when the user asks what `.scratch/` is for, how to activate the bootstrap hook, or how the promotion ladder works. Full rules live in `.scratch/README.md`; this skill is metadata + activation.
---

# .scratch Skill

This skill bootstraps the project's `.scratch/` folder. The canonical convention text lives in `.scratch/README.md` (copied from `.claude/skills/scratch/templates/README.md` on first run). The hook ensures the folder and README exist on every session start; the README explains the rules. This split keeps SKILL.md cheap to load — the prose only costs tokens when the folder is actively being touched.

## Activation (per user)

The bootstrap hook is opt-in. Add the following four entries to your `.claude/settings.local.json` under `hooks.SessionStart`:

```json
{
  "matcher": "startup",
  "hooks": [
    { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/ensure-scratch.sh" }
  ]
},
{
  "matcher": "clear",
  "hooks": [
    { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/ensure-scratch.sh" }
  ]
},
{
  "matcher": "compact",
  "hooks": [
    { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/ensure-scratch.sh" }
  ]
},
{
  "matcher": "resume",
  "hooks": [
    { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/ensure-scratch.sh" }
  ]
}
```

All four matchers (`startup`, `clear`, `compact`, `resume`) cover every SessionStart event.

## Manual bootstrap

To run the bootstrap once without enabling the hook:

```bash
bash .claude/hooks/ensure-scratch.sh
```

If `.scratch/` already exists, this silently backfills `README.md` from the template. If `.scratch/` is missing, the script prints a prompt asking where you want the folder — confirm with the user, then create the folder and copy the template manually.

## What lives where

- `.claude/skills/scratch/templates/README.md` — canonical README content (committed).
- `.claude/hooks/ensure-scratch.sh` — the bootstrap script (committed).
- `.claude/hooks/test-ensure-scratch.sh` — test harness (committed).
- `.scratch/README.md` — written copy of the template (gitignored).
- `.claude/settings.local.json` — your personal hook activation (gitignored).
