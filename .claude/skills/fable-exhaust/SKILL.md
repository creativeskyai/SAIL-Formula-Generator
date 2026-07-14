---
name: fable-exhaust
description: Loop-until-dry exhaustive hunt — waves of diverse finders keep sweeping until two consecutive rounds surface nothing new, and every fresh finding faces a three-lens judge panel. Use for "find ALL the bugs", full audits, and edge-case sweeps.
argument-hint: "[what to hunt] [scope]"
---

The user invoked /fable-exhaust: that is explicit opt-in to workflow orchestration — call the Workflow tool. This is the most expensive skill in the pack — many agents over several rounds — so note that to the user in one line when you start.

1. From the arguments, determine what to hunt and where. Defaults: hunt defects (logic bugs, unhandled edge cases, races, leaks, security flaws) across the whole repository.
2. Run the named workflow `fable-exhaust` with `args: { hunt: "<what>", scope: "<where>" }`.
3. Report the confirmed findings grouped by file, each with its failure scenario and `file:line`. State how many rounds ran and whether the hunt ran dry or stopped at the round/budget cap — the user must know whether coverage is complete.
4. Fix findings only on request.

If the Workflow tool is unavailable, run the same structure with Agent-tool subagents: rounds of four parallel `fable-finder` agents with distinct stances, three `fable-skeptic` lenses per fresh finding (two of three to confirm), stopping after two consecutive rounds with nothing new.
