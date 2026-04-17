# Workspace Memory System V2

> Records the decision to use a pointer-index long-term memory plus atomic files and structured distillation.

## Decision

On 2026-04-17, Lionel asked this workspace to adopt a structured memory model based on the "Memory-Retrieval System v2" directive. The workspace now treats `MEMORY.md` as a small pointer index and stores durable recall in atomic files under `memory/`.

## Structure

- Behavior and always-loaded preferences live in `SOUL.md`, `AGENTS.md`, `TOOLS.md`, and `USER.md`.
- Lookup-oriented memory lives in atomic files under `memory/projects/`, `memory/tools/`, `memory/people/`, `memory/ideas/`, and `memory/summaries/`.
- Daily capture lives in `memory/YYYY-MM-DD.md` with typed entry prefixes.
- Corrections, failures, and feature gaps live in `.learnings/`.

## Retrieval Rules

This structure assumes embedding-first retrieval. Do not add keyword-stuffing sections, synonym padding, multi-language keyword expansion, or repeated reformulations inside source documents. If recall feels uncertain, expand the query at search time instead of diluting the source files.

## Embeddings Addendum

Atomic memory writing now explicitly targets OpenClaw's chunked hybrid retrieval layer. Each file should stay topically narrow, each section should open with the concept it is about, and proper nouns should be written exactly and consistently. Conceptual material should usually be written as connected prose, while list-shaped material can stay in bullets.

The detailed operating note lives in `memory/tools/embedding-friendly-memory-writing.md`. That note also defines the verification habit: after significant structural changes, test retrieval with deliberately different wording and fix weak file leads or mixed topics instead of padding the corpus.

## Initial Migration Outcome

The workspace started with no `MEMORY.md` and only one daily note. Because there was almost nothing to migrate, this change was mostly scaffolding plus routing current facts into the right homes.

## Supporting Automation

Two cron jobs were registered using Lionel's preferred timezone, Eastern Time (`America/New_York`):

- `Memory Distillation` — daily at 21:00 Eastern Time
- `Learnings Review` — Sundays at 10:00 Eastern Time

### Related

- `memory/ideas/backlog.md` — open follow-ups after the initial migration
- `memory/summaries/2026-04.md` — monthly summary that records the bootstrap and migration

### Updated

2026-04-17 — Added the embeddings addendum and retrieval-writing verification rules
