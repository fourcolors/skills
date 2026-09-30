# Baseline: ping-pong build loop

Source of truth: the full [ping-pong skill](../../ping-pong/) with its predefined pp-ping, pp-pong, and pp-auditor agents.
Use the full skill when running the real trio; use this baseline when composing a custom workflow that borrows the shape.
This file carries only the stable concepts and invariants, so it does not drift when the skill's operational detail changes.

## Intent

Split "decide what done means" from "get there" and from "judge the result", so no single agent can declare its own work complete.

## When to use

Any workflow stage that must produce verified code changes, where a single agent tends toward premature-done claims or drifting scope.

## Roles

| Role | Owns | Never does |
|---|---|---|
| Navigator (ping) | WHAT: commits the previous audited batch, scouts read-only for what already exists, writes one failing test per scenario of the batch as the executable spec | Forcing an implementation technique through the test |
| Driver (pong) | HOW: implements the whole batch until every block passes | Modifying the test to make it pass |
| Auditor | VERDICT: one per-axis judgment per batch from fresh context, one reviewer by default and more only by the review sizing primitive's ladder | Joining the pair's channel or negotiating the bar |
| Hygiene critic | Runs the sibling or contract suites and the project's lint rules in parallel with the audit; re-checks a fix round | Judging design or scope |

## Unit of work: the batch

A batch is a run of consecutive scenarios that share one test file, up to a small cap (two by default).
Batching is the single biggest speed lever measured so far (see the speed primitive): it halves the hand-offs per scenario without removing any check.
A scenario that owns a different test file, or that must land alone (a migration, a security boundary), is a batch of one.

## Modes: solo by default, ping-pong by opt-in

Two build modes share the same audit, hygiene critic, rounds, commit seam and gate; they differ only in who writes the failing test.

| Mode | Who writes RED | Who writes GREEN | Use when |
|---|---|---|---|
| `solo` (default) | One builder, before it implements | The same builder | Small, well-specified scenarios: the Given/When/Then already pins the assertions |
| `pingpong` | Navigator | Driver | Ambiguous or security-sensitive scenarios, where an implementer left to write its own tests writes ones that match its code |

- The solo builder returns the RED proof (exit code and output before implementing) and the GREEN proof together; the orchestrator checks RED exactly as it would a navigator's, and a builder that never proved RED is escalated, not audited.
- The solo audit is told that one agent wrote both sides and must fail Correct on any Then clause asserted only by shape, by a value copied from the implementation, or not at all.
- `args.mode` sets the default; a scenario's own `mode` pins it; one pingpong scenario makes its whole batch pingpong.
- Evidence behind the default (2026-09-03, same project, same batched script, sonnet workers and an opus auditor): PR5 in batched ping-pong took 91 wall-clock minutes for 9 scenarios (10.1 min per scenario; navigator 4.2 min and driver 5.1 min per batch, two escalations that needed hand fixes). PR6 in solo took 45 minutes for 6 scenarios (7.5 min per scenario; builder 4.5 min per batch, zero escalations, every batch audited once and every audit finding fixed in a lint-verified round). The audit failure rate was the same in both modes, and in both the auditor caught real gaps the tests did not. Solo is the default; the independence that pays is the auditor's. PR6 was text-heavy and PR5 was logic-heavy, so treat the 25 percent as a floor for simple work and re-measure solo on a logic-heavy PR before trusting it there.

## Contract

- Entry: the loop starts on a non-default feature branch created before the first spec dispatch; branch creation is an owned setup step, never assumed.
- Spec handoff (RED): the navigator runs the batch test command once and proves it fails before handing off; a block that passes on arrival is a broken spec unless the navigator's scout step explains it as already wired, in which case the block is dropped and the drop is reported.
- Implementation return (GREEN): the driver re-proves RED first, implements inside the union of the batch's owned files, then runs the batch command and typecheck verbatim and returns the exit code plus saved output as evidence.
- Audit: the auditor runs the batch command, typecheck and the diff, each exactly once, checks the diff against the declared out-of-scope list, verifies every Then clause by reading, and emits one verdict per axis with a concrete reason that names the scenario and file.
- Verdict axes: which axes block follows the review level (see the review sizing primitive).
  At levels 1 and 2, On task (against the goal's acceptance list) and Correct (security included) block, Right (hygiene) is settled by the hygiene critic and scripts before the audit, and Smart (approach) is advisory and becomes a follow-up.
  At level 3, On task, Correct, Right, and Smart all block.
  Extra mile is always advisory and never blocks.
- Rounds: a round is one implementation return plus its check; the first check is the audit, later rounds are checked by the batch tests, typecheck, the hygiene critic and an anchored re-read of the findings they answer; an On-task re-spec rides inside the round that exposed it, and the runaway backstop counts fix rounds.
- Exit (composition glue): audited work is committed on the non-default feature branch by the next navigator's first step, or by the whole-PR verify for the last batch, with the batch name as the commit subject; a downstream ship gate validates committed history.

## Invariants

- The spec is a real failing test in the codebase, written in the project's existing test conventions - never a spec.md.
- The driver never modifies the test; if the test feels wrong, escalate for a re-spec.
- If the test is already green on arrival in round 0, the spec is wrong (usually a too-weak assertion) - escalate, do not implement. In later rounds the tree holds the previous round's work, so "already green" is expected and the driver addresses the failed axes instead; the brief must say which round it is.
- Evidence over assertion: every return is re-verified by an actor other than its author - the orchestrator directly, or the auditor's own re-run when the orchestrator cannot execute commands (a Workflow script) - and a claim without reproducible evidence is a rejected return. A green claim missing files, command, exit code or output goes to an independent verifier that runs the command itself, never back into a loop.
- The auditor gets fresh context per audit and trusts nothing it did not reproduce itself.
- A passing test is not a passing audit; alignment, hygiene, and approach gate independently.
- Exactly one full audit per batch: a fix that answers a specific audit finding is re-checked by tests, typecheck and the hygiene critic, plus an anchored re-read of that finding alone when no test can show it closed, never by a second full audit.
- Stochastic seams (LLM output, flaky externals) encode at least 5 trials in the test via native parametrization; a single-shot pass is never a pass.
- Cap diagnosis at 2 falsified hypotheses per failing cycle, then escalate with the evidence attached.
- Fast tier does the work (navigator, driver, critic, verifier, ship); the reasoning tier judges (auditor, gate reviewer); the orchestrating session is the only place the top model is used.

## Failure routing

| Failed axis | Route |
|---|---|
| On task | Re-dispatch the navigator - the spec missed intent; fix only the named block, keep the others |
| Correct or Right | Re-dispatch the driver with the gap noted; the fix round is checked by tests plus the critic |
| Smart (blocking at level 3 only) | Re-dispatch the driver with a simpler-approach prompt; escalate if the problem is architectural |
| Smart or out-of-scope finding (levels 1 and 2) | File a follow-up issue; never a fix round |
| The spec, acceptance list, or a design rule is itself wrong | Stop the loop per the rule-level findings primitive: one design pass writes the ruling into the goal, then rebuild once; never route it to the driver |
| Extra mile (advisory) | Orchestrator's choice: log it, or allow one small obvious sibling fix |

Keep fixing only while each round makes progress: fewer open blockers than the round before and none reopened; a blocker that survives a round also moves the next check one review level up.
Escalate to the human when a round makes no progress, the runaway backstop of 5 fix rounds is hit, a time-bound blows, or the input itself proves wrong; escalating a level never resets the backstop.
After a hand fix of an escalation, commit it under the batch name and relaunch on the remaining scenarios; never resume into the cached round-0 driver, which will report the now-green spec as broken.

## Workflow skeleton (example - adapt freely)

```js
// One batch through the loop; the outer loop walks batches sequentially (agents share one tree).
// SPEC returns {committedSha, alreadyWired, testPath, testCmd, exitCode, redEvidence};
// IMPL returns {status, files, testCmd, exitCode, greenEvidence}; VERDICT returns {axes: [{name, blocking, pass, reason}]};
// LINT returns {violations: [{file, rule, detail}]}.
// `level` is the batch's review level from the review sizing primitive (1 default, 2 for sensitive surfaces).
let spec = await agent(specPrompt(batch, pending), { phase: 'Spec', schema: SPEC })   // commits `pending` first, scouts, writes RED blocks
recordCommit(spec)                                                                    // pending batch is shipped only when a sha came back
if (!spec || spec.exitCode === 0) return { escalate: { batch, reason: 'RED unproven' } }
const blocking = () => level < 3 ? ['On task', 'Correct'] : ['On task', 'Correct', 'Right', 'Smart']
const ruleLevel = (axes) => (axes ?? []).some(a => /^\s*RULE-LEVEL/i.test(a.reason ?? ''))   // any axis, blocking or advisory
const BACKSTOP = 5                                                                    // runaway guard, not the normal stop
let verdict = null, failedAxes = null, audited = false, fixes = 0
while (true) {
  const impl = await agent(implPrompt(batch, spec, failedAxes), { phase: 'Build', schema: IMPL })
  let v = null
  if (!impl || impl.status !== 'green') { failedAxes = [{ name: impl?.status === 'broken-spec' ? 'On task' : 'Correct', pass: false, reason: impl?.reason ?? 'no green claim' }] }
  else {
    const fixRound = audited && failedAxes && !failedAxes.some(a => a.name === 'On task')   // after a re-spec (failedAxes null) the new spec gets a full audit
    const prior = failedAxes
    const [checked, lint] = await parallel([
      () => agent(fixRound ? recheckPrompt(batch, spec, prior) : auditPrompt(batch, spec, impl), { phase: 'Audit', schema: VERDICT, effort: fixRound ? 'low' : 'medium' }),   // fix round: anchored re-read of the prior findings and the fix diff only
      () => agent(lintPrompt(batch, spec, fixRound ? prior : null), { phase: 'Lint', schema: LINT }),
    ])
    v = checked; if (!fixRound) { verdict = v; audited = true }
    if (ruleLevel(v?.axes)) return { stopped: { batch, reason: 'rule-level finding: rule it into the goal, then relaunch', axes: v.axes } }
    failedAxes = blocking().map(n => v?.axes.find(a => a.name === n) ?? { name: n, pass: false, reason: 'axis missing' }).filter(a => !a.pass)
    if (!failedAxes.length && lint?.violations.length) failedAxes = [{ name: 'Right', pass: false, reason: JSON.stringify(lint.violations) }]
    if (fixRound && failedAxes.length) {
      const survived = failedAxes.filter(a => prior.some(p => p.name === a.name))
      if (failedAxes.length >= prior.length) return   // progress rule: each round must close more than it opens { escalate: { batch, failedAxes, level, next: 'no progress this round: a human decides with the evidence' } }
      if (survived.length && level < 3) level++                                       // a surviving blocker moves the next check one level up
    }
  }
  if (!failedAxes.length) { pending = { name: batchName(batch), paths: ownedPaths(batch), verdict }; break }   // next navigator commits it
  if (++fixes > BACKSTOP) return { escalate: { batch, failedAxes, level, next: 'runaway backstop: a human decides with the evidence' } }
  if (failedAxes.some(a => a.name === 'On task')) {
    spec = (await agent(respecPrompt(batch, failedAxes), { phase: 'Spec', schema: SPEC })) ?? spec
    failedAxes = null                                                                 // the old audit judged the old spec
  }
}
```

## Composes with

- Upstream: a decomposition stage producing BDD scenarios with disjoint file ownership (see the primitives file); scenarios that share a test file should be listed consecutively so they batch.
- Downstream: the ship gate - this loop's exit state (green, audited, committed on a feature branch) is that gate's entry precondition; when the whole-PR verify already ran every suite, the gate is review only.
