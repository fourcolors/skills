# Template Method

> Define an algorithm's skeleton in one operation while allowing subclasses to redefine selected steps without changing the overall structure.

## Intent

Use Template Method when related procedures share an invariant order and inheritance is an appropriate extension mechanism. The base class owns the workflow; subclasses implement required primitive operations or override optional hooks.

Prefer Strategy or function parameters when behavior must be replaceable independently during an object's lifetime, or when several variation axes would create a subclass cross-product. Do not force dissimilar workflows into a shared template merely to remove superficial duplication.

## Participants

- `AbstractClass` implements the template and invariant steps, declares required primitive operations, and supplies defaults for hooks.
- `ConcreteClass` implements required primitives and optionally overrides hooks.
- `Client` creates a concrete subtype and invokes the template, not its individual protected steps.

## Structure

```text
abstract class AbstractClass {
    // Non-overridable where the language permits it.
    final templateMethod() {
        stepOne()
        primitiveA()
        if hook():
            primitiveB()
        stepTwo()
    }

    private stepOne() { /* invariant behavior */ }
    private stepTwo() { /* invariant behavior */ }
    protected abstract primitiveA()
    protected abstract primitiveB()
    protected hook(): boolean { return true }
}

class ConcreteClass extends AbstractClass {
    protected primitiveA() { /* subtype-specific step */ }
    protected primitiveB() { /* subtype-specific step */ }
    protected hook(): boolean { return false }
}

object = new ConcreteClass()
object.templateMethod()
```

Dynamic dispatch selects the concrete hooks at runtime. The binding constraint is not "compile time": it is that variation is tied to the object's subtype and normally cannot be swapped independently on the same instance.

## Guardrails and trade-offs

- Keep the template non-overridable where possible; otherwise document that overriding it violates the extension contract.
- Keep primitive operations protected and call them only at sanctioned points.
- Never call overridable operations from a base constructor; subclass state may not yet be initialized.
- Give optional hooks safe defaults instead of forcing empty implementations.
- For acquire/use/release workflows, use `finally`, RAII, `defer`, or the language's structured cleanup mechanism. A sequence of method calls alone does not guarantee cleanup after failure.
- Document hook ordering, allowed side effects, and invariants that must hold before and after each hook. A base-class change can break every subclass.
- Avoid deep inheritance chains where no one class reveals the complete algorithm.

Benefits are one authoritative workflow and constrained extension points. Costs are fragile-base-class coupling, a consumed inheritance axis, and control flow split across base and subtype.

## Examples and relationships

Close examples include Java collection skeleton classes, servlet request dispatch, framework refresh/lifecycle methods, Python `unittest.TestCase.run`, Django class-based-view dispatch, Node stream `_read`/`_write` hooks, and the .NET `Dispose(bool)` convention. Some frameworks leave their template overridable by convention; that is a weaker enforcement of the same intent.

Factory Method is often one creation hook within a Template Method. Strategy varies behavior through composition and can be replaced independently; Template Method varies selected steps through subtype dispatch. A callback or Command can replace an inheritance hook when composition is preferable.
