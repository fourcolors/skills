# Chain of Responsibility

> Avoid coupling a request's sender to its receiver by giving more than one object a chance to handle it; chain the candidates and pass the request until one handles it.

## Intent

Use canonical Chain of Responsibility when exactly which receiver should handle a request is not known in advance and candidates form a configurable sequence or natural containment hierarchy. The sender talks only to the chain's entry point; each handler either claims the request or forwards it.

Prefer a direct call or dispatch table when the receiver set is fixed and obvious. Prefer Observer when every subscriber should react. Middleware pipelines are a related variant, described separately below, because several steps may participate in one request.

## Participants

- `Handler` declares request handling and, commonly, successor configuration.
- `ConcreteHandler` claims requests for which it is responsible and forwards the rest.
- `Client` assembles the chain and sends a request to its head.

## Structure

```text
interface Handler {
    handle(request: Request): Result<Handled, Unhandled>
}

abstract class BaseHandler implements Handler {
    private successor: Handler? = none

    setSuccessor(next: Handler) {
        require(next != this)
        require(!wouldCreateCycle(this, next))
        successor = next
    }

    protected forward(request): Result<Handled, Unhandled> {
        if successor is none: return Unhandled
        return successor.handle(request)
    }
}

class HandlerA extends BaseHandler {
    handle(request) {
        if canHandle(request):
            process(request)
            return Handled
        return forward(request)
    }
}

class HandlerB extends BaseHandler {
    handle(request) {
        if canHandle(request):
            process(request)
            return Handled
        return forward(request)
    }
}

a = new HandlerA()
b = new HandlerB()
a.setSuccessor(b)
result = a.handle(request)
if result is Unhandled: reportNoHandler(request)
```

Returning an explicit result prevents unmatched requests from disappearing silently. A catch-all tail is another valid policy when every request must be handled.

## Middleware and pipeline variants

Servlet filters, ASP.NET/Express/Koa middleware, .NET `DelegatingHandler`, and similar pipelines use the same linked-handler shape but not always canonical first-match semantics. A step may act before and after calling `next`, and multiple steps may participate. Treat these as pipeline-style Chain of Responsibility variants and specify:

- whether a handler may short-circuit;
- whether forwarding is mandatory, optional, or forbidden after handling;
- ordering and before/after unwinding rules;
- how errors, cancellation, and partial side effects propagate.

Do not distinguish Decorator by claiming it "always forwards." The structural similarity is strong; the intent differs. Decorator adds responsibilities to one component interface, while Chain of Responsibility chooses or sequences request handlers.

## Guardrails and trade-offs

- Validate runtime wiring for self-links and cycles, or build an immutable chain once. A cycle otherwise causes unbounded recursion/iteration.
- Define unmatched-request behavior; never let security-sensitive authorization or validation requests fall off the tail as implicit success.
- Document order when it affects correctness. Reordering authentication, rate limiting, caching, or mutation can change semantics.
- Cap chain length or expose tracing on hot paths and in dynamically assembled systems.
- Test realistic chain compositions in addition to isolated handlers.
- Keep successor references abstract and wiring outside concrete handler constructors.
- Avoid one "god handler" that claims almost everything and leaves the chain decorative.

Benefits are sender/receiver decoupling and runtime composition. Costs are linear dispatch, implicit control flow, ordering hazards, and the possibility of no receiver.

## Examples and relationships

Canonical or close examples include GoF context-sensitive help bubbling through UI containment, responder chains, approval/escalation chains, and Apache Commons Chain commands that stop propagation by result. DOM propagation with consumption is a useful analogy.

Middleware stacks and logging propagation are pipeline/broadcasting variants, not evidence that canonical CoR always invokes every handler. Command can reify the request being routed. Composite parent links often provide the successor path. Observer broadcasts; Mediator centralizes routing policy in one hub.
