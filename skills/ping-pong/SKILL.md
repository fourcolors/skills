---
name: ping-pong
description: Test-first pair programming with an independent auditor, for autonomous execution of implementation work. Point it at a task, a list of tasks, or a plan with scoped scenarios — the lead decomposes as needed and dispatches a per-scenario trio (pp-ping = navigator, writes the failing test; pp-pong = driver, implements to green; pp-auditor = QC). Use when the user invokes /ping-pong, asks to execute a plan or task list autonomously with TDD discipline, wants implementation with built-in independent review, or when prior attempts produced premature-done or wrong-diagnosis loops.
argument-hint: "[task | path/to/plan.md | task list]"
license: MIT
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
                                       peer auditors from the roster, ...)
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

`.claude/ping-pong/<work-id>/<task-id>/` is **only a cycle cache** — gitignored ephemera holding large blobs the lead and audit can consult during synthesis: raw test output, judge samples, and (for multi-auditor modes) each auditor's independent verdict. Not specs. Not code. Not structured evidence — that lives in the task description via `TaskUpdate`. The cache is reference material; if you delete it, the next run still works because the spec lives in the codebase and the evidence lives in the task.

This split keeps the spec executable and committable; the cache exists only as long as the cycle is interesting.

## The three predefined agents

| Agent | Pair role | Job | Lives at |
|---|---|---|---|
| `pp-ping` | **Navigator** | Per-scenario spec writer. Discovers project test conventions and writes a failing test in-place. Test docstring carries the BDD scenario; assertions carry the acceptance criteria. The test IS the spec. | `.claude/agents/pp-ping.md` |
| `pp-pong` | **Driver** | Implementer. Reads the failing test from the codebase, implements until it passes (RED→GREEN), writes evidence to the cycle cache. | `.claude/agents/pp-pong.md` |
| `pp-auditor` | **Over-the-shoulder QC** | Reads the diff, reproduces the test, checks pong's work on four blocking axes — **on task, correct, right, smart** — plus an advisory **extra mile** axis. Asks "is this dumb?" — not just a test runner. | `.claude/agents/pp-auditor.md` |

These exist as predefined agents — not inlined as on-the-fly prompts — so their `MEMORY.md` accumulates craft over time. After 50 audits the auditor knows which peer catches which class of bug; that compounding is the load-bearing reason to predefine.

## Team model

The lead calls `TeamCreate({team_name: "pp-<work-id>"})` once per work session. Membership is intentional:

**On the team** — `pp-ping` + `pp-pong`. The pair can `SendMessage` each other mid-cycle: if pong hits an ambiguous assertion, it asks ping directly instead of bouncing through the lead. This is the pair-programming model — navigator and driver coordinate without an intermediary.

**Off the team** — `pp-auditor`. Reports only to the lead. If the auditor were on the team, ping could ask "would this pass your bar?" and pong could ask "is this hygienic enough?" — both would compromise independence. The audit's value comes from sitting outside the pair's conversation. Same reason peer auditors write verdicts to separate files before reading each other's. Because the auditor is spawned as a plain subagent, its tool allowlist explicitly includes `TaskGet`, `TaskUpdate`, and `Write` — off-team agents get nothing auto-granted.

**Spawn fresh per scenario, not long-lived workers.** Each scenario gets a new `Agent({subagent_type: "pp-ping", ...})` invocation — fresh context, no anchoring on prior cycles. The `team_name` carries the identity and SendMessage routing; the member is ephemeral. Memory persists via `MEMORY.md`; context resets every dispatch.

**Platform gate:** agent teams (TeamCreate / SendMessage) are an experimental Claude Code feature (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). Without teams, the workflow still runs: skip TeamCreate, dispatch the trio as plain subagent spawns, and the task descriptions remain the coordination bus. Workers know to return early with their question instead of messaging (it's in their discipline rules); the lead answers and re-dispatches. Or just use solo-lead mode, which needs none of this.

## Two modes: dispatched vs solo lead

The skill describes a multi-agent workflow, but the lead has a choice about how literal to be. The **discipline** doesn't change between modes (failing test first, RED→GREEN, per-axis audit) — only the **ceremony** scales.

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
0. PRE-FLIGHT (once per work session):
   - pp-ping / pp-pong / pp-auditor registered? Check .claude/agents/pp-*.md
     (or ~/.claude/agents/). Missing → STOP; give the user the bootstrap
     commands from this skill's README. Never improvise inline substitutes.
   - subagent-memory skill installed? Missing → warn once and continue;
     agents still run, memory discipline degrades.
   - Agent teams available? If not → plain spawns + lead-mediated questions,
     or solo-lead mode (see "Platform gate" above).
   - Copied pp-auditor.md mentions home_audit.md? If it still says
     claude_audit.md the install is stale → STOP; re-run the cp from the
     README. A stale copy writes verdicts where the lead never looks and
     silently degrades a panel to a solo audit.
   - Planning any auditor_mode beyond home-only? RESOLVE THE AUDIT ROSTER.
     Slot `home` is always pp-auditor and is never rotated out. Read the host
     CLAUDE.md / AGENTS.md for a "## Ping-pong audit peers" block; with no
     block, probe for *-cli-orchestrator agent types in .claude/agents/ and
     ~/.claude/agents/ plus the example CLIs on PATH (e.g. `gemini`, `codex`)
     via `command -v`. Slug each peer, keep one entry per underlying tool
     (an orchestrator agent and the CLI it wraps are one reviewer, not two),
     confirm it resolves once, warn if two share a family, and log the
     resolved roster in one line. Ask the user
     nothing. Zero peers → every mode runs home-only. Slug rules, delivery,
     and the degradation table: references/audit-modes.md. An `auditor_mode`
     you don't recognize means `home-only`; log the value and move on.
   - Ensure .claude/ping-pong/ is gitignored in the host repo (append if missing).
1. TeamCreate({team_name: "pp-<work-id>"})   (dispatched mode, teams available)
2. Write a SMART goal at .claude/ping-pong/<work-id>/GOAL.md.
   This is the lead's FIRST artifact — flexibility of input shape doesn't mean
   absence of goal. Even a single-task input gets a goal. See "Goal definition".
3. Take the work — a single task, a list, or a plan with pre-scoped scenarios.
   Decompose what's coarse, take what's pre-scoped, and emit one TaskCreate per scenario:
   - Each scenario: Given/When/Then + predictability check + auditor_mode (see table below)
4. Read references/briefs.md (in this skill's directory) once — it holds the
   dispatch briefs for all three agents plus the cross-model consult brief.
5. For each scenario task, in dependency order:
   a. (optional) spawn helpers if context is thin — codebase-analyzer for unfamiliar code,
      web-search-researcher for docs, etc. The lead decides; this skill doesn't prescribe.
   b. Dispatch pp-ping with team_name + task ID + brief
      → ping discovers project test conventions, writes a FAILING test in-place,
        records the test path in the task description, returns
   c. Dispatch pp-pong with team_name + task ID
      → pong reads the failing test, confirms RED, implements until GREEN,
        TaskUpdates the task with a ## Pong (impl) section, writes large outputs
        to the cycle cache, returns
   d. AUDIT (depends on auditor_mode — see table; detail in references/audit-modes.md):
      - home-only → pp-auditor alone
      - consult   → pp-auditor + every roster peer in parallel, lead synthesizes
      - rotate    → pp-auditor + one roster peer, round-robin per cycle
      - panel     → pp-auditor + every roster peer, independently; lead applies
                    the confirmation rule
      Verify each expected <slug>_audit.md exists before synthesizing; a peer
      that returned a message but wrote no file counts as absent.
      Stamp `Reviewers: home + <slug list> (R of N reachable)` into the
      ## Auditor (verdict) section so the record shows how many eyes ran.
   e. ROUTE on the per-axis verdict:
      - All four blocking axes PASS → mark task completed; if Extra mile is
        ADVISORY, accept and log it, or re-dispatch pong for the sibling fix
        (small, obvious scope only)
      - Failed "On task" → re-dispatch pp-ping (the spec missed intent)
      - Failed "Correct" → re-dispatch pp-pong (test failed on auditor re-run,
                          or a sibling test broke)
      - Failed "Right" → re-dispatch pp-pong (hygiene / half-finished work)
      - Failed "Smart" → re-dispatch pp-pong with "simpler approach" prompt
                        (escalate if architectural)
6. (optional) Monitor for staleness / hangs / capacity — references/monitoring.md.
7. Respawn dead/stale teammates as needed: Agent({subagent_type: "pp-ping",
   name: "ping-retry"}) gives a fresh inbox + fresh context.
8. When the goal in GOAL.md is met (all scenarios PASS + work-level acceptance
   from GOAL.md ✓), TeamDelete.
```

The skill describes the SHAPE. Inside it, the lead exercises judgment: when to add helpers, when to re-spec vs. re-implement, when to bubble to the user. **Bias toward self-recovery** — re-dispatch, re-spec, re-chunk, or skip-and-return-to before escalating to the user. Bubble up only when the loop genuinely can't make progress (see "Red flags").

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
and "extra mile" — e.g. "blocks the compliance audit due end of quarter.">

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

Every mode runs the **home auditor**, which is `pp-auditor` on the session model.
Modes differ in how many **peer auditors** join it and in how the lead combines the verdicts.
Peers come from the audit roster the lead resolves once per work session at pre-flight.

| Mode | Auditors | Time | Default for |
|---|---|---|---|
| `home-only` | home auditor alone | ~30s | Deterministic scenarios |
| `consult` | home + every roster peer in parallel, lead synthesizes | ~1.5 min | LLM-compliance seams |
| `rotate` | home + one roster peer, round-robin per cycle | ~30–60s | Long tasks, reviewer variety |
| `panel` | home + every roster peer, each independent; lead applies the confirmation rule | ~3 min | High-blast-radius seams (see auto-promotion) |

Times assume two reachable peers and scale with roster size.
`home-only` is an auditor_mode (who audits); solo-lead is an orchestration mode (whether the lead dispatches subagents at all).
They are independent axes, so never read `home-only` as `solo-lead`.
Any `auditor_mode` outside this table resolves to `home-only`, and the lead logs the unrecognized value once rather than stopping.
That covers a plan pre-scoped against an older vocabulary (`claude-solo` was this mode's name before the roster existed), a mode renamed in a future version, and a plain typo, all through one path instead of a table of aliases.
An audit that runs is worth more than an audit that refuses over a name.

**Roster size changes what these modes can promise.**
With zero peers resolved, all four modes run `home-only` and the lead logs the degradation.
With one peer, the rotation ring has a single entry and `consult` and `panel` dispatch that same peer every cycle.
A finding is CONFIRMED when two or more auditors flag it independently, at any roster size, and the lead treats it as blocking whatever severity labels came attached.
A finding flagged by exactly one auditor is SINGLE-SOURCE and the lead adjudicates it on evidence rather than by vote.
This replaces the old majority rule, which was undefined at two auditors and tied at four.

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

These mirror the typical bubble-up categories in a project's house rules, so cross-model audit fires exactly where you'd want a second opinion anyway.

**When a promoted mode cannot be honored.**
A mode the lead reached by auto-promotion degrades silently to `home-only` with one logged line, because blocking on the lead's own inference would stall autonomous execution.
A mode the user explicitly asked for bubbles once, states that no audit peers resolved, and hands the user a ready-to-paste `## Ping-pong audit peers` block for their CLAUDE.md.
Either way the cycle proceeds; the lead never stalls waiting for a peer.

Run-time detail lives in **references/audit-modes.md**: how the lead resolves the roster and degrades when it is empty, when `home-only` may be skipped on trivial seams, the write-before-read independence protocol and the `<slug>_audit.md` naming rule, peer delivery options (orchestrator agents or direct CLI), the adjudication ladder for disagreeing verdicts, and rotation state.
Read it before running any mode beyond `home-only`.
`consult` / `rotate` / `panel` never skip the audit.

## Monitoring

For long runs, point Claude Code's native `Monitor` tool at a poll script that emits `ALERT:` lines on hangs, stale tasks, or rate-limit hits — each line surfaces to the lead mid-conversation. Setup, an example script, and the manual-poll fallback for environments without Monitor: **references/monitoring.md**.

## Discipline rules (lead-enforced via verify + re-dispatch)

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
- **Cross-model audit needed** → per `auditor_mode` (references/audit-modes.md)
- **Adversarial second opinion on a tricky impl** → a peer auditor from the roster (references/audit-modes.md); e.g. a `codex-cli-orchestrator` agent or the `codex` CLI
- **Long-running smoke test** → `Monitor` on the test process

Helpers report to the lead, not to ping/pong/auditor. Workers stay focused on their role; if they need help, they ask the lead.

## Brief templates

The dispatch briefs (pp-ping, pp-pong, pp-auditor, cross-model consult) live in **references/briefs.md**. Read that file once per work session before the first dispatch, then adapt per task — the briefs are scaffolds, not scripts.

## Memory layout

Each predefined agent has `memory: project` + `skills: [subagent-memory]` in frontmatter; Claude Code auto-creates a per-agent `MEMORY.md` whose first 200 lines / 25KB are preloaded into the agent's system prompt every invocation. Path follows where the agent is defined: project-scoped agents (`<project>/.claude/agents/`) → `<project>/.claude/agent-memory/<agent>/MEMORY.md`; global agents (`~/.claude/agents/`) → `~/.claude/agent-memory/<agent>/MEMORY.md`. Project memory is designed to be shareable via version control — commit it if the team should inherit the accumulated craft, or switch the agents to `memory: local` (→ `.claude/agent-memory-local/`) to keep it out of the repo. Either way, craft built in one project doesn't leak to others.

What each agent remembers is defined in its own file ("What memory should hold"): ping → test-location maps, spec shapes, decomposition heuristics; pong → impl patterns, harness gotchas, reuse paths; auditor → false-positive patterns, checklist refinements, cross-model findings. Spawn fresh per scenario: memory persists, context does not. The lead persists across the whole session (it's the main thread).

## Install

Human-facing install and agent-bootstrap instructions live in this skill's **README.md**. The lead never installs anything mid-session — pre-flight (step 0) only verifies the pieces exist and stops with the README instructions if they don't. New agent types register on session restart.

## Cycle cache (where ephemera lives)

Three places hold cycle state, each suited to its data shape:

1. **The codebase** — spec (failing test) and impl (diff). Durable, committable, the actual contract.
2. **The task** (via `TaskUpdate` → description) — structured small data: ping's spec section, pong's evidence section, auditor's verdict section. Queryable via `TaskGet`; serves as the built-in audit trail.
3. **The cache** — only LARGE / RAW blobs that would bloat the task description, plus per-auditor verdicts from multi-auditor modes (kept as separate files to enforce write-before-read independence).

```
.claude/ping-pong/<work-id>/                       (gitignored; per-session cache root)
├── GOAL.md                       lead writes at session start — SMART work-level goal
└── <task-id>/                    (one subdir per scenario; safe to delete after audit closes)
    ├── test_output.txt           pp-pong writes — raw test stdout/stderr
    ├── judge_samples.md          pp-pong writes — LLM seams only (N≥5 raw outputs)
    └── <slug>_audit.md           any mode but home-only: one per auditor,
                                  home_audit.md plus one per peer
```

`<work-id>` is the `team_name` slug (e.g. team `pp-auth-rollout` → cache at `.claude/ping-pong/auth-rollout/`), so all scenarios of one work session share a parent directory — one delete cleans the whole session. `GOAL.md` lives at the work-id root because the goal applies to the whole session.

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
- The cache contains anything besides `GOAL.md` (work-id root) or large blobs / `<slug>_audit.md` verdicts (task-id subdirs) → STOP — that data belongs in the task description, not a file
