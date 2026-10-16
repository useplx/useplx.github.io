# Reference

Reference pages describe the interfaces that PLeX accepts today. They are
organized by surface instead of by implementation repository, so a package
author can go directly from a manifest key or public SDK type to its contract.

## Authoring and execution

| Surface | What it defines |
|---|---|
| [SDK](sdk.md) | Graph modules, tensors, parameters, codecs, orchestration, buffers, and native integration. |
| [Runtime](runtime.md) | Artifact loading, sessions, invocation, state, assets, device statistics, and runtime events. |
| [Bindings](bindings.md) | Binding surface overview and Python APIs for metadata, runtime configuration, sessions, buffers, and streaming. |

Installed CMake targets:

| Target | Purpose |
|---|---|
| `MyeLiN::sdk` | Author graph, orchestration, and native packages. |
| `MyeLiN::package` | Package/artifact contracts used by tooling. |
| `MyeLiN::runtime` | Load and execute `.mln` artifacts. |

## Configuration and command line

| Surface | Reference |
|---|---|
| Project manifest | [`synps.toml`](synps-toml.md) |
| Project/package manager | [`synps`](synps-cli.md) |
| Errors | [Diagnostics](../notes/diagnostics.md) |

## Reference boundary

The reference documents public authoring and runtime contracts. Internal
artifact sections, compiler implementation types, generated package adapters,
and private ABI helpers are intentionally excluded. The `.mln` binary layout is
an implementation detail; applications should use `Mln::Runtime` instead of
parsing it directly.

For mechanisms and design rationale, use [Concepts](../notes/index.md). For a
working path from an empty directory to an artifact, start with the
[Quickstart](../guide/getting-started.md).
