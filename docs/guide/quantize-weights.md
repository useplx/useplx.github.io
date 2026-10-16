# Weight storage & quantization

PLeX treats weight representation as Compiler policy backed by a codec. The
model graph names a logical weight; the project selects a codec scheme for the
matching path; the codec provides encode/decode behavior.

## Codec contract

`Mln::Sdk::Codec` can provide:

- graph-side `decode(Operations&, Weight, ...)` so decoding becomes part of the
  graph and remains visible to compiler optimization/fusion;
- host-side `encode(span<float>, ...)` for packaging parameters;
- host-side `decode(span<uint8_t>, ...)` where a codec needs it;
- support checks for a particular `Weight`/`Scheme`;
- multiple stored parameter components for one logical weight.

A codec owns its storage representation. PLeX does not put block size,
zero-point layout, rounding rules, or codec-specific parameters into the generic
scheme schema.

## Select a format

A root policy must cover immutable constants. For example:

```toml
[policies."model"]
dtype = "f16"

[policies."model".backend]
device = "local"

[[policies."model".schemes]]
format = "f16"
```

Then override a narrower weight path:

```toml
[[policies."model.layers.*.mlp.down_proj.weight".schemes]]
format = "q4k"
```

The selected codecs must be available as package exports in the resolved build.
A homonymous codec export can be referenced by its short package name (`q4k`);
qualified references use `package:export`.

## Scheme fields

| Field | Values | Meaning |
|---|---|---|
| `scope` | `any`, `constant`, `input`, `output`, `internal` | kind of value the scheme can represent |
| `lifetime` | `any`, `immutable`, `invocation`, `session` | persistence model |
| `update` | `none`, `whole`, `region` | update contract |
| `format` | codec export | concrete representation |
| `volatile` | boolean | allow clean host pages to be discarded after invocation |

For persisted weights, `scope = "constant"`, `lifetime = "immutable"`, and
`update = "none"` are inferred when omitted. Volatility affects host residency,
not mutability or device residency.

## Checkpoint formats vs. target storage

`[myelin].formats` declares codecs the Compiler may need to **read** source
checkpoint storage even when no policy selects that format for the final
artifact:

```toml
[myelin]
formats = ["bf16"]
```

This is distinct from `policies.*.schemes`, which select the representation of
logical values in the compiled deployment.

## Policy resolution

Policies inherit by graph path. A narrower matching path overlays the broader
policy. Scheme matching additionally considers scope and lifetime; ambiguous
wildcard schemes are rejected instead of depending on TOML order.

See [Graph paths & policies](../notes/granularity.md) and the
[`synps.toml` reference](../api/synps-toml.md).
