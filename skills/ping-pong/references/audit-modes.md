# Audit modes - detail

The mode table and auto-promotion rules live in SKILL.md (the lead applies them at decomposition time). This file holds the run-time detail: how the lead resolves the audit roster, when an audit may be skipped, how independence works, and how the lead synthesizes disagreeing verdicts. Read it before running any `consult` / `rotate` / `panel` audit.

## Skipping the audit on trivial seams

`home-only` mode may be skipped entirely when ALL of:

- Diff is small (< ~50 lines).
- Seam is pure scaffolding, config, boilerplate, version pinning, or generated code (no branching logic).
- Test is contract-shaped - asserts on existence / version / path / signature, not behavior under load or edge cases.
- You're in **solo-lead mode** (single-session, not dispatching separate agents).

`home-only` and solo-lead are independent axes: `home-only` says who audits, solo-lead says whether the lead dispatches subagents at all.

The signal: a scenario where the audit's five-axis check has nothing to bite on because the diff has no judgment in it. Example: `uv init` + a one-line `__version__` assertion. The audit would PASS four blocking axes mechanically; running it is overhead.

In **dispatched mode**, fire the audit even on trivial seams - pp-auditor's memory accumulates "what trivial really looks like" patterns over time. `consult` / `rotate` / `panel` modes **never** skip; those exist precisely because the seam is risky enough to warrant multiple eyes.

## The audit roster (consult / rotate / panel)

Slot `home` is always `pp-auditor` on the session model, never absent and never rotated out. Peers are resolved once per work session at pre-flight, in this order.

1. **Declared.** The host project's CLAUDE.md or AGENTS.md may carry a `## Ping-pong audit peers` block, one line per peer:

   ```
   - slug: gem  | agent: gemini-cli-orchestrator        | family: google
   - slug: cdx  | run: codex exec "{brief}"             | family: openai
   - slug: qwen | run: ollama run qwen3-coder "{brief}" | family: qwen
   ```

   Exactly one of `agent:` (a subagent type to dispatch) or `run:` (a shell command, with `{brief}` substituted for the consult brief). `family` is required, because the whole independence argument is model-family diversity; warn once when two peers share a family. The host project already owns the auto-promotion categories and the orchestrator agent definitions, so the roster belongs beside them, and it sits outside `.claude/ping-pong/` so the cycle-cache delete-test never reaches it.

2. **Probed.** With no block declared, look for agent types matching `*-cli-orchestrator` in `.claude/agents/` and `~/.claude/agents/`, and for the example CLIs on `PATH` (e.g. `gemini`, `codex`) via `command -v`. Derive a slug per the rules below, set `family: unknown`, and note that the diversity warning cannot fire. Key the probe roster by derived slug and keep exactly one entry per underlying tool, preferring the `agent:` form when both channels find the same one. An orchestrator agent wraps the CLI it is named for, so finding both means finding one reviewer twice, and two seats for one model let a single opinion confirm itself. Probing is silent and asks the user nothing, so a project that already followed this skill's setup keeps working with zero configuration.

Hold the resolved roster in your own context for the session. Do NOT write it to a file: availability and auth change between sessions, so a cached roster is a stale-cache bug for no benefit, and `pp-auditor`'s `MEMORY.md` is prompt-injected into an agent that never needs the roster.

**Slugs.** Lowercase ASCII letters, digits, and hyphens; length 2 to 12; always required. `home` is reserved for `pp-auditor`. Derive one by taking the agent type or the command's base binary, stripping a trailing `-cli-orchestrator` / `-orchestrator` / `-cli`, lowercasing, dropping disallowed characters, and truncating to 12, so `gemini-cli-orchestrator` becomes `gemini` and today's installs keep writing `gemini_audit.md` and `codex_audit.md`. When two genuinely distinct tools derive the same slug, the first in roster order keeps the bare slug and the rest take `-2`, `-3` in order; a derived slug landing on `home` becomes `home-2`. That suffix is a filename-safety backstop for distinct tools, never a way to seat one tool twice. A peer whose slug cannot be derived or fails validation is DROPPED with a logged warning. The 2-character minimum is load-bearing: it is what stops `<slug>_audit.md` from ever collapsing into the bare `audit.md` that SKILL.md's red flags STOP on, so do not relax it.

**Degradation.**

| Peers resolved | consult | rotate | panel |
|---|---|---|---|
| 0 | run home-only, log it | run home-only, log it | run home-only, log it |
| 1 | that peer every cycle | ring of one, note it once | run as written; CONFIRMED needs both auditors |
| 2+ | run as written | round-robin in roster order | run as written |

Only zero peers forces degradation, because the confirmation rule below is already defined at two auditors. A mode you reached by auto-promotion degrades silently with one logged line, since blocking on your own inference would stall autonomous execution. A mode the user explicitly asked for bubbles once, states that no audit peers resolved, and hands back a ready-to-paste `## Ping-pong audit peers` block. Either way the cycle proceeds; never stall waiting for a peer.

**Mid-cycle peer failure.** If a peer dispatch errors, times out, or returns nothing, do not re-plan the mode and do not retry the whole audit. Proceed with the verdicts you have, record `(peer <slug> unavailable: <reason>)` in the `## Auditor (verdict)` section so the trail shows how many eyes really ran, and drop that peer from the roster after it fails twice in one session.

**Delivery.** Dispatch an `agent:` peer as a plain subagent with the consult brief (see `briefs.md` → "Cross-model consult brief"). Run a `run:` peer via Bash with `{brief}` substituted, which works anywhere the command is installed and authenticated and needs no agent definition. The brief is identical either way; only the delivery differs.

**Independence protocol:** no auditor sees another's verdict until its own is written to its own file, `<slug>_audit.md` under the task's cache dir, which is `home_audit.md` for `pp-auditor` plus one file per peer. This is the canonical statement of the naming rule; every other file points here. Write-before-read is the whole point, because an auditor that reads first is anchored and its verdict stops being independent evidence. Verdict files are written in every mode other than `home-only`, `rotate` included, since rotate dispatches a genuinely independent peer and independence is only real when write-before-read holds.

**Verify before synthesizing.** You know every expected `<slug>_audit.md` path before dispatch, because slugs come from the declaration or the agent type and never from the peer's self-report. Check each file exists. A peer that returned a message but wrote no file counts as absent and lowers the auditor count.

## Synthesis: confirmation, then the adjudication ladder

**Confirmation rule.** A finding flagged independently by two or more auditors is CONFIRMED, and you treat it as blocking regardless of the severity labels attached. A finding flagged by exactly one auditor is SINGLE-SOURCE, and you adjudicate it on evidence rather than by vote. This is well-defined at every roster size: at one auditor nothing can be confirmed, which correctly collapses `panel` to `home-only`; at two, confirmation means both agreed; at four, a 2-2 split yields two confirmed findings rather than a tie. It replaces the old majority rule, which was undefined at two auditors and tied at four. The home auditor's per-axis verdict stays the routing spine: a CONFIRMED finding the home auditor passed flips the axis it lands on to FAIL, so you still route by axis. Convergence beats severity, and it also feeds auto-promotion.

**Adjudication ladder for single-source findings.** Apply in order and stop at the first rule that resolves it. None of them needs you to know which model produced the verdict.

1. **Reproducible beats asserted.** A finding shipping a command you can run and watch fail outranks a finding that is only argued.
2. **In-harness beats out-of-harness on harness facts.** A peer runs outside this harness and cannot see its real primitives, agent types, task store, or cache layout, so when a peer calls a real primitive fake or a real path missing, the home auditor's read wins unless the peer produced a reproduction under rule 1.
3. **Out-of-family beats in-family on taste and drift.** On the "Smart" and "On task" axes the home auditor shares ping's and pong's priors by construction, so a peer's dissent is weighted UP, never discounted.
4. **Otherwise you decide.** Re-run the disputed check yourself and rule. You are the tiebreak, not a table.

**Per-peer blindspots are learned, not declared.** They live in `pp-auditor`'s `MEMORY.md` keyed by slug. A table of current-model folk knowledge goes stale the week after it ships; memory keyed by slug stays correct for whatever roster the project actually runs, and it starts empty on a new project by design.

**Record what actually ran.** Stamp `Reviewers: home + <slug list> (R of N reachable)` into the `## Auditor (verdict)` section on every multi-auditor cycle, alongside any `(peer <slug> unavailable: <reason>)` notes. Without it a reader six weeks later cannot tell whether a `panel`-stamped task actually got a panel.

## Rotation state (`rotate` mode)

Track the round-robin as a memory bullet on `pp-auditor`:

```markdown
* 🟡 (rotation) Last peer auditor: gem (task X, <date>)
```

The lead reads `pp-auditor`'s `MEMORY.md` (it's a plain file under the agent-memory directory) at the start of each cycle to pick the next peer from the roster. This is the only cross-cycle audit state, and it lives outside `.claude/ping-pong/`, so the cycle-cache delete-test never reaches it. pp-auditor stays in the loop on every rotation cycle as the project-specific lint backstop, because the home auditor is never rotated out. If you find only the old bullet shape (`Last cross-model auditor: gemini`), treat the value as a slug in the roster you just resolved and continue the ring from there; these are templates read with judgment, not parsed.
