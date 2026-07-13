# Command

> Encapsulate a request as an object so clients can parameterize invokers, queue or record requests, and support reversible operations where the domain permits them.

Also known as Action or Transaction in the original GoF catalog. A Command object does not itself provide database transaction semantics.

## Intent

Use Command when the issuer of a request should not depend on the object that performs it, or when requests must be represented as values for scheduling, history, composition, or explicit retry. A callback is usually enough when no identity, metadata, serialization, composition, or undo behavior is required.

## Participants

- `Command` declares execution.
- `UndoableCommand` adds restoration for commands whose effects can be reversed safely.
- `ConcreteCommand` stores request arguments and usually delegates domain work to a receiver. A small self-contained command is also valid; delegation is not mandatory.
- `Receiver` owns the domain operation when there is a natural target object.
- `Invoker` triggers commands and may maintain a queue or history.
- `Client` creates the command, binds its receiver/arguments, and supplies it to the invoker.

## Structure

```text
interface Command {
    execute()
}

interface UndoableCommand extends Command {
    undo(): boolean // reports whether restoration succeeded
}

class Light {
    private on: boolean
    isOn(): boolean { return on }
    turnOn()  { on = true }
    turnOff() { on = false }
}

class TurnOnLightCommand implements UndoableCommand {
    private receiver: Light
    private previous: boolean
    private executed: boolean = false

    constructor(light) { receiver = light }

    execute() {
        require(!executed)
        previous = receiver.isOn() // capture the actual pre-state
        receiver.turnOn()
        executed = true
    }

    undo(): boolean {
        require(executed)
        if previous then receiver.turnOn() else receiver.turnOff()
        executed = false
        return true // restoration succeeded
    }
}

class Invoker {
    private history: Stack<UndoableCommand> = []

    submit(command: Command) {
        command.execute()
        if command is UndoableCommand:
            history.push(command) // only after successful execution
    }

    undoLast(): boolean {
        if history.isEmpty() return false
        command = history.peek()
        if not command.undo(): // undo reports success/failure
            return false       // retain the entry so the recovery point survives a failed undo
        history.pop()          // remove from history only after a successful undo
        return true
    }
}
```

Use a new command instance per independently undoable invocation unless the implementation deliberately resets and snapshots all invocation state.

## Durability, remote execution, and composition

An in-memory command holding a receiver reference is not automatically serializable, durable, remotely executable, idempotent, or safe to replay. Those capabilities require an explicit protocol:

- persist a versioned request DTO containing stable receiver identity and arguments, not an object pointer;
- resolve and authorize the receiver at the destination;
- record durably before acknowledging work when crash recovery depends on replay;
- define idempotency keys, deduplication, retry, timeout, and schema-evolution behavior;
- never replay non-idempotent external effects blindly.

A macro command composes requests but is not automatically atomic. Specify fail-fast versus best-effort behavior and implement rollback, compensating actions, or a real transactional resource when partial execution is unacceptable. Payments and external I/O usually require domain compensation rather than a guessed inverse.

## Guardrails and trade-offs

- Capture the exact pre-state before execution when undo depends on it; do not infer an inverse after the fact.
- Define whether undo can itself fail and how history behaves after partial failure.
- Keep domain invariants in the receiver/domain model when one exists, but allow command-specific orchestration and validation in the command. Logic in `execute()` is not inherently a misuse.
- Do not expose receiver internals through the invoker.
- Avoid mutable command reuse in history, queues, or concurrent execution.
- Treat queries separately when callers need an immediate value and no request-object lifecycle.

Benefits are decoupled invocation and first-class requests. Costs include more objects, indirect control flow, careful history semantics, and substantial extra engineering for durability or distributed execution.

## Examples and relationships

Close examples include Java `Runnable`/`Callable` jobs, Swing `Action`, WPF `ICommand`, queued worker jobs, and explicit editor operations with undo state. Redux actions and message DTOs are command-like request representations, but they do not themselves implement `execute()` or bind a receiver.

Composite builds macro commands. Memento can preserve receiver state for undo. Chain of Responsibility chooses among possible handlers, whereas Command usually represents a request independently of handler selection. Strategy represents a replaceable algorithm rather than a request with its own lifecycle.
