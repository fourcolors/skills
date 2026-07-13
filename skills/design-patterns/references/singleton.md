# Singleton

> *Ensure a class has only one instance and provide a global point of access to it.*

**Reach for it when** one logical instance must exist within a clearly defined runtime scope, callers need a well-known access point, and the implementation - not caller convention - must control creation.

## Problem

Some concepts are meaningful only once within a scope: for example, one process-local coordinator for an exclusive resource. A public constructor cannot enforce that constraint, while a bare global reference does not prevent other instances of the same class from being created.

First define the scope of "one." A process, class loader, module graph, dependency-injection container, tenant, and distributed deployment are different scopes. GoF Singleton is an in-process object-creation pattern; it does not provide cross-process uniqueness.

## Solution

Make the class control access to its instance. For an exact, non-subclassable Singleton, make the class final/sealed and its constructor private. Expose a class-level access operation that returns the controlled instance.

Initialization may be eager or lazy:

- Eager initialization is usually simpler and inherits the runtime's class/module initialization guarantees.
- Lazy initialization is useful only when startup cost or creation order matters. Use a language-provided once primitive or a proven lazy holder; do not hand-roll unsynchronized checks.

A subclassable variant needs a protected constructor and a single controlled access or registration point that chooses the concrete subtype. It cannot simultaneously rely on a private base constructor.

## Participants

- `Singleton` - owns the controlled instance, restricts construction, exposes the access operation, and implements the domain behavior.
- `Client` - obtains the instance through the access operation rather than constructing it.

## Structure

Eager, exact-type variant:

```
final class Singleton {
    private static readonly instance = new Singleton()

    private constructor() {
        // establish invariants
    }

    public static getInstance() : Singleton {
        return instance
    }

    public doWork() { /* ... */ }
}

Singleton.getInstance().doWork()
```

Lazy variant using a runtime once primitive:

```
final class LazySingleton {
    private static onceCell : OnceCell<LazySingleton>
    private constructor() { /* ... */ }

    public static getInstance() : LazySingleton {
        return onceCell.getOrInitialize(() => new LazySingleton())
    }
}
```

The exact once-initialization API is language-specific. It must publish a fully constructed object safely to concurrent callers.

## Collaboration

Clients call the access operation whenever they need the object. Eager initialization creates the instance as part of class or module initialization; lazy initialization creates it on the first successful access. Every access within the declared scope returns the same reference.

## Use when

- Exactly one logical instance is required within a named runtime scope.
- A single access point is part of the requirement, not merely a convenience.
- Creation order or lifetime must be centrally controlled.
- Callers cannot be trusted to preserve uniqueness through convention alone.

## Avoid when

- You only need to share a service or value. Construct it at the composition root and inject it explicitly.
- More than one instance may be legitimate per request, thread, tenant, test, or future deployment.
- The object is stateless; a module or namespace of functions is simpler.
- The real invariant is distributed uniqueness. Use a database constraint, lease, lock service, or leader-election protocol.
- The runtime cannot enforce the intended scope because of multiple class loaders, interpreters, realms, module copies, or processes.

## Trade-offs and guardrails

Singleton centralizes instance control and can defer expensive initialization. The cost is a global dependency with a program-wide lifetime: dependencies become hidden, substitution is harder, mutable state leaks between tests, and parallel tests may interfere.

Guard the implementation as well as the constructor:

- Use safe publication for lazy initialization; incorrect double-checked locking can expose two or partially constructed objects.
- In runtimes with reflection, serialization, deserialization, or cloning, a private constructor alone may not preserve uniqueness. Prefer platform-supported forms such as a Java single-element enum, or implement the runtime-specific serialization/clone guard.
- Define shutdown and resource ownership. A process-lifetime object that owns files, sockets, or pools still needs deterministic cleanup where the platform requires it.
- Do not store request- or user-specific data on a process-wide instance.

## Common misuses

- Turning the instance into a mutable god object used by unrelated subsystems.
- Calling `getInstance()` deep inside domain code so method signatures hide required collaborators.
- Treating a shared default object, a named registry, or a container scope as proof that no other instance can exist.
- Assuming one instance in each process means one instance across a distributed system.

## In the wild

Examples close to GoF Singleton include Java `Runtime.getRuntime()` and Bloch's single-element enum idiom. Python modules are cached per interpreter/import system, and JavaScript ES modules are evaluated per resolved module instance/realm; both are module-level ways to share one object, with scope determined by the loader.

Several APIs use related but different ideas:

- Spring's `singleton` bean scope is one instance per bean definition per container, not one instance of a class per program.
- .NET `AddSingleton` is one service instance per service-provider lifetime.
- Python `logging.getLogger(name)` is a named registry/multiton.
- Go `http.DefaultClient` and `http.DefaultServeMux`, plus Apple APIs such as `FileManager.default` and `NotificationCenter.default`, are shared defaults; callers can create alternatives.

Name these scopes explicitly rather than presenting them as interchangeable implementations of GoF Singleton.

## Related patterns

- **Abstract Factory** and a **Prototype Registry** may be singletons when their scope truly is application-wide and they are stateless or safely synchronized.
- **Builder** is usually stateful and should normally be created per construction, not made a Singleton.
- **Flyweight** shares many fine-grained objects; Singleton controls one instance.
- **Monostate/Borg** allows many instances that share state and is not GoF Singleton.
