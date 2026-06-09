# ping-pong

A powerful pair-programming and quality-control simulation skill for autonomous task execution.

It coordinates three specialized agents:
- **`pp-ping` (Navigator)**: Discovers test conventions and writes a failing test in-place to establish the spec.
- **`pp-pong` (Driver)**: Implements the solution until the test passes (RED ➔ GREEN).
- **`pp-auditor` (QC)**: Reviews the diff, re-runs the tests, and evaluates the work on four blocking axes (**On task, Correct, Right, Smart**) plus an advisory **Extra mile** axis.

---

## Installation

Install using the `skills` CLI:

```bash
# Project-scoped (recommended)
npx skills add fourcolors/skills --skill ping-pong -a claude-code

# Global user-scoped
npx skills add fourcolors/skills --skill ping-pong -g
```

**Recommended companion:** the `pp-*` agents declare `skills: [subagent-memory]` so their craft compounds across cycles. Install it alongside:

```bash
npx skills add fourcolors/skills --skill subagent-memory -a claude-code
```

Without it the agents still work — they just lose the structured memory discipline.

---

## Bootstrapping Custom Agents

Because AI coding assistants expect custom agent definitions to live in `.claude/agents/` (project-local) or `~/.claude/agents/` (global), you must copy the agent markdown files after installing the skill.

### For Project-scoped Installations:
```bash
mkdir -p .claude/agents
cp .claude/skills/ping-pong/agents/*.md .claude/agents/
```

### For Global Installations:
```bash
mkdir -p ~/.claude/agents
cp ~/.claude/skills/ping-pong/agents/*.md ~/.claude/agents/
```

*Note: You may need to restart your AI assistant's session after copying the agent files for the new agent types to register.*

---

## Configuration Notes

- **Model**: the agents ship with `model: inherit`, so each spawn follows whatever model your session is running — no surprise cost pinning. If you want maximum-strength specs or audits regardless of session model, edit the copied agent files in `.claude/agents/` and pin (e.g. `model: opus`) per role.
- **Agent teams** (pair messaging between ping and pong) is an experimental Claude Code feature gated behind `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Without it, the workflow still runs — the lead mediates questions instead of the pair messaging directly, or you can use solo-lead mode.
- **Cross-model audits** (`consult` / `rotate` / `panel` modes) need the `gemini` and/or `codex` CLIs installed and authenticated (or equivalent orchestrator agents defined). The lead degrades gracefully to Claude-only audits when they're absent.

---

## Skill Layout

```text
ping-pong/
├── SKILL.md            Orchestrator playbook (loaded when the skill triggers)
├── README.md           You are here
├── agents/             Subagent definitions — copy these to .claude/agents/
│   ├── pp-ping.md
│   ├── pp-pong.md
│   └── pp-auditor.md
└── references/         Loaded on demand by the lead, not at trigger time
    ├── briefs.md       Dispatch briefs for all three agents + cross-model consult
    ├── audit-modes.md  Skip rules, independence protocol, synthesis guidance
    └── monitoring.md   Monitor-tool setup + manual-poll fallback
```

---

## Workflow Overview

Once installed and bootstrapped, point the lead orchestrator at a task, a task list, or a scoped plan (or invoke `/ping-pong`). The orchestrator will:
1. Pre-flight the environment (agents registered, teams/CLIs available, cache gitignored).
2. Initialize `GOAL.md` at `.claude/ping-pong/<work-id>/GOAL.md` to define the SMART target.
3. Spawn `pp-ping` to spec each scenario via a failing test.
4. Spawn `pp-pong` to implement until the test is green.
5. Spawn `pp-auditor` to conduct the per-axis QC check.
6. Route surgically (re-spec, re-pong, or escalate) based on which axis failed.
