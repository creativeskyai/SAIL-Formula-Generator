---
name: fable-review
description: Multi-agent adversarial code review — four parallel finders (correctness, contracts, security, resources), with every finding independently attacked by skeptics before it reaches you. Use for "review this", "check my changes", or as a pre-PR gate.
argument-hint: "[target]"
---

The user invoked /fable-review: that is explicit opt-in to workflow orchestration — call the Workflow tool.

1. Pin down the target inline first. If arguments were given, they describe it. Otherwise run `git status` and `git diff --stat HEAD` to see what is pending; if the tree is clean, target the most recent commit. If the project is not a git repository, target the files the user named or the most recently modified source files.
2. Run the named workflow `fable-review` with `args: { target: "<precise description of the change set>", votes: 3 }`. If the user asked for a thorough or audit-grade review, use `votes: 5`.
3. Report the confirmed findings most-severe-first, in prose a teammate can act on: what breaks, the concrete failure scenario, and the `file:line`. Note how many raw findings the skeptics refuted (so the user knows the list is filtered), and name anything the review did not cover.
4. Fix findings only if the user asked for fixes; otherwise the report is the deliverable.

If the Workflow tool is unavailable, run the same structure with Agent-tool subagents: four `fable-finder` agents (one per dimension) in parallel, then three `fable-skeptic` agents per finding, majority verdict wins.
