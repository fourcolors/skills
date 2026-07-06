# Baseline: <name>

Source of truth: <the real skill or tool this baseline distills, with a link>.
Use the real thing when it is available; use this baseline when composing a custom workflow that borrows the shape.
This file carries only the stable concepts and invariants, so it does not drift when operational detail changes.

## Intent

<One sentence: the single separation or guarantee this shape exists to enforce.>

## When to use

<One sentence: the workflow condition that makes this baseline the right shape to load.>

## Roles or Stages

<A table of roles (Role | Owns | Never does) for loop-shaped baselines, or an ordered stage list for pipeline-shaped ones.>

## Contract

<Entry preconditions, handoff obligations, and the exit state - what upstream must provide and what downstream may rely on.>
<The exit state is the composition seam: name it precisely enough that another baseline can declare it as an entry precondition.>

## Invariants

<Terse imperative rules the composed workflow must enforce; these are the non-negotiable part.>
<Distill only what stays true across implementations; CLI flags, cache paths, and brief templates stay in the source skill or tool.>

## Failure routing

<Which failure re-dispatches which actor, and the explicit escalation threshold to the human.>

## Workflow skeleton (example - adapt freely)

```js
// Minimal Workflow-tool sketch of the shape; clearly an example, never the contract.
// Show the invariants as code comments where a line embodies one.
```

## Composes with

- Upstream: <what feeds this baseline and how it satisfies the entry preconditions>.
- Downstream: <what consumes this baseline's exit contract>.
