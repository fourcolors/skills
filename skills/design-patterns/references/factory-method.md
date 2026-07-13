# Factory Method

> *Define an interface for creating an object, but let subclasses decide which class to instantiate. Factory Method lets a class defer instantiation to subclasses.*

**Also known as:** Virtual Constructor

**Reach for it when** a Creator owns reusable behavior but needs an overridable creation hook so subclasses or implementations can supply the concrete Product.

## Problem

A class or framework knows when a Product is needed but cannot know every application-specific Product class in advance. Hard-coding `new ConcreteProduct()` couples the reusable behavior to one implementation and forces edits when an extension supplies another.

## Solution

Declare an overridable factory method that returns the abstract Product type. Operations on the Creator call that method and use the result only through the Product interface. A `ConcreteCreator` overrides the factory method to return its `ConcreteProduct`.

The method may be abstract or may provide a useful default. A parameterized factory method is also possible, but the defining GoF mechanism remains polymorphic creation supplied by a subclass or implementation - not merely any static method that returns an object.

## Participants

- `Product` - interface or abstract type used by Creator code.
- `ConcreteProduct` - a Product implementation returned by a particular factory method.
- `Creator` - declares the factory method and usually contains behavior that obtains and uses Products through it.
- `ConcreteCreator` - overrides the factory method to choose a ConcreteProduct.

## Structure

```
interface Product {
    operation()
}

class ConcreteProductA implements Product {
    operation() { /* A behavior */ }
}

class ConcreteProductB implements Product {
    operation() { /* B behavior */ }
}

abstract class Creator {
    protected abstract createProduct() : Product

    public doWork() {
        product = this.createProduct()
        product.operation()
    }
}

class ConcreteCreatorA extends Creator {
    protected createProduct() : Product {
        return new ConcreteProductA()
    }
}

class ConcreteCreatorB extends Creator {
    protected createProduct() : Product {
        return new ConcreteProductB()
    }
}

Creator creator = new ConcreteCreatorA()
creator.doWork()
```

## Collaboration

The client chooses a Creator implementation. Reusable Creator behavior calls the factory method at the point creation is needed. Dynamic dispatch selects the ConcreteProduct, after which the Creator works only through `Product`.

Do not call an overridable factory method from a base-class constructor unless the language explicitly makes that safe: dispatch may reach subclass code before subclass fields and invariants are initialized.

## Use when

- A framework must instantiate application-defined Product types unknown when the framework is written.
- Subclasses need a documented hook to substitute a Product without replacing the surrounding algorithm.
- Shared Creator behavior is stable while the concrete Product varies.
- Product construction is intentionally an inheritance-based extension point.

## Avoid when

- The Product never varies; use a constructor.
- The choice is a small runtime lookup and no Creator hierarchy or reusable Creator behavior exists; use a function, registry, or Simple Factory.
- A construction closure or Product instance can be injected more directly.
- Several related Product kinds must vary as a family; use Abstract Factory.

## Trade-offs and guardrails

Factory Method isolates concrete Product names from reusable Creator code and gives framework users a narrow extension hook. It can also multiply parallel Creator/Product subclasses and make the constructed type less obvious at the call site.

A parameterized factory method can still return the same abstract `Product` contract and may dispatch through a registry rather than a conditional. Its trade-off is that a non-generic key often cannot express the requested concrete subtype statically, and a central switch or registry can become a new extension bottleneck.

Keep Creator code polymorphic. Downcasting the returned Product or branching on its runtime type defeats the abstraction.

## Common misuses

- Calling every object-returning helper a Factory Method. A static `create(kind)` switch is normally Simple Factory, not the GoF pattern.
- Invoking the hook during base construction and observing uninitialized subclass state.
- Letting a parameterized variant become a god factory edited for every new Product.
- Adding a Creator hierarchy solely to avoid writing `new`, without a real extension point.

## In the wild

Examples that preserve the polymorphic creation hook include:

- Java `Collection.iterator()`, whose implementations return their concrete iterators.
- Java `URLStreamHandler.openConnection()` and JDBC `Connection.createStatement()` implementations.
- .NET `DbConnection.CreateCommand()`, backed by provider-specific creation.
- Django class-based-view hooks such as `get_form_class()`/`get_form()` when subclasses override the supplied form.
- Qt virtual creation hooks such as `createEditor()`.

Adjacent creation idioms should be named separately: Java `NumberFormat.getInstance()` and `Calendar.getInstance()` are static/parameterized factories; Go `image.Decode` plus `RegisterFormat` is registry dispatch; `React.createElement` is a creation helper; and Python `@classmethod` alternate constructors are virtual-constructor-like only when subclass dispatch is the relevant variation.

## Related patterns

- **Template Method** often calls a Factory Method as one overridable step.
- **Abstract Factory** composes an object exposing several creation operations for a Product family; it is often implemented with one factory method per Product kind.
- **Prototype** defers creation by copying a configured instance rather than subclassing a Creator.
- **Builder** performs a multi-step construction process rather than one polymorphic creation call.
