---
name: example-skill
description: Use when testing the parser
---

## Contract

### Objective
- Metric: mean pass rate
- Stop: 10 iterations without improvement
- Baseline: 0.42

### Measurements

1. **`m1-fired-when-expected`** — `judge: code`
   - Question: *Did the skill activate?*
   - Evaluator:
     ```
     {"type": "substring", "value": "example-skill"}
     ```

2. **`m2-output-matched`** — `judge: llm`
   - Question: *Did the output match user intent?*
   - Judge prompt:
     ```
     Did this transcript show the example-skill correctly addressing the user's request? Answer yes or no.
     ```

## Skill

> Lever - reflector mutates freely.

The body of the skill goes here.
