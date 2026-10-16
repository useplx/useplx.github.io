# Ecosystem

The ecosystem contains reusable packages that plug into PLeX through
`synps.toml`. They are intentionally separate from core PLeX capabilities: the
home page describes the Compiler and Runtime system, while this section documents
optional packages built on top of it.

## Codec packages

[Quantizations](quantizations.md) exports weight-storage codecs such as F32,
F16, BF16, Int8, Q4K, Q5K, Q6K, Q8, and KBlock. Codecs are consumed by the
Compiler to encode parameters and express graph-side decode.

## Model packages

- [Qwen3.5-2B](qwen3.5.md) — text and image generation package.
- [Yolo26](yolo26.md) — object-detection graph, orchestration flow, and Native
  OpenCV preprocessing package.

## Retrieval packages

[RAG](rag.md) exposes embedding, retrieval/vector-index, context-building,
and related Graph, Orchestration, and Native components. It can be composed
with a model package, but it does not require or select a generator itself.

## Package boundary

An ecosystem package can provide one or more build packages, exports,
capabilities, and public configuration variables. The root application still
owns deployment policy, checkpoint paths, entrypoints, and the final `.mln`.

See [Create a package](../guide/create-a-package.md) and
[Build domains](../notes/build-domains.md).
