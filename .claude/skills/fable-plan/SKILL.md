---
name: fable-plan
description: Judge-panel design — three genuinely different approaches (simplicity-first, robustness-first, evolution-first) scored by independent judges and synthesized into one grounded implementation plan. Use for architecture decisions or "how should I build X".
argument-hint: "<design question>"
---

The user invoked /fable-plan: that is explicit opt-in to workflow orchestration — call the Workflow tool.

1. The arguments are the design question. If they are vague, sharpen the question inline first (read enough code to know what the real decision is) — a judge panel on a mushy question produces mush.
2. Run the named workflow `fable-design` with `args: { question: "<the sharpened question>" }`.
3. Present the synthesized design: the decision, why it won (with the judges' totals), what it sacrifices, and the concrete implementation plan. Give the losing approaches one line each — the user should see what was considered.
4. Do not start implementing unless the user asked for implementation.

If the Workflow tool is unavailable, run the same structure with Agent-tool subagents: three parallel design agents with divergent stances, three `fable-judge` agents (one rubric each), then one `fable-scribe` synthesis.
