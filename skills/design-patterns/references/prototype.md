# Prototype

> *Specify the kinds of objects to create using a prototypical instance, and create new objects by copying this prototype.*

**Reach for it when** configured instances determine the concrete types or starting states at runtime and clients should create new objects by copying those instances rather than naming concrete classes.

## Problem

A system needs new Products while remaining independent of their concrete classes. Types or configurations may be loaded at runtime, construction may repeat expensive pure initialization, or only a small set of configured starting states may exist. A parallel factory hierarchy adds classes solely to defer instantiation.

Copying is useful only when the Product has a precise copy contract. External resources, identity, cycles, shared mutable state, and constructor invariants make naive cloning unsafe.

## Solution

Give each prototype a copy operation that creates a new object of the same concrete type. Store fully initialized prototypes directly or in a registry and ask them to clone themselves.

Define copy semantics field by field:

- Copy owned mutable state so mutation of the clone cannot change the prototype.
- Share only state that is immutable or explicitly documented as shared.
- Preserve graph topology when repeated references or cycles matter, usually through an original-to-copy map.
- Do not clone unique identities or external-resource ownership unless the API defines how a new independent resource is acquired.

The client performing repeated creation can depend only on `Prototype`; the composition code that constructs and registers the initial prototypes may still know their concrete classes.

## Participants

- `Prototype` - declares the copy operation.
- `ConcretePrototype` - implements the copy contract for its fields and graph relationships.
- `Client` - creates Products by cloning a supplied Prototype.
- `PrototypeRegistry` - optional map of configured prototypes keyed by name.

## Structure

```
interface Prototype {
    clone() : Prototype
}

class ReportTemplate implements Prototype {
    field title : String                         // immutable value
    field sections : List<MutableSection>       // owned mutable state
    field catalog : ImmutableCatalog             // explicitly shared

    constructor(title, sections, catalog) {
        validate(title, sections)
        this.title = title
        this.sections = sections
        this.catalog = catalog
    }

    clone() : ReportTemplate {
        copiedSections = sections.map(section => section.copy())
        return new ReportTemplate(title, copiedSections, catalog)
    }
}

class PrototypeRegistry {
    private prototypes : Map<String, Prototype> = new Map()

    register(key, prototype : Prototype) {
        requireNonEmpty(key)
        requireNonNull(prototype)
        prototypes[key] = prototype
    }

    create(key) : Prototype {
        prototype = prototypes.get(key)
        if (prototype == null) {
            throw UnknownPrototype(key)
        }
        return prototype.clone()
    }
}
```

This example gives clones independent `sections` while intentionally sharing immutable `catalog`. It does not promise that every reference in every Prototype must be deep-copied.

## Collaboration

Composition code builds and registers configured prototypes. A client selects one and calls `clone()`. The ConcretePrototype creates a new object according to its documented ownership and aliasing rules. The clone may then be mutated independently only for state that the copy contract defines as independently owned.

## Use when

- Runtime configuration or plugin loading selects the available concrete Product types.
- A registry of a few configured starting states is clearer than repeatedly configuring new instances.
- Copying expensive computed state is cheaper than recomputing it and the state is safe to copy or share immutably.
- A cloneable Composite or Decorator structure should be reproduced while preserving its intended topology.
- You want to avoid a Creator hierarchy that parallels the Product hierarchy.

## Avoid when

- Objects are cheap and their constructors or copy constructors are clearer.
- Objects own sockets, file handles, database connections, native buffers, locks, or other unique resources.
- Stable identity must not be duplicated.
- Correct copying of cycles, callbacks, closures, weak references, or non-copyable members is unclear.
- Normal construction performs validation or dependency injection that copying would bypass.
- The language's ordinary value copy already has exactly the required semantics.

In Go, struct assignment is sufficient only when every field's value/reference behavior is appropriate. Slices, maps, pointers, interfaces, and reference-bearing fields can still alias mutable state.

## Trade-offs and guardrails

Prototype decouples repeated creation from concrete classes, permits runtime registration, and can reuse expensive configuration. The cost is a copy contract that every ConcretePrototype must implement and test.

Test at least:

- the clone and original are distinct objects;
- owned mutable children do not alias;
- intentional shared immutable state remains shared if desired;
- repeated references and cycles retain the required topology;
- identity, resource ownership, and constructor invariants remain valid;
- registry lookup fails explicitly for unknown keys.

Prefer a type-specific `copy()`/copy constructor over a generic clone interface when callers need stronger return types or explicit semantics.

## Common misuses

- Treating "deep copy" as a universal rule instead of defining ownership per field.
- Relying on Java's default shallow `Object.clone()` or implementing `Cloneable` without a usable public clone contract.
- Cloning a Singleton or identity-bearing entity.
- Copying two owners of one external resource and causing double-close or aliasing failures.
- Confusing Spring's `prototype` bean scope - fresh construction per lookup - with GoF Prototype cloning.

## In the wild

Prototype appears in editors, drawing tools, games, and plugin systems that keep configured templates and create new objects by copying them. Generic copy facilities can implement part of the pattern but are not themselves proof that a Prototype design is present:

- Java `Cloneable`/`Object.clone()` is a low-level, usually shallow mechanism with a difficult contract; explicit copy constructors or copy methods are often safer.
- .NET `ICloneable` does not specify shallow versus deep behavior and is discouraged for public APIs; type-specific copy operations are clearer.
- Python `copy.copy()` and `copy.deepcopy()` are customizable copying mechanisms that may bypass `__init__`.
- JavaScript `structuredClone()` handles a defined set of structured-cloneable values but does not preserve arbitrary custom prototype chains, functions, private fields, or property descriptors.
- Go `proto.Clone()` and Lodash `cloneDeep()` are domain/general copy utilities; a registry of configured source instances is what supplies the Prototype pattern's creation policy.

## Related patterns

- **Factory Method** defers creation through polymorphic Creator code; Prototype copies a configured instance.
- **Abstract Factory** may keep one prototype per Product kind and return clones as a family.
- **Composite** and **Decorator** structures often need graph-aware copy logic.
- **Memento** captures state for later restoration; Prototype creates a new object.
- A Prototype Registry may be a scoped **Singleton**, but prototypes themselves exist to produce multiple copies.
