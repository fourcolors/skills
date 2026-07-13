# Visitor

> Represent an operation performed on elements of an object structure so new operations can be added without changing the element classes.

## Intent

Use Visitor when a stable set of heterogeneous element types needs many type-specific operations. Each visitor groups one operation across all element types; every element supplies a small `accept` hook for double dispatch.

Prefer virtual methods on elements for one or two intrinsic operations. Prefer pattern matching, algebraic data types, or native multiple dispatch when the language expresses a closed type set more directly. Avoid Visitor when element types change frequently, because each new type changes the visitor contract and normally every visitor.

## Participants

- `Visitor` declares one operation per concrete element type.
- `ConcreteVisitor` implements one cross-element operation and may accumulate result state.
- `Element` declares `accept(visitor)`.
- `ConcreteElement` implements `accept` as a callback to the matching visitor operation.
- `ObjectStructure` owns/enumerates elements or otherwise exposes traversal.
- `Client` creates a visitor and starts traversal.

## Structure

```text
interface Visitor {
    visitCircle(circle: Circle)
    visitSquare(square: Square)
}

interface Element {
    accept(visitor: Visitor)
}

class Circle implements Element {
    private radius: Number
    radiusValue(): Number { return radius }
    accept(visitor) { visitor.visitCircle(this) }
}

class Square implements Element {
    private side: Number
    sideValue(): Number { return side }
    accept(visitor) { visitor.visitSquare(this) }
}

class AreaVisitor implements Visitor {
    private total: Number = 0
    visitCircle(circle) {
        total += PI * circle.radiusValue() * circle.radiusValue()
    }
    visitSquare(square) {
        total += square.sideValue() * square.sideValue()
    }
    result(): Number { return total }
}

elements: List<Element> = [new Circle(2), new Square(3)]
visitor = new AreaVisitor()
for each element in elements:
    element.accept(visitor)
print(visitor.result())
```

The call to `element.accept(visitor)` dispatches on the element's runtime type. The selected `accept` calls a statically specific method such as `visitCircle`, whose implementation dispatches on the visitor's runtime type. That is the classic double-dispatch mechanism.

## Traversal ownership

Choose one traversal convention and document it:

- structure-controlled: the client/object structure enumerates every element and calls `accept`;
- visitor-controlled: visit methods explicitly recurse into child elements.

Mixing the two can visit nodes twice or skip them. Iterator or Composite can provide traversal independently when Visitor should focus only on the operation.

## Guardrails and trade-offs

- Keep `accept` as a thin dispatch hook; do not move operation-specific behavior back into elements.
- Define whether visitors may mutate elements or structure. Structural mutation during traversal needs snapshotting, deferred edits, or an explicit iterator-invalidating policy.
- Do not expose raw fields solely for visitors. Provide the narrow domain access each operation legitimately needs, or place visitors within an appropriate module boundary.
- Do not reuse a stateful accumulator concurrently or across traversals without resetting it.
- Provide a default/base visitor only when silently ignoring a new element is safe. For validation, authorization, serialization, and other exhaustive operations, prefer compile-time failure when an element type is added.
- Avoid a single `visit(Element)` plus `instanceof`/type switches when the language supports the canonical overload-and-accept design; that forfeits its exhaustiveness and dispatch benefits.

Benefits are easy addition of operations, cohesive operation code, and type-specific behavior without casts. Costs are difficult element evolution, coupling to concrete element types, encapsulation pressure, and dispatch/traversal complexity.

## Examples and relationships

Canonical or close double-dispatch examples include Java annotation-processing `ElementVisitor`/`TypeVisitor`, Roslyn syntax visitors, expression-tree visitors, and visitor hierarchies in compiler IRs.

Python `ast.NodeVisitor`, Babel/TypeScript keyed-node visitors, Java `FileVisitor`, and Go `ast.Walk` are visitor-style traversal APIs implemented with name lookup, callbacks, or type switches rather than the canonical element `accept` double dispatch. They share the operation-over-structure intent but should not be used as proof of the exact GoF mechanics.

Composite commonly supplies the object structure. Iterator controls traversal order. Interpreter ASTs are frequent Visitor targets for type checking, formatting, optimization, or compilation. Strategy swaps one algorithm for a context; Visitor supplies one type-specific operation across an element family.
