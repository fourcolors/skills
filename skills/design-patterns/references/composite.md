# Composite

> Compose objects into tree structures for part-whole hierarchies, letting clients treat individual objects and compositions uniformly.

**Reach for it when** a recursive part-whole structure should support the same meaningful operation on one leaf or an entire subtree without client-side type tests.

## Problem

Leaves and groups appear in one hierarchy - shapes and groups, files and directories, menu items and menus, or widgets and containers. Without a shared abstraction, clients repeatedly branch on node type and duplicate traversal logic.

## Solution

Define a `Component` contract for operations meaningful to both leaves and composites. A `Leaf` performs primitive behavior. A `Composite` stores child components and implements the operation by combining or delegating to them. Because every child is a component, composites nest recursively.

Child management has two canonical variants:

- **Safe variant:** `add`, `remove`, and child access exist only on `Composite`. Invalid leaf operations are impossible at compile time; construction code knows when it is building a composite, while operational clients remain uniform.
- **Transparent variant:** child management is declared on `Component`. Clients can manipulate every node through one type, but leaf operations must fail, return a documented absence, or do nothing. This moves errors to runtime.

Prefer the safe variant unless uniform structural mutation is more valuable than compile-time safety.

## Participants

- `Component` - the common operational contract for every node.
- `Leaf` - a terminal node with no children.
- `Composite` - stores child components and combines their behavior.
- `Client` - performs operations through `Component`; construction code or a builder may use `Composite` explicitly.

## Structure

```text
interface Component {
    operation(): Result
}

class Leaf implements Component {
    operation(): Result {
        return primitiveResult()
    }
}

class Composite implements Component {
    private field children: List<Component> = []

    add(child: Component) {
        require(child != this)
        require(not wouldCreateCycle(this, child))
        children.append(child)
    }

    remove(child: Component) {
        children.remove(child)
    }

    operation(): Result {
        results = []
        for each child in children {
            results.append(child.operation())
        }
        return combine(results)
    }
}

function process(root: Component): Result {
    return root.operation()
}

group = new Composite()
group.add(new Leaf())
process(group)
```

## Collaboration

A client invokes the common operation on a component. A leaf handles it directly. A composite performs any group-level behavior and delegates to or combines results from its children. Children may themselves be composites, so the operation covers an arbitrary subtree.

Not every operation must visit every child. The operation may aggregate, short-circuit, select, order, or otherwise combine child behavior as its contract requires.

## Use when

- Modeling a genuine recursive part-whole hierarchy.
- Applying one meaningful operation uniformly to a leaf or subtree.
- Allowing new leaf and composite types without rewriting client traversal logic.
- Building trees at runtime with arbitrary depth.

## Avoid when

- The data is naturally flat or is not a part-whole relationship.
- Leaves and groups share almost no meaningful operations.
- Structural identity, arbitrary graph edges, or cycles dominate; use an explicit graph model.
- Callers never need uniform treatment of individuals and groups.

## Guardrails and trade-offs

- Choose safe versus transparent child management deliberately; do not mix throwing, `null`, and silent no-op leaf behavior without a precise contract.
- Reject self-links and ancestor cycles on mutation. If shared children form a DAG, do not assume a unique parent.
- Keep parent links synchronized on add, remove, move, and failure. Omit a parent reference when nodes may be shared by multiple parents.
- Invalidate cached aggregates whenever descendants change, or make the tree immutable and rebuild changed paths.
- Define concurrent mutation and traversal behavior. Snapshot, lock, copy-on-write, or forbid mutation during traversal.
- Composite does not require recursive call stacks. Use an explicit stack or Iterator for very deep trees, plus depth/node limits for untrusted input.
- Keep `Component` cohesive; leaf-only and group-only features should not turn it into a union of unrelated methods.

The benefit is simple uniform client code and natural recursive composition. The costs are runtime integrity checks, traversal and debugging complexity, and tension between transparent mutation and type safety.

## In the wild

- Java AWT/Swing uses a safe-style `Component`/`Container` hierarchy: shared component behavior is uniform, while child management belongs to containers.
- The browser DOM is a transparent-style object tree: nodes share the `Node` interface, but some inherited operations do not apply to every node type and can fail at runtime.
- XML element trees, menu hierarchies, scene graphs, and filesystem abstractions commonly use Composite when leaf and group operations are genuinely uniform.

ASTs and UI render trees are often Composite-like, but many use external visitors or type-specific child fields rather than a direct GoF `Composite.operation`; describe them as analogies unless the shared operation and recursive composition are explicit.

## Related patterns

- **Decorator** wraps one component to add responsibilities; Composite owns many child components.
- **Iterator** can traverse a Composite without recursive client code.
- **Visitor** adds new operations across heterogeneous node types.
- **Flyweight** can share immutable leaves, producing a DAG and ruling out a unique parent link.
