---
name: ping-pong
description: Simulates pair programming with a third-party auditor for autonomous execution of work. Point it at a task, a list of tasks, or a plan with scoped scenarios — the lead decomposes as needed and dispatches a per-scenario trio (ping = navigator, pong = driver, auditor = QC). Use when prior attempts produced premature-done or wrong-diagnosis loops, or when the user invokes /ping-pong.
---

# Ping-Pong

**Simulates pair programming with a third-party auditor.** Three predefined agents work as a pair plus an over-the-shoulder reviewer: **pp-ping** navigates (declares the destination by writing a failing test), **pp-pong** drives (writes the code until the test passes), **pp-auditor** watches over their shoulders and asks "is this dumb?"

The lead is the orchestrator — accepts work in whatever shape you hand it, decomposes what's coarse, dispatches a trio per scenario, verifies on every return, and only bubbles to you when the loop genuinely can't recover. The goal is **autonomous execution** of solid-enough input.

```
        ┌──────────────┐
        │  team lead   │  ← you (main thread)
        └──────┬───────┘
               │ accepts: a task, many tasks, or a plan with scenarios
               │ decomposes, dispatches trio per scenario,
               │ verifies on return, escalates only when stuck
   ┌───────────┼───────────┬──────────────┐
   ▼           ▼           ▼              ▼
 pp-ping    pp-pong    pp-auditor    (lead-spawned helpers
 navigator  driver     QC + sanity    as needed: codebase-analyzer,
                       check          web-search-researcher,
                                       gemini-cli-orchestrator,
                                       codex-cli-orchestrator, ...)
```

## Input is flexible

Point ping-pong at whatever you have. The lead figures out the decomposition:

- **A single task** → lead decomposes into BDD scenarios
- **A list of tasks** → lead processes them, decomposing each as needed
- **A plan with pre-scoped scenarios** → lead takes scenarios as-given, dispatches in dependency order

The typical case is a plan with scenarios already scoped — that's the easy path because the decomposition is done. But the framework doesn't require that. Point it at coarse work and the lead figures out how to split it.

## Autonomy is the goal

Given solid-enough input, the loop self-recovers without you steering:

- **Inner (per scenario):** bad impl → re-pong; bad spec → re-ping; drift caught by auditor → re-dispatch with the gap noted; pong blocked after 2 hypothesis attempts → escalate to lead
- **Outer (across scenarios):** stuck scenario → skip, re-chunk, or escalate; plan-level problem → bubble to user

You're the **floor**, not the steering wheel. The lead bubbles to you only when something genuinely can't recover: 3+ re-dispatches on a scenario with no progress, an ignored Monitor alert, or the input itself proves wrong. Otherwise the loop grinds through to completion.

## Specs and code live in the codebase

**The spec IS the failing test, written in-place using the project's existing conventions.** pp-ping investigates where the project keeps tests for the relevant seam — discover the test directory and runner from the project's config / build manifest, then copy the shape of neighboring tests — and writes the failing test there. The codebase becomes the single source of truth. pp-pong implements until the test passes; pp-auditor reads the diff and reproduces the test from the codebase.

`.claude/ping-pong/<work-id>/<task-id>/` is **only a cycle cache** — gitignored ephemera holding large blobs the lead and audit can consult during synthesis: raw test output, judge samples, and (for cross-model audits) each model's independent verdict. Not specs. Not code. Not structured evidence — that lives in the task description via `TaskUpdate`. The cache is reference material; if you delete it, the next run still works because the spec lives in the codebase and the evidence lives in the task.

This split keeps the spec executable and committable; the cache exists only as long as the cycle is interesting.

## The three predefined agents

| Agent | Pair role | Job | Lives at |
|---|---|---|---|
| `pp-ping` | **Navigator** | Per-scenario spec writer. Discovers project test conventions and writes a failing test in-place. Test docstring carries the BDD scenario; assertions carry the acceptance criteria. The test IS the spec. | `.claude/agents/pp-ping.md` |
| `pp-pong` | **Driver** | Implementer. Reads the failing test from the codebase, implements until it passes (RED→GREEN), writes evidence to the cycle cache. | `.claude/agents/pp-pong.md` |
| `pp-auditor` | **Over-the-shoulder QC** | Reads the diff, reproduces the test, checks pong's work on five axes: **on task, correct, right, smart, extra mile**. Asks "is this dumb?" — not just a test runner. | `.claude/agents/pp-auditor.md` |

These exist as predefined agents — not inlined as on-the-fly prompts — so their `MEMORY.md` accumulates craft over time. After 50 audits the auditor knows which model catches which class of bug; that compounding is the load-bearing reason to predefine.

## Team model

The lead calls `TeamCreate({team_name: "pp-<work-id>"})` once per work session. Membership is intentional:

**On the team** — `pp-ping` + `pp-pong`. The pair can `SendMessage` each other mid-cycle: if pong hits an ambiguous assertion, it asks ping directly instead of bouncing through the lead. This is the pair-programming model — navigator and driver coordinate without an intermediary.

**Off the team** — `pp-auditor`. Reports only to the lead. If the auditor were on the team, ping could ask "would this pass your bar?" and pong could ask "is this hygienic enough?" — both would compromise independence. The audit's value comes from sitting outside the pair's conversation. Same reason cross-model auditors (Gemini, Codex) write verdicts to separate files before reading each other's.

**Spawn fresh per scenario, not long-lived workers.** Each scenario gets a new `Agent({subagent_type: "pp-ping", ...})` invocation — fresh context, no anchoring on prior cycles. The `team_name` carries the identity and SendMessage routing; the member is ephemeral. Memory persists via `MEMORY.md`; context resets every dispatch. This is the difference between a *team* (durable namespace + routing) and *workers* (ephemeral spawns within it).

## Two modes: dispatched vs solo lead

The skill describes a multi-agent workflow, but the lead has a choice about how literal to be. The **discipline** doesn't change between modes (failing test first, RED→GREEN, five-axis check) — only the **ceremony** scales.

**Dispatched mode** — lead spawns `pp-ping`, `pp-pong`, `pp-auditor` as separate `Agent` invocations per scenario. Full ceremony: `TeamCreate` + `TaskCreate` per scenario + structured `## Ping (spec)` / `## Pong (impl)` / `## Auditor (verdict)` sections on task descriptions. Agent memory compounds across cycles via per-agent `MEMORY.md`. Use when:
- The plan spans many scenarios (5+) and the lead's own context would get cluttered.
- You want cross-model audit (`consult` / `rotate` / `panel`) — those modes require dispatch.
- Memory compounding matters — long-running work where pp-auditor's pattern recognition pays back.

**Solo-lead mode** — the lead drives the ping/pong/auditor *mindset* in one session without spawning separate agents. The commit log is the audit trail (use `(<scenario> ping)` / `(<scenario> pong)` suffixes on commits — e.g. `feat(worker): scaffold package (M4.1 pong)`). No `TaskCreate` overhead; the lead's in-session context carries cross-cycle continuity. Memory doesn't compound (no separate agents to write `MEMORY.md`), but for short work that's fine. Use when:
- 1–4 small scenarios where the ceremony costs more than it returns.
- Scaffolding, config, boilerplate, or any seam where the lead can hold the whole loop in their head.
- You want to validate the design / decomposition before committing to full dispatch.

GOAL.md is written in **both** modes — it's the work-level anchor regardless of how the cycles run.

The choice can be per-work-session OR per-scenario inside one session: you might run M4.1–M4.2 solo (scaffolding) then switch to dispatched for M4.3–M4.4 (cross-runtime bridge). The lead decides; the skill doesn't prescribe.

## What the lead does

```
1. TeamCreate({team_name: "pp-<work-id>"})
2. Write a SMART goal at .claude/ping-pong/<work-id>/GOAL.md.
   This is the lead's FIRST move — flexibility of input shape doesn't mean
   absence of goal. Even a single-task input gets a goal. See "Goal definition"
   below for the SMART format.
3. Take the work — a single task, a list, or a plan with pre-scoped scenarios.
   Decompose what's coarse, take what's pre-scoped, and emit one TaskCreate per scenario:
   - Each scenario: Given/When/Then + predictability check + auditor_mode (see table below)
4. For each scenario task, in dependency order:
   a. (optional) spawn helpers if context is thin — codebase-analyzer for unfamiliar code,
      web-search-researcher for docs, etc. The lead decides; this skill doesn't prescribe.
   b. Dispatch pp-ping with team_name + task ID + brief
      → ping discovers project test conventions, writes a FAILING test in-place
        at the project's test path,
        records the test path in the task description, returns
   c. Dispatch pp-pong with team_name + task ID
      → pong reads the failing test, runs it to confirm RED, implements until GREEN,
        TaskUpdates the task with a ## Pong (impl) section, writes large outputs
        (test_output.txt, judge_samples.md if LLM seam) to
        .claude/ping-pong/<work-id>/<task-id>/, returns
   d. AUDIT (depends on auditor_mode):
      - claude-solo  → pp-auditor only
      - consult      → pp-auditor + gemini-cli-orchestrator + codex-cli-orchestrator (parallel),
                       lead synthesizes
      - rotate       → one model round-robin per cycle; pp-auditor as project-specific lint backstop
      - panel        → all three audit independently; lead judges majority + dissent
   e. ROUTE on audit verdict (per-axis):
      - All five axes PASS → mark task completed, move to next scenario
      - Failed "On task" → re-dispatch pp-ping (the spec missed intent)
      - Failed "Correct" → re-dispatch pp-pong (test didn't pass on auditor re-run,
                          or sibling test broke)
      - Failed "Right" → re-dispatch pp-pong (hygiene / half-finished work)
      - Failed "Smart" → re-dispatch pp-pong with "simpler approach" prompt
                        (escalate if architectural)
      - Failed "Extra mile" → accept as advisory finding, or re-dispatch with
                             specific sibling fix prompt (small scope only)
5. (optional) Use the Monitor tool on a poll script to surface staleness / hangs / capacity issues
   as notifications — see "Monitoring" below.
6. Respawn dead/stale teammates as needed: Agent({subagent_type: "pp-ping", name: "ping-retry"})
   gives a fresh inbox + fresh context.
7. When the goal in GOAL.md is met (all scenarios PASS + work-level acceptance
   from GOAL.md ✓), TeamDelete.
```

The skill describes the SHAPE. Inside it, the lead exercises judgment: when to add helpers, when to re-spec vs. re-implement, when to bubble to the user. **Bias toward self-recovery** — re-dispatch, re-spec, re-chunk, or skip-and-return-to before escalating to the user. Bubble up only when the loop genuinely can't make progress (see "Red flags" at the bottom).

## Goal definition — SMART at the work-id level

The lead writes a SMART goal to `.claude/ping-pong/<work-id>/GOAL.md` at session start, before any TaskCreate. The goal anchors the whole work session: ping reads it for scenario context, pong reads it for scope checks, **the auditor reads it for the "on task" and "extra mile" axes**, and the lead cites it when bubbling to the user.

Required sections:

```markdown
# Goal: <one-sentence headline>

## Specific
<What is being built or changed, in one paragraph. Concrete enough that
two readers would describe the deliverable the same way.>

## Measurable
<Which tests, checks, or observable behaviors confirm completion at the
WORK level — not per-scenario. E.g. "ten widget bootstraps under 2s
end-to-end" or "rate-limit middleware applied to /api/* with 429 on
overflow.">

## Achievable
<List of scenario task IDs (TaskCreate emits them) that decompose the
goal. Filled in once decomposition is done; updated if re-chunked.>

## Relevant
<Why this matters / who needs it. Gives the auditor context for "on task"
and "extra mile" — e.g. "blocks payment compliance audit due 2026-06-01.">

## Time-bound
<Max N cycles, wall-clock deadline, or iteration cap. After this the lead
bubbles to the user with the current state, even if scenarios remain.>
```

**For trivial single-task input**, GOAL.md is still written but each section can be one sentence. The discipline isn't length — it's making the goal explicit so drift is detectable. **Flexibility of input shape ≠ absence of goal.**

When the lead bubbles to the user, the escalation message cites GOAL.md: not "stuck on task 3," but "can't satisfy the Measurable check (X) because Y — should we adjust scope or escalate to a different approach?"

## Steering — the auditor is your lever

If ping/pong are drifting — off-task tests, half-finished impls, missing the obvious — tighten the auditor brief. The auditor's standing instructions are the QC bar; YOU set that bar. Adjusting the auditor is more direct than retraining ping or pong, and the learning compounds via memory.

**One-shot brief addition** (this task only) — append to the standard auditor brief:

```
For this task specifically, also FAIL on:
- <new rule the lead noticed>
```

**Persistent memory entry** (carries to every future audit) — SendMessage pp-auditor:

```
Add to your MEMORY.md: 🔴 Pattern observed — <symptom>. Auto-fail any future
scenario showing <signature>.
```

Examples worth keeping handy:
- Pong keeps shipping magic numbers → add "FAIL unexplained literal constants in business logic"
- Ping keeps prescribing impl technique inside the test setup → add "FAIL tests that lock the data store or concurrency primitive without scenario justification"
- Recurring component / module reuse misses → add "FAIL diffs that introduce new shared components without first grepping the project's existing component tree"
- Workers chase third hypotheses despite the cap → add "FAIL evidence files with >2 hypothesis log entries"

The lever has limits: don't pile on rules without trimming. If the auditor brief gets long, the bar gets unenforceable. Reflect periodically — which rules have caught real bugs, which were noise.

## Audit modes

| Mode | Auditors | Time | Default for |
|---|---|---|---|
| `claude-solo` | pp-auditor only | ~30s | Deterministic scenarios |
| `consult` | pp-auditor + Gemini + Codex (parallel), lead synthesizes | ~1.5 min | LLM-compliance seams |
| `rotate` | One of {Claude, Gemini, Codex} round-robin per cycle | ~30–60s | Long tasks, model variety |
| `panel` | All three audit independently; lead judges majority + dissent | ~3 min | High-blast-radius seams (see auto-promotion below) |

**Auto-promotion rules (lead applies during decomposition).** Adapt the project-specific row to whatever bubble-up categories the host project's CLAUDE.md / AGENTS.md declares; the rest is general:

| Trigger | Promotes to |
|---|---|
| `seam_type: LLM-compliance` | `consult` |
| Touches AI persona, system prompts, or model-facing instructions | `panel` |
| Touches external vendor integration, partner API, or payment processor | `panel` |
| Touches auth, data isolation (RLS / tenancy), or PII handling | `panel` |
| Touches money, billing, or financial state | `panel` |
| Touches destructive DB ops (`drop`, `delete from`), schema migrations, or force-push | `panel` |
| Anything the host project's CLAUDE.md flags as "bubble up to the user" | `panel` |

These mirror the typical bubble-up categories in a project's house rules — cross-model audit fires exactly where you'd want a second opinion anyway.

**Skipping the audit on trivial seams.** `claude-solo` mode may be skipped entirely when ALL of:

- Diff is small (< ~50 lines).
- Seam is pure scaffolding, config, boilerplate, version pinning, or generated code (no branching logic).
- Test is contract-shaped — asserts on existence / version / path / signature, not behavior under load or edge cases.
- You're in **solo-lead mode** (single-session, not dispatching separate agents).

The signal: a scenario where the audit's five-axis check has nothing to bite on because the diff has no judgment in it. Example: `uv init` + a one-line `__version__` assertion. The audit would PASS five axes mechanically; running it is overhead.

In **dispatched mode**, fire the audit even on trivial seams — pp-auditor's memory accumulates "what trivial really looks like" patterns over time. `consult` / `rotate` / `panel` modes **never** skip; those exist precisely because the seam is risky enough to warrant multiple eyes.

**Cross-model orchestration (consult / panel):** the LEAD dispatches `gemini-cli-orchestrator` and `codex-cli-orchestrator` in parallel with the same audit brief. None of the three auditors sees the others' verdicts until the lead synthesizes. Independence is the point.

**Synthesis rule — convergence is the strongest signal.** When two or three independent reviewers from different model families flag the same thing, weight it heavily — that's a finding that survived three different sets of model-family blindspots. When they disagree, weigh each model's known blindspots: Gemini lacks Claude Code platform knowledge (will call real primitives "pseudo-APIs"); Codex is sharp on schema and enforcement claims but may over-index on adversarial framing; Claude has same-family bias with the agents being audited. Convergence beats severity — a finding all three flag is more actionable than a finding only one calls "critical."

**Rotation state:** memory bullet on `pp-auditor` (`* 🟡 (rotation) Last cross-model auditor: gemini`) — lead reads it at the start of each cycle.

## Monitoring (the Monitor tool, not an agent)

`pp-monitor` does not exist as an agent. Use Claude Code's native `Monitor` tool when the lead wants supervision without baby-sitting:

```sh
# Example poll script — emit ALERT lines for hang / staleness / rate-limit
while true; do
  # check task list for stale in_progress items
  # check team config for member tmuxPaneId == "" (dead inbox)
  # tail the project's dev log for rate-limit hits
  # ... emit "ALERT: <category> <detail>" lines
  sleep 60
done
```

Each `ALERT:` stdout line becomes a chat notification. Lead reacts (respawn, nudge via SendMessage, bubble to user).

Teams die. Tmux panes go stale. Members stop responding. Monitor catches it; the lead respawns. Predefined agents make this trivial — `Agent({subagent_type: "pp-ping", name: "ping-attempt-2"})` gives a fresh instance any time.

## The four discipline rules (lead-enforced via verify + re-dispatch)

These live in agent bodies as self-discipline; the lead enforces them by verifying on every return and re-dispatching when violated. Be honest about this — it's not a system gate, it's a discipline + verification loop.

| Failure | Plug |
|---|---|
| Pong sends "done" before the test passes | Lead reruns the test from pp-ping's path AND confirms the task description has pong's structured evidence on every return; missing fields or red test → re-dispatch with the gap noted |
| Test runner hangs unnoticed | Monitor alerts on `idle > 5min AND CPU < 5%`; lead kills + respawns |
| 3 wrong diagnoses chased in series | Pong: max 2 hypothesis attempts per scenario, then escalate |
| LLM compliance treated as deterministic | LLM seams require N≥5 judge samples encoded as parametrize / repeat in the test itself; single-shot ≠ pass |
| Pong rationalizes incomplete work as PASS | Pong has DONE_WITH_CONCERNS available — substantive doubts go there, not buried in evidence; the auditor must address each concern in the per-axis verdict |
| Work drifts from the original goal across scenarios | Auditor reads GOAL.md and uses it for the "on task" + "extra mile" axes; the lead cites GOAL.md when bubbling to the user |

## When the lead adds helpers

This is the lead's call. The skill is intentionally not prescriptive. Common cases:

- **Spec has thin context** → spawn `codebase-analyzer` or `Explore` before dispatching pp-ping
- **Unfamiliar library / SDK version** → spawn `web-search-researcher` before specifying
- **Cross-model audit needed** → spawn `gemini-cli-orchestrator` + `codex-cli-orchestrator` per `auditor_mode`
- **Adversarial second opinion on a tricky impl** → `codex-cli-orchestrator`
- **Long-running smoke test** → set up `Monitor` on the test process

Helpers report to the lead, not to ping/pong/auditor. Workers stay focused on their role; if they need help, they SendMessage the lead.

## Brief templates

Compact scaffolds. Lead adapts per task.

### pp-ping brief

```
Task ID: <task-id>
Work ID: <team-name slug, e.g. "auth-rollout">
Goal file: .claude/ping-pong/<work-id>/GOAL.md  ← READ THIS FIRST
Scenario: <Given/When/Then from task content>
auditor_mode: <from auto-promotion rules>
Predecessor task IDs: <list — TaskGet each to read prior evidence>

Read GOAL.md first — the scenario you spec must serve the work-level goal,
and your test should make the Measurable section more true once it passes.

Discover the project's test conventions for this seam — locate the test directory
and runner from the project's config / build manifest, then grep neighboring tests
for the seam's symbols and copy their shape.
Write a FAILING test in-place using those conventions:
- BDD scenario in the project's test-container syntax (Given/When/Then)
- Acceptance criteria as assertions
- LLM seams: language-appropriate parametrization at N≥5
- Capacity pre-flight as a setup hook / skip marker if applicable

Update the task description via TaskUpdate with a "## Ping (spec)" section:
- test path (format: <path>/<to>/<test_file>:<line>)
- seam type + auditor mode
- capacity gates (one line or "none required")
- out-of-scope list (files/surfaces pong must not touch)
- narrative context (predecessor evidence summary, capacity-gate rationale,
  scope-creep traps) — inline; only escalate to a cache file if it would bloat
  the task beyond readability
```

### pp-pong brief

```
Task ID: <task-id>
Work ID: <team-name slug>
Goal file: .claude/ping-pong/<work-id>/GOAL.md  ← READ for scope context
Test path: <from task description, format <path>/<to>/<test_file>:<line>>
Predecessor task IDs: <list — TaskGet each for prior evidence>

Read the failing test pp-ping wrote (TaskGet the task, follow test path).
Run it FIRST to confirm RED — if it's already green, escalate (the spec is wrong).
Run capacity pre-flight before any code change. Implement until the test passes
(GREEN). Capture full test output.

Write LARGE outputs to the cache:
- .claude/ping-pong/<work-id>/<task-id>/test_output.txt   (raw test stdout/stderr)
- .claude/ping-pong/<work-id>/<task-id>/judge_samples.md  (LLM seams only, N≥5 raw outputs)

Update the task description via TaskUpdate with a "## Pong (impl)" section:
- status: PASS | DONE_WITH_CONCERNS | FAIL | BLOCKED-<reason>
- files changed: path:line-range — what
- test command + exit code + path to test_output.txt
- acceptance evidence: each assertion → impl line
- LLM compliance: N_pass/N_total + path to judge_samples.md (if applicable)
- diff sha
- hypothesis log (if any failed attempts)
- out-of-scope respected: yes/no
- concerns (DONE_WITH_CONCERNS only): bulleted list of substantive doubts
  the auditor must address — workarounds, edge cases you couldn't verify,
  scope drift you noticed. Don't use this as a hedge; only when the test
  passes but a thoughtful auditor would want a closer look.

Use DONE_WITH_CONCERNS when: the test passes but you have substantive doubts
(an unverified edge case, a workaround that may not generalize, a scope
question worth raising). Don't use it as a CYA hedge — every concern must
be specific and actionable. The auditor will address each one in their verdict.

Max 2 hypothesis attempts per scenario before escalating with STATUS: BLOCKED.
```

### pp-auditor brief

```
Task ID: <task-id>
Work ID: <team-name slug>
Goal file: .claude/ping-pong/<work-id>/GOAL.md  ← READ for "on task" + "extra mile"
Test path: <from task description>
Diff: <git rev-range>
auditor_mode: <claude-solo | consult | rotate | panel>

Read GOAL.md (anchors "on task" + "extra mile" axes), then TaskGet the task —
both ping's spec section AND pong's evidence section. If pong's status is
DONE_WITH_CONCERNS, each listed concern must be addressed in your verdict.

Re-run the test yourself. Validate referenced cache files exist
(.claude/ping-pong/<work-id>/<task-id>/test_output.txt, etc.). grep for orphan
refs / stale comments after any rename.

Update the task description via TaskUpdate with an "## Auditor (verdict)" section
that emits a PER-AXIS verdict (not a single overall PASS/FAIL):

- On task:    PASS | FAIL — <reason; cite GOAL.md if relevant>
- Correct:    PASS | FAIL — <test exit code, sibling tests, claim match>
- Right:      PASS | FAIL — <hygiene findings or "clean">
- Smart:      PASS | FAIL — <concerns or "approach is appropriate">
- Extra mile: PASS | FAIL — <missed sibling work or "none obvious">
- Concerns addressed (DONE_WITH_CONCERNS only): for each pong concern, resolved/open + reasoning
- LLM compliance verified (if applicable)
- Audit sha: <git rev-parse HEAD>
- Overall: PASS  (only if all five axes PASS)
         | FAIL (if any axis fails — lead routes to ping or pong by the failed axis)

For consult/panel modes, ALSO write your independent verdict to:
.claude/ping-pong/<work-id>/<task-id>/claude_audit.md
(separate file preserves "write before reading others" independence)
```

### Cross-model consult brief (lead → gemini-cli-orchestrator / codex-cli-orchestrator)

```
Cross-model audit consultation for task <task-id> (work-id: <work-id>).

You are an independent second pair of eyes. DO NOT read pp-auditor's verdict
until you've formed your own opinion.

1. Read the task (intent + ping's spec + pong's evidence sections) and the test
   pp-ping wrote (path in task description). Read the diff: git diff <rev-range>.
2. Re-run the test yourself.
3. Validate referenced cache files exist at
   .claude/ping-pong/<work-id>/<task-id>/ (test_output.txt, judge_samples.md if LLM seam).
4. Form an independent verdict — write it to
   .claude/ping-pong/<work-id>/<task-id>/<your-model>_audit.md FIRST.
5. THEN read .claude/ping-pong/<work-id>/<task-id>/claude_audit.md.
   Note anything you found that Claude missed.

Reply via SendMessage to the lead with: PASS / FAIL + one concrete reason +
confidence + findings missed by Claude.
```

## Memory layout

Each predefined agent has `memory: project` + `skills: [subagent-memory]` in frontmatter. Claude Code auto-creates a `MEMORY.md` per agent. **Path resolution depends on where the agent is defined:**

- **Project-scoped** agents (like the pp-* set at `<project>/.claude/agents/`) → memory at `<project>/.claude/agent-memory/<agent>/MEMORY.md` (project-local; gitignored via `**/.claude/agent-memory/`)
- **Globally-installed** agents (at `~/.claude/agents/`) → memory at `~/.claude/agent-memory/<agent>/MEMORY.md`

Either way the first ~200 lines (or 25KB, whichever hits first) are preloaded into the agent's system prompt at start of every invocation; the agent appends dated bullets at the end of each task; reflection compresses at the threshold. Project-scoped pp-* agents' memory is per-project — craft built up in one project doesn't leak to others.

What each agent should remember:
- **pp-ping**: where various test types live in the current repo (test-directory paths for different surfaces), spec shapes that produced clean impls, project-specific seams (rate limits, auth rules, harness gotchas), decomposition heuristics
- **pp-pong**: impl patterns, test-harness gotchas, evidence shapes that satisfied audit (which TaskUpdate fields were load-bearing), component / module reuse paths discovered in the current repo
- **pp-auditor**: false-positive patterns, audit-checklist refinements, **cross-model findings** ("Gemini caught X N times now → auto-promote class Y to consult")

Context-clearing per scenario: spawn fresh ping/pong/auditor each scenario; memory persists, context does not. Lead persists across the whole task (it's the main thread).

## Install

This skill is designed to be installed via the `skills` CLI:

```bash
npx skills add fourcolors/skills --skill ping-pong -a claude-code
```

After installing, the three required custom agent definitions (`pp-ping.md`, `pp-pong.md`, and `pp-auditor.md`) must be bootstrapped into your project's `.claude/agents/` directory:

```bash
mkdir -p .claude/agents
cp .claude/skills/ping-pong/agents/*.md .claude/agents/
```

Alternatively, for global user-scoped installation:

```bash
npx skills add fourcolors/skills --skill ping-pong -g
mkdir -p ~/.claude/agents
cp ~/.claude/skills/ping-pong/agents/*.md ~/.claude/agents/
```

Session restart is needed after install for new agent types to register.

For cross-model audit modes (`consult`, `rotate`, `panel`), `gemini-cli-orchestrator` and `codex-cli-orchestrator` must also be present in `.claude/agents/` AND the corresponding CLIs (`gemini`, `codex`) installed and authenticated locally. Lead pre-flight: verify both before kicking off a task with non-default audit modes; degrade gracefully to `claude-solo` with a logged warning if missing.

## Cycle cache (where ephemera lives)

Three places hold cycle state, each suited to its data shape:

1. **The codebase** — spec (failing test) and impl (diff). Durable, committable, the actual contract.
2. **The task** (via `TaskUpdate` → description) — structured small data: ping's spec section, pong's evidence section, auditor's verdict section. Queryable via `TaskGet`; serves as the built-in audit trail.
3. **The cache** — only LARGE / RAW blobs that would bloat the task description, plus cross-model audit verdicts (kept as separate files to enforce write-before-read independence).

```
.claude/ping-pong/<work-id>/                       (gitignored; per-session cache root)
├── GOAL.md                       lead writes at session start — SMART work-level goal
└── <task-id>/                    (one subdir per scenario; safe to delete after audit closes)
    ├── test_output.txt           pp-pong writes — raw test stdout/stderr
    ├── judge_samples.md          pp-pong writes — LLM seams only (N≥5 raw outputs)
    ├── claude_audit.md           consult/panel only — Claude's independent verdict
    ├── gemini_audit.md           consult/panel only — Gemini's independent verdict
    └── codex_audit.md            consult/panel only — Codex's independent verdict
```

The task description carries the structured verdict + evidence + spec sections (queryable via `TaskGet`); the cache holds only what doesn't fit there. `<work-id>` is the `team_name` slug (e.g. team `pp-auth-rollout` → cache at `.claude/ping-pong/auth-rollout/`), so all scenarios of one work session share a parent directory — one delete cleans the whole session. `GOAL.md` lives at the work-id root (not per-task) because the goal applies to the whole session.

**Delete-test:** if you can't delete `.claude/ping-pong/<work-id>/<task-id>/` after the cycle closes without losing meaning, something is in the cache that should be in the task description or the codebase. Move it.

## Red flags — STOP and re-baseline

- No `GOAL.md` at `.claude/ping-pong/<work-id>/` → STOP, write the goal before dispatching anything
- Pong returned without a `## Pong (impl)` section in the task description → reject, re-dispatch
- Pong returned but the test pp-ping wrote still fails when the lead re-runs it → re-dispatch
- Pong status is `DONE_WITH_CONCERNS` but no concerns listed → reject, demand specifics
- Same hypothesis class >2× in pong's hypothesis log → force re-baseline
- Auditor signed off without re-running the test → reject, re-audit
- Auditor emitted a single overall PASS/FAIL instead of per-axis verdicts → reject, re-audit
- Auditor's verdict doesn't address each pong concern when status was DONE_WITH_CONCERNS → re-audit
- LLM seam scenario reporting single-shot pass → require N≥5 in the test itself
- Same task re-dispatched 3+ times with no progress → escalate to user (cite GOAL.md)
- Time-bound section of GOAL.md exceeded → escalate to user with current state
- Monitor logs `ALERT:` for >10 min with no lead action → escalate
- A `spec.md` or `evidence.md` or `audit.md` appears in the cache → STOP — that's the old shape. The spec is a real test in the codebase; evidence and verdict live in the task description.
- The cache contains anything besides `GOAL.md` (work-id root) or large blobs / cross-model verdicts (task-id subdirs) → STOP — that data belongs in the task description, not a file
