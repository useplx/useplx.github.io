# Compilation pipeline

This page describes the build path from C++ graph packages to the IREE program
inside a `.mln` artifact.

## 1. Resolve the project

SYNaPSe loads the root `synps.toml`, resolves local/Git dependencies,
capabilities, package variables, and build-package composition.

```bash
synps graph
```

## 2. Build graph plugins

An `iree` build package is compiled as a build-host library. The generated
package adapter exposes the objects listed in `exports`, such as a root
`Mln::Sdk::Module` or codec.

The plugin is host code used only while compiling; it is not the graph program
shipped to the target.

## 3. Construct and validate the compiler plan

SYNaPSe resolves:

- graph exports;
- source checkpoint formats;
- policies and codecs;
- weights;
- hooks;
- entrypoints and input specializations.

```bash
synps inspect
```

The compiler rejects missing root policy, invalid codec compatibility,
unsupported shapes/arities, unresolved exports, and other inconsistent inputs
before packaging.

## 4. Build MLIR

The exported `Module` constructs tensor operations. Compiler policy is applied
by path while the graph is emitted; deployment policy is not stored on the
`Module` itself.

Graph-side codec decode stays visible as operations near the consumer, which
preserves the opportunity for IREE to fuse unpack/dequantization with the
following computation.

### Compatibility coverage

During graph emission, SYNaPSe records the operation and codec combinations
actually used by each backend. Compatibility packages remain contextual: a rule
may cover one shape or consumer chain without claiming every occurrence of the
same operation. Target properties are part of the matrix identity, so two
devices exposed through the same backend (for example two Vulkan GPUs) do not
share coverage accidentally.

An uncovered combination currently emits one deduplicated warning and is added
to the compilation report. This means that no package declared an explicit
correction for that combination; it does not mean that the canonical StableHLO
operation or IREE backend is unsupported. The matrix is diagnostic data for
package authors today and is also the input intended for future hardware-driven
policy selection. It never changes model policy by itself.

## 5. Lower through IREE

The current bundled SYNaPSe Compiler is built with IREE target-backend defaults
disabled and `IREE_TARGET_BACKEND_LLVM_CPU=ON`. Its normal end-to-end target is
therefore `local`, with:

```text
--iree-hal-target-device=local
--iree-hal-local-target-device-backends=llvm-cpu
```

The policy representation and compiler code understand other device names, but
a device is only buildable if the Compiler binary contains the corresponding
IREE target backend.

The compiler can lower a graph plan with multiple backend assignments. IREE
Stream partitions the graph and inserts the required dependencies and data
transfers; topology links can describe supported device-to-device paths. This
does not mean every backend combination is available in every build: the
compiler must contain each target backend, the runtime must contain compatible
drivers, and the selected devices must satisfy the artifact requirements. See
[Devices and scheduling](devices.md) for configuration and limits.

## 6. Package weights and application modules

Selected weights are encoded into parameter storage. Wasm and Native build
packages are built with their own toolchains. Assets and deployment metadata are
collected with the graph output.

## 7. Write the artifact

The root project produces:

```text
build/<package-name>.mln
```

The deployment machine consumes that artifact through the MyeLiN Runtime. It
does not need the SYNaPSe compiler.

## Compiler vs runtime support

A compiler target and runtime driver are separate requirements. For example,
building MyeLiN with `MLN_ENABLE_VULKAN=ON` adds a Vulkan HAL **runtime driver**;
it does not add the Vulkan **compiler target backend** to an already-built
SYNaPSe Compiler.

See [Devices and scheduling](devices.md) for the complete boundary.
