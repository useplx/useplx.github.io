# Core concepts

PLeX keeps authoring, compilation policy, runtime execution, and packaging as
separate concerns. These terms form the public vocabulary used by the rest of
the documentation.

## Project

A **project** is the root `synps.toml` being built. It owns deployment choices:
dependencies, package configuration, public entrypoints, graph policies,
weights, assets, and project-level toolchain overrides.

## Package

A **package** is a reusable source unit described by its own `synps.toml`.
Packages can come from a local path or Git repository. A package may expose one
or more **build packages**, each producing code for a specific execution domain.

## Build package

A `[build.<domain>[.<label>]]` table describes one buildable component. The
domain selects the execution contract; `toolchain` selects the implementation
language and compiler:

- **IREE/Graph** — a host plugin loaded by the Compiler to construct graph IR;
- **Orchestration** — portable imperative control flow packaged into the artifact;
- **Native** — a shared provider built for the deployment platform.

The canonical graph domain is `graph`. Older `[package.<name>]` declarations
remain accepted as compatibility syntax; new manifests should use `[build.*]`.

## Graph module

`Mln::Sdk::Module` describes tensor computation. The root exported module
implements `graph(span<Tensor>)`; normal submodules commonly expose ergonomic
`forward(...)` methods. The SDK preserves module/operation paths while the
Compiler decides backend, dtype, and storage policy.

## Orchestration

`Mln::Sdk::Orchestration` describes imperative request flow and does **not**
derive from `Module`. It can invoke compiled graphs, call native imports, use
session state and assets, and emit output. C and C++ Orchestration is represented
as WebAssembly.

## Graph path

Every named module and parameter has a path such as:

```text
model.layers.12.attention.q_proj.weight
```

Policies and graph hooks match these paths. `*` matches one segment. More
specific policy paths override inherited values from broader paths.

## Policy

A graph policy is deployment configuration applied by the Compiler, not state
stored in `Mln::Sdk::Module`. A policy may provide:

- compute `dtype`;
- a backend/device and backend flags;
- `optimization_barrier`;
- one or more codec schemes selected by scope/lifetime/update and host residency.

The root policy is special: the current Compiler requires it to provide a dtype
and a scheme that covers immutable constants.

## Codec and scheme

A **codec** owns a concrete storage representation and its encode/decode logic.
A **scheme** says where that format applies: scope (`constant`, `input`,
`output`, `internal`, `any`), lifetime (`immutable`, `invocation`, `session`,
`any`), update mode (`none`, `whole`, `region`), and whether clean host pages
may be discarded after invocation (`volatile`). For weight-storage schemes,
scope, lifetime, and update default to `constant`, `immutable`, and `none`.

Storage-specific details such as block layout, rounding, or codec parameters do
not belong to the PLeX scheme schema; the selected codec owns them.

## Entrypoint

A package entrypoint connects:

1. the selected package's available entrypoint facet;
2. its graph exports and typed specializations, when it has a graph;
3. its orchestration or native `forward` export, when present;
4. the logical name exposed by the `.mln`.

The root `[entrypoint]` table selects a local package or dependency alias.
`forward` is the application contract for orchestration and native entrypoints.
SYNaPSe derives physical bindings from the selected package: it prefers an
Orchestration facet, then a Native facet, then a Graph-only entrypoint. A
graph-only application exposes its surviving logical graph path.

The graph Compiler currently requires at least one specialization and supports
1, 2, 3, 4, or 6 graph inputs through its package adapter.

The current resolver derives this entrypoint from the unlabelled
`[build.orchestration]`, `[build.native]`, or `[build.graph]` table. Labelled
facets such as `[build.native.tokenizer]` are build components but are not
selected as the application entrypoint by themselves.

## Hook

A Graph hook transforms a matched graph boundary while the graph is built. A
Runtime hook names an orchestration package function and transforms the Buffer entering a
represented runtime path. Direct C++ calls are not represented paths.

## Capability

Packages can declare capabilities they `provide` and `require`. The root project
can use `[bindings]` to choose which package satisfies a requirement when the
resolution is not unique.

## Artifact

A `.mln` is the deployable container. Depending on the application it holds the
VM bytecode, parameter archives, Wasm modules, Native providers, assets,
entrypoint metadata, and device configuration required by the runtime.

## Session, state, and output

A `Mln::Runtime::Session` is an isolated execution sandbox and can own multiple
loaded artifacts. Their entrypoint names share only that Session's namespace.
Orchestration can create named state, access packaged assets, invoke graph
functions synchronously, and emit bytes. Host applications invoke public
entrypoints through the runtime callback surface.
