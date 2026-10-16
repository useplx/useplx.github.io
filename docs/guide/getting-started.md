# Quickstart

This walkthrough creates a small project without relying on a model-port
package. It shows the common pieces of a deployable PLeX application: a graph
export, an orchestration entrypoint, a compilation policy, and an artifact.

## 1. Create the project

```bash
synps new hello-plex
cd hello-plex
mkdir -p src
```

`synps new` creates `src/`, `include/`, `assets/`, and a minimal `synps.toml`.

For this example, add a weight-storage codec. The Compiler requires the root
policy to define how immutable constants would be stored, even though the
identity graph below has no named checkpoint weight:

```bash
synps add quantizations --git https://github.com/useplx/Quantizations.git
```

## 2. Export a graph

Create `src/graph.cpp`:

```cpp
#include <mln/sdk/module.hpp>
#include <syn/package.hpp>

class Identity final : public Mln::Sdk::Module {
    public:
        Identity() { name = "model"; }

        std::vector<Mln::Sdk::Tensor>
        graph(std::span<const Mln::Sdk::Tensor> inputs) override {
            return {inputs[0]};
        }

        std::vector<std::vector<Mln::Sdk::Tensor>>
        specializations() const override {
            return {{Mln::Sdk::Tensor(
                {Mln::Sdk::Tensor::Dynamic}, Mln::DType::UInt8)}};
        }
};

PUBLISH(graph, Identity{});
```

A graph build package is loaded by the Compiler on the build machine. `PUBLISH`
publishes a typed object; the generated package ABI adapter is created by
SYNaPSe.

The first argument names the export. `PUBLISH(graph, …)` emits
`mln_package_graph`, which is what `exports = ["graph"]` refers to below. The
name is yours to choose; it is unrelated to the `graph()` method being
overridden.

## 3. Add the application entrypoint

Create `src/application.cpp`:

```cpp
#include <mln/sdk/native.hpp>
#include <mln/sdk/orchestration.hpp>

class Application final : public Mln::Sdk::Orchestration {
    public:
        Mln::Buffer forward(
            Mln::Runtime::Session& session,
            Mln::Buffer input) override {
            return session.invoke("model.forward", std::move(input));
        }
};

ENTRYPOINT(Application);
```

This Orchestration source is compiled to WebAssembly. It receives the
already-loaded Runtime Session and invokes the compiled graph by its logical
path. Compiler namespaces are
physical symbol details and are not part of `Session::invoke`.

`forward` is the graph module's implicit default entrypoint name, so it does
not need a separate manifest export declaration. The orchestration still names
the resolved graph path (`model.forward`) to select that graph call. The host
uses the artifact's public entrypoint and does not need to pass this internal
graph path.

`ENTRYPOINT` marks the entrypoint independently of its physical domain.
SYNaPSe records `wasm`, `native`, or `graph` in the artifact and MyeLiN routes
all three through the same host `Session.invoke` API.

## 4. Configure `synps.toml`

Use:

```toml
[package]
name = "hello-plex"
version = "0.1.0"

[entrypoint]
package = "hello-plex"

[dependencies]
quantizations = { git = "https://github.com/useplx/Quantizations.git", version = "v1.0.0" }

[build.graph]
namespace = "helloplex"
toolchain = "cpp"
sources = ["src/graph.cpp"]
exports = ["graph"]

[build.orchestration]
toolchain = "cpp"
sources = ["src/application.cpp"]

[policies."model"]
dtype = "f16"

[policies."model".backend]
device = "local"

[[policies."model".schemes]]
format = "f16"
```

Important details:

- graph entrypoints require at least one specialization in the current Compiler;
- `namespace` identifies a graph facet internally and is independent of the
  public package entrypoint;
- `[entrypoint].package` selects the package contract; `forward`, physical
  Wasm exports, and graph bindings are derived rather than repeated in the
  project manifest;
- manifest dtype spellings are `f32`, `f16`, `i32`, `i16`, `i8`, `i4`, `u32`,
  `u8`, `u4` — there is no `ui8`;
- the root policy must define a dtype;
- the root policy must cover `constant` + `immutable` storage with a valid codec;
- immutable schemes use `update = "none"`.

## 5. Inspect before building

```bash
synps graph
synps inspect
```

`graph` shows dependency/capability resolution. `inspect` prints the normalized
plan sent to the Compiler, including selected toolchains, build artifacts,
entrypoints, policies, hooks, weights, and assets.

## 6. Build

```bash
synps build --release
```

The root project produces:

```text
build/hello-plex.mln
```

SYNaPSe also reports how many build-DAG nodes executed and how many were served
from its build cache.

## 7. Run the exact artifact

Load `build/hello-plex.mln` with `Mln::Runtime`, create a Session, and invoke
the public entrypoint. The entrypoint is selected from artifact metadata; the
runtime handles the compiled specialization behind it.

## Where to go next

- [Core concepts](concepts.md) for the vocabulary used throughout the docs;
- [Build a project](build-a-project.md) for a real application workflow;
- [`synps.toml` reference](../api/synps-toml.md) for the complete schema;
- [MyeLiN SDK](../api/sdk.md) for Graph and Orchestration code;
- [MyeLiN Runtime](../api/runtime.md) for sessions, loading, and execution.
