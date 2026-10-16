# Compose packages

Composition in PLeX happens in the consuming project's `synps.toml`. Packages
publish named build components, exports, capabilities, and configuration
schemas; the application decides how those pieces are combined.

## Add dependencies

```toml
[dependencies]
graphlib = { path = "../graphlib" }
workflow = { path = "../workflow" }
```

A dependency name is the key used for package configuration and export
references.

## Select a package entrypoint

The root selects a dependency by its alias:

```toml
[package]
name = "app"

[entrypoint]
package = "workflow"
```

SYNaPSe selects the package bound to `workflow` and derives its orchestration `forward`.
Compiler-only references such as codecs and graph hooks still use
`package:export`.

## Absorb source components with `extends`

```toml
[build.orchestration.application]
toolchain = "cpp"
sources = ["src/application.cpp"]
extends = ["workflow:request-flow"]
```

`extends` merges the referenced build package's sources/build metadata into the
consumer. The referenced component is not emitted as a standalone build
artifact.

## Link build artifacts with `uses`

```toml
[build.native.provider]
toolchain = "cpp"
sources = ["src/provider.cpp"]
uses = ["index-core"]
```

`uses` creates a DAG dependency and adds the normalized build-output directory
to the consumer's library search paths. This is useful for a Rust `staticlib`
linked into a Native C++ provider, for example.

## Bind capabilities

A package may require a capability rather than a concrete dependency name. When
more than one provider exists, the root project chooses the binding:

```toml
[bindings]
encoder = "embedding-package"
```

SYNaPSe validates that required capabilities have a provider and that explicit
bindings refer to resolved packages.

## Configure dependency variables

```toml
[packages.graphlib]
width = 1024
```

Only direct root dependencies may be configured here. The dependency's
`[package.variables]` schema determines accepted keys, types, defaults, and
numeric ranges.

## Add graph hooks

```toml
[[hooks]]
path = "model.layers.*.projection"
function = "hook-package:projection-hook"
```

A graph hook runs while the graph is being constructed. It receives the matched
path, module, input tensors, and logical output and returns the transformed
output. It does not create a runtime callback or device dispatch boundary.

## Add runtime hooks

```toml
[[hooks]]
package = "workflow"
path = "generate"
function = "retrieval:augmentation"
```

The function is an orchestration facet, physically compiled to WebAssembly, exporting `forward`. It receives the
incoming Buffer and its result becomes the target path's input. Multiple hooks
for the same path run in manifest order.

## Keep composition directional

A reusable package should not know which application will consume it. Prefer:

- package → publishes exports/capabilities;
- project → selects dependencies, configuration, bindings, entrypoints, hooks,
  policies, weights, and assets.

That direction keeps packages reusable across deployment variants.
