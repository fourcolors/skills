# Primitives: cross-cutting parts

These are not workflows; they are graftable parts.
Any composed workflow can adopt one with its rules intact; the rules are the primitive.

## Goal anchor

A short goal statement written before the first dispatch, with Specific, Measurable, Achievable, Relevant, and Time-bound sections, plus Open decisions and Risk.

- Write the goal before any task is created; every agent reads it to detect drift.
- Measurable states workflow-level completion checks, not per-task ones, and it is the frozen acceptance list: reviewers judge against it plus security, and changing it is a logged decision, never a side effect of a review round.
- Open decisions lists every unknown or unsettled design rule the work depends on; each is resolved and written into the goal before the first build dispatch, so no rule is ever settled by review ping-pong.
- Resolve an unknown fact about the system with a thin spike, a design choice inside the goal's scope with one reasoning-tier design pass, and anything that changes product behavior or scope with the human, batching those questions.
- Risk names the sensitive surfaces the work touches (see Review sizing); unresolved unknowns are the main source of risk, which is why they are resolved first rather than reviewed harder later.
- Time-bound caps cycles or wall-clock; when exceeded, escalate with the current state.
- Escalations cite the goal ("cannot satisfy Measurable check X because Y"), never just "stuck on task 3".

## Refusal is success

A workflow that turns fuzzy input into committed work must have a legal, successful refuse path.

- When the input has no job statement (a problem worth solving plus who benefits), emit a sharp question instead of forcing output.
- Exactly one of {output, refusal} per unit of input; never both, never neither.
- The bounce question cites the exact input that made the judge unsure and asks what would surface the missing job statement.
- A needed project fact that cannot be resolved bounces the same way as a missing job statement.
- Housekeeping verbs (commit, push, merge, deploy, retry) are never product intent.

## Evidence over assertion

Every completion claim must carry reproducible evidence, and the orchestrator re-verifies instead of trusting.

- Record the verbatim command, exit code, and saved output; the exit code is the claim, the output is the evidence.
- The orchestrator re-runs the recorded command on every return; when the orchestrator cannot execute commands (a Workflow script), it delegates the re-run to an independent verifier and treats that reproduction as the check.
- Missing evidence means a rejected return.
- "Done with concerns" is a first-class status, but each concern must be specific and actionable, and the reviewer must address every one.

## Blocking vs advisory verdicts

Review gates emit one verdict per axis, split into blocking and advisory, so failures route surgically.

- A single overall PASS/FAIL gives the router no signal about which actor to re-dispatch.
- Overall pass requires all blocking axes to pass; advisory findings never block.
- Each axis verdict carries a concrete reason; "looks good" is not a verdict.

## Independent verifier

The judging agent is structurally separated from the agents it judges.

- Fresh context per verdict, so it cannot rubber-stamp based on prior cycles.
- Off the workers' channel, so the bar cannot be pre-negotiated.
- In multi-verifier panels, each verifier writes its full verdict before reading any other; read-first verdicts are anchored and stop being evidence.
- Weigh convergence over severity: a finding flagged by all verifiers beats a finding one verifier calls critical.

## Dispatch briefs

A brief carries per-task variables; the agent definition carries the standing discipline.

- Briefs are scaffolds, not scripts: goal pointer first, predecessor references, mode flags, expected output structure.
- Task-specific rules appended to a brief only ever tighten the standing rules, never replace them.
- Keep briefs short; if a brief is restating discipline, the discipline belongs in the agent definition.

## BDD decomposition with disjoint ownership

Work splits into scopes that each own an explicit file list and carry executable acceptance criteria.

- Every scope lists the files it owns; overlaps must name the distinct functions each scope touches.
- Every acceptance criterion is Given/When/Then and must fail if the behavior regresses.
- Every scope ends with a one-line runnable Verify command.
- Define interfaces and stubs first so later scopes drop in without touching call sites.

## Capability-tier routing

Stages declare abstract capability tiers; one config file binds tiers to models.

- Tiers are fast, standard, reasoning, and heavy; workflows never name concrete models.
- Judgment and distillation run at reasoning, mechanical parsing at fast, implementation at standard, adversarial grading at heavy.
- The independent per-axis audit is judgment (reasoning); reserve heavy for adversarial grading panels.
- Switching providers is a one-line config edit with zero workflow changes.
- In a composed Workflow script the binding point is a single tier map at the top of the script, spread into each agent call's options.

## Speed: count hand-offs, not stages

Wall-clock in a sequential build loop is set by the number of agent hand-offs per unit of work, because every hand-off pays a fresh spin-up plus at least one test run.
Measured on 2026-09-03 over three runs of the Effect/WorkOS migration (sonnet workers, opus auditor): scout 0.8 min, navigator 2.2, driver 2.9, auditor 2.8, commit 0.4 per scenario, 1.8 driver rounds on average, about 12 wall-clock minutes per scenario; no single stage dominated.

- Batch consecutive scenarios that share a test file (default two): one navigator writes every RED block, one driver makes them all green, one audit judges the batch; the fixed cost per scenario roughly halves.
- Fold read-only pre-flight (the "already wired" scout) into the navigator's first step; a separate scout agent is a hop that returns a list the navigator would re-derive anyway.
- Fold the commit of an audited batch into the next navigator's first step (or into the whole-PR verify for the last batch); no agent should exist only to run git commit.
- Keep exactly one independent audit per batch; verify a fix round with the batch tests, typecheck and the hygiene critic, never with a second full audit (re-auditing after every small fix was two thirds of the per-scenario time).
- Give the auditor a command budget (batch tests, typecheck, diff, each once) and move sibling or contract suites to a parallel fast-tier critic; the reasoning-tier time should go to reading the diff, not waiting on vitest.
- If the whole-PR verify already runs every suite, the ship gate is review only; a test or lint gate stage would be the third run of the same commands.
- Never resume a run into a guard it will trip: after a hand fix, a cached "round 0" driver prompt that says "if already green, report broken-spec" will do exactly that; commit the fix under the scenario name and relaunch on the remaining scenarios instead.
- Keep slow or headless external models (a grok CLI call that took over 15 minutes) off the critical path; add them as an extra reviewer at the gate if a second opinion is wanted.
- Default to a solo builder (tests first, then code, then one independent audit) and reserve the navigator/driver split for ambiguous or security-sensitive scenarios; the independence that pays is the auditor's, not the test-writer's (see the ping-pong baseline "Modes").

## Bounded loops

Every retry loop has a hard cap and an explicit escalation threshold.

- Cap diagnosis at 2 falsified hypotheses, then escalate with the evidence.
- Cap review-driven fix rounds at 2 per unit of work in total (see Review sizing); after the cap, a blocker still open goes to the human with the evidence, never into a third round.
- Escalate to the human at a blown time-bound, input proven wrong, or blockers still open after the fix-round cap - and bias toward self-recovery before that.
- Kill any command sitting at 0% CPU for more than ~3 minutes and treat it as a failure.

## Review sizing: start small, escalate on evidence

Review effort follows the evidence a unit of work produces, not a fixed ceremony: most work gets one reviewer, and the full panel is the top of a ladder, not the default.
Measured on 2026-09-30 over two long runs that put a four-reviewer panel on every slice: every run ended with blockers still open, the same finding was often filed by two or three reviewers, one design rule was re-decided in four consecutive fix rounds, and file-size complaints a script could check were about a sixth of the findings.
The same reviews also caught real security defects, so the fix is sizing and an exit, not less review.

| Level | Reviewers | Starts here when |
|---|---|---|
| 1 | One reasoning-tier reviewer with a checklist | Default for every unit of work |
| 2 | Level 1 plus one cross-model peer, each writing its verdict before reading the other's | The diff touches a sensitive surface: auth, secrets or credentials, network exposure, data isolation or PII, money, destructive data operations or migrations, model-facing prompts |
| 3 | Full panel: every available independent reviewer, at least one of them cross-model, each writing before reading, with the confirmation rule (ping-pong's `panel`) | Only by escalation |

- A unit of work gets at most 2 fix rounds in total, whatever the level; escalating does not reset that budget, and a blocker still open after the second round goes to the human with the evidence.
- The next check runs one level up when a blocking finding survives a fix round, when reviewers disagree on a blocker, or when a reviewer reports it could not judge with confidence; never step down within a unit of work.
- Scope every review tightly: the reviewer reads the diff in scope and the goal's acceptance list, nothing else, and every blocking finding cites a concrete failure scenario.
- Re-check a fix round cheaply: the batch tests and scripts first, plus an anchored re-read of only the findings it answers and the lines it changed when no test can show a finding closed; never a fresh full review.
- A blocker survives a fix round when that re-check still fails it.
- Run mechanical checks (lint, format, typecheck, file-size and line budgets) as scripts or a fast-tier hygiene critic, before or in parallel with the review; a failure blocks, and a reviewer never spends a finding on something a script can decide.
- Merge duplicate findings from multiple reviewers before routing, so one defect costs one fix.
- At levels 1 and 2 only on task (against the acceptance list), correct, and security block; hygiene is the scripts' job, and approach or style suggestions are advisory follow-ups.
- At level 3 every axis blocks.
- Findings that are real but outside the acceptance list and not security become follow-up issues, never another fix round.
- A finding several reviewers agree on still blocks only if its axis blocks at the current level; agreement on an advisory axis makes a stronger follow-up, not a fix round.
- When a sensitive surface cannot get its level 2 reviewer (no peer available), run level 1 and mark the unit of work as under-reviewed in the final report, so the human sees it.

## Rule-level findings stop the loop

A finding that says the spec, the acceptance list, or a design rule is itself wrong is not a code defect, and another fix round cannot resolve it.

- Stop the fix loop for that unit of work the moment such a finding appears.
- One reasoning-tier design pass decides the rule and writes the ruling into the goal's Open decisions, with the reason.
- Send it to the human only when the ruling changes product behavior or scope, or the design pass is not confident; batch such questions rather than asking one at a time.
- Rebuild once against the written ruling; never let reviewers settle the rule round by round.

## Durability

A workflow that writes state must be safe to re-run at any time.

- A durable manifest keyed by content hash is the record of all outputs; check it before any expensive call or write.
- Re-running on the same inputs is a byte-level no-op.
- Every write is atomic: temp file in the same directory, fsync, rename.
- One mutating run at a time, enforced by an exclusive lock with staleness takeover.
- Derived views render from the full manifest, never from this run's delta.
- Skip inputs younger than a settle window so in-flight material is not processed twice.

## Golden-set gate

Any workflow with an LLM judgment at its core ships with a small hand-graded eval set and a threshold.

- Fix the golden set before tuning the prompt, measure on a cadence, stop tuning at the threshold.
- Expected outcomes are a closed enum, and a correct refusal counts as a pass.
- It is a calibration set, not a benchmark: keep it small and hand-picked.

## Structured LLM output

Every LLM stage that feeds a program returns one JSON object matching a declared shape.

- Use a discriminated union with exactly one branch populated, and show every legal shape in the prompt.
- Derive filenames and dedupe keys from stable content, never from nondeterministic LLM labels.

## Graceful degradation

Missing optional dependencies degrade with a warning; missing explicit requests fail loudly.

- Pre-flight external dependencies once per session before promising modes that need them.
- A missing default input is zero items plus a warning, never an abort; a missing explicitly-passed path is a hard failure naming the path.
- Every platform-gated feature pairs with a documented degradation path.
- Read-only views never write, and they render honestly on a fresh machine with nothing installed.
