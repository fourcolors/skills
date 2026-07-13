# Bridge

> Decouple an abstraction from its implementation so the two can vary independently.

**Also known as:** Handle/Body

**Reach for it when** a high-level abstraction and a lower-level implementation are separate dimensions of change and combining them in one inheritance hierarchy would create their Cartesian product.

## Problem

Suppose windows vary by purpose - ordinary, icon, transient - and by platform - X11, Windows, or another backend. A subclass for every combination binds both decisions into one hierarchy. Adding either a new abstraction or a new backend multiplies classes and leaks implementation choices into client-visible types.

## Solution

Split the design into two hierarchies connected by composition:

- The `Abstraction` is the high-level contract clients use and holds an `Implementor`.
- `RefinedAbstraction` variants express high-level differences.
- `Implementor` defines the backend operations.
- `ConcreteImplementor` variants realize those operations for each platform or mechanism.

The interfaces need not correspond one-to-one. Implementor operations are often lower-level primitives that the abstraction composes, but a mirrored shape does not by itself disqualify Bridge. Intent and independent variation are what matter.

## Participants

- `Abstraction` - client-facing behavior and the implementor reference.
- `RefinedAbstraction` - a high-level variant when the abstraction dimension has subtypes.
- `Implementor` - backend contract, commonly lower-level than the abstraction.
- `ConcreteImplementor` - a platform or mechanism-specific implementation.
- `Client` - chooses or receives an abstraction configured with an implementor.

## Structure

```text
interface DrawingAPI {
    drawLine(x1, y1, x2, y2)
    drawCircle(x, y, radius)
}

class RasterCanvas implements DrawingAPI {
    drawLine(x1, y1, x2, y2) { setPixelsForLine(...) }
    drawCircle(x, y, radius) { setPixelsForCircle(...) }
}

class VectorCanvas implements DrawingAPI {
    drawLine(x1, y1, x2, y2) { emitVectorLine(...) }
    drawCircle(x, y, radius) { emitVectorCircle(...) }
}

abstract class Shape {
    protected field drawing: DrawingAPI

    constructor(drawing) {
        this.drawing = drawing
    }

    abstract draw()
}

class Circle extends Shape {
    field x, y, radius

    draw() {
        drawing.drawCircle(x, y, radius)
    }
}

class Rectangle extends Shape {
    field x1, y1, x2, y2

    draw() {
        drawing.drawLine(x1, y1, x2, y1)
        drawing.drawLine(x2, y1, x2, y2)
        drawing.drawLine(x2, y2, x1, y2)
        drawing.drawLine(x1, y2, x1, y1)
    }
}

shape = new Circle(new VectorCanvas())
shape.draw()
```

## Collaboration

The client invokes a high-level operation on the abstraction. The abstraction implements it using one or more implementor operations. A factory or composition root normally chooses the concrete implementor.

Bridge permits runtime switching only when the abstraction deliberately exposes safe reconfiguration and implementor state is compatible. A mutable reference alone does not make arbitrary hot-swapping correct.

## Use when

- Two orthogonal dimensions of variation would otherwise produce `N × M` concrete combinations.
- Abstractions and implementations should evolve independently.
- A backend must be selected at construction or configuration time without changing client code.
- Implementation details should be hidden behind a stable abstraction boundary.
- Several abstraction objects can safely share one implementor.

## Avoid when

- There is only one meaningful dimension of change and ordinary polymorphism or composition is clearer.
- The proposed dimensions are coupled, so abstraction variants must know concrete implementors.
- You are merely reconciling an already incompatible API; use Adapter.
- The delegated object is specifically a replaceable algorithm or policy rather than an implementation dimension; Strategy is usually clearer.
- The extra abstraction has no foreseeable variation, implementation-hiding, testing, or dependency-boundary value.

## Guardrails and trade-offs

- Name both axes before introducing the pattern and show that each can change independently.
- Link the axes through composition, not another cross-product inheritance hierarchy.
- Keep implementor-specific types, exceptions, and configuration out of the client-facing abstraction. Translate them at the bridge boundary.
- Do not identify patterns mechanically. No `RefinedAbstraction` subclass does not automatically mean Strategy, and similar method signatures do not make a wrapper pointless.
- Keep construction policy in a factory or composition root when clients should not know concrete implementors.
- Test each abstraction against implementor contract tests and representative combinations; independent types can still have behavioral incompatibilities.

The benefit is additive growth - roughly `N + M` types rather than `N × M` combinations - and a stable client boundary. The costs are another interface, delegation, more objects, and the design risk of splitting dimensions that are not truly independent.

## In the wild

- Java AWT's `Component`/peer architecture is close to the canonical Window/WindowImp example: high-level components delegate platform work to toolkit peers.
- C++ pImpl and Qt's d-pointer are related Handle/Body implementation-hiding idioms. They are a degenerate Bridge when there is only one body implementation, not evidence of two independently varying hierarchies by themselves.

Provider base classes, plug-in interfaces, or standardized driver modules are not automatically Bridge. Verify that a client-facing abstraction object composes a distinct implementor dimension; subclass-only provider models are usually polymorphism plus Factory rather than GoF Bridge.

## Related patterns

- **Adapter** reconciles an incompatible existing interface; Bridge is organized around independent abstraction and implementation dimensions.
- **Strategy** delegates a replaceable algorithm or policy. Similar structure does not erase the difference in intent.
- **Abstract Factory** can create compatible abstraction/implementor combinations.
- **Decorator** preserves a component interface and layers responsibilities rather than separating two axes.
- **Template Method** varies steps through inheritance instead of a composed implementor.
