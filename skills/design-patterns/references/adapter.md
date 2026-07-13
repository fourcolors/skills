# Adapter

> Convert the interface of an existing class into another interface clients expect, so classes with incompatible interfaces can work together.

**Also known as:** Wrapper

**Reach for it when** useful existing code has the wrong interface for a client and changing either side is impractical or undesirable.

## Problem

A client is written against a domain-specific `Target`, but an existing `Adaptee` exposes different names, argument shapes, data formats, return values, or error conventions. Teaching every client about the incompatible API spreads translation logic and couples the domain to a third-party or legacy type.

## Solution

Introduce an `Adapter` that implements `Target`, holds an `Adaptee`, and translates each request in both directions. The adaptee remains unchanged and clients depend only on the target contract.

An object adapter uses composition and is normally the more flexible form: it can wrap an adaptee or any compatible subtype. A class adapter inherits the adaptee while conforming to the target; this requires multiple inheritance when both are classes, or ordinary single inheritance when the target is an interface. A class adapter is bound to the inherited adaptee type.

## Participants

- `Target` - the interface the client expects.
- `Client` - collaborates only with `Target`.
- `Adaptee` - useful existing code with an incompatible interface.
- `Adapter` - implements `Target` and translates to and from the adaptee contract.

## Structure

```text
interface Target {
    request(input): Output
}

class Adaptee {
    specificRequest(encodedInput): LegacyResult
}

class Adapter implements Target {
    field adaptee: Adaptee

    constructor(adaptee) {
        this.adaptee = adaptee
    }

    request(input): Output {
        encoded = encodeForAdaptee(input)
        try {
            legacyResult = adaptee.specificRequest(encoded)
            return decodeForTarget(legacyResult)
        } catch legacyError {
            throw translateError(legacyError)
        }
    }
}

function clientCode(target: Target) {
    return target.request(domainInput)
}

clientCode(new Adapter(new Adaptee()))
```

## Collaboration

The client invokes the adapter through `Target`. The adapter converts the request, delegates to the adaptee, and converts the result and failures back into the semantics promised by `Target`. The client never needs adaptee-specific types.

## Use when

- Reusing a third-party or legacy class whose interface does not match the domain.
- Supporting old and new APIs behind one migration contract.
- Adapting several compatible adaptee subclasses through one object adapter.
- Making a legacy implementation conform to an application-owned Strategy, repository, transport, or service interface.

## Avoid when

- You own both interfaces and can make them agree directly.
- The interfaces already match; delegation would add no translation.
- You need the same interface with optional added responsibilities; use Decorator.
- You need a same-interface stand-in that controls access or lifecycle; use Proxy.
- Translation would reimplement most of the target's business behavior; build a new component instead.

## Guardrails and trade-offs

- Preserve semantics, not just method shapes. Document lossy conversions, units, ordering, nullability, precision, and error mapping.
- Do not leak adaptee-specific types, exceptions, handles, or lifecycle rules through `Target`.
- Make ownership explicit: state whether closing the adapter closes the adaptee and whether either can be shared safely.
- Be cautious when translating synchronous to asynchronous behavior, streaming to buffering, or one transaction model to another; these may not be substitutable contracts.
- Keep business rules, caching, and unrelated validation out of the adapter. Its responsibility is compatibility.
- Prefer one focused adapter per coherent mismatch over a god adapter spanning unrelated systems.

The benefit is reuse with translation centralized in one testable place. The costs are an extra object, indirect calls, and the risk that a seemingly simple conversion silently drops important semantics.

## In the wild

- Java `Arrays.asList` presents an array through a fixed-size `List` view.
- Java `InputStreamReader` and `OutputStreamWriter` bridge byte-stream and character-stream interfaces.
- Java JAXB `XmlAdapter` converts between a bound type and its XML value representation.
- Python `io.TextIOWrapper` presents a text interface over a buffered binary stream.
- Go `http.HandlerFunc` gives a function value the `http.Handler` interface.
- C++ standard container adapters such as `std::stack` and `std::queue` expose a constrained interface over an underlying container.

Named "adapters" in transport or ORM libraries are not automatically GoF Adapter; verify that an object actually converts an incompatible adaptee into a client-expected target interface.

## Related patterns

- **Bridge** is designed around two independently varying dimensions; Adapter reconciles an already incompatible interface.
- **Decorator** preserves the component interface and adds responsibilities.
- **Proxy** preserves the subject interface and controls access or lifecycle.
- **Facade** offers a simpler entry point over a subsystem rather than adapting one object to a required target.
