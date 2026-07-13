# Proxy

> Provide a surrogate or placeholder for another object to control access to it.

**Also known as:** Surrogate

**Reach for it when** clients need a stand-in with the same subject contract, while access, location, creation, or lifecycle must be controlled separately from the real subject.

## Problem

The real object may be expensive to create, live in another address space, require authorization, or need lifecycle bookkeeping. Putting those concerns in every client duplicates policy; putting all of them in the real subject mixes infrastructure with its primary responsibility.

## Solution

Define a `Subject` contract shared by `RealSubject` and `Proxy`. The proxy decides whether, when, and how to forward. "Same interface" means contract-level substitutability, not identical cost, latency, failure, consistency, equality, or identity semantics.

Common forms are:

- **Remote proxy** - a local representative that marshals requests to another address space.
- **Virtual proxy** - creates or loads an expensive subject on demand.
- **Protection proxy** - authorizes each request before forwarding.
- **Smart reference** - manages ownership or lifecycle, such as reference counting, locking, or first-use persistence loading.

## Participants

- `Subject` - the client-facing contract shared by proxy and real subject.
- `RealSubject` - performs the domain behavior.
- `Proxy` - controls access and may manage location, creation, or lifetime.
- `Client` - depends on `Subject` while respecting its documented operational semantics.

## Structure

Keep different proxy concerns separate. A protection proxy should obtain caller identity from trusted per-request context rather than mutable shared proxy state:

```text
interface Subject {
    request(context, input): Result
}

class RealSubject implements Subject {
    request(context, input): Result {
        return doRealWork(input)
    }
}

class ProtectionProxy implements Subject {
    field subject: Subject
    field authorizer: Authorizer

    constructor(subject, authorizer) {
        this.subject = subject
        this.authorizer = authorizer
    }

    request(context, input): Result {
        principal = context.authenticatedPrincipal
        if not authorizer.allows(principal, "request", input) {
            throw AccessDenied
        }
        return subject.request(context, input)
    }
}
```

A virtual proxy needs an atomic or locked once-initialization mechanism when shared concurrently:

```text
class VirtualProxy implements Subject {
    field subjectOnce: OnceCell<Subject>
    field loader: () -> Subject

    request(context, input): Result {
        subject = subjectOnce.getOrInitialize(loader)
        return subject.request(context, input)
    }
}
```

## Collaboration

The client calls `Subject`. A protection proxy may reject the request; a virtual proxy may initialize the subject; a remote proxy serializes and transports it; a smart reference performs lifecycle work. If forwarding occurs, the real subject executes and the proxy returns or translates the result according to the documented contract.

## Use when

- A local object represents a remote service or process.
- Expensive creation or loading should happen only on first use.
- Authorization or capability checks must be centralized and cannot be bypassed.
- Ownership, copy-on-write, locking, or persistent-object loading belongs outside the real subject.
- Existing callers and the real subject should continue to depend on one client-facing contract.

## Avoid when

- The intent is to add composable responsibilities; use Decorator.
- The client needs a different interface; use Adapter.
- A subsystem needs a simpler high-level entry point; use Facade.
- The proxy must violate the subject contract to work.
- There is no meaningful access, remoting, creation, or lifecycle concern.

## Guardrails and trade-offs

- Never trust caller identity supplied as ordinary mutable data. Authenticate at the boundary and pass a trusted context or capability per request.
- Make lazy initialization atomic and define failure behavior: retry initialization deliberately or memoize the failure.
- Put mandatory cleanup in `finally`. A proxy that acquires a lock, lease, span, or active-call slot must release it even when the subject throws.
- Ownership reference counts change when references are acquired, copied, released, or destroyed - not before and after each subject method. An in-flight call counter is a different mechanism.
- Remote proxies must expose or propagate deadlines, cancellation, transport failures, and observability. A local-looking method does not make a network call local or reliable.
- Retry only safe/idempotent remote operations, with a budget, backoff, and deduplication where necessary.
- Ensure protection proxies never expose a direct unchecked reference to the real subject.
- Define equality, identity, serialization, and unwrapping behavior. Deep proxy chains make all four harder to reason about.

The benefit is centralized, substitutable access control or lifecycle management. The costs are indirection, hidden latency or I/O, interface synchronization, and the possibility that local syntax obscures remote or lazy failure modes.

## In the wild

- Java RMI stubs are remote proxies; Hibernate lazy-loading proxies are virtual proxies.
- Java `java.lang.reflect.Proxy` and Spring AOP can generate protection, transaction, or lifecycle proxies around interfaces.
- gRPC client stubs are remote proxies with an explicit RPC failure model.
- Python Werkzeug `LocalProxy` resolves a context-local object behind a stand-in.
- .NET `DispatchProxy`, WCF channel proxies, and EF lazy-loading proxies implement proxy roles.
- JavaScript `Proxy` is a language interception mechanism that can implement GoF Proxy, but use of that mechanism - such as reactivity tracking - is not automatically this pattern.

## Related patterns

- **Decorator** has a similar shape but adds composable responsibilities rather than primarily controlling access or lifecycle.
- **Adapter** changes the interface; Proxy preserves the subject contract.
- **Facade** presents a new higher-level interface over a subsystem.
- **Factory Method** or **Abstract Factory** can hide whether a client receives a proxy or real subject.
