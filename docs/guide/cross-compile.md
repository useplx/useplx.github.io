# Cross-compilation

Cross-compiling a PLeX project means handling three build domains independently.
The graph plugin runs on the **build machine**, Native code runs on the
**deployment machine**, and Orchestration remains portable through its WebAssembly representation.

## Domain model

| Build domain | Built for | Typical compiler |
|---|---|---|
| `graph` | build host | host C or C++ compiler |
| `native` | deployment target | target C, C++, Rust, Zig, or Go toolchain |
| `orchestration` | WebAssembly with WASI | wasi-sdk, TinyGo, or another supported WebAssembly driver |

Do not cross-compile graph package plugins for the target: the SYNaPSe Compiler
must `dlopen` them on the build host.

## Declare toolchains

```toml
[toolchain.cpp]
compiler = "/usr/bin/clang++"

[toolchain.cpp.native.aarch64]
compiler = "/opt/sdk/bin/aarch64-linux-gnu-g++"
triple = "aarch64-linux-gnu"
flags = ["--sysroot=${TARGET_SYSROOT}"]

[toolchain.cpp.orchestration."*"]
compiler = "${WASI_SDK_PATH}/bin/wasm32-wasip1-clang++"
triple = "wasm32-wasi"
```

Toolchain path/flag expansion supports `~`, `${VAR}`, and the parser's
`${VAR:-fallback}` form where used in toolchain configuration.

## Select a family in each artifact

```toml
[build.graph]
toolchain = "cpp"
sources = ["src/graph.cpp"]

[build.native]
toolchain = "cpp"
sources = ["src/provider.cpp"]

[build.orchestration]
toolchain = "cpp"
sources = ["src/application.cpp"]
```

The domain and target-specific toolchain descendants are selected automatically
from the declared language family.

## Override at package level

A root `[packages.<dependency>]` variable is package configuration, not a
compiler override. Toolchain selection belongs to `[build.*]`, a build
package's own `toolchain`, or any explicit package and build package selection
supported by the resolved manifest.

SYNaPSe resolves toolchains with the most specific declared preference first and
otherwise discovers a compatible compiler from the environment.

## Graph target backend is separate

Cross-compiling Native code for ARM does not automatically make the compiled
IREE graph target ARM, CUDA, Vulkan, or another backend. Graph target selection
is a **Compiler** concern. The bundled Compiler currently enables LLVM CPU; use
an ABI-compatible Compiler build with the required IREE target backend when
building another graph target.

Likewise, the target MyeLiN runtime must contain the matching HAL driver.

## Verify before the full build

```bash
synps inspect --project deployment.toml
```

Check the resolved toolchain executable, triple, runtime domain, and graph
backend policy before compiling large model graphs or parameters.
