# Build domains

A `[build.<domain>]` table is one buildable component. Its domain
controls *where the source is built* and *what kind of artifact it contributes*.

## `iree`: graph plugin

```toml
[build.graph]
namespace = "example"
toolchain = "cpp"
sources = ["src/model.cpp"]
exports = ["model"]
```

A `graph` artifact is compiled for the **build host** and loaded by the SYNaPSe
Compiler. Its exports are C++ graph and codec objects used to construct compiler IR.
The plugin itself is not shipped as the graph executable for the target.

## `orchestration`: portable Wasm

```toml
[build.orchestration]
toolchain = "cpp"
sources = ["src/application.cpp"]
```

Orchestration packages contain portable control flow such as an
`Mln::Sdk::Orchestration`. C and C++ use a WASI toolchain; Go uses TinyGo for
the current WebAssembly representation.

## `native`: deployment provider

```toml
[build.native.image]
toolchain = "cpp"
sources = ["src/image.cpp"]
libraries = ["opencv_core"]
```

Native packages are shared providers built for the deployment architecture.
Several providers can coexist under stable labels such as
`build.native.image` and `build.native.tokenizer`.

## `driver`: runtime backend plugin

```toml
[build.driver.qnn]
toolchain = "cpp"
sources = ["src/driver.cpp"]
```

Drivers extend device discovery and execution in the MyeLiN Runtime. They use
the `mln_runtime_driver` ABI and are not interchangeable with Native providers.

## `extends`

`extends` inherits another build-package definition:

```toml
[build.orchestration.application]
toolchain = "cpp"
extends = ["control:base"]
```

A reference identifies a project dependency and build package. Missing targets,
invalid reference syntax, and incompatible explicit runtime domains are rejected.

## `uses`

`uses` adds a build-time artifact dependency rather than inheriting source
configuration:

```toml
[build.native.wrapper]
toolchain = "cpp"
uses = ["support"]
```

Use `extends` for definition composition; use `uses` when one build component
needs another component's produced artifact.

## Source discovery

`sources` may name files or directories. When it is omitted, the planner can
use repository layout/convention-based discovery. Explicit source lists are
preferable when a package boundary should be obvious and auditable.

## Domain vs target

The domain is not the hardware backend:

- `iree` means “host plugin that describes a graph to the Compiler”;
- a graph **policy backend** selects the IREE graph target;
- `native` uses the deployment CPU/platform toolchain;
- `wasm` is the physical build value for portable Orchestration represented as WebAssembly.

See [Toolchains](toolchains.md) and [Devices](devices.md).
