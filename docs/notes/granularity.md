# Graph paths & policies

A model graph is addressable by named paths. Paths make deployment policy a
property of the root application instead of a property embedded in model source.

## Paths

Module and parameter names compose into dot-separated paths:

```text
model.language_model.layers.7.self_attn.q_proj.weight
```

Because projects can target these names, renaming a public model path is a
contract change for manifests that depend on it.

## Pattern matching

`*` matches one path segment. A policy path also applies to descendants after
its own segments match, which is how inheritance is expressed.

```text
model.layers.*.mlp
```

matches a descendant such as:

```text
model.layers.7.mlp.down_proj.weight
```

but not `model.layers.mlp`.

## Root policy

The first policy record is the compiler's root policy. The current compiler
requires it to exist, define `dtype`, and provide a scheme that can cover
`constant` + `immutable` weights.

```toml
[policies."model"]
dtype = "f16"

[policies."model".backend]
device = "local"

[[policies."model".schemes]]
scope = "constant"
lifetime = "immutable"
update = "none"
format = "f16"
```

## Merge order

For a requested graph path, the compiler:

1. starts with the first/root policy;
2. collects later policy patterns that match;
3. sorts the matches by pattern-string length, shortest first;
4. merges them in that order.

The longest matching pattern therefore applies last. Equal-length patterns keep
manifest order because equal-length matches preserve their manifest order.

!!! warning "Specificity is pattern-string length"
    Current precedence uses the number of characters in the pattern, not a
    semantic segment score. Avoid overlapping equal-purpose patterns whose
    precedence would be surprising, and confirm the effective plan with
    `synps inspect`.

## Field merge

A matching child policy only replaces fields it declares. `dtype`, `backend`,
and `optimization_barrier` inherit when omitted.

Schemes are merged by the `(scope, lifetime)` key. Replacing a
constant/immutable scheme does not erase a separate session-lifetime scheme
inherited from an ancestor.

## Scheme selection

A scheme has:

| Axis | Values |
|---|---|
| `scope` | `any`, `constant`, `input`, `output`, `internal` |
| `lifetime` | `any`, `immutable`, `invocation`, `session` |
| `update` | `none`, `whole`, `region` |
| `volatile` | `false`, `true` |
| `format` | resolved codec export |

When wildcard (`any`) and concrete schemes could both match a concrete
scope/lifetime pair, the compiler selects the most specific combination. An
ambiguous tie is rejected.

Immutable values require `update = "none"`. `volatile = true` allows the
Runtime to discard their clean package-backed host pages after invocation.

## Practical policy layout

Keep the default broad and add exceptions only where they are justified:

```toml
[policies."model"]
dtype = "f16"

[[policies."model".schemes]]
scope = "constant"
lifetime = "immutable"
update = "none"
format = "f16"

[[policies."model.layers.*.mlp.down_proj.weight".schemes]]
scope = "constant"
lifetime = "immutable"
update = "none"
format = "q4k"
```

Use `synps inspect` after changing path rules. It is cheaper and more reliable
than discovering a wrong match after a full model build.
