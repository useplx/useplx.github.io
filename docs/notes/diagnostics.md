# Diagnostics

SYNaPSe reports configuration and build failures as a `Diagnostic` carrying a
numeric `Error::Code`, a message, and—when available—the manifest/build location
that needs attention.

Codes are grouped by subsystem so the prefix narrows the failure before the full
message is read.

## Code families

| Range | Subsystem | Typical failures |
|---|---|---|
| `E10x` | Package resolution | missing manifest, dependency cycle, unresolved/ambiguous capability, unavailable registry |
| `E12x`–`E13x` | Toolchains/language drivers | missing MyeLiN root, unavailable/ambiguous compiler, unsupported output, TinyGo requirement |
| `E14x`/`E19x` | Compiler-plan routes | missing/duplicate entrypoint, invalid module, package, path, or hook route |
| `E15x` | Build-package composition | unknown runtime, missing source/path, `extends` errors, export/reference errors |
| `E16x`/`E18x` | CLI | existing target, dependency add/remove errors, usage/options |
| `E17x` | Weights/environment | invalid weight path selection, missing environment values, malformed references |
| `E2xx` | Build DAG | duplicate/invalid node, dependency/input/output failures, DAG cycle |
| `E3xx` | Compiler API | compiler library/symbol/ABI/load/compile failures |
| `E4xx` | Manifest/schema | TOML type errors, missing fields, build-domain/toolchain/schema/variable failures |
| `E5xx` | Lockfile parser | invalid lockfile structure/version/fields |
| `E6xx` | Processes/files | pipe/process start/wait failures, command failure, unreadable files |

## Frequently useful exact codes

| Code | Condition |
|---|---|
| `E101` | A dependency package manifest is missing. |
| `E102` | Dependency cycle. |
| `E103` | Required capability has no provider. |
| `E104` | Capability provider is ambiguous. |
| `E106` | Registry resolution is unavailable. |
| `E121` | No language driver is available. |
| `E122` | Referenced toolchain is not declared. |
| `E124` | Selected toolchain is unavailable. |
| `E125` | Toolchain compiler executable is missing. |
| `E130` | Go Wasm build requires TinyGo. |
| `E131` | Toolchain selection is ambiguous. |
| `E141` | No entrypoint is declared in the compiler plan. |
| `E142` | Duplicate entrypoint name. |
| `E145` | Entrypoint module reference is unknown. |
| `E147` | Entrypoint module is missing. |
| `E190`–`E193` | The selected package entrypoint dependency or path is invalid. |
| `E194` | Runtime hook function is not a `project:package` reference. |
| `E195` | Hook has neither a graph implementation nor a runtime function. |
| `E196` | Runtime hook references an unknown Wasm module. |
| `E197` | Hook targets an unknown composed package. |
| `E150` | Unknown build-package runtime. |
| `E151` | Declared path does not exist. |
| `E153` | Build package has no usable sources. |
| `E156` | Invalid `extends` reference format. |
| `E157` | `extends` project dependency is unknown. |
| `E158` | `extends` build package is unknown. |
| `E159` | Explicit `extends` runtime domains conflict. |
| `E161` | Referenced export is unknown. |
| `E168` | CLI usage is invalid. |
| `E169` | Option requires a value. |
| `E170` | `[weights]` does not select exactly one of `path`/`paths`. |
| `E175` | `weights.paths` is empty. |
| `E180` | Unknown CLI option. |
| `E203` | Build DAG contains a cycle. |
| `E301` | Compiler API library cannot be loaded. |
| `E302` | Compiler API symbol is missing. |
| `E303` | Compiler API is incompatible. |
| `E304` | Graph or Compiler invocation failed. |
| `E413` | TOML is invalid. |
| `E414` | Manifest cannot be found. |
| `E415` | Dependency source is invalid. |
| `E416` | Dependency source selection is ambiguous. |
| `E417` | Unknown build domain. |
| `E418` | Build domain declaration is empty. |
| `E419` | Build domain is duplicated. |
| `E428` | Build-domain toolchain is unknown. |
| `E430` | Manifest section uses a renamed spelling. |
| `E433` | Schema/package variable is unknown. |
| `E434` | Variable value type does not match its schema. |
| `E442` | Package variables were supplied where no schema declares them. |
| `E446`/`E447` | Numeric package variable violates configured range/bounds. |
| `E448` | A Git dependency `subdir` escapes the checked-out repository. |
| `E502` | Lockfile version is unsupported. |
| `E605` | External process returned failure. |
| `E606` | File cannot be read. |

The source catalog contains additional structural type and file/process codes;
when debugging a concrete failure, the emitted message and location are the
primary description of that condition.

## Read the location first

A diagnostic with a manifest location is intended to be actionable, for
example:

```text
policies.model
packages.encoder
weights.path
```

Fix the referenced configuration layer before changing Compiler or Runtime code.

## Escalation order

1. `synps graph` for dependency/capability failures;
2. `synps inspect` for manifest, policy, export, toolchain, and plan failures;
3. `synps build` for source, Compiler, or package failures;
4. Runtime observers and application logs for deployment-time failures.
