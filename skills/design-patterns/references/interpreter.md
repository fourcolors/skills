# Interpreter

> Given a language, define a representation for its grammar and an interpreter that uses that representation to evaluate sentences in the language.

## Intent

Use Interpreter when a recurring problem is naturally expressed as a small, stable grammar and direct evaluation of an abstract syntax tree is adequate. The pattern models grammar rules as expression objects and defines their evaluation semantics. Lexing and parsing source text into the tree remain separate responsibilities.

Prefer a parser/compiler toolchain for a complex or fast-changing grammar, and a mature expression/rules library when one already fits. Prefer a table or configuration object when there is no real language.

## Participants

- `Expression` declares `interpret(context)` for every AST node.
- `TerminalExpression` implements a leaf such as a literal or variable reference.
- `NonterminalExpression` represents a composite grammar rule and evaluates child expressions.
- `Context` carries scoped information needed during evaluation.
- `Client` or parser constructs the AST, initializes Context, and evaluates the root.

## Structure

```text
class Context {
    private variables: Map<String, Boolean>

    assign(name, value) { variables[name] = value }

    lookup(name): Boolean {
        if !variables.contains(name):
            throw UnknownVariable(name)
        return variables[name]
    }
}

interface Expression {
    interpret(context: Context, budget: Budget): Boolean
}

class Variable implements Expression {
    private name: String
    constructor(name) { this.name = name }
    interpret(context, budget) {
        budget.consumeNode()
        return context.lookup(name)
    }
}

class Literal implements Expression {
    private value: Boolean
    constructor(value) { this.value = value }
    interpret(context, budget) {
        budget.consumeNode()
        return value
    }
}

class And implements Expression {
    private left: Expression
    private right: Expression
    constructor(left, right) { this.left = left; this.right = right }
    interpret(context, budget) {
        budget.consumeNode()
        return left.interpret(context, budget)
            AND right.interpret(context, budget)
    }
}

class Or implements Expression {
    private left: Expression
    private right: Expression
    constructor(left, right) { this.left = left; this.right = right }
    interpret(context, budget) {
        budget.consumeNode()
        return left.interpret(context, budget)
            OR right.interpret(context, budget)
    }
}

sentence = new Or(
    new And(new Variable("x"), new Literal(true)),
    new Variable("y"))
context = new Context()
context.assign("x", true)
context.assign("y", false)
result = sentence.interpret(context, new Budget(maxNodes = 100))
```

The parser should also enforce source-size and AST-depth limits before interpretation. The runtime budget shown above limits work during evaluation.

## Guardrails and trade-offs

- For untrusted input, bound source length, token count, AST depth/node count, evaluation steps, recursion, allocation, and wall time.
- Reject unknown variables, functions, and operators explicitly; do not silently coerce missing data into a permissive result.
- Never implement the DSL by passing input to host-language `eval` or unrestricted reflection. Whitelist capabilities and isolate execution when expressions can access costly or sensitive services.
- Define short-circuit behavior, numeric overflow, type coercion, determinism, side effects, and error propagation as part of the language contract.
- Keep Context scoped and minimal rather than a process-global mutable service locator.
- Cache or compile repeated expressions only with explicit invalidation and tenant/security boundaries.
- When operations beyond evaluation proliferate - formatting, type checking, optimization - apply Visitor or a separate compiler pass instead of adding every operation to every node.

Benefits are code that mirrors a small grammar and independently testable rules. Costs are one class/type per rule, recursive dispatch overhead, a growing Context, and poor scalability to large languages.

## Examples and relationships

Direct-evaluation examples or close analogies include Spring Expression Language nodes, math.js expression nodes, and Go template execution. Regular expressions are the GoF's motivating language example; modern regex engines often compile to automata or bytecode rather than applying the object pattern literally.

LINQ expression trees, SQLAlchemy/Django query objects, and similar ASTs are related representations commonly processed by Visitor or compilers; they are not canonical `interpret(context)` examples. Composite supplies the AST structure, Visitor adds operations over a stable grammar, and a parser or Builder constructs the tree.
