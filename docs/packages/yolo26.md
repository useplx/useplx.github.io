# Yolo26

Yolo26 is an ecosystem object-detection package built on the PLeX contracts. It
is not a feature of the PLeX core itself.

## Manifest contract

The supplied package provides the capability:

```text
object-detector
```

and contains three build packages:

| Build package | Domain | Purpose |
|---|---|---|
| `graph` | `iree` | C++ detection graph exported as `detector`. |
| `orchestration` | `wasm` | Portable inference orchestration. |
| `preprocess` | `native` | OpenCV image decoding and resizing. |

The Native preprocess provider links `opencv_imgcodecs`, `opencv_imgproc`, and
`opencv_core`.

## Deployment policy

A consuming application supplies:

- the compatible checkpoint through `[weights]`;
- the root graph policy and codec scheme;
- deployment toolchains and backend policy.

Yolo26 owns its graph specialization and declares `yolo26` as its entrypoint;
the consuming project selects the package by dependency alias.

The repository's standalone manifest selects CUDA and F32 so it can be built
directly. A composing root may select another backend for the Yolo graph path.
Hardware support comes from that Compiler backend plus the compatible MyeLiN
runtime driver described in [Devices](../notes/devices.md).
