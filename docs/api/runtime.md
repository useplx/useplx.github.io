# MyeLiN Runtime

The MyeLiN runtime is the host API for loading and executing a finished `.mln`
artifact.

The Runtime executes the artifact contract independently of whether the
application is a machine-learning model, a data pipeline, or another
heterogeneous workload.

## Create a session and load

```cpp
#include <mln/runtime/runtime.hpp>

Mln::Runtime runtime;
auto session = runtime.session();
session.load("build/app.mln");
```

A `Session` is move-only. Loading validates package metadata and parameters,
validates the artifact ABI/platform requirements, loads its native and Wasm
modules, and initializes the device-backed graph packages.

## Invoke from a host application

The callback interface is the public host-facing path:

```cpp
Mln::Buffer input(/* bytes */);

session.invoke(
    "application.generate",
    input,
    [](std::span<const std::uint8_t> bytes) {
        // Consume one emitted value.
    });
```

`session.invoke(input, callback)` selects the default public entrypoint. Use the
named overload when an artifact exposes more than one.

The callback is synchronous and the span is borrowed only for the duration of
the call. Copy it if the bytes must outlive the callback.

Typed invocation is also available for values supported by the Runtime and Native
serialization traits:

```cpp
session.invoke("application.classify", request, [](Result result) {
    // typed result
});
```

## Graph-facing invocation

orchestration and native integration can use the synchronous buffer forms:

```cpp
auto output = session.invoke("model.forward", std::move(input));
```

There are also vector forms for entrypoints with multiple buffers. These are
part of the orchestration-facing runtime contract, not a second deployment
mechanism.

!!! note "Two different name spaces"
    The two invocation forms above do not take the same string.

    | Caller | Name | Built from |
    |---|---|---|
    | Host application, `Session::invoke` | public entrypoint | `[entrypoint].package`, after dependency alias resolution |
    | orchestration, native provider | graph logical path | the module path, such as `model.forward` |

    A graph namespace qualifies physical compiler symbols. It does not become
    part of the logical path passed to `Session::invoke`.

## Session state

```cpp
auto state = session.state("cache", bytes);
state.write(source);
state.read(destination);
```

`Session::State` exposes a named buffer whose lifetime is tied to the loaded
session. A state can also be initialized from an existing `Buffer`.

## Assets and emitted output

```cpp
auto tokenizer = session.asset("tokenizer.json");
session.emit(output);
```

`asset(name)` returns bytes packaged into the artifact. `emit(value, offset)`
publishes an output value to the current invocation's host callback.

## Ownership model

- Each `Runtime` owns its own physical execution infrastructure; separate
  Runtime instances do not share mutable execution state implicitly.
- A `Session` refers to one Runtime and owns its isolated set of loads,
  entrypoints, states, assets, and execution state.
- `Buffer` owns its bytes independently of both.
- `Session::State` is session-scoped persistent storage.

## Profiling

HAL-native profiling is configured in `myelin.toml`. `{capture}` is replaced
with a unique capture id, preventing concurrent sessions from sharing a file:

```toml
[runtime.profile]
output = "captures/run-{capture}.ireeprof"
device_timing = true
```

The legacy environment variables remain available for transition:

```bash
MLN_PROFILE_OUTPUT=run.ireeprof ./application
iree-profile summary run.ireeprof
```

The default capture requests portable queue, executable metadata, and memory
events. Vulkan and other drivers with device timestamp support can additionally
capture dispatch timing:

```bash
MLN_PROFILE_OUTPUT=run.ireeprof \
MLN_PROFILE_DEVICE_TIMING=1 \
./application
```

Runtime selection is also configured here. `variants` bounds lazy candidate
materialization and prevents an unbounded Cartesian product:

```toml
[runtime]
scheduler = "throughput" # static, latency, throughput, or adaptive
memory = "8GiB"
variants = 8

[backend.local]
device = "local"
ordinal = 0
threads = 8
```

External drivers declare and validate their own keys under `[backend.<name>]`.
`memory` is a per-variant admission budget derived from IREE allocator
statistics. A dispatch is rejected when every compatible variant is already at
the budget; it is not an estimate of total system or global GPU utilization.

Support is a property of the selected IREE HAL driver. The Runtime reports an
error if a requested data family is unavailable instead of creating an empty
or misleading profile. In the pinned IREE revision, HAL-native CUDA profiling
is not implemented.

## See also

- [Artifacts](../guide/artifacts.md)
