# State

> Allow an object to alter its behavior when its internal state changes, making it appear to change class.

Also known as Objects for States.

## Intent

Use State when several operations repeatedly branch on the same evolving mode and the mode has meaningful behavior and transition rules. Each state object localizes behavior for one mode while the Context exposes the stable client interface.

Prefer an enum and one switch for a tiny machine. Prefer a transition table or state-machine library for large, data-driven graphs. Prefer Strategy when a client selects an algorithm that does not represent the context's lifecycle mode.

## Participants

- `Context` owns the current state, exposes the client API, and delegates state-dependent requests.
- `State` declares operations whose behavior varies by state.
- `ConcreteState` implements one mode's behavior.

Transition policy can be centralized in `Context`, distributed among `ConcreteState` objects, or supplied by a separate transition table. Concrete states do not have to know or construct one another.

## Structure

```text
interface State {
    insertCoin(context: Turnstile)
    pushButton(context: Turnstile)
}

class Turnstile {
    private state: State = LockedState.instance

    insertCoin() { dispatch(() => state.insertCoin(this)) }
    pushButton() { dispatch(() => state.pushButton(this)) }

    internal transitionTo(next: State) {
        // Validate the transition here when Context owns the graph.
        require(isAllowed(state, next))
        state = next
    }

    internal dispense() { /* receiver/domain action */ }

    private dispatch(action) {
        // Serialize events or lock here if callers may be concurrent.
        action()
    }
}

class LockedState implements State {
    static instance = new LockedState()
    insertCoin(context) { context.transitionTo(UnlockedState.instance) }
    pushButton(context) { /* denied; remain locked */ }
}

class UnlockedState implements State {
    static instance = new UnlockedState()
    insertCoin(context) { /* already paid */ }
    pushButton(context) {
        context.dispense()
        context.transitionTo(LockedState.instance)
    }
}
```

The example keeps transition validation in the Context while states request transitions. A design may instead let states own the graph, but should choose one visible policy rather than scattering it accidentally.

## Guardrails and trade-offs

- Rebinding the current-state reference does not make a whole transition transactional or thread-safe. Guards, actions, exit/entry hooks, failures, and the state change need one defined protocol.
- Serialize or synchronize events if the Context can be called concurrently. Define how reentrant requests are queued or rejected.
- Decide whether the state changes before or after side effects and what happens when an action fails. Preserve Context invariants on every error path.
- Keep client code from assigning arbitrary states; expose controlled events and restrict `transitionTo` to the state-machine implementation.
- Keep per-context mutable data in Context unless state instances are deliberately per-context. Shared stateless states can be immutable flyweights.
- Make the legal graph auditable with a transition table, diagram, or centralized validation even when behavior lives in state classes.
- Adding a state may still require edits to transition owners and exhaustive visitors/serializers; State localizes behavior but does not guarantee a completely open graph.

Benefits are localized mode behavior and removal of repeated flag conditionals. Costs are more types, indirect flow, and a transition graph that can become hard to see when distributed.

## Examples and relationships

The GoF TCP connection example is canonical. State-machine libraries such as XState, Spring Statemachine, Stateless, pytransitions, and looplab/fsm solve a broader problem and often use tables/statecharts rather than the exact object form.

Strategy has a similar delegation shape but represents client/configuration-selected algorithms; State reflects an evolving internal mode. Command can model transition actions. Stateless state objects can be Flyweights or shared instances.
