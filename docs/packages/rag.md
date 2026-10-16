# RAG

RAG is an ecosystem package for retrieval-augmented applications. In the
supplied source it is a composition package rather than a standalone PLeX core
feature.

## Manifest contract

RAG provides these capabilities:

```text
embedder
multilingual-embedder
vector-index
dense-retriever
```

It does not declare a `generator` requirement. A consuming application chooses
and composes its generator separately; the RAG augmentation hook transforms
the incoming request/context before the selected model entrypoint runs.

## Build packages

| Build package | Domain | Role |
|---|---|---|
| `embedder-graph` | Graph | Embedding model used by retrieval. |
| `orchestration` | Orchestration | Embedding and indexing control flow. |
| `augmentation` | Orchestration | Retrieval and context augmentation flow. |
| `embedder-tokenizer` | `native` (inferred) | XLM-R/SentencePiece tokenizer provider. |
| `turbovec-crate` | `native` (inferred) | Rust static library for vector search support. |
| `turbovec` | `native` (inferred) | Native provider linking the Rust static library. |
| `search` | `native` (inferred) | Web-search provider using libcurl. |

The Orchestration facets are represented as WebAssembly in the current package.
`embedder-graph` exports the embedding graph used by retrieval.

## Public variables

```toml
[packages.rag]
top_k = 12
bit_width = 4
context_budget = 2200
minimum_similarity = 0.2
require_lexical_match = true
```

`top_k`, `bit_width`, and `context_budget` are `uint32` values.
`minimum_similarity` is a floating-point threshold and
`require_lexical_match` is boolean. The package defaults `top_k` to 5; an
application can widen retrieval before reranking, as Sensix does above, without
increasing the final context budget.

## Composition

RAG does not decide the application's checkpoint, graph policy, public
entrypoint, or generator. Those remain root-project responsibilities. Its
`augmentation` facet can be attached without application C++:

```toml
[[hooks]]
package = "qwen"
path = "qwen3.5"
function = "rag:augmentation"
```

## Build the retrieval assets

The optional `rag-index` tool receives an artifact containing
`embedder.forward`, an output directory, and one or more source documents:

```bash
rag-index application.mln assets documentation.md more-docs.md
```

It embeds passages with the same packaged encoder used for queries and writes
`rag_index.tvim` and `rag_chunks.bin` as one consistent pair. Rebuild both files
when the documents, encoder, or chunking implementation changes.
