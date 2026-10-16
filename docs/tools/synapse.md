# SYNaPSe

SYNaPSe is the PLeX project and package manager and build orchestrator. It turns a
root `synps.toml` plus reusable source packages into a deployable `.mln`.

## Responsibilities

- parse and validate project and package manifests;
- resolve local and Git dependencies;
- resolve capabilities and package variables;
- select language toolchains;
- build the Graph, Orchestration, and Native DAG;
- load the MyeLiN compiler API;
- compile graph and weight inputs;
- package the final artifact.

SYNaPSe does not execute applications; deployment belongs to the
MyeLiN Runtime.

## Main surfaces

| Goal | Documentation |
|---|---|
| Create/build a project | [Build a project](../guide/build-a-project.md) |
| Author reusable packages | [Create a package](../guide/create-a-package.md) |
| Configure the manifest | [`synps.toml` reference](../api/synps-toml.md) |
| Use commands | [`synps` CLI](../api/synps-cli.md) |
| Understand planning | [Build workflow](../notes/build-workflow.md) |
| Configure compilers | [Toolchains](../notes/toolchains.md) |

## Compiler boundary

The bundled compiler links IREE compiler infrastructure and currently enables
the LLVM CPU target backend. Graph packages are host plugins loaded through the
compiler package ABI; orchestration and Native packages are built by their own language
toolchains.

An alternate compiler can be selected through `MLN_COMPILER_API` when it is ABI
compatible.

## Dependency boundary

Local and Git package sources are usable. Registry resolution is not currently
implemented. `synps.lock` is written as a resolution snapshot but is not yet
consumed by normal resolver runs; pin Git `rev` values when reproducibility is
required.

Source: [github.com/useplx/SYNaPSe](https://github.com/useplx/SYNaPSe)
