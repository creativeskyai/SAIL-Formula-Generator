---
name: fable-migrate
description: Repo-wide mechanical change — four parallel discovery modalities find every site, a two-file pilot proves the instruction before the fan-out, then each file is transformed and independently checked, and the project's own checks run once. Use for "rename X everywhere", "replace API A with B", "apply this fix across the repo". It edits files.
argument-hint: "<instruction>"
---

The user invoked /fable-migrate: that is explicit opt-in to workflow orchestration and to applying the described change across the repository — call the Workflow tool.

1. The arguments are the migration instruction. If they are empty, ask for it. If the instruction is ambiguous about what the end state looks like, sharpen it inline first (read one representative site) — discovery on a mushy instruction floods the transformers with false positives. If the user named a verification command, capture it.
2. Run the named workflow `fable-migrate` with `args: { instruction: "<the instruction>", verify: "<command if the user gave one>" }` — omit `verify` to let the workflow detect the project's own checks.
3. Report: how many files were transformed, every per-file problem the checkers reported with its file:line, and the final suite report verbatim — failing checks are reported, never silently fixed or hidden. If discovery found no matching sites, say so plainly and stop. If the result says `pilotFailed`, report that the fan-out was aborted after the pilot slice failed its checks — the remaining files were never touched — and what to sharpen before re-running.
4. Per-file problems are part of the requested change — fix them and re-check. Pre-existing suite failures unrelated to the migration are report-only unless the user asks.

If the Workflow tool is unavailable, run the same structure with Agent-tool subagents: four parallel `fable-scout` discovery agents (identifiers, strings/docs, types/config, tests — one modality each), then per file one `fable-builder` transform followed by one `fable-skeptic` check — piloting two files first and stopping if their checks fail — then run the project checks once yourself and report the outcome verbatim.
