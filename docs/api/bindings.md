# Bindings

PLeX bindings expose the MyeLiN contracts to a host language. The complete
surface has two parts: the authoring SDK (modules, codecs, orchestration, and
native integration) and the runtime API (artifacts, sessions, buffers, and
execution). The C++ interfaces are documented in the [SDK](sdk.md) and
[Runtime](runtime.md) references.

| Language | SDK authoring | Runtime |
|---|---|---|
| C++ | [MyeLiN SDK](sdk.md) | [MyeLiN Runtime](runtime.md) |
| Python | Not exposed by the current Python package. | `myelin-runtime`, described below. |

Bindings should preserve the same artifact and session concepts rather than
inventing language-specific execution semantics. The currently available
Python package wraps the MyeLiN C ABI; it loads and runs `.mln` artifacts and
is not a graph-authoring or model-training API. It requires Python 3.10 or
newer and a compatible `libmln_runtime` shared library.

## Python runtime

## Install from the source tree

Build MyeLiN with the runtime enabled, then install the binding:

```bash
python -m pip install ./MyeLiN/python
```

When the runtime library is not on the system library path, point the binding
to it before starting Python:

```bash
export MLN_RUNTIME_LIBRARY=/absolute/path/to/libmln_runtime.so
```

The runtime shared library and Python binding must come from ABI-compatible
MyeLiN builds.

## Load and invoke an artifact

```python
from myelin import Metadata, Runtime

artifact = "build/application.mln"
metadata = Metadata.read(artifact)
print("compiled backends:", metadata.backends)

with Runtime("myelin.toml") as runtime:
    with runtime.session() as session:
        session.load(artifact)
        for chunk in session.stream(b"input"):
            consume(chunk)
```

Pass `backend="local"` (or another value from `metadata.backends`) to
`Session.load` to request a compiled backend explicitly. If omitted, MyeLiN
uses the artifact's alternatives and runtime scheduling policy. A compiled
backend is not proof that the corresponding physical device is installed;
`Runtime.devices()` enumerates devices visible to IREE.

The `entrypoint` argument to `Session.invoke()` and `Session.stream()` is
optional when the artifact has a default public entrypoint. `invoke()` returns
the concatenated output bytes; `stream()` yields output chunks as they arrive.

## Session model

A `Session` is an isolated execution context created by a `Runtime`. It owns
the artifacts loaded into it, their entrypoint namespace, session state, and
per-session execution data. Create it through `runtime.session()` and load
artifacts through `session.load()`:

```python
with Runtime() as runtime:
    with runtime.session() as session:
        session.load("build/application.mln")
        result = session.invoke(b"input")
```

This is logical isolation, not a separate process or a promise of dedicated
physical RAM/VRAM. The Runtime owns shared device and driver infrastructure;
IREE manages device allocations and execution resources.

## Runtime configuration

The optional `Runtime` argument is a path to `myelin.toml`:

```toml
[runtime]
memory = "8GiB"
scheduler = "adaptive"
variants = 8

[backend.local]
device = "local"
ordinal = 0
threads = 8
```

Backend tables are opt-in: when configured, they define the enabled backend
set. Each backend owns its fields. For example, `backend.local` accepts
`threads`; CUDA and Vulkan device tables select `device` and `ordinal` but do
not use that local thread-count setting. Backend names and available options
depend on how MyeLiN was built.

## API summary

| API | Purpose |
|---|---|
| `Metadata.read(path)` | Read compiled backend names, sections, entrypoints, signatures, deployment, parameters, and ABI requirements without creating a runtime. |
| `Runtime(configuration=None)` | Own runtime configuration and enumerate physical devices. Supports `with` and `close()`. |
| `Runtime.session()` | Create an isolated `Session`. |
| `Session.load(path, backend=None)` | Load an artifact, optionally requesting a compiled backend. |
| `Session.invoke(data, entrypoint=None)` | Run once and return the joined bytes. |
| `Session.stream(data, entrypoint=None)` | Yield output chunks; closing iteration cancels an in-flight invocation. |
| `Session.buffers(entrypoint, inputs)` | Invoke with shaped `Buffer` inputs and receive output buffers. |
| `Session.state(name, value)` / `Session.asset(name)` | Read or update session state and retrieve a packaged asset. |
| `Session.devices()` / `Session.routes()` | Inspect selected device routes and their invocation/latency counters. |
| `Buffer.from_bytes(data, shape=...)` | Construct a shaped byte buffer; use `read`, `write`, and `close` to manage its contents. |

`Runtime`, `Session`, and `Buffer` support context management. Prefer `with`
blocks so native runtime resources are released deterministically. Runtime
failures raise `MyeLiNError`; package diagnostics are warnings by default and
can be handled with `Session.set_diagnostic_handler()`.

## Qwen input helper

The package also exports `QwenInput`, `QwenText`, and `QwenImage`. These encode
the Qwen artifact's typed input contract; they are model-specific, not the
generic format for every `.mln`:

```python
from myelin import QwenInput

payload = QwenInput.text("Summarize this passage.").encode()
```

See [Qwen3.5](../packages/qwen3.5.md) for that artifact's supported content.
