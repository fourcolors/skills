# Baseline: no-mistakes ship gate

Source of truth: the `no-mistakes` CLI (`axi`) and its driving-manual skill, which own the real pipeline, state, and config.
If the CLI is installed, the baseline is "drive the tool" - never reimplement the pipeline alongside it.
Use this file to compose the gate's shape into workflows or environments where the CLI is absent.

## Intent

All committed work passes an ordered validation pipeline, under an explicit human-authority model, before it reaches the push target.

## When to use

As the terminal stage of any workflow that produces committed code; the gate sits after the build loop and before the human merge, and it is never modified by the workflow around it.

## Stages, in order

intent -> rebase -> review -> test -> document -> lint -> push -> PR -> CI

Cheap-to-fix semantic issues (review) come before mechanical checks, and everything comes before the remote sees the branch.

## Contract

- Entry preconditions: work is committed on a non-default feature branch and the push target is configured; a violated precondition returns the exact fix command, never a guess.
- Intent input: a rich statement of what the user set out to accomplish - decisions, tradeoffs, ruled-out approaches - so review can tell deliberate choices from mistakes.
- Gate loop: run -> gate -> respond -> ... -> outcome; the run never advances past a gate without an explicit response.
- Response vocabulary is closed: approve, fix, skip; skips are explicit, never silent.
- Terminal outcomes: checks-passed (CI green, PR awaits the human), passed (merged), failed, cancelled.

## Finding taxonomy (the authority model)

| Action class | Meaning | Who decides |
|---|---|---|
| auto-fix | Mechanical and low-risk | The agent may authorize it on its own judgment |
| no-op | Informational, never blocks | Nobody - note it and move on |
| ask-user | Challenges deliberate intent or product behavior | Only the human; relay the finding verbatim |

## Invariants

- Validate committed history only - the working tree is never what gets validated, unrelated uncommitted changes are preserved rather than blocking, and the gate never runs on the default branch.
- While a run is active the pipeline owns all fixes; the agent decides at gates but never side-channel edits the code.
- ask-user findings are relayed verbatim - no paraphrase, no pre-judging - unless the user gave explicit standing consent to drive unattended.
- A thin one-line intent is a defect: it makes review flag deliberate choices as mistakes.
- Failures loop back through the full gate: fix what the output points at, commit on the same branch, start a fresh run - never a partial or incremental re-validation.
- The agent is done at checks-passed: hand the PR to the human and never poll for the merge.
- Long-running gate calls are working, not stalled; never cancel or re-issue a blocking call because it seems slow.

## Failure routing

Fix exactly what the failing output points at, commit on the same feature branch, and start a fresh run.
Abort and rerun are strictly between-runs actions; never use them mid-run to bypass a gate or take over a fix.

## Workflow skeleton (example - adapt freely)

```js
// Composed gate for environments without the no-mistakes CLI.
// GATE returns {findings: [{id, action, detail}]} where action is 'auto-fix' | 'no-op' | 'ask-user'.
const stages = ['review', 'test', 'docs', 'lint']
for (let attempt = 0, i = 0; i < stages.length; ) {
  const gate = await agent(gatePrompt(stages[i], intent, branch), { phase: 'Gate', schema: GATE })
  if (!gate) return { blocked: { stage: stages[i], reason: 'gate agent returned no verdict' } }  // a missing verdict blocks, never advances
  const askUser = gate.findings.filter(f => f.action === 'ask-user')
  if (askUser.length) return { blocked: { stage: stages[i], findings: askUser } }                // surface verbatim; only the human decides
  const fixable = gate.findings.filter(f => f.action === 'auto-fix')
  if (!fixable.length) { i++; continue }                                                         // clean or no-op only: next stage
  if (++attempt > 3) return { escalate: { stage: stages[i], findings: fixable } }                // bounded: never spin on a non-converging fix
  await agent(fixPrompt(stages[i], fixable), { phase: 'Fix' })
  i = 0                                                                                          // a fix re-enters the FULL gate from the first stage
}
```

## Composes with

- Upstream: the ping-pong build loop - its exit contract (green, audited, committed feature branch) satisfies this gate's entry preconditions.
- Downstream: the human merge; the composed workflow's job ends at green checks.
