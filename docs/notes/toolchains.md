# Toolchains

SYNaPSe toolchains select source-language compilers for build packages. They are
separate from the IREE graph target backend selected by graph policy.

## Declare a toolchain

```toml
[toolchain.cpp.native.aarch64]
compiler = "aarch64-linux-gnu-g++"
triple = "aarch64-linux-gnu"
flags = ["-O3"]
```

Fields are `language`, `compiler`, `linker`, `archiver`, `triple`, and `flags`.
Supported language drivers are C, C++, Rust, Zig, and Go.

## Inherit by domain and target

```toml
[toolchain.cpp]
compiler = "clang++"

[toolchain.cpp.orchestration."*"]
compiler = "${WASI_SDK_PATH:-/opt/wasi-sdk}/bin/clang++"
triple = "wasm32-wasi"

[toolchain.cpp.native.aarch64]
compiler = "aarch64-linux-gnu-g++"
triple = "aarch64-linux-gnu"
```

The language table supplies defaults. Domain and target descendants inherit
and override them. A build artifact normally selects the family with
`toolchain = "cpp"`; it may select a fully qualified compatible entry when a
project needs an explicit override.

## Selection precedence

The current registry resolves from the most explicit applicable choice toward
language discovery:

1. fully qualified build-artifact `toolchain`;
2. the most specific compatible `toolchain.<language>.<domain>.<labels>`;
3. the language parent;
4. automatic language-driver discovery.

Ambiguous choices fail rather than depending on manifest order.

## Environment expansion

Toolchain configuration supports:

- `~/...`;
- `${VAR}`;
- `${VAR:-fallback}`.

```toml
[toolchain.cpp.orchestration."*"]
compiler = "${WASI_SDK_PATH:-/opt/wasi-sdk}/bin/clang++"
```

## C and C++

Native host discovery uses common C and C++ compiler names. Orchestration written
in C or C++ expects a
WASI-capable Clang toolchain and can use `WASI_SDK_PATH` or `/opt/wasi-sdk`.

## Rust

The Rust driver uses Cargo with `--locked` and forwards release/target
configuration through the selected toolchain path. Hermetic deployments may
configure Cargo source replacement to a vendored registry; network isolation
is an environment policy rather than an unconditional compiler flag.

## Zig

The Zig driver uses Zig for its supported build forms.

## Go

Native Go uses the Go toolchain. Orchestration written in Go requires TinyGo in the current driver;
missing TinyGo is a dedicated SYNaPSe diagnostic.

## Cross-compilation rule

Cross-compile **Native** packages with a target compiler. Keep `iree` graph
plugins build-host compatible because the Compiler must load them locally.
Graph hardware targeting is performed later by the IREE Compiler and is not
implied by the native toolchain's target triple.
