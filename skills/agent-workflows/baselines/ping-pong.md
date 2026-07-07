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
| Navigator (ping) | WHAT: writes one failing test as the executable spec | Forcing an implementation technique through the test |
| Driver (pong) | HOW: implements until the test passes | Modifying the test to make it pass |
| Auditor | VERDICT: per-axis judgment from fresh context | Joining the pair's channel or negotiating the bar |

## Contract

- Entry: the loop starts on a non-default feature branch created before the first spec dispatch; branch creation is an owned setup step, never assumed.
- Spec handoff (RED): the navigator runs the test once and proves it fails before handing off; a passing-on-arrival test is a broken spec.
- Implementation return (GREEN): the driver re-proves RED first, implements, then runs the test command verbatim and returns the exit code plus saved output as evidence.
- Audit: the auditor re-runs the target test plus sibling tests, checks the diff against the declared out-of-scope list, and emits one verdict per axis with a concrete reason.
- Verdict axes: On task, Correct, Right (hygiene), and Smart (approach) are blocking; Extra mile is advisory and never blocks.
- Rounds: a round is one implementation return plus its audit, an On-task re-spec rides inside the round that exposed it, and the round cap counts build attempts.
- Exit (composition glue): before the loop exits, audited work is committed on a non-default feature branch - the source trio does not mandate this, the baseline adds it so a downstream ship gate can validate committed history.

## Invariants

- The spec is a real failing test in the codebase, written in the project's existing test conventions - never a spec.md.
- The driver never modifies the test; if the test feels wrong, escalate for a re-spec.
- If the test is already green on arrival, the spec is wrong (usually a too-weak assertion) - escalate, do not implement.
- Evidence over assertion: every return is re-verified by an actor other than its author - the orchestrator directly, or the auditor's own re-run when the orchestrator cannot execute commands (a Workflow script) - and a claim without reproducible evidence is a rejected return.
- The auditor gets fresh context per audit and trusts nothing it did not reproduce itself.
- A passing test is not a passing audit; alignment, hygiene, and approach gate independently.
- Stochastic seams (LLM output, flaky externals) encode at least 5 trials in the test via native parametrization; a single-shot pass is never a pass.
- Cap diagnosis at 2 falsified hypotheses per failing cycle, then escalate with the evidence attached.

## Failure routing

| Failed axis | Route |
|---|---|
| On task | Re-dispatch the navigator - the spec missed intent |
| Correct or Right | Re-dispatch the driver with the gap noted |
| Smart | Re-dispatch the driver with a simpler-approach prompt; escalate if the problem is architectural |
| Extra mile (advisory) | Orchestrator's choice: log it, or allow one small obvious sibling fix |

Escalate to the human only at 3+ fruitless rounds, a blown time-bound, or when the input itself proves wrong.

## Workflow skeleton (example - adapt freely)

```js
// One scenario through the loop; pipeline() this over all scenarios.
// SPEC returns {testPath, redEvidence}; IMPL returns {files, testCmd, greenEvidence}; VERDICT returns {axes: [{name, blocking, pass, reason}]}.
let spec = await agent(specPrompt(scenario), { phase: 'Spec', schema: SPEC })
if (!spec) return { escalate: { scenario, reason: 'no spec produced' } }
const BLOCKING = ['On task', 'Correct', 'Right', 'Smart']
let verdict = null
for (let round = 0; round < 3; round++) {
  const impl = await agent(implPrompt(spec, verdict), { phase: 'Build', schema: IMPL })
  verdict = impl && await agent(auditPrompt(scenario, spec, impl), { phase: 'Audit', schema: VERDICT, effort: 'high' })
  if (!verdict) { verdict = { axes: [{ name: 'Correct', blocking: true, pass: false, reason: 'missing impl or verdict' }] }; continue }
  const failed = BLOCKING                                                    // gate by axis name, fail closed on absent axes:
    .map(n => verdict.axes.find(a => a.name === n) ?? { name: n, pass: false, reason: 'axis missing' })
    .filter(a => !a.pass)                                                    // a partial verdict never passes; advisory never blocks
  if (!failed.length) {
    await agent(commitPrompt(scenario, impl), { phase: 'Build' })            // exit invariant: commit audited work on a non-default feature branch
    return { scenario, impl, verdict }                                      // audited green and committed: done
  }
  const specGap = failed.some(a => a.name === 'On task')
  if (specGap && round < 2) {
    spec = (await agent(respecPrompt(scenario, verdict), { phase: 'Spec', schema: SPEC })) ?? spec
    verdict = null                                                           // the old audit judged the old spec; never route its gap to the driver
  }
}
return { escalate: { scenario, verdict } }                                   // three fruitless rounds: the human's call
```

## Composes with

- Upstream: a decomposition stage producing BDD scenarios with disjoint file ownership (see the primitives file).
- Downstream: the no-mistakes gate - this loop's exit state (green, audited, committed on a feature branch) is that gate's entry precondition.
