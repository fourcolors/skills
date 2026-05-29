# ping-pong

A powerful pair-programming and quality-control simulation skill for autonomous task execution.

It coordinates three specialized agents:
- **`pp-ping` (Navigator)**: Discovers test conventions and writes a failing test in-place to establish the spec.
- **`pp-pong` (Driver)**: Implements the solution until the test passes (RED ➔ GREEN).
- **`pp-auditor` (QC)**: Reviews the diff, re-runs the tests, and evaluates code quality on five axes (**On task, Correct, Right, Smart, Extra mile**).

---

## Installation

Install using the `skills` CLI:

```bash
# Project-scoped (recommended)
npx skills add fourcolors/skills --skill ping-pong -a claude-code

# Global user-scoped
npx skills add fourcolors/skills --skill ping-pong -g
```

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

## Workflow Overview

Once installed and bootstrapped, point the lead orchestrator at a task list or scoped plan. The orchestrator will:
1. Initialize `GOAL.md` at `.claude/ping-pong/<work-id>/GOAL.md` to define the SMART target.
2. Spawn `pp-ping` to spec each scenario via a failing test.
3. Spawn `pp-pong` to implement until the test is green.
4. Spawn `pp-auditor` to conduct the five-axis QC check.
5. Surgical routing (re-spec, re-pong, or escalate) occurs automatically based on axis failures.
