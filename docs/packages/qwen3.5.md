# Qwen3.5-2B

This repository ports Qwen3.5-2B as an ecosystem package separate from the PLeX
core. Text, multiple encoded images, and sampled video frames use the same
public entrypoint.
Model-port pages describe how an optional package composes with PLeX; they are
not part of the core feature list on the documentation home page.

## Integration boundary

The package supplies:

- a `graph` facet exporting the language decoder and 24-layer vision encoder;
- an `orchestration` facet exporting `forward`;
- a Native tokenizer provider;
- a Native image provider for decode, resize, normalization, patches, position
  interpolation, and visual RoPE.

The consuming root application remains responsible for:

- dependency selection and package variables;
- checkpoint paths;
- codec/storage policies;
- graph target policy;
- deployment.

The decoder owns its configuration-dependent graph specializations. The root
project configures the package once; it does not repeat physical graph paths or
input shapes.

Select it through a dependency alias:

```toml
[package]

[entrypoint]
package = "qwen"

[dependencies]
qwen = { git = "https://github.com/useplx/Qwen3_VL.git", version = "v1.0.0" }
```

No application-specific C++ wrapper is required.

## Configuration

```toml
[packages.qwen]
context = 1024
max_new_tokens = 224
prefill_chunk = 128
```

`prefill_chunk` controls how many prompt tokens are processed by each prefill
specialization. It does not change the token-by-token streaming contract.

## Image input

Use the typed input from the package. The Runtime selects its argument
serialization automatically:

```cpp
Qwen3VL::Input request{
    .content = {
        Qwen3VL::Text{"Compare these images: "},
        Qwen3VL::Image{first_encoded_image},
        Qwen3VL::Text{" and "},
        Qwen3VL::Image{second_encoded_image},
    },
};

session.invoke(
    "qwen3.5",
    request,
    [](std::string text) {
        std::print("{}", text);
    });
```

Content order is preserved. Images use the checkpoint's dynamic smart resize;
videos receive already sampled encoded frames and their sampling rate. The
visual result remains associated with the Session while the decoder consumes
it; it is not downloaded and uploaded for each generated token.

The vision encoder selects a compiled patch-range specialization while keeping
the checkpoint's smart-resize result unchanged. Multiple media items remain
isolated inside visual attention, and padding introduced for specialization is
not exposed as prompt content.

The package covers the checkpoint's inference architecture and common chat
generation path. Media container decoding, batching, training, and the
Transformers tool-calling message API are outside this package.
