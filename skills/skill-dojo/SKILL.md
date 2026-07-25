---
name: skill-dojo
description: Use when the user wants to create or improve a Claude Code skill. Produces a self-contained SKILL.md with embedded measurements and an objective metric, scored against a seed corpus for a baseline.
license: MIT
---

## Contract

> **Frozen.** This block is the dojo's own evaluation contract. The reflector cannot edit it autonomously. A human revises with approval.

### Objective

- **Metric:** mean pass rate across corpus
- **Stop:** 10 iterations without improvement
- **Baseline:** <unset - filled by first reflector run>

### Measurements

> The five self-measurements check for **trace markers** the dojo emits via Bash tool calls during the workflow (see the Skill body for the marker protocol). Tool-call args are reliably captured in the transcript, which makes the markers a robust grep target - unlike free-form prose, which the LLM rephrases.

1. **`m1-completed-grill`** — `judge: code`
   - Question: *Did the dojo emit all seven step-complete trace markers?*
   - Evaluator:
     ```
     {"type": "all", "checks": [
       {"type": "substring", "value": "dojo-trace:step-complete:1"},
       {"type": "substring", "value": "dojo-trace:step-complete:2"},
       {"type": "substring", "value": "dojo-trace:step-complete:3"},
       {"type": "substring", "value": "dojo-trace:step-complete:4"},
       {"type": "substring", "value": "dojo-trace:step-complete:5"},
       {"type": "substring", "value": "dojo-trace:step-complete:6"},
       {"type": "substring", "value": "dojo-trace:step-complete:7"}
     ]}
     ```

2. **`m2-file-written-and-parsed`** — `judge: code`
   - Question: *Did the dojo write the new SKILL.md and verify it parses cleanly?*
   - Evaluator:
     ```
     {"type": "all", "checks": [
       {"type": "substring", "value": "dojo-trace:file-written"},
       {"type": "substring", "value": "dojo-trace:file-parses-ok"}
     ]}
     ```

3. **`m3-scoring-ran`** — `judge: code`
   - Question: *Did the dojo execute the first-run scoring against the seed corpus?*
   - Evaluator:
     ```
     {"type": "substring", "value": "dojo-trace:score-complete"}
     ```

4. **`m4-baseline-positive`** — `judge: code`
   - Question: *Was the computed baseline strictly greater than zero? (The dojo emits `baseline-positive` only when score > 0.)*
   - Evaluator:
     ```
     {"type": "substring", "value": "dojo-trace:baseline-positive"}
     ```

5. **`m5-handoff-clean`** — `judge: code`
   - Question: *Did the dojo reach the final hand-off step end-to-end?*
   - Evaluator:
     ```
     {"type": "substring", "value": "dojo-trace:handoff-complete"}
     ```

## Skill

> **Lever.** Reflector mutates this section + the frontmatter `description` freely.

You are the **sensei** of the dojo. When the user asks to create or improve a Claude Code skill, run this seven-step grill, then write a self-contained skill file with an embedded evaluation contract.

### Setup

The dojo's helper scripts live next to this file at `~/.claude/skills/skill-dojo/scripts/`. Invoke them from that working directory:

    cd ~/.claude/skills/skill-dojo
    python -m scripts.fetch_corpus "trigger context" --limit 10 --write-to /tmp/seed.jsonl
    python -m scripts.score <path-to-new-skill>/SKILL.md <path-to-new-skill>/corpus/seed-<date>.jsonl

### Trace markers (the spec)

After completing each step and at every key event below, emit the corresponding marker via a one-line Bash tool call:

    bash -c "echo dojo-trace:<event>"

Tool-call arguments are captured reliably in the session transcript, which makes the markers a robust grep target for your self-contract. If you skip a marker, your own self-evaluation will count the step as not done. The marker is the spec - not your prose.

| Event | Marker to emit |
|---|---|
| Step 1 complete | `dojo-trace:step-complete:1` |
| Step 2 complete | `dojo-trace:step-complete:2` |
| Step 3 complete | `dojo-trace:step-complete:3` |
| Step 4 complete | `dojo-trace:step-complete:4` |
| Step 5 complete | `dojo-trace:step-complete:5` |
| After Write of new SKILL.md | `dojo-trace:file-written` |
| After `parse_contract` smoke on new file succeeds | `dojo-trace:file-parses-ok` |
| Step 6 complete | `dojo-trace:step-complete:6` |
| After `score_skill` returns | `dojo-trace:score-complete` |
| After `score_skill` returns, **if** baseline > 0 | `dojo-trace:baseline-positive` |
| Step 7 complete (final hand-off message printed) | `dojo-trace:step-complete:7` AND `dojo-trace:handoff-complete` |

### Step 1 - Triage location

Ask one question:

> Should this skill be **user-level** (`~/.claude/skills/`, applies across all your projects) or **project-local** (`<current-repo>/.claude/skills/`)?

Lock the answer before moving on.

Then emit: `bash -c "echo dojo-trace:step-complete:1"`

### Step 2 - Grill on purpose

Ask one at a time:

1. What task does this skill exist to make better?
2. When should it activate? Describe the trigger context in user words.
3. What does "this skill worked" look like - for the user, in one sentence?
4. What does it look like when it almost worked but failed in a way you would notice?

Record each answer. Do not move on until you have all four.

Then emit: `bash -c "echo dojo-trace:step-complete:2"`

### Step 3 - Affirm objective

Confirm the defaults unless the user pushes back:

- Metric: mean pass rate
- Stop after: 10 iterations without improvement
- Baseline: set on first scoring run

Then emit: `bash -c "echo dojo-trace:step-complete:3"`

### Step 4 - Define measurements (the heart)

For each measurement, run this sub-loop:

1. Ask: *"Phrase one observable as a yes/no question."*
2. Ask: *"Can a code check answer that from a session transcript?"*
3. If code: ask which check shape fits, and offer the JSON spec templates:

       Substring presence:
           {"type": "substring", "value": "<text to look for>"}

       Regex match:
           {"type": "regex", "pattern": "<regex>", "flags": "i"}     # flags optional

       Count of occurrences:
           {"type": "count_gte", "value": "<text>", "n": <int>}
           {"type": "count_eq",  "value": "<text>", "n": <int>}

       Combinators:
           {"type": "all", "checks": [<check>, ...]}
           {"type": "any", "checks": [<check>, ...]}
           {"type": "not", "check": <check>}

4. If LLM: ask for the binary judge prompt. The transcript is interpolated where `{{transcript}}` appears. Example:

       Given this transcript: {{transcript}}
       Did Sofia greet the user before asking for their name? Answer yes or no.

5. Repeat until the user signals "that's the set."

Enforce:
- **Minimum 3, maximum 7 measurements.** If outside the range, push back.
- **At most 2 LLM-judged measurements.** A third needs a one-line justification.
- **Every measurement must be answerable from a session transcript alone.** No "did the deployment succeed in prod" - that requires running the world.

**DSL growth rule.** If a user's check isn't expressible in the current JSON grammar, the fix is **one new combinator + one new test** in `judge_code.py` - never widen the runner to accept arbitrary code. This keeps the DSL named, reviewable, and bounded.

Then emit: `bash -c "echo dojo-trace:step-complete:4"`

### Step 5 - Confirm lever boundaries

State the defaults:

- **Lever (reflector can mutate):** frontmatter `name`, frontmatter `description`, the `## Skill` body, examples.
- **Frozen (human approval only):** the entire `## Contract` block.

Most users accept these.

Then emit: `bash -c "echo dojo-trace:step-complete:5"`

### Step 6 - Synthesize the file

1. Build a `Contract` object from the grill answers.
2. Decide the target path:
   - User-level: `~/.claude/skills/<name>/SKILL.md`
   - Project-local: `<repo-root>/.claude/skills/<name>/SKILL.md`
3. Call the writer via Python - easiest is a small inline script:

       cd ~/.claude/skills/skill-dojo
       python -c "
       from pathlib import Path
       from scripts.parse_contract import Contract, Measurement
       from scripts.new_skill import write_new_skill
       contract = Contract(name='<name>', description='<desc>', objective_metric='mean pass rate',
                           plateau_iterations=10, baseline=None,
                           measurements=[Measurement(id='m1-x', question='...', judge='code',
                                                     evaluator='{\"type\": \"substring\", \"value\": \"...\"}')],
                           lever_body='<starting body or empty>')
       write_new_skill(contract, Path('<target-path>'))
       "

4. Read the generated file back; show the user a brief summary.
5. After the Write succeeds, emit: `bash -c "echo dojo-trace:file-written"`
6. Run a parse smoke check on the new file:

       cd ~/.claude/skills/skill-dojo
       python -c "from scripts.parse_contract import parse_contract; from pathlib import Path; parse_contract(Path('<new-skill-path>/SKILL.md'))"

   If it returns without raising, emit: `bash -c "echo dojo-trace:file-parses-ok"`

Then emit: `bash -c "echo dojo-trace:step-complete:6"`

### Step 7 - First run before handoff

**7a. Capture seed corpus.**

Offer:

> Want me to pull from your local session history (Claude Code stores transcripts under `~/.claude/projects/`) for sessions matching this trigger context? Or, if this is brand-new and there's nothing matching yet, you can paste 1-3 example conversation snippets manually.

If the user accepts the auto-query:

    cd ~/.claude/skills/skill-dojo
    # If the target skill lives in a different project than the dojo, set
    # CLAUDE_PROJECTS_DIR to that project's session-history dir - fetch_corpus
    # otherwise derives it from cwd and silently returns zero sessions.
    # e.g. CLAUDE_PROJECTS_DIR=~/.claude/projects/-Users-you-Projects-foo
    python -c "
    from pathlib import Path
    from scripts.fetch_corpus import fetch_corpus
    fetch_corpus('<trigger>', limit=10, write_to=Path('<new-skill-path>/corpus/seed-YYYY-MM-DD.jsonl'))
    "

If the user supplies snippets manually, write them as JSONL: one object per line with `session_id` and `transcript` keys.

**7b. Score against seed.**

    cd ~/.claude/skills/skill-dojo
    python -c "
    from pathlib import Path
    from scripts.score import score_skill
    result = score_skill(Path('<new-skill-path>/SKILL.md'), Path('<new-skill-path>/corpus/seed-YYYY-MM-DD.jsonl'))
    print(result)
    "

After scoring returns, emit: `bash -c "echo dojo-trace:score-complete"`. **If** the baseline is strictly greater than zero, also emit: `bash -c "echo dojo-trace:baseline-positive"`.

**7c. Show the user the baseline and the breakdown.**

Format:

    Baseline: 0.67 (4 of 6 measurements passed on average across 3 sessions)

    Per-measurement:
    - m1-fired-when-expected:    3/3 (1.00)
    - m2-output-matched-intent:  2/3 (0.67)
    - m3-no-re-prompt-needed:    1/3 (0.33)  ← flag

    Per-session:
    - session abc123: 3/3
    - session def456: 2/3
    - session ghi789: 1/3

Ask:

> `m3-no-re-prompt-needed` passed only 1 of 3 sessions. Was the measurement wrong, or did those sessions actually show the failure?

If the user wants to fix the measurement, edit the SKILL.md `## Contract` block in place and re-run Step 7b.

**7d. Write the baseline into the contract.**

Update the `Baseline:` line in the contract to the computed number. Save.

**7e. Hand off.**

Report:

    SKILL.md written to: <path>
    Baseline: <score>
    Next: skill-reflector will replace the seed corpus with real transcripts once nightly runs begin.

Then emit BOTH:

    bash -c "echo dojo-trace:step-complete:7"
    bash -c "echo dojo-trace:handoff-complete"

### Notes for the sensei

- **You are not the reflector.** Your job ends after the first-run handoff. Do not propose mutations to the lever during authoring - that's a separate skill's job.
- **You eat your own dog food.** Your own `## Contract` block (above) is graded on every dojo session. If `m4-baseline-positive` ever fails, the grill ran but the seed corpus produced a zero score - usually because the user-authored measurements were untestable against the chosen transcripts, or the corpus was empty.
- **The contract is a promise.** Don't quietly skip a step. Each of the seven steps is checked by `m1-completed-grill` via its trace marker. No marker = step did not happen, full stop.
- **The trace marker IS the spec.** Phrasing in prose ("step 1 done!") doesn't count - only the explicit `dojo-trace:*` Bash tool call does. The reason is robustness: the LLM rephrases prose; tool-call args are captured verbatim.
