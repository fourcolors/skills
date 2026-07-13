# Flyweight

> Use sharing to support large numbers of fine-grained objects efficiently.

**Reach for it when** measured memory use is dominated by a very large population of objects whose state can mostly be shared.

## Problem

Glyphs, tiles, particles, or similar logical elements may number in the millions while repeating the same context-independent data. Storing a complete physical object for every logical element wastes memory, but clients still need each logical element to behave according to its own context.

## Solution

Partition state into:

- **Intrinsic state** - context-independent, shareable, and effectively immutable. It lives in the flyweight.
- **Extrinsic state** - context-dependent. The client stores or computes it and passes it to each operation.

A `FlyweightFactory` canonicalizes intrinsic state: equal complete keys return the same shared instance while it remains pooled. The key must include every value that determines intrinsic behavior. For a rendered glyph, that may include code point, font face, size, style, variation axes, hinting, and other rendering configuration; alternatively those values must remain extrinsic.

## Participants

- `Flyweight` - accepts extrinsic state in its operations.
- `ConcreteFlyweight` - stores intrinsic immutable state.
- `UnsharedConcreteFlyweight` - participates in the interface but is intentionally not shared, often as a composite parent.
- `FlyweightFactory` - performs canonical, sharing-aware lookup and creation.
- `Client` - keeps extrinsic state and obtains flyweights through the factory.

## Structure

```text
record IntrinsicKey(codePoint, fontFace, size, style, variationAxes)
record ExtrinsicState(position, color, transform)

interface Flyweight {
    operation(extrinsic: ExtrinsicState)
}

class GlyphFlyweight implements Flyweight {
    private readonly field key: IntrinsicKey
    private readonly field outline: ImmutableOutline

    constructor(key) {
        this.key = deepImmutableCopy(key)
        this.outline = buildOutline(key)
    }

    operation(extrinsic) {
        render(outline, extrinsic)
    }
}

class FlyweightFactory {
    private field pool: ConcurrentMap<IntrinsicKey, Flyweight>

    get(key): Flyweight {
        stableKey = deepImmutableCopy(key)
        return pool.atomicGetOrCreate(
            stableKey,
            () -> new GlyphFlyweight(stableKey)
        )
    }
}

factory.get(key).operation(extrinsicState)
```

`atomicGetOrCreate` stands for a lock, concurrent-map insertion primitive, or single-flight mechanism that publishes one fully initialized instance. A check-then-insert sequence is insufficient under concurrency.

## Collaboration

At design time, state is split into intrinsic and extrinsic parts. At runtime, a client asks the factory for an intrinsic key and invokes the returned flyweight with the current extrinsic context. Many logical objects may use one physical flyweight sequentially or concurrently.

Sharing requires context-independent intrinsic state whether or not concurrency exists. If concurrent use is possible, the factory, flyweight operations, lazy internal data, and referenced collaborators must all be thread-safe; shallow field immutability alone is not enough.

## Use when

- Profiling shows that object count and duplicated state dominate memory.
- Most per-object state can be externalized.
- Many logical objects collapse into relatively few intrinsic keys.
- Intrinsic state can be made deeply immutable or safely shared.
- Logical value, not unique physical identity, drives behavior.

## Avoid when

- Object count is small or memory is not the bottleneck.
- Almost every object has distinct intrinsic state, making sharing close to one-to-one.
- Per-context mutation cannot be externalized.
- Unique object identity or per-instance metadata is part of the domain.
- Reconstructing or passing extrinsic state costs more than the measured memory saving.
- The need is temporary reuse of mutable instances; that is an object pool, not Flyweight.

## Guardrails and trade-offs

- Include all intrinsic determinants in a stable, immutable key with correct equality and hashing. Missing one field causes one context to reuse the wrong object.
- Do not expose setters or mutable collections from a flyweight. Defensive copies may be required at construction and access boundaries.
- Never use physical identity as value equality. Pooling and eviction policies can change whether equal values share one reference.
- Make factory scope explicit rather than hiding it as mutable global state. Inject it when tests or lifetimes need isolation.
- Analyze key cardinality and lifetime. A non-evicting pool is valid for a small bounded keyspace or application-long canonicalization; an unbounded keyspace can erase the memory saving.
- Use weak references, bounds, or eviction only when semantics allow a later lookup to produce a different physical instance for the same value.
- If canonical identity must remain globally stable, eviction is incompatible with that promise.
- Benchmark the complete trade: memory saved versus lookup, hashing, indirection, and extrinsic-state transfer.

Flyweight can produce dramatic memory savings. It complicates state ownership, calling conventions, concurrency, and factory lifetime, and it deliberately gives up unique per-logical-object identity.

## In the wild

- Java `Integer.valueOf` guarantees cached instances for `-128..127` and may cache other values; do not depend on reference identity outside or inside that range for value comparison.
- Java `String.intern`, Python `sys.intern`, JavaScript `Symbol.for`, and .NET `String.Intern` provide forms of canonicalized shared values.
- Go `unique.Make` returns canonical handles for comparable values and is safe for concurrent use.
- CPython reuses some small integers and strings as implementation details. The exact ranges and identity behavior are not Python language guarantees.
- Font, glyph, tile, and sprite managers are Flyweight only when one immutable object is shared per complete intrinsic key while position, color, transform, and other context remain extrinsic.

## Related patterns

- **Composite** can use shared immutable leaves, turning a tree into a DAG and preventing a unique parent reference.
- **State** and **Strategy** objects are sometimes flyweights, but their primary intent is behavioral variation rather than memory sharing.
- **Singleton** controls one instance within a declared runtime scope; Flyweight shares a controlled set keyed by intrinsic state.
- A flyweight factory resembles a cache, but its purpose is representing many simultaneous logical objects with shared immutable state, not merely avoiding recomputation.
