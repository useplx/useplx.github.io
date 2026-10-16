# `synps.toml` reference

`synps.toml` describes both reusable packages and root applications. The same
manifest vocabulary covers source components, dependencies, toolchains, build
domains, compiler policy, weights, and deployable entrypoints.

All paths are relative to the manifest that declares them unless noted
otherwise.

## Minimal package metadata

```toml
[package]
name = "example"
version = "0.1.0"
description = "Optional short description"
```

`package.name` and `package.version` are required. `include_directories` may add
package-level include paths.

## `[layout]`

The default project directories are:

```text
src/
include/
assets/
tests/
examples/
```

Override them when a repository uses another layout:

```toml
[layout]
sources = "source"
includes = "public"
assets = "resources"
tests = "test"
examples = "examples"
```

## `[dependencies]`

A dependency selects exactly one source form.

```toml
[dependencies]
local_codec = { path = "../Quantizations/F16" }
model = { git = "https://github.com/useplx/Qwen3_VL.git", version = "v1.0.0" }
```

Supported forms:

| Form | Fields |
|---|---|
| Local | `path` |
| Git | `git`, optionally `rev` or `version` |
| Registry | version string/table syntax is parsed, but registry resolution is currently unavailable |

The table key is the dependency alias used by package configuration and
cross-package references.

## `[toolchain.<language>.<domain>.<labels>]`

```toml
[toolchain.cpp.native.aarch64]
compiler = "aarch64-linux-gnu-g++"
flags = ["-O3"]
```

Fields:

| Field | Required | Meaning |
|---|:---:|---|
| `compiler` | no | compiler executable/path |
| `linker` | no | linker executable/path |
| `archiver` | no | archive executable/path |
| `triple` | no | target triple passed by the language driver |
| `flags` | no | additional compiler arguments |

Toolchain strings support `~/`, `${NAME}`, and `${NAME:-fallback}` expansion.

The first path component is the language. The optional domain is `graph`,
`orchestration`, or `native`; additional labels such as an architecture refine
selection. Child tables inherit the fields of their parent. A `*` label is a
fallback for any target.

## `[build.<domain>]`

Build domains declare the artifacts produced by the package.

```toml
[build.graph]
toolchain = "cpp"
namespace = "example"
sources = ["src/model.cpp"]
exports = ["model"]

[build.orchestration]
toolchain = "cpp"
sources = ["src/application.cpp"]

[build.native]
toolchain = "cpp"
sources = ["src/tokenizer.cpp"]
```

Canonical domains are `graph`, `orchestration`, `native`, and `driver`. Their
physical outputs are respectively an IREE compiler plugin, a Wasm module, a
native provider, and a runtime driver. Native providers and drivers are both
shared libraries, but expose different versioned ABIs.

When a package has several artifacts in one domain, add a stable label:

```toml
[build.native.tokenizer]
toolchain = "cpp"
sources = ["src/tokenizer.cpp"]

[build.native.index]
toolchain = "rust"
artifact = "libindex.a"
sources = ["src/index/Cargo.toml"]
```

## Build fields

A project may contain several independently built components:

```toml
[build.graph.model]
namespace = "example"
toolchain = "cpp"
sources = ["src/model.cpp"]
includes = ["include"]
exports = ["model"]

[build.orchestration.application]
toolchain = "cpp"
sources = ["src/application.cpp"]

[build.native.tokenizer]
toolchain = "cpp"
sources = ["src/tokenizer.cpp"]
libraries = ["utf8proc"]
```

Supported fields:

`namespace` · `toolchain` · `artifact` · `sources` ·
`includes` · `libraries` · `defines` · `library_directories` · `exports` ·
`uses` · `extends`

The build domain determines the runtime. `artifact = "*.a"` marks a private
static-library input: it may be referenced through `uses` but is not embedded
as a loadable runtime provider.

`exports` lists symbols registered by a build-time graph package, for example
graph modules, codecs, hooks, or compatibility objects. It does not configure
Native provider symbols or Wasm module exports. Orchestration exposes the
implicit `forward` entrypoint; runtime hooks refer to that export unless an
explicit export is provided by the artifact plan.

`extends` composes another build-package definition. `uses` links the artifact
produced by another build package.

## Capabilities and bindings

Reusable packages can declare abstract composition requirements:

```toml
[capabilities]
provides = ["generator"]
requires = ["tokenizer"]
```

If multiple dependencies provide the same required capability, the root project
selects one:

```toml
[bindings]
tokenizer = "text-tools"
```

The binding value is a dependency/package alias.

## Package variables

A package publishes its configurable values under `[package.variables]`:

```toml
[package.variables]
context = { type = "uint32", default = 2048, min = 1, define = "MODEL_CONTEXT", facets = ["graph", "orchestration"] }
trace = { type = "boolean", default = false, define = "MODEL_TRACE", facets = ["orchestration"] }
```

Accepted type names are:

`string` · `boolean`/`bool` · `integer`/`int64` · `uint32` · `float`/`number` ·
`array` · `table`

A schema may use `default`, `required`, and numeric `min`/`max` constraints.
`define` supplies a scalar value to compiled source. `facets` optionally limits
that definition to named build-package facets; without it, the definition is
available to every facet for compatibility.
The root configures a **direct** dependency with:

```toml
[packages.model]
context = 4096
```

Unknown package variables and incompatible values are rejected.
`facets` must be an array of strings.

## `[weights]`

Select exactly one of `path` or `paths`:

```toml
[weights]
path = "${MODEL_DIR}/model.safetensors"
```

or:

```toml
[weights]
paths = [
  "weights/model-00001-of-00002.safetensors",
  "weights/model-00002-of-00002.safetensors",
]
```

`paths` must not be empty. Environment references must resolve.

## `[scheduling]`

Scheduling expresses a high-level compilation preference. It does not select
passes or create a PLeX scheduler.

```toml
[scheduling]
favor = "min-memory"
```

Accepted values are:

| Value | Meaning |
|---|---|
| `min-memory` | Minimize overlapping live allocations; this is the default. |
| `max-concurrency` | Expose more independent work to the device at the cost of peak memory. |
| `debug` | Prefer deterministic, minimally partitioned execution for diagnosis. |

The compiler translates this intent to IREE Stream partitioning. Device
placement remains controlled by backend policies, and Stream remains
responsible for dependencies, transfers and resource lifetime.

## Policy loading

Loading policy is independent from dtype, codec and backend placement:

```toml
[policies."model.layers.*".loading]
mode = "streamed"
```

| Mode | Meaning |
|---|---|
| `resident` | Retain mapped parameter pages between invocations. |
| `streamed` | Load through IREE IO Parameters and allow the mapped pages to be discarded after the owning graph scope completes. |

Both modes use IREE parameter providers and Stream parameter operations. The
difference is host archive residency, not a separate transfer engine. The
legacy `volatile` field inside a scheme remains readable for compatibility;
an explicit loading policy takes precedence. `cached` and `prefetch` are not
accepted yet because this pinned IREE revision does not provide generic LRU
policy semantics, and PLeX does not create a parallel prefetch runtime.

## `[myelin]`

`[myelin]` currently carries global compiler input-format requirements:

```toml
[myelin]
formats = ["f16"]
```

`formats` names codec exports needed to read/interpret source checkpoint
representations even when the deployment policy does not otherwise select that
codec.

## Policies

Policies are keyed by graph path and inherit from broader paths to more specific
ones.

```toml
[policies."model"]
dtype = "f16"

[policies."model".backend]
device = "local"

[[policies."model".schemes]]
format = "f16"
```

### Policy fields

| Field | Meaning |
|---|---|
| `dtype` | Compute/exposed tensor dtype. |
| `backend.device` | Target device alias such as `local`, `cuda`, or `vulkan`. |
| `backend.ordinal` | Optional device ordinal. |
| `backend.flags` | Backend-specific compiler flags. |
| `optimization_barrier` | Prevent selected compile-time folding/optimization across the path. |
| `schemes` | Storage/codec schemes attached to the path. |

`volatilized` has been removed. It previously acted as a misleading alias for
`optimization_barrier` and never controlled memory residency. Weight residency
belongs to each scheme through `volatile`.

Supported dtype spellings are `f32`, `f16`, `i32`, `i16`, `i8`, `i4`, `u32`,
`u8`, and `u4`.

### Scheme fields

Each scheme requires `format`. For the currently implemented weight-storage
contract, `scope`, `lifetime`, and `update` default to `constant`, `immutable`,
and `none`.

```toml
[[policies."model.layers.*.mlp.down_proj.weight".schemes]]
format = "q4k"
volatile = true
```

| Field | Default | Meaning |
|---|---:|---|
| `format` | required | Codec used for persisted bytes. |
| `scope` | `constant` | Value class matched by the scheme. |
| `lifetime` | `immutable` | Logical lifetime of the value. |
| `update` | `none` | Allowed update mode. |
| `volatile` | `false` | Discard clean host pages after invocation while preserving the package mapping. |

`volatile = true` does not evict device memory and does not make a weight
mutable. On a host backend, a later access can fault discarded pages back from
the package. The Runtime keeps the mapping valid because IREE parameter
providers and VM bytecode retain non-owning views into it.

The current Compiler executes constant/immutable schemes. Invocation- and
session-lifetime codec storage remains reserved by the shared contract and is
rejected until its runtime semantics are implemented.

Codec references may be qualified as `package:export`. A bare name can resolve
to a homonymous package export when unambiguous.

Generic policy does **not** define codec-owned keys such as block size,
granularity, storage layout, rounding, saturation, or arbitrary parameter maps.
Those decisions belong to the codec implementation.

!!! important "Root policy"
    A deployable compiler plan requires a root policy with a dtype and a scheme
    capable of covering immutable constant weights. This makes the default
    deployment behavior explicit before path-specific overrides are applied.

## `[entrypoint]`

```toml
[package]
name = "app"

[entrypoint]
package = "model"
```

`package` is the root package name or a direct dependency alias. The selected
package must provide a usable entrypoint facet. SYNaPSe derives it in this
order: an Orchestration build (Wasm), otherwise a Native build, otherwise a
Graph build. For Orchestration and Native, the public `forward` entrypoint is
implicit. A Graph-only package exposes its surviving logical graph path as the
entrypoint. Graph exports are discovered from their SDK types, and graph
modules own their input specializations.

The current entrypoint resolver looks for the unlabelled `[build.orchestration]`,
`[build.native]`, and `[build.graph]` facets. A package that only declares a
labelled facet such as `[build.native.tokenizer]` does not provide an
application entrypoint through that facet; keep the entrypoint component under
the canonical unlabelled domain table.

Composition-only packages may omit `[entrypoint]`.
The current graph package adapter supports specialization arities of 1, 2, 3,
4, or 6 tensor inputs.

A deployable root package must select one public entrypoint. The current
compiler requires at least one specialization for a graph entrypoint.

## `[[hooks]]`

Graph hooks transform a module boundary during compilation:

```toml
[[hooks]]
path = "model.layers.*.attention"
function = "extension:attention-hook"
```

`*` matches one path segment. SYNaPSe recognizes this as a graph hook because
the referenced facet is a build-time package.

Runtime hooks transform the Buffer entering a represented path:

```toml
[[hooks]]
package = "qwen"
path = "qwen3.5"
function = "rag:augmentation"
```

`package` must name the root package or one of its direct dependencies and says
which composed piece owns the intercepted route. `path` selects the represented
route. `function` always identifies a package facet. An orchestration facet exports the
implicit `forward` and becomes a runtime hook; a build-time facet becomes a
graph hook. Runtime hooks run in declaration order. Direct calls that are not
represented as paths do not pass through this router.

## Validation workflow

Use the cheapest validation step that answers the question:

```bash
synps graph     # dependencies and capability bindings
synps inspect   # effective Compiler and build plan
synps build     # compile and package the artifact
```

See [Diagnostics](../notes/diagnostics.md) for diagnostic-code families and
[Build workflow](../notes/build-workflow.md) for ordering.
