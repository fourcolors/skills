# Strategy

> Define a family of algorithms, encapsulate each one, and make them interchangeable so the algorithm can vary independently from its context.

Also known as Policy.

## Intent

Use Strategy when a context must delegate one responsibility to interchangeable algorithm or policy variants. It is especially useful when the variant is selected by configuration, injected for testing, or replaced during the context's lifetime.

Prefer a parameter, function, or closure for a tiny variation. Prefer State when behavior follows the context's evolving internal mode; transition policy may live either in the context or in state objects. Prefer Template Method when a stable skeleton is inherited and subclasses fill selected steps.

## Participants

- `Strategy` declares the operation shared by all variants.
- `ConcreteStrategy` implements one compatible algorithm.
- `Context` holds a strategy and delegates the relevant work.
- `Client` selects and supplies a strategy, directly or through configuration/factory code.

## Structure

```text
interface Strategy<Result> {
    execute(input: Input): Result
}

class StrategyA implements Strategy<Result> {
    execute(input): Result { /* algorithm A */ }
}

class StrategyB implements Strategy<Result> {
    execute(input): Result { /* algorithm B */ }
}

class Context {
    private strategy: Strategy<Result>

    constructor(strategy) { this.strategy = strategy }

    setStrategy(strategy) { this.strategy = strategy }

    doWork(input): Result {
        return strategy.execute(input)
    }
}

context = new Context(new StrategyA())
resultA = context.doWork(input)
context.setStrategy(new StrategyB())
resultB = context.doWork(input)
```

The context knows only the strategy contract. Strategies need not be classes in languages with first-class functions.

## Guardrails and trade-offs

- Define semantic preconditions, outputs, error behavior, and side effects in the strategy contract. Sharing a method signature is not enough to make algorithms safely interchangeable.
- Keep selection outside the context's algorithmic core. A factory or configuration switch that selects a strategy is fine; retaining the full algorithm switch inside the context defeats the pattern.
- Make replacement atomic or otherwise synchronized if the same context is used concurrently.
- Prefer stateless, immutable strategies. Do not accidentally share mutable policy state across requests or tenants.
- Avoid a class per micro-variation when parameters or composed functions express the space more clearly.
- Pass only the data strategies need. A broad back-reference to the context can recouple every strategy to its internals.

Benefits are replaceable behavior, isolated tests, and removal of algorithm-selection branches from the context. Costs are additional indirection, a larger variant surface, and client responsibility for choosing a compatible policy.

## Examples and relationships

Close examples include Java `Comparator` and rejection policies, Python `sorted(key=...)`, JavaScript sort comparators, .NET `IComparer<T>`, Go comparison functions, and configurable authentication or encoding policies.

State and Strategy often have similar object structures, but differ in intent: Strategy is an interchangeable algorithm selected by a client or configuration; State reflects the context's current mode and changes as that mode transitions. Template Method is subclass-bound: a concrete subtype can be selected at runtime, but its hooks are not independently replaceable on the same object. Bridge separates an abstraction from a broader implementation hierarchy, while Strategy focuses on a behavioral policy.
