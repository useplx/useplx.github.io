# IREE integration audit

This audit is tied to IREE commit
`70491fba035c8687cebe2d70eda0c31cc8d57bae`. The pinned source is the final
authority for every integration below. Current upstream documentation is used
for architectural guidance only.

## Architecture boundary

PLeX owns intent, package resolution, policy, artifact composition and the
public `.mln` boundary. MyeLiN translates that intent and provides the stable
runtime surface. IREE owns graph/dispatch formation, asynchronous scheduling,
resource lifetime, transfers, HAL devices, VM execution and target codegen.

PLeX must not add a second allocator, command-buffer layer, transfer engine or
device scheduler where the pinned IREE already provides the mechanism.

## Capability matrix

| Capability | Pinned IREE | PLeX state | Decision |
|---|---|---|---|
| StableHLO input | available | implemented | Keep the SDK high-level and lower through the standard IREE pipeline. |
| LLVM CPU target | available | implemented | Keep optional target selection separate from runtime drivers. |
| Vulkan/SPIR-V target | available | implemented | Keep opt-in builds and target flags. |
| CUDA target | available | implemented | Keep opt-in; never require CUDA for CPU-only builds. |
| ROCm target | available | implemented, opt-in | `SYN_ENABLE_ROCM` enables the compiler target without affecting minimal builds. |
| Metal/SPIR-V target | available | implemented, opt-in | `SYN_ENABLE_METAL` enables the compiler target without affecting minimal builds. |
| local-task/local-sync drivers | available | implemented | Use the official HAL drivers. |
| CUDA/Vulkan drivers | available | implemented | Keep runtime selection independent of compiler targets. |
| HIP/Metal drivers | available | implemented, opt-in | `MLN_ENABLE_HIP` and `MLN_ENABLE_METAL` keep runtime drivers independent from compiler targets. |
| Multiple target devices | available | implemented | Policies resolve to named HAL target devices. |
| Device affinity | available | implemented | `stream.affinity` carries PLeX placement through IREE dispatch formation. A private compiler pass runs at the official `dispatch-creation` phase boundary and rejects mixed-affinity dispatches. |
| Cross-device transfers | available | implemented | Backend transitions create optimization boundaries; IREE Stream inserts the resource copies, flushes, timepoints, and optimal-device allocations. Shard/module boundaries use the official HAL D2D transfer helper without a PLeX host bounce. |
| Unified memory model | available, default | correctly inherited | Do not invent copies on shared-memory SoCs. |
| Stream async execution/timepoints | available | inherited from pipeline | Do not add a parallel scheduler. |
| Build DAG parallelism | PLeX responsibility | implemented in this work | Execute independent package and graph-shard nodes concurrently with a bounded job count; the resolved weights plan also batches independent roots under a temporary-memory budget. Leave graph scheduling to Stream. |
| Allocation scheduling/reuse/copy elision | available | inherited from pipeline | Inspect generated Stream IR; remove only proven duplication. |
| Min peak memory | available | implemented in this work | Map `scheduling.favor = "min-memory"` to Stream. |
| Max concurrency | available | implemented in this work | Map `scheduling.favor = "max-concurrency"` to the `stream.partitioning` IR attribute; the pinned compiler C API does not register the equivalent global flag. |
| Debug partitioning | available | implemented in this work | Map `scheduling.favor = "debug"` to Stream. |
| IO parameter providers | available | implemented | `.mln` parameter sections are exposed by the official provider API. |
| Parameter scopes/keys | available | implemented | Keep IREE names internal to the `.mln` adapter. |
| Partial/ranged reads | available | implemented by provider and Stream | Parameter metadata exposes exact archive ranges; Stream chooses load/read operations from the compiled constant slices. |
| parameter load/read | available | implemented | Named PLeX weights lower through Flow to Stream parameter operations. |
| parameter gather/scatter | available | correctly delegated | Pinned `PackConstants` selects `cmd.parameter.load` for independently reusable/unified-memory parameters and `cmd.parameter.gather` when static spans must be packed for discrete memory. It is not a tensor-ID-driven expert router. |
| Resident/streamed policy | parameter mechanism available; residency semantics are PLeX-specific | implemented in this work | Keep loading independent from codec; use the official provider and Stream operations, with PLeX controlling mapped-page retention. |
| Cached/prefetch policy | no generic LRU semantics in pinned provider | intentionally pending | Validate graph timepoint prefetch and add only the minimal missing cache policy; no custom async engine. |
| Encoding/physical layouts | available | partially used | Keep codec format logical; leave target layout to IREE where possible. |
| LinalgExt attention | available | implemented | Continue using the official op. |
| LinalgExt top-k/gather/scatter | available | partial | Prefer official operations in compiler lowering. |
| Quantized lowering/fusion | available, target-dependent | partial | Express decode plus contraction and inspect fusion before custom kernels. |
| Tuning specs/Transform dialect | available | implemented | Packages export named specs; `[myelin] tuning` selects exactly one and the compiler passes it through the official codegen tuning-spec option. Model ports remain unchanged. |
| Runtime instance/session/call | available | implemented | Keep the public MyeLiN lifecycle while using IREE ownership internally; resolved calls and VM lists are reused per physical entrypoint. |
| Multiple VM modules in one context | available | implemented | Use modular graph shards without multiple model runtimes. |
| Concurrent public invocation | available across independent sessions | implemented | PLeX releases its registry lock before dispatch and keeps per-session/per-call ownership; IREE schedules each invocation. Cancellation is cooperative at dispatch boundaries. |
| Custom VM modules | available | partial/native boundary under audit | Adopt only where it reduces existing Native infrastructure. |
| External HAL drivers | available | implemented for external backends | Keep this as the preferred hardware extension point. |
| Profiling | available, driver-dependent | implemented opt-in | `[runtime.profile]` creates a uniquely owned HAL profile capture; legacy environment variables remain compatible. `MLN_BUILD_REFLEX_TOOLS` builds `iree-profile` for inspection. |
| Device replay | available but incomplete for this runtime path | official inspection/replay tools integrated opt-in; capture intentionally not exposed | The pinned recorder enters a terminal failure while `io_parameters.load` consumes host-allocation-backed `.mln` parameters and leaves a truncated stream. Do not let an experimental debug option break inference. |
| Collectives | present, maturity target-dependent | experimental | Audit and prepare abstractions; do not claim production distributed inference. |
| Dynamic shapes | available | implemented with explicit shape metadata | `Buffer(size, shape)` carries arbitrary-rank runtime dimensions through specialization selection and HAL buffer views. Legacy byte-only buffers retain unambiguous zero/one-dynamic-dimension inference. |

## Current implementation notes

The pinned revision has a textual round-trip mismatch for
`PartitioningConfigAttr`: its printer emits `favor-<value>` while its parser and
tests require a quoted value. The PLeX compiler adapter normalizes that one
textual representation before handing the module to the IREE compiler C API;
the upstream source is not patched.

Graph packages may compile natural shards into independent VM modules and merge
them into one `.mln`. The runtime registers those modules in the same IREE VM
context. This is compilation granularity and cache reuse, not a PLeX execution
scheduler. Dependencies inside each graph remain visible to Flow and Stream.
The SYNaPSe executor runs independent build nodes concurrently. Backend resource
metadata is shared only among graph compilations using the same parameters
package identity; different parameter packages remain mutually isolated.
An in-process regression test drives two independent IREE compiler sessions
through VMFB emission concurrently; this validates that graph-shard compilation
is not only scheduled concurrently at the DAG layer.

Backend placement attaches a HAL device promise as Stream affinity. The
standard IREE pipeline remains responsible for transfer placement and resource
lifetime. On unified-memory systems the pinned Stream default is `unified`, so
cross-access does not automatically imply a copied staging allocation.
The pinned dispatch-creation pipeline does not propagate operation affinity to
the `flow.dispatch.workgroups` it outlines. PLeX therefore pauses at the public
`dispatch-creation` phase, applies a narrow compiler pass that copies the single
resolved affinity and rejects conflicts, then resumes the official Flow/Stream
pipeline. A CPU -> Vulkan -> external-device synthetic graph verifies dispatch
affinities plus the copies/flushes inserted by Stream.
At an explicit module boundary that Stream can no longer see, the runtime uses
`iree_hal_device_transfer_d2d`; the HAL selects direct/P2P or its supported
fallback. MyeLiN no longer performs a device-to-host-vector-to-device bounce.

Weight bytes remain embedded in `.mln` parameter archives. At runtime the
archive memory is wrapped by IREE IO file handles and registered through an
`iree_io_parameter_index_provider_t`; checkpoint paths are not part of the
runtime API.
The pinned Stream parameter gather batches compile-time parameter keys and
ranges into a target resource. Runtime MoE indices are ordinary tensor values,
so they cannot be treated as archive keys without a separate compiled-system
boundary. Existing quantized tensor `Gather` lowering instead pushes selection
through row-addressable codec maps and has a regression check that no full f16
weight is materialized. On the Q6A unified memory model, `parameter.load` is the
expected zero-staging representation; forcing `parameter.gather` would add an
allocation and copy.

Target-specific tuning is a build input rather than model source. A package
exports `[tuning.<name>] path`, the application selects `package:name`, and
SYNaPSe fingerprints the selected file in every affected graph node. The file
is consumed by IREE's Transform-dialect tuning library support and is not
retained as a runtime sidecar. A concurrent compilation regression test loads
a no-op default tuning library and verifies VMFB emission from two sessions.

Runtime profiling is disabled unless `[runtime.profile]` is configured (or the
legacy `MLN_PROFILE_OUTPUT` names an output bundle). When enabled, the runtime creates an official
`iree_hal_profile_file_sink_t` before registering parameter and bytecode
modules, starts profiling on the package devices, and ends each session through
RAII after the VM context is destroyed. Each capture owns a distinct output;
`{capture}` may be used in the configured path, otherwise a unique suffix is
appended. No PLeX command-buffer interception or profiling format is involved.
The pinned CUDA driver returns `UNIMPLEMENTED`
for HAL-native profiling, so CUDA capture fails loudly instead of producing an
empty or misleading bundle; local and other supported drivers use the same
generic adapter. The portable default requests queue events, executable
metadata and memory events. `device_timing = true` (or legacy
`MLN_PROFILE_DEVICE_TIMING=1`) additionally requests
device-queue and dispatch timestamps for drivers such as Vulkan; IREE rejects
that narrower mode on drivers that cannot provide trustworthy device timing.

External accelerator packages use IREE's local executable loader contract.
Their dispatches are hosted by the official `local-task` driver with one queue
and one worker per external device, so a blocking vendor call does not block
the CPU device queue and Stream may overlap independent CPU/GPU work. The
vendor binding ABI receives HAL binding pointers directly; it has no internal
host staging copy. Cross-device visibility is still decided by HAL/Stream and
may produce an explicit transfer when a Vulkan allocation is not importable.

The QNN compatibility keeps the codec representation generic. For a QNN
MatMul it disables the early MyeLiN decode/contraction fusion, outlines the
exclusive canonical weight-preparation chain with the contraction, and maps
the resulting integer parameter plus affine scale/zero metadata to QAIRT block
quantization. Q4 storage remains `[output, group, block]` in `.mln`; only the
logical QNN tensor view is `[output, group * block]`. This fixes both activation
K matching and FullyConnected rank without introducing a QNN-only codec.
Adjacent activation operations are not yet combined into the same QAIRT graph:
the current generic backend compilation ABI describes bindings and contraction
count, not a typed value DAG, so pretending otherwise would be unsafe.

For the Q6A Vulkan vision path, the pinned SPIR-V pipeline does not legalize
the vector `i32` to `i8` cast emitted by generic INT8 parameter decode. The
target profile therefore keeps the volatile vision weights in FP16. This
removes decode materialization and uses the Adreno 643 native FP16 arithmetic
and storage. INT8 remains a portable codec for targets whose backend pipeline
explicitly legalizes it.

## Deliberate v1 boundaries

- Hardware-specific CUDA, Vulkan, HIP, Metal and QNN validation is published as
  a platform matrix; a CPU-only release does not claim unexecuted hardware.
- Device Replay capture remains disabled because the pinned recorder cannot
  capture the IO Parameters initialization path safely. Official replay tools
  may still be built for external streams.
- Collectives, WebGPU, bare-metal and model importers are additive future
  packages, not requirements of the Linux `.mln` runtime ABI.
- `runtime.memory` is a per-variant admission budget based on IREE allocator
  statistics. It is intentionally not described as global GPU utilization.

## Pinned revision differences

| Feature | Current documentation | Pinned source | Decision |
|---|---|---|---|
| Stream partitioning preference | Configurable scheduling preference | Typed attribute exists, but its printer and parser disagree on spelling | Normalize only the compiler C API textual boundary; do not patch IREE. |
| Per-operation device placement | Affinity analysis and Stream transfers are supported | Dispatch formation does not inherit affinity from nested source operations | Propagate the resolved attribute at the public phase boundary, then use unmodified Flow/Stream. |
| Tuning specs | Transform-dialect tuning libraries are supported | Exactly one `--iree-codegen-tuning-spec-path` is accepted | Require explicit selection of one package-provided spec; never merge packages by incidental order. |
| Device Replay capture | Recorder wrappers and replay tools are documented | Recorder fails terminally in the `.mln` IO Parameters initialization path tested here | Build the official tools, but defer runtime capture instead of carrying a local HAL recorder patch. |
| HAL-native profiling | Profile sink and device lifecycle APIs are available | Local/Vulkan/HIP/Metal implementations exist, but the CUDA driver returns `UNIMPLEMENTED` | Integrate the generic sink once and preserve the driver's explicit capability failure; do not add a CUDA-specific profiler to MyeLiN. |
