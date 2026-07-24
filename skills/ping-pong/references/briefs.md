# Dispatch briefs

Compact scaffolds the lead adapts per task. Read this file once per work session, before the first dispatch. The briefs are scaffolds, not scripts — fill the placeholders, append task-specific rules where noted, and keep each brief short; the agent bodies already carry the full discipline.

## pp-ping brief

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

## pp-pong brief

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

## pp-auditor brief

```
Task ID: <task-id>
Work ID: <team-name slug>
Goal file: .claude/ping-pong/<work-id>/GOAL.md  ← READ for "on task" + "extra mile"
Test path: <from task description>
Diff: <git rev-range>
auditor_mode: <home-only | consult | rotate | panel>   (legacy `claude-solo` = `home-only`)
auditor_slot: home
verdict_file: .claude/ping-pong/<work-id>/<task-id>/home_audit.md
Task-specific FAIL conditions (optional, lead-added):
- <pattern the lead has noticed across recent cycles>

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
- Extra mile: PASS | ADVISORY — <missed sibling work or "none obvious">
- Concerns addressed (DONE_WITH_CONCERNS only): for each pong concern, resolved/open + reasoning
- LLM compliance verified (if applicable)
- Audit sha: <git rev-parse HEAD>
- Overall: PASS  (all four blocking axes PASS; list advisory findings)
         | FAIL (any blocking axis fails — lead routes to ping or pong by the failed axis)

For any mode other than home-only, ALSO write your independent verdict to the
verdict_file above (.claude/ping-pong/<work-id>/<task-id>/home_audit.md).
(separate file preserves "write before reading others" independence)
```

## Cross-model consult brief (lead → peer auditors)

Deliver this via the peer's roster entry, either its `agent:` subagent type or its `run:` command with `{brief}` substituted; see `audit-modes.md`. Same brief either way:

```
Cross-model audit consultation for task <task-id> (work-id: <work-id>).
Your auditor slug: <slug>
Your verdict file: .claude/ping-pong/<work-id>/<task-id>/<slug>_audit.md

You are an independent second pair of eyes. DO NOT read the home auditor's
verdict until you've formed your own opinion.

1. Read the task (intent + ping's spec + pong's evidence sections) and the test
   pp-ping wrote (path in task description). Read the diff: git diff <rev-range>.
2. Re-run the test yourself.
3. Validate referenced cache files exist at
   .claude/ping-pong/<work-id>/<task-id>/ (test_output.txt, judge_samples.md if LLM seam).
4. Form an independent verdict and write it to your verdict file above FIRST.
5. THEN read .claude/ping-pong/<work-id>/<task-id>/home_audit.md.
   Note anything you found that the home auditor missed.

Report back: PASS / FAIL + one concrete reason + confidence +
findings missed by the home auditor.
```
