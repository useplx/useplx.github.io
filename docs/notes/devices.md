# Devices

PLeX has two device-facing layers that should not be conflated:

1. the **compiler target** used to lower a graph;
2. the **runtime HAL driver** used to open the device when the artifact loads.

```mermaid
flowchart LR
    policy["policy backend"] --> compiler["IREE target backend"]
    compiler --> artifact["device URI in .mln"]
    artifact --> runtime["MyeLiN HAL driver"]
```

## Policy backend

```toml
[policies."model".backend]
device = "local"
ordinal = 0
```

The compiler maps known device names to runtime URIs:

| Policy device | Runtime URI |
|---|---|
| `local` | `local-task://` |
| `vulkan` | `vulkan://` |
| another device, e.g. `cuda` | `<device>://<ordinal>` |

Vulkan only accepts ordinal `0` in the current compiler because runtime Vulkan
selection is not represented by a portable numeric index here.

## What the bundled Compiler can emit

SYNaPSe always enables the LLVM CPU target and makes GPU targets explicit CMake
options:

| Option | Default | Compiler effect |
|---|---:|---|
| `SYN_ENABLE_CUDA` | `OFF` | Build the IREE CUDA target backend. |
| `SYN_ENABLE_VULKAN` | `OFF` | Build the IREE Vulkan SPIR-V target backend. |

The default build therefore supports:

```text
policy device = local
        ↓
IREE local target + llvm-cpu
        ↓
local-task:// at runtime
```

A CUDA/Vulkan policy is not sufficient by itself. It needs a Compiler build
that actually contains that IREE target backend.

## What MyeLiN Runtime can open

MyeLiN Runtime always builds IREE's `local-task` and `local-sync` drivers.
Optional build flags add runtime drivers:

| Option | Default | Runtime effect |
|---|---:|---|
| `MLN_ENABLE_CUDA` | `OFF` | Build the IREE CUDA HAL driver. |
| `MLN_ENABLE_VULKAN` | `OFF` | Build the IREE Vulkan HAL driver. |

These options do not modify SYNaPSe's compiler binary.

## Multiple backends in one graph

The graph compiler accepts several deployment backends in one plan. Paths are
assigned through policies, while explicit `[[topology.links]]` entries describe
which device pairs permit transparent access or unified memory. Without a
declared link, IREE retains the transfer boundary between those devices.

## Select deployment targets

Each graph path selects its device through its policy backend. Native and orchestration
packages select their own toolchains under `[build.native]` and
`[build.orchestration]`.
Use a deployment-specific manifest when those choices differ.

## Backend flags

A policy can pass backend flags to IREE:

```toml
[policies."model".backend.flags]
iree-hal-local-target-device-backends = "llvm-cpu"
```

PLeX forwards these as `--<key>=<value>`. The keys are backend/compiler options,
so an unknown or unsupported flag ultimately fails in the IREE compiler.

## Inspect deployment metadata

Use:

```bash
synps inspect
```

This shows the resolved build/compiler plan, including the backend selected for
each graph path.
