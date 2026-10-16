# Artifacts

A `.mln` is the deployment boundary of PLeX. SYNaPSe writes it, MyeLiN loads it,
and tooling can inspect its package sections without executing the application.

## Contents

The current container format can hold named sections for:

- compiled VM bytecode;
- parameter archives;
- Wasm modules;
- Native modules;
- assets;
- metadata and device information;
- graph entrypoint signatures;
- public application entrypoints;
- ordered Runtime hook routes;
- runtime, Native and Driver ABI requirements plus the native platform.

The exact set depends on the project.

## Single mapping

`Mln::Package::File` opens and maps the package so section views can reference
artifact bytes without copying the complete file into heap buffers. The runtime
can therefore attach graph bytecode and parameter archives directly from mapped
sections where the underlying APIs permit it.

## Build

```bash
synps inspect
synps build --release
```

The root output is:

```text
build/<project-name>.mln
```

## Assets

Files under the root project's layout asset directory (default `assets/`) are
packaged by name:

```text
app/
├── assets/
│   ├── tokenizer.json
│   └── labels.txt
└── synps.toml
```

Orchestration retrieves an asset with `session.asset(name)`.

## Weights

The project can provide one checkpoint path or multiple paths through
`[weights]`. SYNaPSe fingerprints weight inputs in the build DAG so a changed
checkpoint invalidates the relevant packaging work.

The Compiler decides the output parameter representation from codec policies
and writes the parameter archive included in the final `.mln`. Each parameter
record also carries its host-residency policy. For a volatile weight, MyeLiN
keeps the mapping valid for IREE but asks the operating system to discard clean
backing pages after an invocation. A later CPU access can fault them back;
device-resident storage is unaffected.

## Inspect package metadata

`Mln::Package::File::open()` maps an artifact and exposes its typed sections
without opening a runtime device. Application execution should still use
`Mln::Runtime` rather than parsing sections directly.

## Runtime compatibility

The package format carries a version and explicit runtime, Native and Driver
ABI requirements. Native/Driver artifacts also carry their build platform.
Unknown mandatory sections are rejected; unknown optional sections are kept
available to metadata tooling and skipped by runtimes that do not implement
them. This permits additive format evolution without guessing at semantics.

## Public vs. internal package API

Applications should normally use `Mln::Runtime` instead of manually
parsing artifact sections. `Mln::Package::File` and `Mln::Package::Builder` are
public C++ types used by the toolchain/runtime contracts, but the binary section
layout is not an application-level interoperability promise.
