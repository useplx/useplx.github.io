# Concepts

These pages explain the mechanisms behind PLeX. Use them when you need to
understand *why* a manifest behaves a certain way or where a responsibility
belongs. For exact keys and signatures, use [Reference](../api/index.md).

## Execution and compilation

| Topic | Covers |
|---|---|
| [Execution model](execution-model.md) | Graph, orchestration, Native providers, and their runtime relationship. |
| [Graph paths & policies](granularity.md) | Path matching, inheritance, policy merge order, and schemes. |
| [Compilation pipeline](compilation.md) | From graph package export to IREE bytecode and the final `.mln`. |
| [Devices](devices.md) | Compiler targets, runtime drivers, URIs, and the support boundary in this source tree. |

## Build system

| Topic | Covers |
|---|---|
| [Build workflow](build-workflow.md) | Resolution, planning, caching, compilation, and packaging. |
| [Dependency resolution](package-resolution.md) | Local/Git sources, capabilities, variables, and the current lockfile behavior. |
| [Build domains](build-domains.md) | `iree`, `wasm`, and `native` build packages. |
| [Toolchains](toolchains.md) | Compiler discovery, explicit toolchains, Orchestration compilers, and cross-compilation. |

## Operations

| Topic | Covers |
|---|---|
| [Diagnostics](diagnostics.md) | Diagnostic-code families and how to read failures. |
