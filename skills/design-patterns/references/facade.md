# Facade

> Provide a unified, higher-level interface to a set of interfaces in a subsystem, making the subsystem easier to use.

**Reach for it when** most clients need a simple, coherent entry point over a complex subsystem and should not have to understand its object graph or call sequence.

## Problem

A subsystem accumulates fine-grained classes, initialization order, and multi-step workflows. Clients that need only the common case must still wire low-level objects and duplicate sequencing logic, coupling themselves to internal structure.

## Solution

Introduce a `Facade` with high-level operations for common workflows. It knows which subsystem objects perform each step, delegates to them, and composes their results. Subsystem classes do not depend on the facade.

A facade does not inherently determine visibility. It can be an optional convenience while advanced clients use exported subsystem classes directly, or packaging/module boundaries can make it the only public entry point.

## Participants

- `Facade` - exposes coherent high-level operations and coordinates subsystem objects.
- `Subsystem classes` - perform the real work without knowing about the facade.
- `Client` - uses the facade rather than assembling common workflows itself.

## Structure

```text
class MediaFacade {
    field decoder: VideoDecoder
    field mixer: AudioMixer
    field subtitleLoader: SubtitleLoader
    field renderer: Renderer

    constructor(decoder, mixer, subtitleLoader, renderer) {
        this.decoder = decoder
        this.mixer = mixer
        this.subtitleLoader = subtitleLoader
        this.renderer = renderer
    }

    play(path) {
        video = decoder.decode(path)
        audio = mixer.mix(video.audioStreams)
        captions = subtitleLoader.load(path)
        return renderer.render(video, audio, captions)
    }
}

facade = new MediaFacade(decoder, mixer, subtitles, renderer)
facade.play("movie.mkv")
```

Dependency injection is not required by the pattern, but it keeps construction policy separate and makes orchestration testable.

## Collaboration

The client calls one facade operation. The facade selects subsystem collaborators, translates the high-level request where needed, orders their calls, and composes the result. Subsystem classes may collaborate with each other but remain unaware of the facade.

## Use when

- Most clients need a simple default view of a complex subsystem.
- Repeated low-level wiring and sequencing should live in one place.
- A layer or module needs a well-defined entry point.
- Legacy or poorly organized APIs need a coherent application-facing surface.
- One transaction or workflow must span several subsystem calls.

## Avoid when

- The subsystem is already small and cohesive.
- The facade would be a one-to-one pass-through with no simplification.
- One object must conform to a specific existing interface; use Adapter.
- The real need is bidirectional communication among peers; use Mediator.
- Most clients require the entire low-level surface, causing the facade to mirror it wholesale.

## Guardrails and trade-offs

- Keep operations use-case-oriented. A facade that exposes every subsystem method becomes a god object or a second, leaky API.
- Do not move subsystem business rules into the facade merely because it orchestrates them.
- Make transaction boundaries and partial-failure behavior explicit across multi-step operations.
- Propagate cancellation and deadlines. Retry only operations known to be safe or idempotent, with bounded attempts, backoff, and idempotency keys where required; a generic retry wrapper can duplicate side effects.
- Inject volatile or expensive collaborators when testability, lifecycle, or configuration matters.
- Decide deliberately whether raw subsystem classes are public. Optional bypass is a packaging choice, not a requirement or disqualifier for Facade.

The benefit is reduced client coupling and a clear common path. The cost is another abstraction that depends on many subsystem pieces and can become a bottleneck or dumping ground if its scope is not controlled.

## In the wild

- SLF4J presents a simple logging facade over selectable logging providers.
- Python `requests` and `subprocess.run` provide high-level operations over lower-level HTTP and process machinery.
- Go `http.Get` and `http.Client` provide common entry points over transports, connection reuse, redirects, and request execution.
- jQuery's `$` API historically offered a unified entry point over DOM selection, events, animation, and Ajax subsystems.

Framework helpers can combine Facade with Template Method, Adapter, or Factory. Classify them by the role being discussed rather than by name alone.

## Related patterns

- **Adapter** converts an incompatible object to an expected interface; Facade defines a convenient subsystem interface.
- **Mediator** coordinates peer objects that know the mediator; subsystem classes remain unaware of a Facade.
- **Abstract Factory** can create the subsystem objects a facade uses.
- **Proxy** and **Decorator** normally preserve the wrapped object's interface; a Facade deliberately presents a higher-level one.
