# Observer

> Define a one-to-many dependency so that when one object changes state, its dependents are notified and can update.

Also known as Dependents or in-process publish-subscribe. Broker-backed messaging is a different architectural mechanism with durability and delivery semantics that Observer does not provide.

## Intent

Use Observer when one source of truth must announce changes to an open-ended set of dependents without importing their concrete types. Typical cases include model/view synchronization, UI listeners, cache invalidation, and in-process reactive updates.

Prefer a direct call for one fixed dependent. Prefer a broker when delivery must be durable, buffered, cross-process, retried, or acknowledged. Use an explicit coordinator with documented ordering and transaction semantics when all reactions must form one ordered or atomic update; Mediator alone does not provide those guarantees.

## Participants

- `Subject` stores observers and exposes subscription, unsubscription, and notification.
- `Observer` defines the narrow update operation.
- `ConcreteSubject` owns the state of interest.
- `ConcreteObserver` reconciles its own state after notification, either from a supplied payload (push) or by querying the subject (pull).

## Structure

```text
interface Observer {
    update(subject: Subject)
}

interface Subscription {
    unsubscribe()
}

interface Subject {
    attach(observer: Observer): Subscription
}

class ConcreteSubject implements Subject {
    private observers: Set<Observer> = new Set()
    private state: State

    attach(observer): Subscription {
        observers.add(observer)
        return Subscription(() => observers.remove(observer))
    }

    setState(next: State) {
        state = next
        notifyObservers()
    }

    getState(): State { return state }

    private notifyObservers() {
        // A stable snapshot permits attach/detach during callbacks.
        recipients = copyOf(observers)
        failures = []
        for each observer in recipients:
            try observer.update(this)
            catch error: failures.add(error)
        reportFailures(failures) // explicit policy; one failure does not skip later observers
    }
}

class ConcreteObserver implements Observer {
    private subject: ConcreteSubject
    private localState: State

    constructor(subject: ConcreteSubject) { this.subject = subject }

    update(changed: Subject) {
        if changed == subject:
            localState = subject.getState() // pull model
    }
}

subject = new ConcreteSubject()
observer = new ConcreteObserver(subject)
subscription = subject.attach(observer)
subject.setState(newValue)
subscription.unsubscribe()
```

Push notifications reduce queries but couple observers to a payload contract. Pull notifications keep the subject less aware of observer needs but may cause repeated or expensive queries.

## Guardrails and trade-offs

- Define callback ordering only if clients may rely on it; otherwise state explicitly that order is unspecified.
- Decide whether callbacks run synchronously or are scheduled. Never hide blocking work on a latency-sensitive notifying thread.
- Define an exception policy. Isolate and aggregate failures when every observer should get a chance to run; fail fast only when that is the declared contract.
- Iterate a snapshot or use a mutation-safe collection so reentrant subscribe/unsubscribe cannot corrupt traversal.
- Prevent feedback loops with idempotent updates, change detection, batching, or an explicit reentrancy/cycle guard.
- Return an unsubscribe handle and align subscription lifetime with owner lifetime. Weak references can help, but explicit disposal is usually easier to reason about.
- A synchronous notification is not a transaction: an observer can see intermediate state unless the subject batches mutations and publishes only after its invariants hold.
- Broadcasting is proportional to subscriber count. Avoid broad events that wake many uninterested observers.

Benefits are open-ended subscription, loose coupling to observer types, and runtime composition. Costs are implicit fan-out, lifecycle management, reentrancy, and harder tracing.

## Examples and relationships

Canonical or close examples include Java property-change and Swing/AWT listeners, DOM event listeners, Node `EventEmitter`, .NET events and `INotifyPropertyChanged`, Qt signals and slots, Cocoa notifications/KVO, Django signals, and client-go informer handlers. Reactive Streams APIs add demand and lifecycle semantics beyond the minimal GoF pattern.

Mediator centralizes coordination among colleagues; Observer broadcasts a change to dependents. Chain of Responsibility offers a request to handlers in sequence instead of broadcasting it. A Command may be executed by an observer callback.
