# Decorator

> Attach additional responsibilities to an object dynamically, as a flexible alternative to subclassing for extending functionality.

**Also known as:** Wrapper

**Reach for it when** optional, orthogonal responsibilities must be composed around individual objects while those objects remain usable through the same component contract.

## Problem

Inheritance fixes behavior in a class hierarchy and creates a subclass for every useful feature combination. It also applies a choice to every instance of that subclass. You instead need to add or remove responsibilities per object and compose them in different, sometimes order-sensitive combinations.

## Solution

Define a `Component` interface shared by the core object and its decorators. A decorator implements `Component`, holds another `Component`, and delegates while adding work before or after the call. Because a decorator is itself a component, decorators can form a chain terminating in a `ConcreteComponent`.

## Participants

- `Component` - the contract shared by core objects and wrappers.
- `ConcreteComponent` - the base behavior at the end of a chain.
- `Decorator` - implements `Component`, stores a wrapped component, and delegates by default.
- `ConcreteDecorator` - adds one responsibility while retaining the component contract.
- `Client` - composes and uses the chain through `Component`.

## Structure

```text
interface Component {
    operation(input): Result
}

class ConcreteComponent implements Component {
    operation(input): Result {
        return coreBehavior(input)
    }
}

abstract class Decorator implements Component {
    protected field wrapped: Component

    constructor(wrapped) {
        require(wrapped != this)
        this.wrapped = wrapped
    }

    operation(input): Result {
        return wrapped.operation(input)
    }
}

class ConcreteDecorator extends Decorator {
    operation(input): Result {
        token = before(input)
        try {
            result = wrapped.operation(input)
            return augmentSuccessfulResult(result)
        } finally {
            // Required cleanup belongs in finally. Omit when no cleanup exists.
            cleanup(token)
        }
    }
}

component: Component =
    new ConcreteDecorator(new ConcreteComponent())
component.operation(input)
```

## Collaboration

The client calls the outermost component. Each decorator normally performs its concern and delegates inward; results and post-processing unwind outward. Wrapping order is observable when responsibilities are not commutative.

## Use when

- Adding responsibilities to selected objects without changing other instances.
- Combining orthogonal features such as buffering, compression, encryption, logging, tracing, or result transformation.
- Avoiding a subclass for every feature combination.
- Extending a final, sealed, third-party, or otherwise unavailable implementation through its interface.

## Avoid when

- The interface itself must change; use Adapter.
- The intent is access control, lazy creation, remoting, or lifecycle management; use Proxy.
- The concern belongs to every instance and a simple base implementation or policy is clearer.
- The component interface is so wide that every decorator becomes brittle forwarding boilerplate.
- Callers require concrete-type checks or reference identity through the wrapper.

## Guardrails and trade-offs

- Keep the public component contract intact. New public methods on an inner decorator disappear behind outer decorators.
- Treat ordering as configuration: document it and test important permutations.
- Prevent self-wrapping and accidental cycles.
- If a decorator acquires a lock, transaction, stream, span, or other resource, release it in `finally`. Define whether `close` or disposal propagates inward and ensure it happens exactly once.
- Do not share a stateful decorator across unrelated component chains unless its state is deliberately concurrent and shared.
- Interface evolution affects every decorator; use forwarding helpers or language delegation carefully.
- A wrapper that sometimes suppresses delegation may overlap another pattern. For example, a cache hit controls access to the underlying subject and is commonly Proxy by intent; do not rely on shape alone to classify it.

Decorators avoid subclass explosion and keep concerns small and independently testable. They add object count, call depth, order sensitivity, lifecycle complexity, and less transparent debugging and identity behavior.

## In the wild

- Java I/O filter streams such as `BufferedInputStream` and `DataInputStream` wrap the `InputStream` contract.
- .NET `BufferedStream`, `GZipStream`, and `CryptoStream` compose over `Stream`.
- Go wrappers such as `bufio.Reader`, `gzip.Reader`, and `io.LimitReader` participate in the `io.Reader` contract.
- Python `io.BufferedReader` and `gzip.GzipFile` expose file-like interfaces around another stream.

React higher-order components are a type-level wrapper analogy, not a direct object Decorator: they return a new component type and may inject or change props. Treat them as Decorator only when their contract and intent actually match.

## Related patterns

- **Adapter** changes an interface; Decorator preserves it.
- **Proxy** is also substitutable but primarily controls access, location, or lifecycle.
- **Composite** recursively contains many components; a Decorator wraps one.
- **Chain of Responsibility** may stop or reroute a request; a Decorator normally delegates as part of composing one operation.
