# Dependency resolution

A PLeX package is a directory with a `synps.toml`. The root project and its
reusable dependencies use the same package format.

## Local dependencies

```toml
[dependencies]
codec = { path = "../Quantizations/F16" }
```

The path is relative to the declaring manifest.

## Git dependencies

```toml
[dependencies]
model = { git = "https://github.com/useplx/Qwen3_VL.git", version = "v1.0.0" }
```

The resolver caches Git sources under `~/.cache/synapse`. Selection preference
for Git dependencies is an explicit `rev`, then a declared version selector,
then the repository's default HEAD when neither is supplied.

Use `subdir` when one repository contains multiple packages:

```toml
[dependencies]
f16 = { git = "https://github.com/useplx/Quantizations.git", version = "v1.0.0", subdir = "F16" }
```

The resolved subdirectory must remain inside the checked-out repository.

Use a commit `rev` when source identity matters.

## Registry sources

Version/registry syntax exists in the manifest model, but registry resolution
currently reports `Registry::Unavailable`. Public docs should not present a
registry workflow as usable yet.

## `synps.lock`

```bash
synps install
```

writes a lockfile describing the just-resolved package graph.

!!! important "Current behavior"
    Normal dependency resolution does not call `Lockfile::load()`. The lockfile
    is therefore a snapshot, not a source of pinning for subsequent `build` or
    `install` operations in this implementation. `synps update` currently calls
    the same install/resolution path and rewrites the snapshot.

Do not rely on lockfile consumption for reproducibility until the resolver uses
it. Pin Git commits in `synps.toml` instead.

## Aliases

The key under `[dependencies]` is the local alias:

```toml
[dependencies]
text = { path = "../TextPackage" }

[packages.text]
context = 2048
```

That alias is also used where the configuration refers to a dependency package.

## Capabilities

Packages can declare abstract requirements:

```toml
[capabilities]
provides = ["generator"]
requires = ["tokenizer"]
```

When one provider satisfies a requirement, resolution can select it. When the
choice is ambiguous, the root chooses explicitly:

```toml
[bindings]
tokenizer = "text-tools"
```

## Variables

A reusable package publishes a schema:

```toml
[package.variables]
context = { type = "uint32", default = 2048, min = 1, define = "MODEL_CONTEXT", facets = ["graph", "orchestration"] }
```

The root may configure variables of a direct dependency:

```toml
[packages.text]
context = 4096
```

Unknown names, type mismatches, and bounds violations are errors.
Facet-scoped definitions participate only in the fingerprints of the facets
that consume them.

## Inspect resolution

```bash
synps graph
synps inspect
```

`graph` is the compact view of dependency/capability resolution. `inspect`
continues into the effective build/compiler plan.
