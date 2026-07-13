# design-patterns

A decision-first, language-agnostic guide to the 23 Gang-of-Four software design patterns for coding agents.

## Design

`SKILL.md` is the router. It identifies the problem's axis of variation, keeps the no-pattern option visible, and links directly to one self-contained reference per pattern. A typical request loads the router plus one roughly pattern-sized reference; comparing two look-alikes loads only those two entries.

The references are grouped conceptually, not bundled into category-sized context payloads:

- **Creational:** Singleton, Factory Method, Abstract Factory, Builder, Prototype
- **Structural:** Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy
- **Behavioral:** Chain of Responsibility, Command, Interpreter, Iterator, Mediator, Memento, Observer, State, Strategy, Template Method, Visitor

Each entry focuses on canonical intent, decision boundaries, structure, collaboration, trade-offs, implementation hazards, and clearly labeled real-world examples or analogies. It distinguishes pattern guarantees from separate concerns such as durability, concurrency, atomicity, authorization, and idempotency.

## Trigger boundaries

Prompts that should load the skill include:

- "Should this wrapper be a Proxy, Decorator, or Adapter?"
- "Refactor this repeated state switch into explicit transitions."
- "Which construction pattern fits a family of matching database objects?"
- "Review our Command implementation for undo and replay safety."

Prompts about UI design systems, architecture styles, schema patterns, language protocols, or non-software meanings of words such as strategy and facade should not load it.

## Validation

Repository-level structural tests and adversarial prompt fixtures live in [`../../evals/design-patterns`](../../evals/design-patterns), outside the installed skill payload. They cover discovery, direct reference routing, pattern completeness, trigger boundaries, look-alike selection, no-pattern decisions, unsafe replay/undo, snapshot isolation, concurrency, and misleading language analogies.

## Installation

```bash
# Project-scoped
npx skills add fourcolors/skills --skill design-patterns -a claude-code

# Global
npx skills add fourcolors/skills --skill design-patterns -g
```
