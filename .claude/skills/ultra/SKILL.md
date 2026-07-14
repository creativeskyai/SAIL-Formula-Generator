---
name: ultra
description: Full multi-phase orchestration for one task — understand → design → implement → review, each phase backed by multi-agent workflows with adversarial verification. Use for substantive features, refactors, and audits where the user wants maximum quality over minimum tokens.
argument-hint: "<task>"
---

The user invoked /ultra: that is explicit opt-in to multi-agent workflow orchestration for this task. Call the Workflow tool as directed below without asking for further permission.

The arguments to this command are the task. If there are no arguments, ask the user what the task is before doing anything else.

Run the task through the phases, reading each workflow's result before choosing the next step.

1. **Understand.** Unless the relevant code is already well known to you from this session, run the named workflow `fable-understand` with `args: { focus: "<the subsystem this task touches>" }`.
2. **Design.** If more than one reasonable approach exists, run `fable-design` with `args: { question: "<the design decision>" }` and adopt the synthesized design. If the approach is genuinely forced, write a three-line plan inline instead.
3. **Implement.** Make the changes yourself for a normal-sized diff, verifying compile/tests as you go. If the change is the same operation across many files, run `fable-migrate` with `args: { instruction: "..." }`.
4. **Review.** Run `fable-review` over the change set (`args: { target: "the uncommitted changes", votes: 3 }`). Fix every confirmed finding, re-run the tests, and re-run the review if the fixes were non-trivial. The task is done when review comes back clean and tests pass — or when the only remaining findings are ones you explicitly present to the user as accepted risks.
5. **Ship** (only when the task includes releasing or deploying). Gate with `fable-ship` and hand the deploy trigger to the user.

Scale honestly: if the task turns out to be trivial once understood, say so and skip ahead rather than burning a full pipeline on a one-line fix.

If the Workflow tool is not available in this environment, emulate each workflow per the fallback in `.claude/fable/FABLE.md`.
