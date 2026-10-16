# Build a project

A project is the composition and deployment layer of PLeX. Keep reusable
implementation in packages and keep target-specific choices in the consuming
project.

## Start from a manifest

```bash
synps new app
cd app
```

The generated manifest contains only identity:

```toml
[package]
name = "app"
version = "0.1.0"
```

A deployable project also needs build packages, at least one public entrypoint,
policies, and whatever dependencies/weights/assets those components require.

## Add dependencies

Use local paths while developing related repositories:

```toml
[dependencies]
component = { path = "../component" }
codec = { git = "https://github.com/useplx/Quantizations.git", version = "v1.0.0" }
```

Registry-style version dependencies are parsed by the manifest but registry
resolution is not implemented. Use path or Git sources today.

## Configure dependency variables

A dependency may publish a `[package.variables]` schema. The root project sets
those values under `[packages.<dependency>]`:

```toml
[packages.component]
context = 2048
```

SYNaPSe rejects unknown packages, unknown fields, type mismatches, required
values that are missing, and numeric values outside declared ranges.

## Compose build packages

A root build package can absorb build packages from dependencies with
`extends` and link build artifacts with `uses`:

```toml
[build.orchestration]
toolchain = "cpp"
sources = ["src/application.cpp"]
extends = ["component:orchestration"]
```

`extends` combines sources/build metadata into the consuming build package;
`uses` keeps a separately built artifact as a build/link input.

## Select the public entrypoint

```toml
[entrypoint]
package = "component"
```

When `component` is a dependency alias, SYNaPSe selects that package. Its graph
and orchestration facets supply the physical bindings; the root project does
not repeat them.

## Declare graph policy

A minimal root policy needs a dtype, backend, and immutable-constant scheme:

```toml
[policies."model"]
dtype = "f16"

[policies."model".backend]
device = "local"

[[policies."model".schemes]]
format = "f16"
```

Add narrower policies only where the model needs a different decision. See
[Graph paths & policies](../notes/granularity.md).

## Add weights

The root project supplies checkpoints:

```toml
[weights]
path = "${MODEL_WEIGHTS}"
```

or:

```toml
[weights]
paths = ["part-00001.safetensors", "part-00002.safetensors"]
```

Exactly one of `path` or `paths` is accepted and `paths` cannot be empty.
`${VAR}` references in weight paths must be set.

## Add assets

The default asset directory is `assets/`. Files found there are included in the
artifact and exposed to orchestration through `session.asset(name)`.

Change the layout when needed:

```toml
[layout]
assets = "deployment-assets"
```

## Inspect the resolved build

```bash
synps graph
synps inspect
```

Run these before long builds. `inspect` is the best way to verify which
build-package runtime, toolchain, entrypoint, policy, hook, weight source, and
artifact module the current manifest resolves to.

## Build and clean

```bash
synps build --release
synps clean
```

The artifact path is `build/<root-package-name>.mln`. `clean` removes the local
`build/` directory, not the Git dependency cache or `synps.lock`.

## Record dependency resolution

`synps install` and `synps update` currently both resolve the manifest and write
`synps.lock`. The resolver does **not** currently read that lockfile back to pin
a later resolution, so reproducibility comes from immutable Git `rev` values or
local source control, not from lockfile consumption.
