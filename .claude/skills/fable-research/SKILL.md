---
name: fable-research
description: Deep codebase research — five parallel search modalities (names, content, structure, git history, tests), deep-reads of every lead, a cited synthesis, and a completeness critic. Use for "where is X handled", "how does Y work", "what breaks if Z changes". This searches the repo, not the web.
argument-hint: "<question>"
---

The user invoked /fable-research: that is explicit opt-in to workflow orchestration — call the Workflow tool.

1. The arguments are the research question. If they are empty, ask for the question first.
2. Run the named workflow `fable-research` with `args: { question: "<the question>" }`.
3. Deliver the synthesized answer with its path:line citations intact. Separate what the evidence establishes from what remains uncertain, say what the completeness critic flagged — or that it found the answer complete — and name any leads the workflow returned as unread.

If the Workflow tool is unavailable, run the same structure with Agent-tool subagents: five parallel `fable-scout` sweeps (one modality each), scouts deep-reading the deduplicated leads, one `fable-scribe` synthesis, then one `fable-critic` completeness pass.
