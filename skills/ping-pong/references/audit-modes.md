# Audit modes — detail

The mode table and auto-promotion rules live in SKILL.md (the lead applies them at decomposition time). This file holds the run-time detail: when an audit may be skipped, how cross-model independence works, and how the lead synthesizes disagreeing verdicts. Read it before running any `consult` / `rotate` / `panel` audit.

## Skipping the audit on trivial seams

`claude-solo` mode may be skipped entirely when ALL of:

- Diff is small (< ~50 lines).
- Seam is pure scaffolding, config, boilerplate, version pinning, or generated code (no branching logic).
- Test is contract-shaped — asserts on existence / version / path / signature, not behavior under load or edge cases.
- You're in **solo-lead mode** (single-session, not dispatching separate agents).

The signal: a scenario where the audit's five-axis check has nothing to bite on because the diff has no judgment in it. Example: `uv init` + a one-line `__version__` assertion. The audit would PASS four blocking axes mechanically; running it is overhead.

In **dispatched mode**, fire the audit even on trivial seams — pp-auditor's memory accumulates "what trivial really looks like" patterns over time. `consult` / `rotate` / `panel` modes **never** skip; those exist precisely because the seam is risky enough to warrant multiple eyes.

## Cross-model orchestration (consult / panel)

The LEAD dispatches the Gemini and Codex auditors in parallel with the same audit brief (see `briefs.md` → "Cross-model consult brief"). Two delivery options:

1. **Orchestrator agents** — if the host project defines `gemini-cli-orchestrator` / `codex-cli-orchestrator` agent types, dispatch them as plain subagents.
2. **Direct CLI** — drive `gemini` / `codex` directly via Bash with the brief as the prompt. Works anywhere the CLIs are installed and authenticated; no agent definitions needed.

Pre-flight either path before promising a non-default audit mode; **degrade gracefully to `claude-solo` with a logged warning** if neither is available.

**Independence protocol:** none of the three auditors sees the others' verdicts until its own is written to its own file (`claude_audit.md`, `gemini_audit.md`, `codex_audit.md` under the task's cache dir). Write-before-read is the whole point — an auditor that reads first is anchored, and its verdict stops being independent evidence.

## Synthesis — convergence is the strongest signal

When two or three independent reviewers from different model families flag the same thing, weight it heavily — that's a finding that survived three different sets of model-family blindspots. When they disagree, weigh each model's known blindspots:

- **Gemini** lacks Claude Code platform knowledge — will call real primitives "pseudo-APIs."
- **Codex** is sharp on schema and enforcement claims but may over-index on adversarial framing.
- **Claude** has same-family bias with the agents being audited.

Convergence beats severity — a finding all three flag is more actionable than a finding only one calls "critical."

## Rotation state (`rotate` mode)

Track the round-robin as a memory bullet on `pp-auditor`:

```markdown
* 🟡 (rotation) Last cross-model auditor: gemini (task X, <date>)
```

The lead reads `pp-auditor`'s `MEMORY.md` (it's a plain file under the agent-memory directory) at the start of each cycle to pick the next model. pp-auditor stays in the loop on every rotation cycle as the project-specific lint backstop.
