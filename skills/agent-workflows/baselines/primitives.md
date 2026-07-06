# Primitives: cross-cutting parts

These are not workflows; they are graftable parts.
Any composed workflow can adopt one with its rules intact; the rules are the primitive.

## Goal anchor

A short goal statement written before the first dispatch, with Specific, Measurable, Achievable, Relevant, and Time-bound sections.

- Write the goal before any task is created; every agent reads it to detect drift.
- Measurable states workflow-level completion checks, not per-task ones.
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

## Bounded loops

Every retry loop has a hard cap and an explicit escalation threshold.

- Cap diagnosis at 2 falsified hypotheses, then escalate with the evidence.
- Escalate to the human at 3+ fruitless re-dispatches, a blown time-bound, or input proven wrong - and bias toward self-recovery before that.
- Kill any command sitting at 0% CPU for more than ~3 minutes and treat it as a failure.

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
