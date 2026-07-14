---
name: fable-understand
description: Codebase mapping — partition the repo or a subsystem into coherent areas, deep-read each area in parallel, and synthesize one architecture brief with path:line citations. Use for onboarding onto unfamiliar code, "how is this organized", or before designing changes in territory you don't know.
argument-hint: "[focus]"
---

The user invoked /fable-understand: that is explicit opt-in to workflow orchestration — call the Workflow tool.

1. The arguments name the focus (a subsystem, directory, or feature). If they are empty, map the whole repository.
2. Run the named workflow `fable-understand` with `args: { focus: "<the focus>" }`.
3. Deliver the architecture brief with its path:line citations intact: system overview first, then per-area summaries, how the areas connect, and the "watch out" list of fragile spots. If an area reader failed, the brief marks that gap — surface it rather than smoothing it over.
4. This is a mapping task: do not propose or start changes unless the user asked for them.

If the Workflow tool is unavailable, run the same structure with Agent-tool subagents: one `fable-scout` to partition into 3-8 areas, one `fable-scout` per area deep-reading in parallel, then one `fable-scribe` synthesis.
