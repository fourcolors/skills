// Copy-ready composition of the SKILL.md worked example:
//   goal anchor (primitive) -> ping-pong loop per scenario (baseline) -> no-mistakes gate (baseline).
// Start from this file when the request matches "build these scenarios and ship them".
// Adapt the structure freely; every "invariant" comment marks a line that must stay true.
// Runs only inside the Workflow tool, which injects agent/parallel/pipeline/phase/log/args
// as globals per its documented contract - this is not a standalone Node script.
//
// Invoke as: Workflow({ scriptPath: <your adapted copy>, args: {
//   goal:      { specific, measurable, achievable, relevant, timeBoundRounds },
//   intent:    'rich statement of what the user set out to accomplish - decisions, tradeoffs, ruled-out approaches',
//   branch:    'feature/...',   // non-default; the gate validates committed history here
//   scenarios: [{ name, given, when, then, ownedFiles: ['...'], verify: 'one-line command' }],
// }})
// Resolve project facts (real test runner, file conventions) into these args before dispatch;
// a placeholder left in a dispatched prompt is a composition defect (SKILL.md procedure step 4).

export const meta = {
  name: 'build-and-ship',
  description: 'Ping-pong build loop per BDD scenario, then the no-mistakes ship gate on the finished branch',
  phases: [
    { title: 'Setup', detail: 'create or check out the non-default feature branch' },
    { title: 'Spec', detail: 'navigator writes one failing test per scenario' },
    { title: 'Build', detail: 'driver implements to green, then commits audited work' },
    { title: 'Audit', detail: 'independent per-axis verdicts from fresh context' },
    { title: 'Verify', detail: 'workflow-level Measurable check from the goal anchor' },
    { title: 'Gate', detail: 'ordered validation pipeline before the push target' },
    { title: 'Fix', detail: 'bounded auto-fix responses to gate findings' },
    { title: 'Ship', detail: 'push, PR, CI; done at checks-passed, the human merges' },
  ],
}

// Refusal is success (primitive): bounce thin input instead of forcing a workflow,
// citing the exact missing facts - thin means any fact the prompts below would interpolate.
const need = {
  'goal.specific': args?.goal?.specific, 'goal.measurable': args?.goal?.measurable,
  'goal.achievable': args?.goal?.achievable, 'goal.relevant': args?.goal?.relevant,
  'goal.timeBoundRounds > 0': args?.goal?.timeBoundRounds > 0,
  'intent': args?.intent, 'branch': args?.branch,
  'scenarios[]': Array.isArray(args?.scenarios) && args.scenarios.length,
}
const missing = Object.keys(need).filter(k => !need[k])
if (Array.isArray(args?.scenarios)) {
  for (const [i, sc] of args.scenarios.entries()) {
    for (const k of ['name', 'given', 'when', 'then', 'verify']) if (!sc?.[k]) missing.push(`scenarios[${i}].${k}`)
    if (!Array.isArray(sc?.ownedFiles) || !sc.ownedFiles.length) missing.push(`scenarios[${i}].ownedFiles[]`)
  }
}
if (missing.length) {
  return { refused: `Thin input - missing: ${missing.join(', ')}. What job statement (a problem worth solving plus who benefits) should drive this run, and what are these facts?` }
}
const { goal, intent, branch, scenarios } = args
// Goal anchor (primitive): all five SMART sections, read by every agent to detect drift.
const anchor = `GOAL: ${goal.specific} | MEASURABLE: ${goal.measurable} | ACHIEVABLE: ${goal.achievable} | RELEVANT: ${goal.relevant} | TIME-BOUND: ${goal.timeBoundRounds} rounds per scenario`

// Structured LLM output (primitive): every stage that feeds this script declares its shape.
const SPEC = { type: 'object', required: ['testPath', 'testCmd', 'exitCode', 'redEvidence'], properties: {
  testPath: { type: 'string' }, testCmd: { type: 'string' }, exitCode: { type: 'number' }, redEvidence: { type: 'string' } } }
// IMPL is a discriminated union (structured-output primitive) so the driver's mandated
// stop-path is schema-legal; the API rejects oneOf at a schema's top level, so branch
// completeness is enforced fail-closed in the loop code instead.
const IMPL = { type: 'object', required: ['status'], properties: {
  status: { enum: ['green', 'broken-spec'] },
  files: { type: 'array', items: { type: 'string' } }, testCmd: { type: 'string' },
  exitCode: { type: 'number' }, greenEvidence: { type: 'string' }, reason: { type: 'string' } } }
const VERDICT = { type: 'object', required: ['axes'], properties: { axes: { type: 'array', items: {
  type: 'object', required: ['name', 'blocking', 'pass', 'reason'], properties: {
    name: { enum: ['On task', 'Correct', 'Right', 'Smart', 'Extra mile'] },
    blocking: { type: 'boolean' }, pass: { type: 'boolean' }, reason: { type: 'string' } } } } } }
const COMMIT = { type: 'object', required: ['sha'], properties: { sha: { type: 'string' } } }
const MEASURE = { type: 'object', required: ['cmd', 'exitCode', 'evidence'], properties: {
  cmd: { type: 'string' }, exitCode: { type: 'number' }, evidence: { type: 'string' } } }
const OK = { type: 'object', required: ['ok'], properties: { ok: { type: 'boolean' }, fix: { type: 'string' } } }
const GATE = { type: 'object', required: ['findings'], properties: { findings: { type: 'array', items: {
  type: 'object', required: ['id', 'action', 'detail'], properties: {
    id: { type: 'string' }, action: { enum: ['auto-fix', 'no-op', 'ask-user'] }, detail: { type: 'string' } } } } } }
const SHIP = { type: 'object', required: ['prUrl', 'ci'], properties: {
  prUrl: { type: 'string' }, ci: { enum: ['checks-passed', 'failed'] } } }

// Capability tiers (primitive): stages declare tiers, never concrete models.
// This map is the script's single tier-to-options binding point; retune here, never per call.
const TIER = { fast: { effort: 'low' }, standard: {}, reasoning: { effort: 'high' }, heavy: { effort: 'xhigh' } }

const specPrompt = sc => `${anchor}
You are the navigator for scenario "${sc.name}" (Given ${sc.given} / When ${sc.when} / Then ${sc.then}).
Write ONE failing test in the project's existing test conventions that encodes this behavior - never a spec document.
Only touch files in: ${sc.ownedFiles.join(', ')}.
The scope's Verify one-liner is "${sc.verify}"; confirm or correct it against the project's real test runner - your returned testCmd is authoritative.
Run the test once and prove it fails; a passing-on-arrival test is a broken spec.
If the behavior crosses a stochastic seam (LLM output, flaky externals), encode at least 5 trials via native parametrization; a single-shot pass is never a pass.
Return testPath, the verbatim testCmd, its exit code, and the failure output as redEvidence.`

const implPrompt = (sc, spec, failedAxes) => `${anchor}
You are the driver for scenario "${sc.name}"; the spec is the failing test at ${spec.testPath}.
NEVER modify the test; if it feels wrong, return status 'broken-spec' with your reason instead of implementing.
Re-run ${spec.testCmd} first to re-prove RED; if it is already green on arrival the spec is broken (usually a too-weak assertion) - return status 'broken-spec' instead of implementing.
Implement only inside ${sc.ownedFiles.join(', ')}, then run the same command verbatim.
Cap diagnosis at 2 falsified hypotheses this cycle, then stop and return what you have with the evidence attached.
${failedAxes ? `The previous round failed audit on: ${JSON.stringify(failedAxes)}. Address exactly that gap.` : ''}
Return exactly one of two shapes: status 'green' with the files you touched, the verbatim testCmd, its exit code, and its passing output as greenEvidence; or status 'broken-spec' with a reason.`

const auditPrompt = (sc, spec, impl) => `${anchor}
You are the independent auditor for scenario "${sc.name}", judging from fresh context; trust nothing you did not reproduce yourself.
Re-run ${spec.testCmd} and the sibling tests; compute the diff yourself - the driver's reported files (${impl.files.join(', ')}) are a claim to check, not the boundary - and verify it stays inside ${sc.ownedFiles.join(', ')}.
Emit one verdict for EACH axis with a concrete reason; "looks good" is not a verdict.
Axes: On task, Correct, Right, Smart are blocking; Extra mile is advisory and never blocks.`

// Ping-pong entry precondition: the loop starts on a non-default feature branch
// created before the first spec dispatch - branch creation is owned here, not assumed.
const setup = await agent(`Create or check out the non-default feature branch ${branch} from the default branch.
On failure return ok:false with the exact fix command, never a guess.`, { phase: 'Setup', schema: OK, ...TIER.fast })
if (!setup?.ok) return { blocked: { stage: 'setup', fix: setup ? (setup.fix ?? 'verdict returned no fix command') : 'no setup verdict' } }

// Ping-pong loop (baseline), one scenario at a time.
// Sequential agents share one working tree - that is what lets the driver and auditor
// see the navigator's uncommitted RED test; parallel scenarios need worktree isolation
// per agent plus an explicit merge stage.
const BLOCKING_AXES = ['On task', 'Correct', 'Right', 'Smart']
const shipped = []
for (const sc of scenarios) {
  // RED is proven by exit code, checked here, not assumed: a passing-on-arrival spec is broken.
  let spec = await agent(specPrompt(sc), { phase: 'Spec', schema: SPEC, ...TIER.standard })
  if (spec && spec.exitCode === 0) {
    spec = await agent(specPrompt(sc) + '\nYour previous spec passed on arrival (exit code 0) - a passing-on-arrival test is a broken spec; write one that provably fails.', { phase: 'Spec', schema: SPEC, ...TIER.standard })
  }
  if (!spec || spec.exitCode === 0) return { escalate: { scenario: sc.name, reason: 'no failing spec produced - RED unproven', anchor }, shipped }
  let verdict = null
  let failedAxes = null
  let done = false
  // A round is one implementation return plus its audit; an On-task re-spec rides inside
  // the round that exposed it, so the round cap counts build attempts.
  for (let round = 0; round < goal.timeBoundRounds && !done; round++) {
    const impl = await agent(implPrompt(sc, spec, failedAxes), { phase: 'Build', schema: IMPL, ...TIER.standard })
    if (!impl) { failedAxes = [{ name: 'Correct', pass: false, reason: 'no implementation returned' }]; continue }
    if (impl.status === 'green' && Array.isArray(impl.files) && impl.files.length && impl.testCmd && impl.greenEvidence && impl.exitCode === 0) {
      verdict = await agent(auditPrompt(sc, spec, impl), { phase: 'Audit', schema: VERDICT, ...TIER.reasoning })
      if (!verdict) { failedAxes = [{ name: 'Correct', pass: false, reason: 'no audit verdict returned' }]; continue }
      // Blocking is decided by axis NAME, not the auditor's flag, and absent axes fail closed:
      // an empty or partial verdict can never pass vacuously, and a mislabeled
      // "Extra mile blocking:true" can never block (advisory never blocks).
      // This one computed list also drives the next driver dispatch, so gate and prompt never disagree.
      failedAxes = BLOCKING_AXES
        .map(name => verdict.axes.find(a => a.name === name) ?? { name, pass: false, reason: 'axis missing from verdict' })
        .filter(a => !a.pass)
      if (!failedAxes.length) {
        // Exit invariant and the composition seam: audited work is committed on the
        // non-default feature branch, which is exactly the gate's entry precondition.
        // The sha is the evidence; preflight verifies these exact commits before its rebase.
        const committed = await agent(`Commit the audited work for scenario "${sc.name}" on branch ${branch}, message naming the scenario; return the commit sha.`, { phase: 'Build', schema: COMMIT, ...TIER.fast })
        if (!committed?.sha) return { escalate: { scenario: sc.name, reason: 'no commit sha returned - gate entry precondition unproven', anchor }, shipped }
        shipped.push({ scenario: sc.name, sha: committed.sha, verdict })
        done = true
        continue
      }
    } else if (impl.status === 'broken-spec') {
      // The driver's stop-path: a spec-level signal, routed to the navigator below, never back to the driver.
      verdict = null
      failedAxes = [{ name: 'On task', pass: false, reason: impl.reason ?? 'driver reports broken spec' }]
    } else {
      // An incomplete green claim (missing files, testCmd, evidence, or nonzero exit) fails closed
      // as a driver-side gap: the schema cannot enforce branch completeness (no top-level oneOf),
      // so this guard is what keeps auditPrompt's impl.files access crash-free.
      verdict = null
      failedAxes = [{ name: 'Correct', pass: false, reason: 'incomplete green claim - missing files, testCmd, evidence, or nonzero exit' }]
    }
    // Failure routing: only a JUDGED On-task failure re-dispatches the navigator - an
    // On task axis absent from the verdict is an audit defect, and the next round's
    // fresh auditor re-judges it rather than the spec being condemned unheard.
    const specGap = failedAxes.filter(a => a.name === 'On task' && a.reason !== 'axis missing from verdict')
    if (specGap.length && round < goal.timeBoundRounds - 1) {
      const respec = await agent(specPrompt(sc) + `\nThe previous spec missed intent: ${JSON.stringify(specGap)}.`, { phase: 'Spec', schema: SPEC, ...TIER.standard })
      if (!respec || respec.exitCode === 0) return { escalate: { scenario: sc.name, reason: 'no failing re-spec produced after On-task failure', failedAxes, anchor }, shipped }
      spec = respec
      failedAxes = null // the old audit judged the old spec; never route its gap to the driver
    }
  }
  // Escalations cite the goal anchor (primitive), never just "stuck on scenario N".
  if (!done) return { escalate: { scenario: sc.name, verdict, failedAxes, anchor }, shipped }
  log(`${shipped.length}/${scenarios.length} scenarios audited and committed`)
}

// Workflow-level Measurable check (goal anchor primitive): per-scenario green is not goal-level done.
const measure = await agent(`${anchor}
All ${scenarios.length} scenarios are audited and committed on ${branch}.
Prove the Measurable condition holds: ${goal.measurable}
Evidence over assertion: return the verbatim command you ran, its exit code, and the saved output.`, { phase: 'Verify', schema: MEASURE, ...TIER.standard })
if (!measure || measure.exitCode !== 0) {
  return { escalate: { reason: `cannot satisfy Measurable check: ${goal.measurable}`, measure, anchor }, shipped }
}

// Gate entry preconditions and rebase (gate baseline setup steps): verified against the
// recorded commit shas BEFORE the rebase, which may rewrite them - the scenario-named
// commit messages are the identifiers that survive.
const preflight = await agent(`Preflight the ship gate for ${branch}: confirm the branch is non-default, confirm commits ${shipped.map(s => s.sha).join(', ')} are present on it, confirm the push target is configured, then rebase ${branch} on the default branch (the rebase may rewrite those shas; their scenario-named messages are the stable identifiers).
Unrelated uncommitted changes are preserved, never validated and never a blocker.
On any violated precondition return ok:false with the exact fix command, never a guess.`, { phase: 'Gate', schema: OK, ...TIER.standard })
if (!preflight?.ok) return { blocked: { stage: 'preflight', fix: preflight ? (preflight.fix ?? 'verdict returned no fix command') : 'no preflight verdict' }, shipped }

// No-mistakes gate (baseline): ordered stages, closed response vocabulary, full re-entry after any fix.
// Composition-time choice (SKILL.md step 4): if the no-mistakes CLI is installed in the target
// environment, replace this whole section with one agent that drives the tool - never both.
const stages = ['review', 'test', 'document', 'lint']
const attempts = Object.fromEntries(stages.map(s => [s, 0]))
for (let i = 0; i < stages.length; ) {
  const stage = stages[i]
  const gate = await agent(`${anchor}
Gate stage "${stage}" for the committed history on ${branch}; validate commits only, never the working tree.
Intent (so review can tell deliberate choices from mistakes): ${intent}
Classify every finding as auto-fix, no-op, or ask-user; skips are explicit, never silent.`, { phase: 'Gate', schema: GATE, ...TIER.reasoning })
  if (!gate) return { blocked: { stage, reason: 'gate agent returned no verdict' }, shipped }  // a missing verdict blocks, never advances
  const askUser = gate.findings.filter(f => f.action === 'ask-user')
  if (askUser.length) return { blocked: { stage, findings: askUser, note: 'relay verbatim; only the human decides' }, shipped }
  const fixable = gate.findings.filter(f => f.action === 'auto-fix')
  if (!fixable.length) { i++; continue }
  if (++attempts[stage] > 3) return { escalate: { stage, findings: fixable, anchor }, shipped }
  const fixed = await agent(`Fix exactly these ${stage} findings, nothing else, and commit on ${branch}; return the commit sha: ${JSON.stringify(fixable)}`, { phase: 'Fix', schema: COMMIT, ...TIER.standard })
  if (!fixed?.sha) return { blocked: { stage, reason: 'fix agent returned no commit sha - the gate cannot re-enter unfixed' }, shipped }
  i = 0 // a fix commits new code: re-enter the FULL gate from the first stage
}

// Terminal steps (gate baseline): push -> PR -> CI; the workflow is done at checks-passed.
const ship = await agent(`Push ${branch}, open the PR with title and body derived from this intent, and watch CI to completion.
Intent: ${intent}
Long-running CI is working, not stalled; never cancel or re-issue a blocking call because it seems slow.
You are done at checks-passed; hand the PR to the human and never poll for the merge.`, { phase: 'Ship', schema: SHIP, ...TIER.standard })
if (!ship || ship.ci !== 'checks-passed') {
  // CI failure ends this run - bounded, never an auto-loop; the escalation tells the next
  // run to fix what CI points at, commit on the same branch, and re-enter from preflight.
  return { escalate: { stage: 'CI', ship, anchor, next: 'fix what CI points at, commit on the same branch, re-run from preflight - never a partial re-validation' }, shipped }
}

return { shipped, pr: ship.prUrl, done: 'checks-passed - the PR awaits the human merge' }
