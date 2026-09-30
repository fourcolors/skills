// Copy-ready composition of the SKILL.md worked example:
//   goal anchor (primitive) -> ping-pong loop per BATCH of scenarios (baseline) -> ship gate (baseline).
// Start from this file when the request matches "build these scenarios and ship them".
// Adapt the structure freely; every "invariant" comment marks a line that must stay true.
// Runs only inside the Workflow tool, which injects agent/parallel/pipeline/phase/log/args
// as globals per its documented contract - this is not a standalone Node script.
//
// Speed shape (measured 2026-09-03, see primitives.md "Speed"): the cost of a build loop is
// the number of hand-offs per scenario, so this script batches scenarios that share a test
// file, folds the scout and the commit into the navigator, audits once per batch, verifies
// fix rounds with tests plus a fast critic, and gates with review only.
//
// Invoke as: Workflow({ scriptPath: <your adapted copy>, args: {
//   goal:      { specific, measurable, achievable, relevant, timeBoundRounds, openDecisions: [{ decision, ruling, reason }] },   // every entry needs a ruling: resolve unknowns before building
//   reviewLevel: 1,            // review sizing primitive; this example implements level 1 (one auditor) only and refuses 2 or 3
//   intent:    'rich statement of what the user set out to accomplish - decisions, tradeoffs, ruled-out approaches',
//   branch:    'feature/...',   // non-default; the gate validates committed history here
//   baseBranch: 'main',
//   repoDir:   '/abs/path/to/checkout',
//   prId:      'PR1', prTitle: '...', outOfScope: ['...'],
//   contractTests: 'npx vitest run test/a.test.ts test/b.test.ts',   // suites that must stay green after every batch
//   hygieneRules: 'project rules the critic enforces on the diff (banned APIs, log redaction, ...)',
//   measureCommands: ['npx vitest run', 'npm run typecheck'],       // whole-PR Measurable check, each must exit 0
//   batchSize: 2,
//   scenarios: [{ name, given, when, then, ownedFiles: ['...'], testPath: 'test/x.test.ts', verify: 'one-line command', notes: '...' }],
// }})
// Resolve project facts (real test runner, file conventions) into these args before dispatch;
// a placeholder left in a dispatched prompt is a composition defect (SKILL.md procedure step 4).

export const meta = {
  name: 'build-and-ship',
  description: 'Ping-pong build loop per batch of BDD scenarios, then a review gate and ship on the finished branch',
  phases: [
    { title: 'Setup', detail: 'create or check out the non-default feature branch' },
    { title: 'Spec', detail: 'navigator commits the previous batch, scouts, writes failing tests, proves RED' },
    { title: 'Build', detail: 'driver implements the batch to green' },
    { title: 'Audit', detail: 'one independent per-axis verdict per batch' },
    { title: 'Lint', detail: 'contract suites and hygiene rules, in parallel with the audit' },
    { title: 'Verify', detail: 'commit the last batch; workflow-level Measurable check' },
    { title: 'Gate', detail: 'review of committed history' },
    { title: 'Fix', detail: 'bounded auto-fix responses to gate findings' },
    { title: 'Ship', detail: 'push, PR, CI; done at checks-passed, the human merges' },
  ],
}

// Refusal is success (primitive): bounce thin input instead of forcing a workflow.
const need = {
  'goal.specific': args?.goal?.specific, 'goal.measurable': args?.goal?.measurable,
  'goal.achievable': args?.goal?.achievable, 'goal.relevant': args?.goal?.relevant,
  'goal.timeBoundRounds > 0': args?.goal?.timeBoundRounds > 0,
  'intent': args?.intent, 'branch': args?.branch, 'baseBranch': args?.baseBranch, 'repoDir': args?.repoDir,
  'prId': args?.prId, 'prTitle': args?.prTitle, 'outOfScope[]': Array.isArray(args?.outOfScope),
  'contractTests': args?.contractTests, 'measureCommands[]': Array.isArray(args?.measureCommands) && args.measureCommands.length,
  'scenarios[]': Array.isArray(args?.scenarios) && args.scenarios.length,
}
const missing = Object.keys(need).filter(k => !need[k])
if (Array.isArray(args?.scenarios)) {
  for (const [i, sc] of args.scenarios.entries()) {
    for (const k of ['name', 'given', 'when', 'then', 'testPath', 'verify']) if (!sc?.[k]) missing.push(`scenarios[${i}].${k}`)
    if (!Array.isArray(sc?.ownedFiles) || !sc.ownedFiles.length) missing.push(`scenarios[${i}].ownedFiles[]`)
  }
}
if (missing.length) return { refused: `Thin input - missing: ${missing.join(', ')}. What job statement should drive this run, and what are these facts?` }
// Goal anchor primitive: an open decision is a rule reviewers would otherwise settle round by round, so refuse to build
// while any entry lacks a ruling; resolved entries stay in the goal as the decision log every agent reads.
const od = args.goal.openDecisions ?? []
if (!Array.isArray(od)) return { refused: `goal.openDecisions must be an array of { decision, ruling, reason }, got: ${JSON.stringify(od)}` }
const unresolved = od.filter(d => !d?.decision || !d?.ruling)
if (unresolved.length) return { refused: `Open decisions must be resolved before building (each needs a decision and a ruling): ${unresolved.map(d => typeof d === 'string' ? d : JSON.stringify(d)).join('; ')}` }
// Review sizing primitive: this example wires level 1 only. Level 2 (a cross-model peer) and level 3 (the full
// panel) need a reviewer roster, so compose them per the ping-pong skill's audit modes instead of passing a number here.
if (args.reviewLevel != null && args.reviewLevel !== 1) return { refused: `reviewLevel ${args.reviewLevel} is not implemented by this example (level 1 only); compose levels 2 and 3 per the ping-pong audit modes` }
const { goal, intent, branch, baseBranch, repoDir, prId, prTitle, outOfScope, contractTests, measureCommands, scenarios } = args
const hygieneRules = typeof args.hygieneRules === 'string' ? args.hygieneRules : 'none beyond the project lint'
const BATCH = Number.isInteger(args.batchSize) && args.batchSize > 0 ? args.batchSize : 2
// Build mode (ping-pong baseline, "Modes"). 'solo': one builder writes the failing tests,
// then the implementation, then one independent audit judges the batch (default; the audit
// is told the same agent wrote both sides so it hunts for self-serving weak assertions).
// 'pingpong': the navigator/driver split, for ambiguous or security-sensitive scenarios.
// args.mode sets the default; a scenario's own `mode` pins it; one pingpong scenario makes
// its whole batch pingpong.
const MODE = args.mode === 'pingpong' ? 'pingpong' : 'solo'
const modeOf = b => b.some(sc => sc.mode === 'pingpong') ? 'pingpong' : b.every(sc => sc.mode === 'solo') ? 'solo' : MODE

// Batches (ping-pong baseline): consecutive scenarios that share a test file, up to BATCH each.
const batches = []
for (const sc of scenarios) {
  const last = batches[batches.length - 1]
  if (last && last.length < BATCH && last[0].testPath === sc.testPath) last.push(sc)
  else batches.push([sc])
}
const uniq = xs => Array.from(new Set(xs))
const batchName = b => b.map(sc => sc.name).join(' + ')
const batchOwned = b => uniq(b.flatMap(sc => sc.ownedFiles))
const batchTestCmd = b => uniq(b.map(sc => sc.verify)).join(' && ')
log(`${scenarios.length} scenarios in ${batches.length} batches of up to ${BATCH}; modes: ${batches.map(modeOf).join(', ')}`)

// Goal anchor (primitive): all five SMART sections, read by every agent to detect drift.
const anchor = `GOAL: ${goal.specific} | MEASURABLE: ${goal.measurable} | ACHIEVABLE: ${goal.achievable} | RELEVANT: ${goal.relevant} | TIME-BOUND: ${goal.timeBoundRounds} rounds per batch${od.length ? ` | DECISIONS (settled, never re-decide): ${od.map(d => `${d.decision} -> ${d.ruling}${d.reason ? ` (${d.reason})` : ''}`).join('; ')}` : ''}`
// Project facts every brief carries (resolved, never placeholders).
const FACTS = `Working directory: ${repoDir} (branch ${branch}). Run every command from there.
Contract tests that stay green after every batch: ${contractTests}
Hygiene rules: ${hygieneRules}
Out of scope for ${prId}: ${outOfScope.join('; ')}.
Hang rule: kill any command idle for three minutes and report it as a failure. Never add attribution lines to commits or PR bodies.`

// Structured LLM output (primitive): every stage that feeds this script declares its shape.
const OK = { type: 'object', required: ['ok'], properties: { ok: { type: 'boolean' }, fix: { type: 'string' }, evidence: { type: 'string' } } }
const SPEC = { type: 'object', required: ['committedSha', 'alreadyWired', 'testPath', 'testCmd', 'exitCode', 'redEvidence'], properties: {
  committedSha: { type: 'string' }, alreadyWired: { type: 'array', items: { type: 'string' } },
  testPath: { type: 'string' }, testCmd: { type: 'string' }, exitCode: { type: 'number' }, redEvidence: { type: 'string' } } }
// Every IMPL field is required on both branches so a claim can never be incomplete.
const IMPL = { type: 'object', required: ['status', 'files', 'testCmd', 'exitCode', 'greenEvidence', 'reason'], properties: {
  status: { enum: ['green', 'broken-spec'] }, files: { type: 'array', items: { type: 'string' } },
  testCmd: { type: 'string' }, exitCode: { type: 'number' }, greenEvidence: { type: 'string' }, reason: { type: 'string' } } }
// Solo builder: the navigator's fields (RED proof) plus the driver's fields (GREEN proof).
const SOLO = { type: 'object', required: ['committedSha', 'alreadyWired', 'testPath', 'testCmd', 'redExitCode', 'redEvidence', 'status', 'files', 'exitCode', 'greenEvidence'], properties: {
  committedSha: { type: 'string' }, alreadyWired: { type: 'array', items: { type: 'string' } },
  testPath: { type: 'string' }, testCmd: { type: 'string' }, redExitCode: { type: 'number' }, redEvidence: { type: 'string' },
  status: { enum: ['green', 'blocked'] }, files: { type: 'array', items: { type: 'string' } },
  exitCode: { type: 'number' }, greenEvidence: { type: 'string' }, reason: { type: 'string' } } }
const VERIFY = { type: 'object', required: ['exitCode', 'evidence', 'files'], properties: {
  exitCode: { type: 'number' }, evidence: { type: 'string' }, files: { type: 'array', items: { type: 'string' } } } }
const VERDICT = { type: 'object', required: ['axes'], properties: { axes: { type: 'array', items: {
  type: 'object', required: ['name', 'blocking', 'pass', 'reason'], properties: {
    name: { enum: ['On task', 'Correct', 'Right', 'Smart', 'Extra mile'] },
    blocking: { type: 'boolean' }, pass: { type: 'boolean' }, reason: { type: 'string' } } } } } }
const LINT = { type: 'object', required: ['violations'], properties: { violations: { type: 'array', items: {
  type: 'object', required: ['file', 'rule', 'detail'], properties: { file: { type: 'string' }, rule: { type: 'string' }, detail: { type: 'string' } } } } } }
const RESULTS = { type: 'array', items: {
  type: 'object', required: ['cmd', 'exitCode', 'evidence'], properties: { cmd: { type: 'string' }, exitCode: { type: 'number' }, evidence: { type: 'string' } } } }
const MEASURE = { type: 'object', required: ['committedSha', 'results'], properties: { committedSha: { type: 'string' }, results: RESULTS } }
// A gate fix makes Verify's evidence stale, so it returns fresh results for every mandated command, never a bare sha.
const FIXED = { type: 'object', required: ['sha', 'results'], properties: { sha: { type: 'string' }, results: RESULTS } }
// Evidence over assertion: every mandated command appears exactly once, verbatim, and exits 0; a repeated, missing,
// or unexpected command is a gap, not a pass.
const measureGaps = (results) => !Array.isArray(results) ? ['no results returned'] : [
  ...measureCommands.flatMap(cmd => {
    const hits = results.filter(r => r.cmd === cmd)
    return hits.length !== 1 ? [`${cmd}: ${hits.length} results`] : hits[0].exitCode !== 0 ? [`${cmd}: exit ${hits[0].exitCode}`] : []
  }),
  ...results.filter(r => !measureCommands.includes(r.cmd)).map(r => `unexpected command: ${r.cmd}`),
]
const GATE = { type: 'object', required: ['findings'], properties: { findings: { type: 'array', items: {
  type: 'object', required: ['id', 'action', 'detail'], properties: { id: { type: 'string' }, action: { enum: ['auto-fix', 'no-op', 'ask-user'] }, detail: { type: 'string' } } } } } }
const SHIP = { type: 'object', required: ['prUrl', 'ci'], properties: { prUrl: { type: 'string' }, ci: { enum: ['checks-passed', 'failed'] } } }

// Capability tiers (primitive): fast does the work, reasoning judges. Retune here, never per call.
const TIER = { fast: { effort: 'low' }, standard: {}, reasoning: { effort: 'high' }, heavy: { effort: 'xhigh' } }

// Briefs
const commitStep = pending => pending
  ? `FIRST, before anything else: the working tree holds audited work for the previous batch "${pending.name}". Commit exactly these paths (git add -- <paths>, nothing else): ${pending.paths.join(', ')}; message "${prId}: ${pending.name}"; no attribution lines. Return its sha as committedSha. If the tree is clean, return committedSha "".`
  : 'Nothing is pending from a previous batch: return committedSha "".'
const scenarioBlock = sc => `Scenario "${sc.name}"\nGiven ${sc.given}\nWhen ${sc.when}\nThen ${sc.then}\nOwned files: ${sc.ownedFiles.join(', ')}\nVerify one-liner: ${sc.verify}\nNotes: ${sc.notes ?? ''}`

const specPrompt = (b, pending) => `${anchor}\n${FACTS}
You are the navigator for this batch of ${b.length} scenario(s), all in ${b[0].testPath}.
${commitStep(pending)}
THEN scout, read-only: grep the tree for anything these scenarios claim to add and list what already exists as alreadyWired; check the notes' factual claims against the source and mention any contradiction inside redEvidence.
THEN write ONE failing test block per scenario, appended to ${b[0].testPath} in the project's existing test conventions; never a spec document, never an implementation. Never edit blocks that already exist.
${b.map(scenarioBlock).join('\n\n')}
The batch testCmd is "${batchTestCmd(b)}"; confirm or correct it against the real runner and return the authoritative testCmd that runs every block of this batch.
Run it once and prove it fails; a block that passes on arrival is a broken spec unless alreadyWired explains it, in which case drop that block and say so.
Every test must gate the behavior, not just the shape, and must typecheck once the implementation exists.
If the behavior crosses a stochastic seam (LLM output, flaky externals), encode at least 5 trials via native parametrization.
Return committedSha, alreadyWired, testPath, verbatim testCmd, exit code, and the failure output as redEvidence.`

const soloPrompt = (b, pending, gap) => `${anchor}\n${FACTS}
You are the builder for this batch of ${b.length} scenario(s), all tested in ${b[0].testPath}. You write the tests first, then the code; an independent auditor judges both afterwards, so tests that merely mirror your implementation will fail the audit.
${commitStep(pending)}
THEN scout, read-only: grep the tree for anything these scenarios claim to add and list what already exists as alreadyWired; check the notes' factual claims against the source and mention any contradiction inside redEvidence.
THEN write ONE failing test block per scenario, appended to ${b[0].testPath} in the project's existing test conventions. Never edit blocks that already exist. Every Then clause needs an assertion that would fail if the implementation were removed or subtly wrong; the tests must typecheck once the implementation exists.
${b.map(scenarioBlock).join('\n\n')}
The batch testCmd is "${batchTestCmd(b)}"; confirm or correct it against the real runner and return the authoritative testCmd. Run it once BEFORE implementing and record its exit code as redExitCode and its output as redEvidence; a block that passes before you implement is a broken test unless alreadyWired explains it, in which case drop that block and say so.
THEN implement only inside ${batchOwned(b).join(', ')}. Cap diagnosis at 2 falsified hypotheses per scenario.
Before claiming green you MUST run your authoritative testCmd and the project's typecheck once each.
${gap ? `A previous audit found open blockers: ${JSON.stringify(gap)}. For any On task gap, fix only the test block(s) named and whatever code that requires; for every other named gap, fix the code; keep everything else.` : ''}
Return every field: committedSha, alreadyWired, testPath, testCmd, redExitCode, redEvidence, status 'green' with files (every path you changed, tests included), exitCode 0 and the passing output as greenEvidence; or status 'blocked' with a reason, the exit code you observed and the output as greenEvidence.`

const implPrompt = (b, spec, failedAxes, round) => `${anchor}\n${FACTS}
You are the driver for this batch of ${b.length} scenario(s); the spec is the failing block(s) in ${spec.testPath}, run by: ${spec.testCmd}
NEVER modify the tests; if a block is internally contradictory, return status 'broken-spec' with your reason.
${round === 0
  ? `Re-run ${spec.testCmd} first to re-prove RED; if every block is already green on this first round, return 'broken-spec'.`
  : `This is round ${round + 1}: the previous round's implementation is already in the working tree, so the tests may already pass. Do NOT return 'broken-spec' because they pass; address exactly the failed axes below, then run ${spec.testCmd} and return fresh evidence.`}
Implement only inside ${batchOwned(b).join(', ')}.
${b.map(scenarioBlock).join('\n\n')}
Before claiming green you MUST run ${spec.testCmd} and the project's typecheck once each.
Cap diagnosis at 2 falsified hypotheses per scenario, then stop and return what you have with evidence.
${failedAxes ? `The previous round failed audit on: ${JSON.stringify(failedAxes)}. Address exactly that gap.` : ''}
Return status 'green' with the files you changed, the verbatim testCmd, its exit code and its passing output as greenEvidence; or status 'broken-spec' with a reason, the exit code you observed, an empty files list and the output as greenEvidence. Every field is required.`

const verifyPrompt = (b, spec) => `${FACTS}
You are an independent verifier for the batch "${batchName(b)}". Change nothing. Run exactly: ${spec.testCmd}
Return its exit code, the last 40 lines of its output as evidence, and the working-tree changes from git status --porcelain (paths only) as files.`

const auditPrompt = (b, spec, impl, mode) => `${anchor}\n${FACTS}
You are the independent auditor for the batch "${batchName(b)}", judging from fresh context; trust nothing you did not reproduce.
${mode === 'solo' ? 'The SAME agent wrote the tests and the implementation. Read every assertion with that in mind: a Then clause that is asserted only by shape (toBeDefined, typeof, toBeTruthy), a magic value copied from the implementation instead of derived from the scenario, or a clause with no assertion at all fails Correct; name the clause.' : 'A navigator wrote the tests and a separate driver wrote the code.'}
Command budget (run each EXACTLY ONCE, in this order, then judge from the output and the diff): (1) ${spec.testCmd}; (2) the project's typecheck; (3) git status --porcelain and git diff. Reading files is free; running suites again is not. The contract suites are run by a parallel critic, not by you.
The driver's reported files (${(impl.files ?? []).join(', ')}) are a claim to check against the diff. Verify the diff stays inside ${batchOwned(b).join(', ')} and touches nothing out of scope; verify every Then clause of every scenario by reading the tests and the sources.
${b.map(scenarioBlock).join('\n\n')}
Emit one verdict per axis with a concrete reason: at this review level ${BLOCKING.join(', ')} block (Correct includes security); judge On task only against the goal's MEASURABLE acceptance list; every other axis is advisory and short, and a real finding outside the acceptance list is reported as a follow-up, not a failure. If the spec or a design rule is itself wrong, fail the axis it lands on with a reason starting RULE-LEVEL. A failing reason must name the scenario and the file.`

// Anchored re-check (review sizing primitive): after a fix round, judge ONLY the findings the round answered and the
// lines it changed, never a fresh full audit. This is what makes "a blocker survived the round" detectable.
const recheckPrompt = (b, spec, prior) => `${anchor}\n${FACTS}
You are the anchored re-checker for the batch "${batchName(b)}" after a fix round. The previous check failed on: ${JSON.stringify(prior)}.
Run once: ${spec.testCmd}; then read git diff HEAD (the batch is uncommitted until audited, so this is the whole batch; look only at the code the named findings concern and at what changed there). Judge ONLY whether each named finding is now closed, and whether the fix itself adds a new blocker; review nothing else. If a named finding was a spec gap, judge whether the rewritten tests now match the goal's MEASURABLE acceptance list.
Emit one verdict per axis (On task, Correct, Right, Smart, Extra mile): an axis fails only if one of its named findings is still open or the fix diff adds a blocker on it, with the reason naming which. If the spec or a design rule is itself wrong, fail the axis it lands on with a reason starting RULE-LEVEL.`

const lintPrompt = (b, spec, failedAxes) => `${anchor}\n${FACTS}
You are the hygiene critic for the batch "${batchName(b)}". First run, once: ${contractTests}; any failure is a violation with rule "contract-suite".
Then diff the working tree against the last commit and report violations of the hygiene rules. Return an empty list only after checking every changed file.
${failedAxes ? `This is a fix round; the previous audit failed on ${JSON.stringify(failedAxes)}. Also re-run ${spec.testCmd} and the typecheck, and report a violation if either fails or if the named finding is still present.` : ''}`

// Setup: the loop starts on a non-default feature branch (ping-pong entry precondition).
phase('Setup')
const setup = await agent(`${FACTS}
Ensure the working directory is on ${branch}: create it from ${baseBranch} if missing, else check it out and confirm it contains ${baseBranch}.
On failure return ok:false with the exact fix command, never a guess.`, { phase: 'Setup', schema: OK, ...TIER.fast })
if (!setup?.ok) return { blocked: { stage: 'setup', fix: setup?.fix ?? 'no setup verdict' } }

// Ping-pong loop (baseline), one batch at a time; sequential agents share one working tree.
// Review sizing primitive, level 1: only On task and Correct (security included) block; Right is the
// critic's and scripts' job and Smart becomes a follow-up.
const REVIEW_LEVEL = 1
const BLOCKING = ['On task', 'Correct']
// Bounded loops primitive: keep fixing only while each round makes progress (fewer open blockers, none reopened);
// the backstop of 5 fix rounds only catches runaway loops. Progress is tracked per failed axis here, which is
// coarser than per finding; a real composition should count findings.
const BACKSTOP_FIX_ROUNDS = 5
const ROUNDS = Math.min(goal.timeBoundRounds, BACKSTOP_FIX_ROUNDS + 1)
const ruleLevelOf = (axes) => (axes ?? []).filter(a => /^\s*RULE-LEVEL/i.test(a.reason ?? ''))
// Hygiene failures are open blockers too, so they count toward the progress rule like any other.
// A lint agent that returned nothing is an infrastructure failure: it still blocks shipping, but it is not a code
// blocker, so it never counts for or against progress.
const withLint = (axes, lint) => !lint ? [...axes, { name: 'Right', pass: false, infra: true, reason: 'no lint verdict returned' }]
  : lint.violations.length ? [...axes, { name: 'Right', pass: false, reason: `hygiene: ${JSON.stringify(lint.violations)}` }] : axes
const shipped = []
let pending = null
const recordCommit = (r) => {
  if (pending && r?.committedSha) shipped.push({ batch: pending.name, sha: r.committedSha, verdict: pending.verdict })
  else if (pending) return false
  pending = null
  return true
}
// Solo mode: one builder returns RED proof and GREEN proof together; the RED proof is
// checked here exactly as a navigator's would be, and the impl is seeded into round 0.
const splitSolo = (s) => ({
  spec: { testPath: s.testPath, testCmd: s.testCmd, exitCode: s.redExitCode, redEvidence: s.redEvidence },
  impl: { status: s.status === 'green' ? 'green' : 'broken-spec', files: s.files, testCmd: s.testCmd, exitCode: s.exitCode, greenEvidence: s.greenEvidence, reason: s.reason },
})
for (const b of batches) {
  const mode = modeOf(b)
  let spec, seeded = null
  if (mode === 'solo') {
    phase('Build')
    const solo = await agent(soloPrompt(b, pending, null), { phase: 'Build', schema: SOLO, ...TIER.standard })
    if (!recordCommit(solo)) return { escalate: { batch: batchName(b), reason: 'builder did not commit the previous audited batch', anchor }, shipped }
    if (!solo || solo.redExitCode === 0) return { escalate: { batch: batchName(b), reason: 'solo builder produced no failing test before implementing - RED unproven', anchor }, shipped }
    ;({ spec, impl: seeded } = splitSolo(solo))
  } else {
    phase('Spec')
    spec = await agent(specPrompt(b, pending), { phase: 'Spec', schema: SPEC, ...TIER.standard })
    if (!recordCommit(spec)) return { escalate: { batch: batchName(b), reason: 'navigator did not commit the previous audited batch', anchor }, shipped }
    if (spec && spec.exitCode === 0) {
      spec = await agent(specPrompt(b, null) + '\nYour previous spec passed on arrival; write blocks that provably fail.', { phase: 'Spec', schema: SPEC, ...TIER.standard })
    }
    if (!spec || spec.exitCode === 0) return { escalate: { batch: batchName(b), reason: 'no failing spec produced - RED unproven', anchor }, shipped }
  }
  let verdict = null, failedAxes = null, done = false, audited = false
  const history = [], everClosed = new Set()   // open blocking axes after each review-driven check
  for (let round = 0; round < ROUNDS && !done; round++) {
    phase('Build')
    let impl
    if (seeded) { impl = seeded; seeded = null }
    else impl = await agent(implPrompt(b, spec, (f => f?.length ? f : null)(failedAxes?.filter(a => a.name !== 'On task')), round), { phase: 'Build', schema: IMPL, ...TIER.standard })   // the driver never gets the spec gap
    if (!impl) { failedAxes = [{ name: 'Correct', pass: false, reason: 'no implementation returned' }]; continue }
    // Evidence over assertion: an incomplete green claim, or a later-round "broken-spec because it
    // already passes", is settled by an independent verifier that runs the test itself.
    const complete = impl.status === 'green' && Array.isArray(impl.files) && impl.files.length && impl.testCmd && impl.greenEvidence && impl.exitCode === 0
    if ((impl.status === 'green' && !complete) || (impl.status === 'broken-spec' && round > 0)) {
      const v = await agent(verifyPrompt(b, spec), { phase: 'Build', schema: VERIFY, ...TIER.fast })
      if (v && v.exitCode === 0 && Array.isArray(v.files) && v.files.length) impl = { status: 'green', files: v.files, testCmd: spec.testCmd, exitCode: 0, greenEvidence: v.evidence }
      else { verdict = null; failedAxes = [{ name: 'Correct', pass: false, reason: `independent verify: exit ${v ? v.exitCode : 'n/a'}` }]; continue }
    }
    if (impl.status === 'green' && impl.exitCode === 0 && impl.files.length) {
      // One full audit per batch (invariant): every later check, including the one after a re-spec, is an anchored re-check.
      const fixRound = audited && Array.isArray(failedAxes)
      let lint
      if (fixRound) {
        const prior = failedAxes
        const [re, lintVerdict] = await parallel([
          () => agent(recheckPrompt(b, spec, prior), { phase: 'Audit', schema: VERDICT, ...TIER.reasoning, effort: 'low' }),
          () => agent(lintPrompt(b, spec, prior), { phase: 'Lint', schema: LINT, ...TIER.standard }),
        ])
        lint = lintVerdict
        if (!re) { failedAxes = [{ name: 'Correct', pass: false, reason: 'no re-check verdict returned' }]; continue }
        if (ruleLevelOf(re.axes).length) return { stopped: { batch: batchName(b), reason: 'rule-level finding: resolve it into goal.openDecisions, then relaunch this batch', ruleLevel: ruleLevelOf(re.axes), anchor }, shipped }
        failedAxes = withLint(BLOCKING.map(name => re.axes.find(a => a.name === name) ?? { name, pass: false, reason: 'axis missing from re-check' }).filter(a => !a.pass), lint)
        // Progress rule: a fix round must close more than it opens and must not reopen anything already closed.
        const prev = history.at(-1) ?? []
        const open = failedAxes.filter(a => !a.infra).map(a => a.name)
        prev.filter(n => !open.includes(n)).forEach(n => everClosed.add(n))
        history.push(open)
        const reopened = open.filter(n => everClosed.has(n) && prev.every(p => p !== n))
        if (open.length && (open.length >= prev.length || reopened.length)) {
          return { escalate: { batch: batchName(b), reason: reopened.length ? `fix round reopened ${reopened.join(', ')}` : 'fix round made no progress', history, failedAxes, reviewLevel: REVIEW_LEVEL, next: 'a human decides with this evidence', anchor }, shipped }
        }
      } else {
        const [auditVerdict, lintVerdict] = await parallel([
          () => agent(auditPrompt(b, spec, impl, mode), { phase: 'Audit', schema: VERDICT, ...TIER.reasoning, effort: 'medium' }),
          () => agent(lintPrompt(b, spec, null), { phase: 'Lint', schema: LINT, ...TIER.standard }),
        ])
        verdict = auditVerdict; lint = lintVerdict; audited = !!verdict   // a missing verdict is not an audit: the next round audits in full
        if (!verdict) { failedAxes = [{ name: 'Correct', pass: false, reason: 'no audit verdict returned' }]; continue }
        // Rule-level findings primitive: a RULE-LEVEL reason on ANY axis, blocking or advisory, stops the batch for a ruling.
        if (ruleLevelOf(verdict.axes).length) return { stopped: { batch: batchName(b), reason: 'rule-level finding: resolve it into goal.openDecisions, then relaunch this batch', ruleLevel: ruleLevelOf(verdict.axes), anchor }, shipped }
        // Blocking is decided by axis NAME and absent axes fail closed; advisory never blocks.
        failedAxes = withLint(BLOCKING.map(name => verdict.axes.find(a => a.name === name) ?? { name, pass: false, reason: 'axis missing from verdict' }).filter(a => !a.pass), lint)
        history.push(failedAxes.filter(a => !a.infra).map(a => a.name))
      }
      if (!failedAxes.length) {
        pending = { name: batchName(b), paths: uniq([...batchOwned(b), b[0].testPath]), verdict }   // exit invariant: the next navigator commits it
        done = true
        continue
      }
    } else if (impl.status === 'broken-spec') {
      verdict = null
      failedAxes = [{ name: 'On task', pass: false, reason: impl.reason ?? 'driver reports broken spec' }]
    } else {
      verdict = null
      failedAxes = [{ name: 'Correct', pass: false, reason: 'incomplete green claim' }]
    }
    // Failure routing: only a JUDGED On-task failure re-dispatches the navigator.
    const specGap = failedAxes.filter(a => a.name === 'On task' && a.reason !== 'axis missing from verdict')
    if (ruleLevelOf(failedAxes).length) return { stopped: { batch: batchName(b), reason: 'rule-level finding: resolve it into goal.openDecisions, then relaunch this batch', ruleLevel: ruleLevelOf(failedAxes), anchor }, shipped }
    if (specGap.length && round < ROUNDS - 1) {
      if (mode === 'solo') {
        // The builder owns both sides: it fixes the named tests and whatever code that
        // needs, and its returned impl seeds the next round (no separate driver call).
        const again = await agent(soloPrompt(b, null, failedAxes), { phase: 'Build', schema: SOLO, ...TIER.standard })
        if (!again) return { escalate: { batch: batchName(b), reason: 'no re-spec after On-task failure', failedAxes, anchor }, shipped }
        ;({ spec, impl: seeded } = splitSolo(again))
      } else {
        const respec = await agent(specPrompt(b, null) + `\nThe previous spec missed intent: ${JSON.stringify(specGap)}. Fix only the block(s) named; keep the others. The tree may already hold a driver's implementation from a previous round, so a corrected block that passes is NOT a broken spec here: report its real exit code either way.`, { phase: 'Spec', schema: SPEC, ...TIER.standard })
        if (!respec) return { escalate: { batch: batchName(b), reason: 'no re-spec after On-task failure', failedAxes, anchor }, shipped }
        spec = respec
        if (respec.exitCode === 0) {
          // A corrected spec that passes is green work awaiting audit whenever a driver
          // has already run (even in round 0 a driver that reports broken-spec has usually
          // implemented first; this exact case escalated two real runs), not an unproven
          // RED. An independent verifier confirms it against the tree and seeds the next
          // round; only a verifier that finds no implementation escalates.
          const v = await agent(verifyPrompt(b, spec), { phase: 'Build', schema: VERIFY, ...TIER.fast })
          if (v && v.exitCode === 0 && Array.isArray(v.files) && v.files.length) seeded = { status: 'green', files: v.files, testCmd: spec.testCmd, exitCode: 0, greenEvidence: v.evidence }
          else return { escalate: { batch: batchName(b), reason: 'corrected spec passes but no implementation is in the tree - RED unproven', failedAxes, anchor }, shipped }
        }
      }
      // Keep failedAxes: the re-check judges the rewritten spec, and any other open blocker still reaches the driver.
    }
  }
  if (!done) return { escalate: { batch: batchName(b), verdict, failedAxes, reviewLevel: REVIEW_LEVEL, history, next: 'runaway backstop or time-bound reached: a human decides with this evidence', anchor }, shipped }
  log(`${shipped.length + 1}/${batches.length} batches audited (${batchName(b)})`)
}

// Workflow-level Measurable check (goal anchor primitive); commits the last audited batch first.
phase('Verify')
const measure = await agent(`${anchor}\n${FACTS}
${commitStep(pending)}
All ${scenarios.length} scenarios are then committed on ${branch}. Prove the Measurable condition: ${goal.measurable}
Run verbatim and return each with its exit code and saved output: ${measureCommands.join('; ')}`, { phase: 'Verify', schema: MEASURE, ...TIER.standard })
if (!recordCommit(measure)) return { escalate: { reason: 'Verify did not commit the last audited batch', measure, anchor }, shipped }
const measureGap = measure ? measureGaps(measure.results) : ['no Verify verdict']
if (measureGap.length) return { escalate: { reason: `cannot satisfy Measurable check: ${goal.measurable}`, gaps: measureGap, anchor }, shipped }

// Ship gate: review only (Verify already ran every suite); a fix re-enters the stage.
phase('Gate')
const preflight = await agent(`${FACTS}
Preflight the ship gate for ${branch}: confirm it is non-default, confirm commits ${shipped.map(s => s.sha).join(', ')} are present, confirm the push target is configured, then rebase ${branch} on ${baseBranch} (batch-named commit messages are the stable identifiers). On any violated precondition return ok:false with the exact fix command.`, { phase: 'Gate', schema: OK, ...TIER.standard })
if (!preflight?.ok) return { blocked: { stage: 'preflight', fix: preflight?.fix ?? 'no preflight verdict' }, shipped }
let attempts = 0
for (;;) {
  const gate = await agent(`${anchor}\n${FACTS}
Gate stage "review" for the committed history on ${branch} relative to ${baseBranch}; validate commits only, never the working tree. Do not re-run suites: Verify already ran them.
Intent (so review can tell deliberate choices from mistakes): ${intent}
Check correctness, scope against the out-of-scope list, and that every scenario has a commit. Classify every finding as auto-fix, no-op, or ask-user; skips are explicit, never silent.`, { phase: 'Gate', schema: GATE, ...TIER.reasoning })
  if (!gate) return { blocked: { stage: 'review', reason: 'gate agent returned no verdict' }, shipped }
  const askUser = gate.findings.filter(f => f.action === 'ask-user')
  if (askUser.length) return { blocked: { stage: 'review', findings: askUser, note: 'relay verbatim; only the human decides' }, shipped }
  const fixable = gate.findings.filter(f => f.action === 'auto-fix')
  if (!fixable.length) break
  if (++attempts > 3) return { escalate: { stage: 'review', findings: fixable, anchor }, shipped }
  const fixed = await agent(`${FACTS}
Fix exactly these review findings, nothing else, and commit on ${branch} with a subject that describes the change itself (never "gate fix"): ${JSON.stringify(fixable)}
Then run each of these verbatim on that commit and return each with its exact command, exit code and saved output, plus the sha: ${measureCommands.join('; ')}`, { phase: 'Fix', schema: FIXED, ...TIER.standard })
  if (!fixed?.sha) return { blocked: { stage: 'review', reason: 'fix agent returned no commit sha' }, shipped }
  const fixGap = measureGaps(fixed.results)
  if (fixGap.length) return { escalate: { stage: 'review', reason: `gate fix ${fixed.sha} is not verified: the Measurable check no longer holds`, gaps: fixGap, anchor }, shipped }
}

// Ship: push, PR against the base branch, CI to checks-passed; the human merges.
phase('Ship')
const ship = await agent(`${FACTS}
Push ${branch} to origin. Write the PR body to a temp file (never inline, never an editor): derived from this intent plus the full scenario list, no attribution lines, noting the PR is stacked on ${baseBranch}. Resolve the PR number non-interactively (gh pr list --head ${branch} --state open --json number --jq '.[0].number'); gh pr edit "$NUM" --body-file if it exists, else gh pr create --base ${baseBranch} --head ${branch} --title "${prId}: ${prTitle}" --body-file. Watch CI with gh pr checks "$NUM" --watch; long-running CI is working, not stalled.
Intent: ${intent}
You are done at checks-passed; never merge and never poll for the merge.`, { phase: 'Ship', schema: SHIP, ...TIER.standard })
if (!ship || ship.ci !== 'checks-passed') return { escalate: { stage: 'CI', ship, anchor, next: 'fix what CI points at, commit on the same branch, re-run from preflight' }, shipped }
return { shipped, pr: ship.prUrl, done: 'checks-passed - the PR awaits the human merge' }
