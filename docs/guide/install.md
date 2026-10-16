# Installation

PLeX is built from source. A development machine normally needs **SYNaPSe** to
build artifacts and **MyeLiN** for the SDK and Runtime contracts and execution.

## Requirements

- Linux;
- Git;
- CMake 3.21 or newer;
- Ninja or Make;
- a C++23 compiler;
- the Wasmtime C++ headers and library for `MyeLiN::runtime`;
- wasi-sdk when a project contains Orchestration packages written in C or C++;
- the language toolchain used by any selected Rust, Zig, or Go build package.

Both MyeLiN and SYNaPSe build against the IREE source pinned in their source
trees. Initialize repository submodules before the first build.

!!! note "The compiler build is the large one"
    A SYNaPSe build with its Compiler enabled builds IREE's compiler stack and
    LLVM. A runtime-only MyeLiN build is substantially smaller.

## Build MyeLiN

```bash
git -C MyeLiN submodule update --init --recursive
cmake -S MyeLiN -B MyeLiN/build -G Ninja \
  -DCMAKE_BUILD_TYPE=Release
cmake --build MyeLiN/build --parallel 2
ctest --test-dir MyeLiN/build --output-on-failure
```

Useful options:

| CMake option | Default | Effect |
|---|---:|---|
| `MLN_BUILD_RUNTIME` | `ON` | Builds `MyeLiN::runtime`. |
| `MLN_BUILD_TESTS` | `ON` | Builds MyeLiN tests. |
| `MLN_ENABLE_CUDA` | `OFF` | Adds the IREE CUDA HAL driver to the runtime build. |
| `MLN_ENABLE_VULKAN` | `OFF` | Adds the IREE Vulkan HAL driver to the runtime build. |
| `MLN_ENABLE_RUNTIME_BACKTRACES` | `ON` | Enables IREE runtime backtraces. |
| `MLN_ENABLE_SANITIZERS` | `OFF` | Enables sanitizer instrumentation for MyeLiN targets. |

`local-sync` and `local-task` are enabled in the runtime by default.

## Build SYNaPSe

```bash
cmake -S SYNaPSe -B SYNaPSe/build -G Ninja \
  -DMLN_ROOT=/absolute/path/to/MyeLiN \
  -DCMAKE_BUILD_TYPE=Release
cmake --build SYNaPSe/build --parallel 1
```

The Compiler build includes IREE and LLVM and can use substantial memory. Start
with the conservative parallelism above; increase it only after confirming the
machine has enough RAM and swap for the compiler build.

`MLN_ROOT` is the MyeLiN **source tree**, not a package dependency. SYNaPSe uses
its public headers and, when building the Compiler, the pinned IREE tree under
MyeLiN may also be used.

The default SYNaPSe Compiler configuration enables the IREE LLVM CPU target.
Add `-DSYN_ENABLE_CUDA=ON` and/or `-DSYN_ENABLE_VULKAN=ON` when this Compiler
must emit those targets. `MLN_COMPILER_API` may point `synps` at another
ABI-compatible Compiler library when a different Compiler build is required.

Confirm the CLI is available:

```bash
SYNaPSe/build/synps help
```

## Install SYNaPSe

```bash
cmake --install SYNaPSe/build --prefix "$HOME/.local"
python SYNaPSe/tests/install/check.py SYNaPSe/build
```

The installation includes the compiler service, package headers, SDK sources
needed for Graph and Orchestration builds, and the compiler's pinned IR headers.
These resources live under `share/synps/sdk` and are located relative to the
installed executable, so the installation prefix can be moved. A build from
the source tree continues to use that tree. `MLN_ROOT` explicitly overrides the
MyeLiN SDK location; language compilers and wasi-sdk are still external tools.

Compiler compatibility extensions using `Mln::Ir` must be rebuilt against the
headers shipped with that compiler. These aliases encapsulate vendor names but
retain the upstream types and their revision-specific host ABI. This boundary
is separate from the stable C compiler service and Runtime ABIs.

The installation check moves a temporary prefix and builds Native and Graph
artifacts, including a compiler compatibility plugin, using the installed SDK.
Add `--run` to execute them when the MyeLiN binding and runtime are available.

## Runtime drivers are not compiler targets

SYNaPSe's `SYN_ENABLE_CUDA` and `SYN_ENABLE_VULKAN` options control **compiler
targets**. MyeLiN's corresponding `MLN_ENABLE_CUDA` and `MLN_ENABLE_VULKAN`
options control **runtime HAL drivers**. A complete non-CPU deployment needs
both sides enabled; the package policy chooses which enabled target is emitted.

## Next

Continue with the [Quickstart](getting-started.md).
