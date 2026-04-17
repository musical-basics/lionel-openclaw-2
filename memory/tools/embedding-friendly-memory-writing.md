# Embedding-Friendly Memory Writing

> Explains how to write atomic memory notes so vector retrieval embeddings stay sharp instead of smeared.

## Retrieval Model

Atomic memory notes should be written for OpenClaw's vector retrieval layer. OpenClaw `memory_search` chunks, embeds, and indexes `MEMORY.md` and files under `memory/`, so each chunk should represent one concept cleanly enough to retrieve on differently worded queries. Sharp, topically coherent chunks retrieve well. Keyword stuffing, unrelated asides, translation padding, and repeated reformulations smear the embedding and make retrieval noisier.

The current embedding model is OpenAI `text-embedding-3-large`. It already handles synonymy, paraphrase, and cross-lingual similarity well enough that source files should stay clean. BM25 covers exact proper nouns, filenames, IDs, and other exact-match terms.

## Writing Rules

Each atomic file should stay focused on one topic, and each section should stay focused on one subtopic. If a project has separate manufacturing, pricing, and branding concerns, split them into separate files instead of mixing them.

Each section should lead with the concept it is about. The first sentences should directly name the topic and the key fact, because the opening of a chunk strongly influences its embedding.

Proper nouns should be written exactly and consistently. Use the real names of projects, people, tools, and internal terms so BM25 can support the embedding layer on exact-match queries.

Do not add keyword lists, synonym padding, multi-language padding, or reformulated-concept sections. The source prose is the retrieval signal.

Use prose for conceptual material and save bullet lists for genuinely list-shaped content like directories, URLs, or config fragments. When a file changes, update it in place and keep a `### Updated` line current instead of appending stale history forever.

Keep `### Related` sections small and intentional. They are for navigation after retrieval, not for trying to influence retrieval.

## Query Strategy

When retrieval feels uncertain, expand the query at search time instead of editing source files to include extra keywords. Try two or three alternative phrasings, union the results, and compare the highest-scoring chunks.

If the same retrieval pattern fails three or more times across sessions, log it to `.learnings/LEARNINGS.md` as a retrieval failure. The likely fixes are a missing atomic file, a weak opening sentence, a file that needs splitting, or a documented fallback strategy.

## Verification Test

After a significant memory restructure, a new atomic file, or a file split, run a retrieval test with deliberately different wording from the stored text. If the right chunk comes back strongly, the embeddings are doing their job. If it does not, improve the file lead or split the topic instead of padding the document.

### Related

- `memory/projects/memory-system-v2.md` — the main memory-system design decision
- `AGENTS.md` — always-loaded operating rules for writing and distilling memory

### Updated

2026-04-17 — Added the embeddings addendum rules for writing atomic memory files
