# Memento

> Without violating encapsulation, capture and externalize an object's internal state so the object can later be restored to that state.

Also known as Token.

## Intent

Use Memento when a caretaker must retain undo, rollback, or checkpoint state without learning the originator's private representation. The originator creates and interprets snapshots; the caretaker stores opaque tokens and manages history lifetime.

Prefer ordinary immutable values when state is already public and immutable. Prefer diffs, inverse commands, copy-on-write, or persistent data structures when full snapshots are too large. Use a versioned persistence or event-sourcing design when durable cross-process recovery is the real requirement.

## Participants

- `Originator` creates snapshots of its state and restores itself from snapshots it created.
- `Memento` stores snapshot state with privileged access for its originator and an opaque interface for caretakers. It should normally be immutable.
- `Caretaker` stores, returns, and prunes opaque mementos without inspecting their contents.

The GoF "wide" interface means privileged access to the state needed for restoration; it does not require a public setter or a mutable memento. The "narrow" interface exposes only an opaque token to the caretaker.

## Structure

```text
interface OpaqueMemento {}

class Originator {
    private state: State
    private instanceId: Id = newId()
    private snapshotVersion: integer = 1

    // Private/nested: only this originator implementation can inspect it.
    private immutable class Snapshot implements OpaqueMemento {
        ownerId: Id
        version: integer
        savedState: State
    }

    save(): OpaqueMemento {
        return new Snapshot(
            ownerId = instanceId,
            version = snapshotVersion,
            savedState = deepCopy(state))
    }

    restore(token: OpaqueMemento): Result {
        if token is not Snapshot: return InvalidMemento
        if token.ownerId != instanceId: return WrongOriginator
        if token.version != snapshotVersion: return UnsupportedVersion

        // Copy again so later originator mutation cannot alter the snapshot.
        state = deepCopy(token.savedState)
        return Restored
    }
}

class Caretaker {
    private originator: Originator
    private history: Stack<OpaqueMemento> = []

    backup() { history.push(originator.save()) }

    undo(): boolean {
        if history.isEmpty(): return false
        token = history.pop()
        if originator.restore(token) is not Restored:
            history.push(token) // do not silently lose a failed restore point
            return false
        return true
    }
}
```

Language mechanisms differ: nested/private types, friends, package privacy, closures, or module boundaries can enforce the wide/narrow split. Comments alone are not access control in production code.

## Guardrails and trade-offs

- Preserve snapshot isolation. Deep copying is one technique; immutable persistent values, serialization copies, and copy-on-write are also valid.
- Copy or otherwise isolate on restore as well as save. Assigning a mutable snapshot reference back into the originator corrupts repeatable undo/redo.
- Validate memento type, originator provenance, and schema/version where tokens can be mixed or retained across upgrades.
- Define failure and empty-history behavior. Never pop and discard the only restore point before knowing restoration succeeded.
- Bound and prune history by count and memory cost. Caretakers cannot infer cost from an opaque interface unless the originator supplies safe metadata or policy.
- Treat snapshots as sensitive data when state contains credentials or personal information; minimize retention and encrypt durable copies.
- Avoid exposing getters/setters that let caretakers inspect or mutate snapshot contents.

Benefits are restoration without leaking representation and separation of history management from domain behavior. Costs are copy/storage overhead, versioning, lifecycle policy, and awkward access-control enforcement in some languages.

## Examples and relationships

Java Swing `StateEdit`/`StateEditable` with `UndoManager` is a close library example. Editor snapshots, game checkpoints, and transactional edit buffers can implement Memento when the caretaker holds an opaque originator-created token.

Redux history arrays, .NET `IEditableObject`, Python pickle, and gob-encoded snapshots demonstrate related snapshot/rollback or serialization techniques, but do not necessarily preserve the canonical originator-wide/caretaker-narrow boundary. Serialization alone is not Memento.

Command often uses a Memento for undo. Prototype creates a new object for general use, while Memento preserves state for restoring the same originator. Iterator state can be captured in a memento for resumability.
