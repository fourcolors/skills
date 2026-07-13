# Iterator

> Provide sequential access to the elements of an aggregate without exposing its underlying representation.

Also known as Cursor.

## Intent

Use Iterator when clients need a uniform traversal protocol across collections whose representation should remain private, or when each traversal needs independent position and ordering state. Implement the language's native iteration protocol instead of inventing a parallel hierarchy when one exists.

Iterator provides traversal, not random access, bulk operations, set algebra, or automatic parallelism.

## Participants

- `Iterator` defines advancement and current-element access.
- `ConcreteIterator` tracks traversal state and understands one aggregate representation.
- `Aggregate` creates an iterator without exposing storage.
- `ConcreteAggregate` returns the matching concrete iterator.
- `Client` traverses through the iterator interface.

## Structure

```text
interface Iterator<Element> {
    first()
    next()
    isDone(): boolean
    current(): Element
}

interface Aggregate<Element> {
    createIterator(): Iterator<Element>
}

class ConcreteAggregate implements Aggregate<Element> {
    private items: Element[]

    createIterator(): Iterator<Element> {
        return new ConcreteIterator(this)
    }

    // Available only to the matching iterator, not to general clients.
    internal count(): integer { return items.length }
    internal itemAt(index): Element { return items[index] }
}

class ConcreteIterator implements Iterator<Element> {
    private aggregate: ConcreteAggregate
    private cursor: integer = 0

    constructor(aggregate) { this.aggregate = aggregate }
    first() { cursor = 0 }
    next() { require(!isDone()); cursor += 1 }
    isDone(): boolean { return cursor >= aggregate.count() }
    current(): Element {
        require(!isDone())
        return aggregate.itemAt(cursor)
    }
}

iterator = aggregate.createIterator()
for (iterator.first(); !iterator.isDone(); iterator.next()):
    use(iterator.current())
```

Many native protocols combine `next` and `current`, returning an optional/result or throwing a documented end-of-sequence exception. That design is equally valid.

## Guardrails and trade-offs

- "Concurrent traversals" means multiple independent cursors can coexist. It does not imply thread-safe traversal or mutation.
- Define a mutation policy: fail fast on structural version changes, snapshot, lock, or explicitly document weak consistency.
- Keep aggregate access used by the concrete iterator private, package-internal, nested, or otherwise unavailable to normal clients.
- State end-of-sequence behavior precisely; do not allow an accidental out-of-bounds read.
- Document laziness, resource ownership, and cost. A cursor over a database or network stream may require explicit close/dispose and may perform I/O on advancement.
- Do not conceal unexpectedly quadratic traversal. Indexing a linked structure from zero on every step turns a nominal walk into O(n²).
- Prefer generators/internal iterators when callers do not need manual control or multiple pending traversals.

Benefits are representation independence, multiple cursors, and variant traversal order. Costs are cursor lifecycle, invalidation rules, and potential indirection or hidden expense.

## Examples and relationships

Close examples include Java `Iterator`/`Iterable`, Python iterators and generators, JavaScript `Symbol.iterator`, .NET `IEnumerator`/`yield`, C++ iterator ranges, Go range-over-function iterators and `database/sql.Rows`, and Ruby `Enumerator`.

Composite structures often expose iterators. Factory Method commonly creates the appropriate iterator. Visitor performs type-specific operations over heterogeneous elements; Iterator determines traversal order and access. Memento can capture cursor state when resumability is required.
