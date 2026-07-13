# Builder

> *Separate the construction of a complex object from its representation so that the same construction process can create different representations.*

Two related patterns commonly share the name "Builder":

- **GoF Builder** applies one construction process to different representations, usually through a Director and interchangeable ConcreteBuilders.
- **Fluent/Bloch Builder** replaces telescoping constructors with named, often order-independent configuration followed by `build()`, commonly producing an immutable validated value.

Do not assume the goals or participants of one variant are requirements of the other.

## GoF Builder

### Reach for it when

A stable multi-step process must produce different representations or Product types without coupling the process to their internals.

### Problem

A construction algorithm knows the sequence of parts to process, while several outputs represent those parts differently. If the algorithm constructs each representation directly, every new representation duplicates the process and couples it to concrete Product details. The canonical example is an RTF reader driving ASCII, TeX, or widget-oriented converters from the same token stream.

### Solution

Define a `Builder` vocabulary containing one operation per construction step. A representation-agnostic Director drives those steps. Each ConcreteBuilder accumulates its own Product and exposes a representation-specific retrieval operation.

Products from different builders need not share a type, so retrieval does not have to appear on the abstract Builder interface.

### Participants

- `Builder` - declares construction steps without committing to a representation.
- `ConcreteBuilder` - implements the steps, owns in-progress state, and transfers a finished Product to its caller.
- `Director` - owns the reusable construction sequence and depends only on Builder.
- `Product` - a completed representation; different builders may produce unrelated Product types.
- `Client` - selects a ConcreteBuilder, invokes the Director, and retrieves the result from that builder.

### Structure

```
interface DocumentBuilder {
    reset()
    buildTitle(text)
    buildParagraph(text)
}

class PlainTextBuilder implements DocumentBuilder {
    private document : PlainTextDocument

    constructor() { reset() }
    reset() { document = new PlainTextDocument() }
    buildTitle(text) { document.append(text.toUpperCase()) }
    buildParagraph(text) { document.append(text) }

    finish() : PlainTextDocument {
        result = document
        reset()                    // transfer result; next build starts clean
        return result
    }
}

class WidgetTreeBuilder implements DocumentBuilder {
    private tree : WidgetTree

    constructor() { reset() }
    reset() { tree = new WidgetTree() }
    buildTitle(text) { tree.add(new HeadingWidget(text)) }
    buildParagraph(text) { tree.add(new ParagraphWidget(text)) }

    finish() : WidgetTree {
        result = tree
        reset()
        return result
    }
}

class Director {
    construct(builder : DocumentBuilder, source) {
        builder.reset()
        builder.buildTitle(source.title)
        for paragraph in source.paragraphs {
            builder.buildParagraph(paragraph)
        }
    }
}

builder = new PlainTextBuilder()
new Director().construct(builder, source)
textDocument = builder.finish()
```

`finish()` transfers ownership and resets the builder so later construction cannot mutate a previously returned Product. A different valid lifecycle is to make each builder explicitly single-use.

## Fluent/Bloch Builder

### Reach for it when

A value has many optional parameters, named configuration improves readability, or required-field validation should occur at one construction boundary.

### Structure

```
class RequestBuilder {
    private url
    private timeout = defaultTimeout
    private headers = new Map()

    constructor(url) { this.url = url }
    withTimeout(value) { timeout = value; return this }
    withHeader(name, value) { headers[name] = value; return this }

    build() : Request {
        requireValidUrl(url)
        requirePositive(timeout)
        return new ImmutableRequest(url, timeout, copyOf(headers))
    }
}

request = new RequestBuilder(url)
    .withTimeout(5 seconds)
    .withHeader("Accept", "application/json")
    .build()
```

Fluency, validation, and immutability are useful choices, not requirements of GoF Builder. Conversely, this variant does not require a Director or multiple representations.

## Use when

- One process must drive multiple representations or Product types (GoF).
- Construction has meaningful ordered stages that should be isolated from representation details (GoF).
- A constructor has many optional values and named methods materially improve clarity (fluent/Bloch).
- A final boundary should validate and freeze accumulated configuration (fluent/Bloch).

## Avoid when

- A small constructor or factory function expresses the object clearly.
- There is no construction variation, staging, validation, or readability benefit.
- You need to select a family of related Products rather than assemble one result; use Abstract Factory.
- Copying a configured exemplar is the real operation; use Prototype or an explicit copy operation.

## Trade-offs and guardrails

GoF Builder decouples a reusable process from representation and permits unrelated result types. Fluent Builder can make optional configuration readable and can produce immutable, validated results. Both add indirection and mutable in-progress state.

- Treat a stateful builder as single-owner and normally single-threaded.
- Define reset/transfer behavior. Never keep mutating an object already returned by `finish()` or `build()`.
- If `build()` returns immutable output, defensively copy mutable collections owned by the builder.
- Keep required-field and cross-field validation at a clear boundary when the chosen variant promises valid results.
- Do not turn a builder into a bag of dozens of unrelated options; that merely relocates a god constructor.

## Common misuses

- Calling a direct mutable Product with setters a Builder even though construction and representation are not separated.
- Sharing one mutable builder globally or concurrently.
- Returning the builder's live internal collections so later calls change completed Products.
- Forcing a common result type onto all GoF builders when their representations are intentionally unrelated.

## In the wild

GoF-like builders appear in parser, compiler, serializer, and UI-generation pipelines where one traversal emits different representations.

Fluent/Bloch examples include Java `Locale.Builder`, `Calendar.Builder`, Guava `ImmutableList.Builder`, OkHttp `Request.Builder`/`OkHttpClient.Builder`, and .NET configuration or host builders when they accumulate configuration before producing a result.

Names alone do not establish the GoF pattern. Java `StringBuilder`, Go `strings.Builder` and `bytes.Buffer` are useful accumulators; Knex, TypeORM, and SQLAlchemy query chains are fluent expression-building DSLs; Python `EmailMessage` is primarily a directly mutable Product. They are adjacent builder idioms, not evidence of a Director varying representation.

## Related patterns

- **Abstract Factory** returns members of a Product family; GoF Builder assembles one result over multiple steps.
- **Factory Method** may implement an individual Builder step.
- **Composite** is a common Product shape for tree-building builders.
- **Prototype** copies a configured exemplar instead of replaying construction.
- A stateful Builder is usually not a **Singleton**.
