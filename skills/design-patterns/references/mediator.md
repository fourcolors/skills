# Mediator

> Define an object that encapsulates how a set of objects interact, promoting loose coupling by keeping them from referring to one another explicitly and allowing their interaction to vary independently.

## Intent

Use Mediator when several colleagues participate in a named coordination protocol and direct peer-to-peer references create a dense dependency mesh. The mediator owns interaction rules; colleagues report events to it and receive commands from it without knowing one another.

A passive event bus, message broker, or request dispatcher is not automatically a GoF Mediator. If the hub merely forwards or broadcasts without encapsulating colleague coordination, Observer, publish-subscribe, or a dispatcher is the clearer description.

## Participants

- `Mediator` declares the typed operations or events colleagues use to communicate.
- `ConcreteMediator` knows the participating colleagues and implements their coordination rules.
- `Colleague` knows its mediator but not its peers.

## Structure

```text
sealed Event {
    GuestSelected
    SubmitRequested
}

interface Mediator {
    notify(sender: Colleague, event: Event)
}

abstract class Colleague {
    protected mediator: Mediator
    constructor(mediator) { this.mediator = mediator }
}

class GuestCheckbox extends Colleague {
    check() { mediator.notify(this, GuestSelected) }
}

class TextField extends Colleague {
    clear() { /* ... */ }
    value(): String { /* ... */ }
}

class OkButton extends Colleague {
    click() { mediator.notify(this, SubmitRequested) }
}

class DialogMediator implements Mediator {
    private guest: GuestCheckbox
    private name: TextField
    private ok: OkButton

    notify(sender, event) {
        match (sender, event):
            (guest, GuestSelected) => name.clear()
            (ok, SubmitRequested)  => submit(name.value())
            _ => rejectUnexpectedEvent(sender, event)
    }
}
```

Explicit mediator methods such as `guestSelected()` and `submitRequested()` are equally valid and often simpler than a general event union. Avoid opaque string event names.

## Guardrails and trade-offs

- Keep the mediator focused on one coherent interaction protocol. Split unrelated workflows before it becomes a god object.
- Use typed events/payloads or explicit methods, and reject impossible sender/event combinations.
- Define reentrancy. A colleague invoked by the mediator may notify it again; queue nested events or guard cycles when immediate recursion could loop or observe half-completed coordination.
- Keep colleagues from retaining direct peer references "for convenience," or the original mesh remains.
- Put domain invariants in the appropriate domain model. The mediator should coordinate participants, not absorb every participant's business behavior.
- A mediator centralizes policy but does not inherently provide transactional, ordering, durability, or distributed-delivery guarantees.
- Avoid a global mutable singleton mediator; it creates hidden action at a distance and cross-test coupling.

Benefits are independently reusable colleagues and one visible place for interaction rules. Costs are an increasingly knowledgeable coordinator, indirect flow, and a potential coupling hotspot.

## Examples and relationships

Canonical or close examples include GoF's dialog director, form/controller coordination, chat-room coordination, and the air-traffic-control tower metaphor. MediatR, Redux stores, JMS/ESBs, and event-bus modules are dispatcher, state-container, or broker analogies unless they actively encode a concrete colleague-coordination protocol.

Facade offers a one-way simplified subsystem interface; Mediator coordinates multidirectional collaboration. Observer is often the notification mechanism inside a mediator, but broadcast alone is not mediation. Command can represent requests the mediator coordinates. State fits when the apparent coordination is really one context's mode transition logic.
