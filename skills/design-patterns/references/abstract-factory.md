# Abstract Factory

> *Provide an interface for creating families of related or dependent objects without specifying their concrete classes.*

**Also known as:** Kit

**Reach for it when** several Product kinds must vary together as a family and clients should switch families through one composed factory object.

## Problem

A subsystem uses several related Product kinds whose concrete implementations vary by platform, provider, theme, or another axis. Scattered constructors couple clients to concrete classes and make a family swap a shotgun edit. Mixing family members may also be semantically invalid.

## Solution

Declare an AbstractFactory with one creation operation per Product kind. Each ConcreteFactory returns the matching concrete members of one family, typed through AbstractProduct interfaces. Clients receive one factory for a defined consistency scope and avoid naming concrete Product classes.

The ordinary GoF structure centralizes family selection but does not by itself prove family consistency: a buggy factory can return a mismatched Product, and a client holding multiple factories can mix their results. If the type system must reject mixing, add a family type parameter/associated type, return an encapsulated family aggregate, or prevent Products from escaping the scope that owns the factory.

## Participants

- `AbstractFactory` - declares one creation operation per abstract Product kind.
- `ConcreteFactory` - implements those operations for one family.
- `AbstractProduct` - interface for a Product kind used by clients.
- `ConcreteProduct` - family-specific implementation of an AbstractProduct.
- `Client` - depends only on AbstractFactory and AbstractProduct interfaces.

## Structure

```
interface Button { render() }
interface Checkbox { toggle() }

interface GUIFactory {
    createButton() : Button
    createCheckbox() : Checkbox
}

class WinButton implements Button { render() { /* Windows */ } }
class WinCheckbox implements Checkbox { toggle() { /* Windows */ } }
class MacButton implements Button { render() { /* macOS */ } }
class MacCheckbox implements Checkbox { toggle() { /* macOS */ } }

class WinFactory implements GUIFactory {
    createButton() : Button { return new WinButton() }
    createCheckbox() : Checkbox { return new WinCheckbox() }
}

class MacFactory implements GUIFactory {
    createButton() : Button { return new MacButton() }
    createCheckbox() : Checkbox { return new MacCheckbox() }
}

class Application {
    constructor(factory : GUIFactory) {
        // Consistent while this scope uses one correctly implemented factory.
        this.button = factory.createButton()
        this.checkbox = factory.createCheckbox()
    }
}

factory = (os == "mac") ? new MacFactory() : new WinFactory()
application = new Application(factory)
```

## Collaboration

A composition boundary selects and injects a ConcreteFactory. The selection may be application-wide or scoped per window, request, tenant, document, or subsystem. Within that consistency boundary, the client obtains each Product kind from the same factory and works only through abstract interfaces.

## Use when

- Two or more Product kinds vary together along the same family axis.
- Clients must remain independent of concrete Product creation and representation.
- A library exposes Product interfaces while hiding implementations.
- One composition decision should select a coherent provider, theme, or platform family for a defined scope.

## Avoid when

- Only one Product kind is created; use Factory Method, a factory function, or a service-provider lookup.
- There is one family with no credible variation; the interfaces are speculative.
- New Product kinds are added far more often than new families, because every factory must change.
- Products genuinely need arbitrary cross-family mixing.
- Plain injection of already-constructed collaborators solves the problem without family creation.

## Trade-offs and guardrails

Abstract Factory isolates clients from concrete classes and localizes family selection. Adding a new family is usually additive. Adding a new Product kind is expensive because the AbstractFactory and every ConcreteFactory must change.

The pattern can create a large kinds-by-families lattice. Keep the family axis explicit, test every ConcreteFactory against a shared contract suite, and test semantic compatibility among the Products it returns. Avoid downcasts that leak concrete Product types.

A ConcreteFactory may be shared when it is stateless and its scope is explicit. Do not hide selection in a mutable global Singleton; doing so makes tests and per-scope family choices interfere.

## Common misuses

- Implementing creation methods that return mismatched family members while claiming the interface guarantees consistency.
- Passing Products from multiple factory scopes into the same family-sensitive operation.
- Returning or downcasting to concrete Product types in client code.
- Using a dynamic `create(kind)` method to avoid interface changes without acknowledging the loss of static Product typing.

## In the wild

Strong examples expose several sibling creation operations for one provider family:

- .NET `DbProviderFactory` creates provider-consistent connections, commands, parameters, and adapters.
- LLVM `Target` creates related target-machine and machine-code components.
- AWT `Toolkit` creates a platform family of UI peers, while also participating in a Bridge-oriented subsystem.

Some commonly named examples are adjacent rather than strict GoF Abstract Factories:

- `DocumentBuilderFactory` and `SAXParserFactory` principally create one Product kind and are better described as service-provider selection plus Factory Method.
- Python DB-API driver modules and Go `database/sql/driver.Driver` begin provider-consistent object chains with `connect()`/`Open()`, but do not expose one sibling creation operation per family member.
- A React reconciler host configuration is primarily a strategy/port containing host operations, even though some callbacks create related host objects.

## Related patterns

- **Factory Method** creates one Product through polymorphic override and often implements an AbstractFactory operation.
- **Builder** runs a multi-step process to assemble one result; Abstract Factory returns family members as requested.
- **Prototype** can implement a ConcreteFactory by cloning one prototype per Product kind.
- **Singleton** may scope a stateless ConcreteFactory, but is not part of Abstract Factory's intent.
- **Bridge** can receive its family of implementors from an Abstract Factory.
