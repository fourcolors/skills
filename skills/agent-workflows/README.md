# agent-workflows

A baseline library for composing agent workflows on the fly.

## The idea

Dynamic workflow engines (like Claude Code's Workflow tool) can build multi-agent workflows at run time, but every generated workflow otherwise starts from a blank page.
This skill gives the generator a library of named, battle-tested workflow shapes to start from instead.

Each baseline is defined as **concepts and invariants**, not as a rigid script.
Two rigid scripts cannot be merged, but two contracts can be wired together: the ping-pong loop's exit state (green, audited, committed on a feature branch) is exactly the no-mistakes gate's entry precondition.
Composition means picking baselines, wiring them at those seams, and grafting whichever cross-cutting primitives the job needs.

## Layout

```text
agent-workflows/
├── SKILL.md            <-- Composition procedure, rules, and baseline index
├── README.md           <-- You are here
├── baselines/
│   ├── ping-pong.md    <-- Build loop: spec -> implement -> independent audit
│   ├── no-mistakes.md  <-- Ship gate: ordered validation pipeline before the push target
│   └── primitives.md   <-- Graftable parts: goal anchors, refusal, evidence, tiers, durability, ...
├── examples/
│   └── build-and-ship.workflow.js  <-- The worked example as a complete, copy-ready Workflow script
└── templates/
    └── baseline-template.md        <-- Fixed anatomy skeleton for contributing a new baseline
```

Every workflow-shape baseline follows the same minimum anatomy, fixed by `templates/baseline-template.md`: Intent, When to use, Roles or Stages, Contract, Invariants, Failure routing, Workflow skeleton, Composes with.
`primitives.md` is the exception: a parts bin of graftable cross-cutting rules, not a shape.
The invariants are the fixed part; the skeleton is a starting example the generator adapts freely.

## How it gets used

The agent loads this skill when asked to generate, compose, or orchestrate a workflow, then loads only the baseline files the request needs.
When the request matches a shape under `examples/`, it starts from that copy-ready script and adapts it instead of re-deriving the wiring.

Example prompts that should route through this skill:

- "Compose a workflow that refactors the parser with ping-pong discipline and ships it through a gate."
- "Build me a dynamic workflow for this migration - use our standard baselines."
- "Design an overnight run: implement these five scenarios, audit each one, then validate before pushing."

## Relationship to the source skills

The full [ping-pong](../ping-pong/) skill and the `no-mistakes` CLI remain the source of truth for running those workflows directly, with all their operational detail.
The baselines here are the composable distillations: stable concepts and invariants only, so they do not drift when operational detail changes.
When the real tool or trio is available, the baseline says so and defers to it rather than reimplementing it.

## Adding a baseline

1. Copy `templates/baseline-template.md` into `baselines/` and fill in the fixed anatomy.
2. Distill concepts that stay true across implementations; leave CLI flags, cache paths, and brief templates in the source tool.
3. Keep invariants terse and imperative - they are what the composed workflow must enforce.
4. Add the file to the index table in `SKILL.md` with a one-line "load when" trigger.

## Installation

```bash
# Project-scoped (recommended)
npx skills add fourcolors/skills --skill agent-workflows -a claude-code

# Global
npx skills add fourcolors/skills --skill agent-workflows -g
```
