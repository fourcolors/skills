---
name: design-patterns
description: Use when the user asks which Gang-of-Four design pattern fits a software problem, compares or names GoF patterns, wants a GoF-pattern implementation reviewed, or wants existing code refactored around a concrete object-creation, composition, interaction, state-transition, or extensibility problem. Do not use for UI design systems, architecture styles, database/schema patterns, language protocols, or non-software uses of words such as strategy, state, iterator, or facade.
license: MIT
---

# Design Patterns

Choose patterns by the change they isolate, then adapt the pattern to the target language instead of reproducing its class diagram mechanically.

## Workflow

1. Inspect the concrete design or code path. Name the axis of variation: what must change independently, and what invariant must stay fixed?
2. Use the decision index below to select the smallest plausible candidate set. Include the no-pattern option.
3. Open only the reference files for those candidates. When comparing look-alikes, load only the entries being compared.
4. Prefer the target language's native idiom when it preserves the intent: a function may be a Strategy, a generator an Iterator, a closure a Command, and a module an intentionally shared instance.
5. State why the choice fits, why its nearest alternatives do not, what complexity it adds, and which lifecycle, concurrency, failure, or ownership invariant needs testing.

## Decision index

### Creating objects

| Pattern | Load when | Reference |
|---|---|---|
| Singleton | One runtime scope must enforce one instance and expose controlled shared access; explicit injection is insufficient | [Singleton](references/singleton.md) |
| Factory Method | A creator's reusable workflow must let subclasses choose one concrete product | [Factory Method](references/factory-method.md) |
| Abstract Factory | A consistency boundary must create several related product kinds from one selected family | [Abstract Factory](references/abstract-factory.md) |
| Builder | Construction has meaningful steps or a large validated parameter surface; distinguish GoF representation builders from fluent parameter builders | [Builder](references/builder.md) |
| Prototype | Runtime-selected, preconfigured exemplars should produce new objects through a deliberate copy contract | [Prototype](references/prototype.md) |

### Composing objects

| Pattern | Load when | Reference |
|---|---|---|
| Adapter | An existing interface must be translated into a different interface a client expects | [Adapter](references/adapter.md) |
| Bridge | Two genuine dimensions of variation must evolve independently through composition | [Bridge](references/bridge.md) |
| Composite | Leaves and containers form a part-whole hierarchy with meaningful shared operations | [Composite](references/composite.md) |
| Decorator | Optional responsibilities must be composed around individual objects behind the same client-facing contract | [Decorator](references/decorator.md) |
| Facade | Clients need a simpler entry point over several subsystem operations | [Facade](references/facade.md) |
| Flyweight | Measured memory pressure comes from many objects duplicating immutable intrinsic state | [Flyweight](references/flyweight.md) |
| Proxy | A substitutable stand-in must control access, lifecycle, location, or lazy acquisition of a subject | [Proxy](references/proxy.md) |

### Coordinating behavior

| Pattern | Load when | Reference |
|---|---|---|
| Chain of Responsibility | A request must be offered to an ordered, configurable set of possible handlers | [Chain of Responsibility](references/chain-of-responsibility.md) |
| Command | A request must become data with an explicit execution, queueing, history, or undo contract | [Command](references/command.md) |
| Interpreter | A small, bounded grammar is naturally represented and evaluated as an expression tree | [Interpreter](references/interpreter.md) |
| Iterator | Traversal state or traversal order must be separated from an aggregate's representation | [Iterator](references/iterator.md) |
| Mediator | One object should own the coordination policy among otherwise tangled colleagues | [Mediator](references/mediator.md) |
| Memento | An originator must issue opaque, isolated checkpoints that can restore its private state | [Memento](references/memento.md) |
| Observer | One source must notify an open-ended set of dynamic dependents | [Observer](references/observer.md) |
| State | Behavior follows an object's evolving internal mode and legal transition policy | [State](references/state.md) |
| Strategy | A caller or configuration selects among interchangeable algorithms | [Strategy](references/strategy.md) |
| Template Method | A subtype fills sanctioned steps in one fixed inherited algorithm skeleton | [Template Method](references/template-method.md) |
| Visitor | A stable set of element types needs frequently added type-specific operations | [Visitor](references/visitor.md) |

## Look-alikes

| Candidates | Deciding intent |
|---|---|
| Proxy / Decorator / Adapter | Proxy controls access through the subject contract; Decorator composes responsibilities through that contract; Adapter translates to a different contract |
| Bridge / Adapter | Bridge is designed around two independently varying dimensions; Adapter reconciles an existing mismatch |
| Factory Method / Abstract Factory | Factory Method varies one product through a creator override; Abstract Factory supplies several related product kinds through a family object |
| Strategy / State | Strategy is selected as an algorithm; State follows the context's evolving internal mode, regardless of where transition policy lives |
| Facade / Mediator | Facade simplifies client-to-subsystem use; Mediator owns colleague-to-colleague coordination policy |
| Command / Strategy | Command represents a request and its execution lifecycle; Strategy represents an interchangeable algorithm |
| Composite / Decorator | Composite owns zero or more children in a part-whole structure; Decorator wraps one component to add a responsibility |
| Visitor / Iterator | Visitor dispatches type-specific operations; Iterator controls traversal order and position |

## Guardrails

- Prefer a plain function, value, module, data structure, conditional, or explicit dependency until a real variation or coordination boundary justifies the pattern.
- Treat diagrams as roles, not mandatory classes. Language features may collapse several participants.
- Never claim a pattern supplies guarantees it does not encode. Atomicity, durability, exactly-once effects, authorization, thread safety, family consistency, and snapshot isolation need explicit mechanisms and tests.
- Define ownership and failure behavior for wrappers, callbacks, histories, pools, and mutable graphs. Cleanup must survive exceptions; replay and retry must account for idempotency.
- Measure before applying performance patterns such as Flyweight, caching proxies, or deep wrapper stacks.
- Test the composition, not only each participant: ordering, reentrancy, cycles, concurrent access, partial failure, empty histories, unknown keys, and repeated restore/replay are common failure seams.
