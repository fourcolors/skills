---
name: agent-workflows
description: Use when the user asks to generate, compose, design, or orchestrate a multi-agent workflow, wants a dynamic workflow built on the fly, or names a baseline like ping-pong or no-mistakes as the shape a workflow should follow. Provides composable baseline workflow definitions - the ping-pong build loop, the no-mistakes ship gate, and cross-cutting workflow primitives (goal anchors, evidence rules, gate semantics, refusal, tier routing, durability) - plus a copy-ready example composition.
license: MIT
---

# Agent Workflows

A baseline library for composing agent workflows on the fly.
Each file under `baselines/` defines one reusable workflow shape as concepts and invariants, not as a rigid script - except `primitives.md`, a parts bin of cross-cutting rules to graft into any shape.
You compose a concrete workflow by loading the relevant baselines and wiring them together at their contract seams.

## Baseline index

| File | Shape | Load when |
|---|---|---|
| [baselines/ping-pong.md](baselines/ping-pong.md) | Build loop: spec (failing test) -> implement -> independent audit | The workflow must produce verified code changes |
| [baselines/no-mistakes.md](baselines/no-mistakes.md) | Ship gate: ordered validation pipeline before a push target | The workflow ends with committed work that must ship safely |
| [baselines/primitives.md](baselines/primitives.md) | Cross-cutting parts to graft into any composition | Always skim; graft what the composition needs |

## Composition procedure

1. Restate the goal of the requested workflow in one sentence and pick the baselines that cover it.
2. Load only the baseline files you picked, skim `primitives.md` for graftable parts, and start from the matching `examples/` script when one exists.
3. Map each baseline's stages onto your orchestration constructs: Workflow-tool phases and agents, or plain subagent dispatches when no Workflow tool is available.
4. Resolve the project facts your prompts will need (test runner, file conventions, ownership lists, available tools) by inspecting the target project or asking, before the first dispatch; a placeholder left in a dispatched prompt is a composition defect, and an unresolvable fact bounces per the refusal primitive.
5. Carry every invariant from each loaded baseline into the composed workflow - as agent rules, verifier criteria, or gate checks.
6. Wire baselines at their contract seams: one baseline's exit contract must satisfy the next baseline's entry preconditions.
7. If the request is too thin to compose responsibly, bounce a sharp question instead of forcing a workflow (see the refusal primitive).

## Composition rules

- Invariants are non-negotiable; skeletons are examples - adapt structure freely, never the invariants.
- Never merge roles a baseline separates for independence reasons (for example auditor and implementer).
- The discipline never changes with ceremony: solo, subagent dispatch, and a full Workflow run all enforce the same invariants.
- Every composed workflow gets a goal anchor and concrete done-when conditions before the first dispatch.
- Declare capability tiers (fast/standard/reasoning/heavy) per stage, never concrete model names.

## Worked example

"Build feature X and ship it" composes as: goal anchor (primitive) -> ping-pong loop per BDD scenario (baseline) -> no-mistakes gate on the finished branch (baseline).
The seam is one deliberate exit invariant: the loop commits audited work on a non-default feature branch, which satisfies the gate's entry preconditions.
[examples/build-and-ship.workflow.js](examples/build-and-ship.workflow.js) is this exact composition as a complete, copy-ready Workflow script; when the request matches this shape, start from it and adapt rather than re-derive the wiring.

## Adding a baseline

One file per baseline under `baselines/`, copied from [templates/baseline-template.md](templates/baseline-template.md), which fixes the minimum anatomy: Intent, When to use, Roles or Stages, Contract, Invariants, Failure routing, Workflow skeleton, Composes with.
Keep invariants terse and imperative, and keep the skeleton minimal and clearly marked as an example.
Distill only concepts that stay true across implementations; operational detail (CLI flags, cache paths, brief templates) stays in the source skill or tool it came from.
