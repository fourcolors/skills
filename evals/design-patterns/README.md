# design-patterns evals

The installed skill stays limited to runtime guidance. This repository-level directory preserves its validation surface.

Run the deterministic checks with:

```bash
node evals/design-patterns/run.mjs
```

`cases.json` is the forward-test matrix. A fresh agent receives the installed skill and one prompt without expected answers. Review its response against `expectedPatterns`, `forbiddenPatterns`, `requiredConcepts`, and `forbiddenClaims`. Trigger cases are evaluated from metadata alone.

The matrix intentionally includes positive and negative triggers, pattern look-alikes, a no-pattern decision, concurrency and lifecycle seams, durable Command replay, repeatable Memento restore, type-safe Composite traversal, Abstract Factory consistency, and untrusted Interpreter input.

Preserved forward-test evidence:

- [`results/2026-07-13.md`](results/2026-07-13.md)
