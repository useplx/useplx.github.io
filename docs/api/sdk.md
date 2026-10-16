# MyeLiN SDK

The MyeLiN SDK is the authoring surface used by graph, orchestration, and native
packages. Deployment policy does **not** live on SDK objects: dtype, device,
storage formats, and path overrides belong to `synps.toml` and are applied by
the compiler. Examples on this page use the core C++ SDK.

The SDK describes heterogeneous artifact components. It is not limited to
machine learning or language-model graphs.

## `Mln::Sdk::Module`

`Module` is the base of tensor-computation components.

```cpp
#include <mln/sdk/functional/add.hpp>
#include <mln/sdk/module.hpp>

class Residual final : public Mln::Sdk::Module {
    public:
        Mln::Sdk::Tensor forward(
            const Mln::Sdk::Tensor& hidden,
            const Mln::Sdk::Tensor& residual) {
            return operations.insert<Mln::Sdk::Functional::Add>(hidden, residual);
        }
};
```

Public members used by package authors:

| Member | Purpose |
|---|---|
| `name` | Local module name. |
| `parent` | Parent module, or `nullptr` at a root. |
| `modules` | Child-module registry. |
| `parameters` | Parameter registry. |
| `operations` | Operation registry. |
| `path()` | Fully qualified path through the module tree. |
| `graph(inputs)` | Uniform graph-plugin boundary for a root module. |
| `apply(output, inputs, name)` | Applies a bound graph hook to an output. |

A model may keep ergonomic `forward(...)` overloads internally. A graph package
exports its root module, and the root adapts its public tensor signature through
`graph(std::span<const Tensor>)` when required by the package boundary.

## Child modules and paths

```cpp
Block() {
    modules.insert<Attention>("attention", hidden_size);
    modules.insert<Mlp>("mlp", hidden_size);
}

auto attended = modules.forward<Attention>("attention", hidden);
auto output = modules.forward<Mlp>("mlp", attended);
```

Names compose into paths such as `model.layers.0.attention`. Those paths are the
selectors used by policies and graph hooks, so names are part of the deployment
contract.

## Parameters and weights

```cpp
parameters.insert("weight", Mln::Sdk::Weight{{}, {output, input}});
auto weight = parameters.at("weight");
```

`Weight` describes the checkpoint key and shape needed by the graph. Storage
dtype and quantization are selected later by compiler policy; they are not
properties of `Weight` itself.

## Tensor dtypes

`Mln::DType` currently defines:

`Float32` · `Float16` · `Int32` · `Int16` · `Int8` · `Int4` · `UInt32` ·
`UInt8` · `UInt4`

The manifest spellings are `f32`, `f16`, `i32`, `i16`, `i8`, `i4`, `u32`,
`u8`, and `u4`.

## Operations

Tensor operations are inserted through `operations.insert<T>(...)`. The SDK
includes arithmetic, conversion, reshape, slicing, reduction, matrix
multiplication, convolution, pooling, gather, trigonometric, and activation
operations.

`Mln::Sdk::Functional::Attention` expresses scaled dot-product attention as a
single graph operation, with an optional additive mask. This preserves the
operation's intent so the selected compiler backend can choose an aggregated
or online implementation without model-specific lowering rules.

Common `Mln::Sdk::Nn` modules include `Linear`, `Conv2D`, `SiLU`, `GELU`,
`Add`, and `Subtract`. Model ports may define their own modules when checkpoint
layout or behavior differs.

## `Mln::Sdk::Codec`

A codec defines how a stored weight representation is encoded and decoded. It
is deliberately independent from model policy.

```cpp
class MyCodec final : public Mln::Sdk::Codec {
    public:
        Mln::Sdk::Tensor decode(
            Mln::Sdk::Operations& operations,
            const Mln::Sdk::Weight& weight,
            Mln::DType dtype) override;
};
```

A `Codec::Scheme` carries the compiler-selected storage contract:

| Field | Values |
|---|---|
| `scope` | `Any`, `Constant`, `Input`, `Output`, `Internal` |
| `lifetime` | `Any`, `Immutable`, `Invocation`, `Session` |
| `update` | `None`, `Whole`, `Region` |
| `residency` | `Weight::Residency::Retained`, `Weight::Residency::Volatile` |
| `format` | Resolved codec implementation |

Codecs may implement graph decode, host encode/decode, weight-specific support
checks, and multi-component encoded parameters. Codec-specific layout or block
rules belong to the codec implementation, not to generic PLeX policy fields.

## `Mln::Sdk::Orchestration`

`Orchestration` is imperative control flow compiled to WebAssembly. It does **not**
derive from `Module`.

The default graph entrypoint name is implicit: `Module::entrypoint()` derives
`<module path>.forward`. The string passed to `session.invoke` is still the
graph *logical* name, such as `model.forward`; this is an internal graph
dispatch, not the public application entrypoint name a host application uses.
The host can invoke the artifact's default public entrypoint without naming
`forward`. See [MyeLiN Runtime](runtime.md#graph-facing-invocation).

```cpp
#include <mln/sdk/orchestration.hpp>

class Application final : public Mln::Sdk::Orchestration {
    public:
        Application() { name = "application"; }

        Mln::Buffer forward(
            Mln::Runtime::Session& session,
            Mln::Buffer input) override {
            auto output = session.invoke("model.forward", std::move(input));
            session.emit(output);
            return output;
        }
};
```

An orchestration can own graph `modules` and nested `orchestrations`. Its single
`forward(Session&, Buffer)` boundary can invoke compiled graph entrypoints,
access packaged assets, keep session state, call native imports, and emit output.

## `Mln::Buffer`

`Mln::Buffer` is an owning, move-only byte buffer. It is not owned by a
`Runtime` or `Session`.

Core operations include sizing, reading, writing, indexed byte access, and
`clone()` when an independent copy is required. Passing a buffer by move
transfers ownership without implying a deep copy.

## Native providers

Platform-dependent code belongs in a Native build package. Native functions are
exported/imported through the SDK native ABI, while orchestration remains
portable. Keep tensor-heavy deterministic computation in Graph packages,
portable request logic in orchestration, and platform libraries in Native providers.

## See also

- [Execution model](../notes/execution-model.md)
- [`synps.toml` policies](synps-toml.md#policies)
- [MyeLiN Runtime](runtime.md)
