# `synps` command line

`synps` is the project, dependency, build, and packaging command line for PLeX.
Commands act on the nearest `synps.toml` unless `--project` selects another
manifest.

```text
synps <command> [arguments] [options]
```

## Global option

| Option | Meaning |
|---|---|
| `--project <file>` | Use another `synps.toml` for this command. |

The parser also accepts a single leading dash, but documentation and examples
use the conventional `--long-option` spelling.

## Commands

| Command | Purpose |
|---|---|
| `synps new <name>` | Create a project directory, source/include/assets directories, and a starter manifest. |
| `synps init` | Create `synps.toml` in the current directory. |
| `synps add <pkg>` | Add a dependency. |
| `synps remove <pkg>` | Remove a dependency. |
| `synps install` | Resolve dependencies and write `synps.lock`. |
| `synps update` | Re-resolve dependencies and write `synps.lock`. |
| `synps graph` | Print the resolved dependency/capability graph. |
| `synps inspect` | Print the resolved compiler plan. |
| `synps build` | Build and package `build/<package-name>.mln`. |
| `synps clean` | Remove the project `build/` directory. |
| `synps help [command]` | Show command usage. |

## Create a project

```bash
synps new vision-app
cd vision-app
```

Use `synps init` when the directory already exists.

## Manage dependencies

Local dependency for development:

```bash
synps add quantizations --path ../Quantizations
```

Git dependency:

```bash
synps add quantizations --git https://github.com/useplx/Quantizations.git
```

`add` requires at least one of `--path` or `--git`. Add `version = "v1.0.0"` or
`rev = "<commit>"` to the generated Git dependency before publishing a
reproducible project. `remove` uses the dependency alias as it appears under
`[dependencies]`.

## Resolve

```bash
synps install
synps graph
```

`install` resolves the manifest and writes a lockfile snapshot. In the current
implementation, normal resolution does **not** read that lockfile back to pin a
later build; use immutable Git `rev` values when source reproducibility matters.
`update` currently follows the same resolution/write path as `install`.

## Inspect

```bash
synps inspect
```

Use this before a long compile. It resolves dependencies, package configuration,
exports, policies, formats, hooks, and entrypoints into the plan presented to
the compiler.

## Build

```bash
synps build
synps build --release
synps build --jobs 8
synps build --jobs 8 --weight-memory-mib 2048
```

`--release` asks source-language toolchains for optimized output without debug
symbols. `--jobs N` bounds independent build-DAG actions and accepts values from
1 through 8; the default is the host hardware concurrency capped at 8. Dependencies and order-only dependencies
are always completed before a consumer starts. This is build parallelism and is
independent from the IREE Stream scheduling policy. The same bound reaches the
weight-conversion plan. Independent weight roots are converted concurrently in
declaration order while `--weight-memory-mib` limits their estimated temporary
decoded buffers; its default is 2048 MiB. The final artifact is
written under:

```text
build/<root-package-name>.mln
```

Intermediate outputs and cache entries remain under `build/`.

Devices are selected per graph path by `[policies."path".backend]`. Native and
Orchestration toolchains are selected independently by `[build.native]` and
`[build.orchestration]`; there is no global target override.

## Clean

```bash
synps clean
```

Removes the complete project `build/` directory.

## Help and failures

```bash
synps help
synps help build
```

Unknown commands, malformed arguments, configuration errors, resolution errors,
and build failures are reported with a diagnostic code. See
[Diagnostics](../notes/diagnostics.md).
