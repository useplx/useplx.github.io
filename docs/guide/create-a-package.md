# Create a package

A PLeX package is a source repository with a `synps.toml`. It can publish graph
objects for the Compiler, Orchestration modules for portable control flow, Native
providers, codecs, graph hooks, or static libraries used by another build
package.

## Package identity

```toml
[package]
name = "example"
version = "0.1.0"
description = "Reusable PLeX component"
include_directories = ["include"]
```

`name` and `version` are required. `include_directories` adds public include
roots inherited by consumers in addition to the normal layout include path.

## Publish a graph object

```toml
[build.graph]
namespace = "example"
toolchain = "cpp"
sources = ["src/graph.cpp"]
exports = ["graph"]
```

```cpp
#include <mln/sdk/module.hpp>
#include <syn/package.hpp>

class Graph final : public Mln::Sdk::Module {
    public:
        Graph() { name = "model"; }

        std::vector<Mln::Sdk::Tensor>
        graph(std::span<const Mln::Sdk::Tensor> inputs) override {
            // Build and return the graph outputs.
            return {inputs.at(0)};
        }
};

PUBLISH(graph, Graph{});
```

For graph build packages, `namespace` controls the physical namespace of
functions emitted by the Compiler. If omitted, SYNaPSe derives it from the
project and package name.

## Publish orchestration

```toml
[build.orchestration]
toolchain = "cpp"
sources = ["src/entrypoint.cpp", "src/orchestration.cpp"]
```

Use `ENTRYPOINT(Type)` to mark the application entrypoint. In an orchestration
build it emits the Wasm adapter; in a native build it registers the equivalent
native adapter. A graph-only package needs no artificial orchestration: its
compiled graph entrypoint is indexed directly in the artifact.

## Publish a Native provider

```toml
[build.native.provider]
toolchain = "cpp"
sources = ["src/provider.cpp"]
libraries = ["example"]
```

Native providers use the typed `PUBLISH(module, name, return_type, args...)`
and, when manual ABI access is required, `PUBLISH_RAW(module, name)` from
`<mln/sdk/native.hpp>`. A provider `.so` exposes one `mln_native_module()`
registration with the symbols registered by its translation units. These native
macros are distinct from the graph-package `PUBLISH(symbol, object)` above.

## Publish a Compiler object

Codecs and graph hooks are also Graph build packages using IREE because the Compiler
loads them on the build host. Export them with `PUBLISH(symbol, object)` and
list the same symbol in `exports`.

## Build-package fields

The complete schema is in [`synps.toml`](../api/synps-toml.md). Common fields
are:

| Field | Meaning |
|---|---|
| `namespace` | physical graph namespace |
| `toolchain` | language family or explicit compatible toolchain |
| `sources`, `includes` | source and input paths |
| `libraries`, `library_directories` | link configuration |
| `defines` | preprocessor definitions |
| `artifact` | expected toolchain-produced filename when the toolchain chooses it |
| `exports` | names published by a build-time graph package; orchestration uses its implicit `forward` export |
| `uses` | separately built component artifacts consumed during linking or building |
| `extends` | build packages absorbed into this component |

## Declare package variables

```toml
[package.variables]
context = { type = "uint32", required = true, min = 1, max = 32768, define = "APP_CONTEXT" }
mode = { type = "string", default = "default", define = "APP_MODE", facets = ["orchestration"] }
```

Supported variable types are `string`, `boolean`/`bool`, `integer`/`int64`,
`uint32`, `float`/`number`, `array`, and `table`. Numeric schemas can set
`min`/`max`. The root project configures a dependency under
`[packages.<name>]`. `define` exposes a configured scalar to compiled source.
Optional `facets` limits that definition to the named build-package facets, so
changing it does not invalidate unrelated artifacts.

## Declare capabilities

```toml
[capabilities]
provides = ["encoder"]
requires = ["storage"]
```

Capabilities let projects connect package roles without making packages depend
on one another's source repositories.

## Keep deployment out of the package

Do not hardcode root graph policies, target devices, checkpoint locations, or
application entrypoint composition in a reusable package unless they are truly
part of the package contract. Those choices normally belong to the consuming
project.
