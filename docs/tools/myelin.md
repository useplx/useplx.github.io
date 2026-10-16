# MyeLiN

MyeLiN provides the C++ contracts used to describe graphs, orchestration, and
native providers, together with the `.mln` package contract and deployment
runtime.

MyeLiN is general-purpose infrastructure for self-contained heterogeneous
artifacts. Machine learning and language models are supported applications,
not a restriction of its SDK, package format, or Runtime.

## Responsibilities

### SDK

- graph `Module`, tensor, parameter, operation, and codec contracts;
- `Orchestration` contract;
- Native provider ABI and serialization;
- common Functional and `Nn` graph building blocks.

### Runtime

- map and validate `.mln` artifacts;
- create runtime sessions and IREE devices;
- load graph bytecode, parameter archives, orchestration, and Native modules;
- expose public entrypoints;
- provide session state/assets and streamed output;
- expose device statistics and runtime lifecycle events.

MyeLiN does not resolve project dependencies or compile source packages; that is
SYNaPSe's role.

## Build surface

The project exposes installed CMake targets including
`MyeLiN::sdk`, `MyeLiN::package`, and `MyeLiN::runtime`.

The runtime always includes IREE `local-task` and `local-sync` HAL drivers. CUDA and
Vulkan runtime drivers are opt-in with `MLN_ENABLE_CUDA` and
`MLN_ENABLE_VULKAN`. Those runtime flags do not change the target backends built
into the SYNaPSe Compiler; enable those separately with `SYN_ENABLE_CUDA` and
`SYN_ENABLE_VULKAN`.

Building `MyeLiN::runtime` also requires the Wasmtime headers and library for
packaged Orchestration modules represented as WebAssembly.

## Documentation

- [MyeLiN SDK](../api/sdk.md)
- [MyeLiN Runtime](../api/runtime.md)
- [Execution model](../notes/execution-model.md)
- [Artifacts](../guide/artifacts.md)

Source: [github.com/useplx/MyeLiN](https://github.com/useplx/MyeLiN)
