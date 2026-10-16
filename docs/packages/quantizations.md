# Quantizations

The Quantizations repository provides MyeLiN `Codec` implementations for weight
storage. Each codec is a Compiler-time package export: encoded parameter bytes
and graph decode behavior go into the deployment result, not the codec plugin
library itself.

## Exports in the supplied source

| Package | Export | Description from the package contract |
|---|---|---|
| `f32` | `f32` | 32-bit floating-point storage. |
| `f16` | `f16` | IEEE half precision. |
| `bf16` | `bf16` | Brain floating-point 16-bit storage. |
| `int8` | `int8` | Symmetric 8-bit storage with per-output-row scaling. |
| `q4k` | `q4k` | Q4 affine G32 representation. |
| `q5k` | `q5k` | GGML-style Q5_K, 256-value superblocks. |
| `q6k` | `q6k` | GGML-style Q6_K, 256-value superblocks. |
| `q8` | `q8` | Grouped 8-bit representation with graph decode. |
| `kblock` | `kblock` | Facade over Q5_K/Q6_K layouts. |

The umbrella `quantizations` manifest exports the same codecs as separate build
packages; each codec directory also has its own standalone `synps.toml`.

## Use a codec

```toml
[dependencies]
quantizations = { git = "https://github.com/useplx/Quantizations.git", version = "v1.0.0" }

[policies."model"]
dtype = "f16"

[policies."model".backend]
device = "local"

[[policies."model".schemes]]
format = "f16"

[[policies."model.layers.*.mlp.down_proj.weight".schemes]]
format = "q4k"
```

## Design contract

PLeX's generic scheme specifies scope, lifetime, update behavior, and the codec
export. Storage-specific representation belongs to each codec implementation.
The codec's graph `decode()` remains visible to compiler optimization so decode
and the consuming operation can be optimized together when the backend supports
it.

This repository provides formats, not a universal recommendation that one
format is fastest or most accurate on every model/device. Measure the finished
artifact in the target application and hardware environment.
