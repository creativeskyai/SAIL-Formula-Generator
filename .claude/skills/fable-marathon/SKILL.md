---
name: fable-marathon
description: Continuous goal-directed operation across many cycles or sessions — maintains a persistent run file (goal, backlog, journal), executes one backlog item per cycle through the full phase discipline, commits at verified milestones, and keeps cycling. Composable with /loop or scheduled tasks for unattended long runs. Use for "keep working on this", overnight runs, or multi-day builds. Wants a git repository — checkpoint commits are its safety rail; it offers git init once if missing.
argument-hint: "[goal]"
---

The user invoked /fable-marathon: that is explicit opt-in to workflow orchestration and to checkpoint commits at verified milestones — call the Workflow tool and commit without asking again.

## State

All run state lives in `FABLE-RUN.md` at the project root, structured as:

```markdown
# Fable Run
> Run state for /fable-marathon — re-read .claude/skills/fable-marathon/SKILL.md before acting on this file.
## Goal
<the standing goal, in the user's words>
## Walls
<actions that always queue for the user, even mid-run — default: credentials and secrets, payments, anything destructive or externally visible (sends, deploys; for code projects also migrations and force-pushes)>
## Backlog
- [ ] item — acceptance criteria; done-when: `<command that exits 0 when the item is done, where one exists>`
- [?] blocked item — blocked: <the question only the user can answer>
- [x] done item (finished <date>; the checkpoint commit message names the item)
## Invariants
- `<cheap, read-only command; exit 0 = still true>` — guards: <the done item>
## Proposals
- <retro-proposed Wall or Invariant — takes effect only when the user moves it up>
## Journal
- <date>: one-line cycle summary
## Next
<the single next actionable step>
```

This file is the only memory the run has: update it before ending any turn, keep it committed, and in a fresh session or after compaction, re-ground from it — and from this skill file, per its header line — before acting. Never rely on conversation history surviving. Record run-level decisions in it too (e.g. "user declined git init") so no question is ever asked twice.

## Cycle

1. **Load or create.** If `FABLE-RUN.md` exists, read it; if arguments were also given, reconcile first — a different goal replaces the **Goal** section and gets the backlog rebuilt around it, new constraints get folded in. If the file predates any template section (Walls, Invariants, Proposals), backfill the missing section — Walls from the template defaults — before cycling. Then check the working tree (`git status`): if it is dirty from an interrupted cycle, reconcile against **Next** and the journal — finish and verify the half-done work, or revert it — before starting anything new. Then re-run every entry under **Invariants** (each is a cheap, read-only command): a failure is a regression — make fixing it the next item, ahead of the backlog; if the fix would cross a Wall, or a previous cycle already fixed this invariant once (a re-failure is its second strike), mark it `- [?]` blocked instead and keep cycling. If the file does not exist, create it exactly in the structure shown above: take the goal from the arguments (ask if there are none); ground the backlog with `fable-understand` when the repo has meaningful code, or — greenfield — derive it from the goal itself, running `fable-design` for the initial architecture instead; set **Walls** to the template defaults plus anything the goal implies or the project's own operating docs declare as always-queue-for-user, give each item a done-when command where one exists, order items by value, and write the file. If the project is not a git repository, ask once whether to `git init` (checkpoint commits are the marathon's safety rail), record the answer in the run file; if declined, skip the commit steps below and note in each journal line that rollback is unavailable.
2. **Execute one item** through the phase discipline: understand what it touches, run `fable-design` if the approach is genuinely open, implement, then verify with `fable-review` plus the project's own checks — preferring end-to-end verification (drive the changed behavior, not just the edit) where the project offers a way to. Fix confirmed findings before calling it done; an item with a done-when command is done only when that command passes.
3. **Checkpoint.** When the item is verified: tick it in the backlog and — when a cheap, read-only command can keep checking it — graduate its acceptance into **Invariants**, add a journal line, rewrite **Next**, then commit everything including `FABLE-RUN.md` (item description in the message) — file first, commit second, so the committed state always includes its own bookkeeping.
4. **Continue.** Re-enter the cycle at step 1 for the next actionable item — invariants are re-checked every cycle, not once per session. Keep cycling within the session while context allows; when context is running low, make sure `FABLE-RUN.md` and the working tree are committed so the next session resumes cleanly, then end the turn with a re-grounding summary.

## Blocked items

When an item needs input only the user can provide, do not stall the run: mark it `- [?] … — blocked: <question>`, record the question in the journal, move **Next** to the next actionable item, and keep cycling. Treat deploy-gated items the same way — gate with `fable-ship`, mark the item with the pending trigger, continue with the rest. A **Wall** hit works identically: the moment an item needs a walled action, mark it blocked with that action as the question (Walls are the run's own queue-for-user list, on top of whatever the harness permission system allows). When blocking an item mid-implementation — Wall hit or standoff — first revert its unverified changes or park them on a branch: half-done work never rides into another item's checkpoint. And when verification rejects the same fix twice — the same disagreement recurring, not successive rounds of new findings being fixed — stop iterating: mark the item blocked with the disagreement; the third opinion is the user's. Ask-and-end-the-turn only when no actionable items remain.

## Stopping

Stop cycling and report when the backlog has no actionable items left: every item done (say so and propose next steps), or only blocked items remaining (surface their questions, each explained as if new). Before the final report, sweep the run's failure exhaust — failed verifications, reverted work, blocked items — and record at most three proposals under **Proposals**, each a candidate Wall or Invariant; they take effect only when the user moves them up, never by your hand. Commit the run file so the run ends with a clean tree.

## Unattended operation

Each invocation is resumable, so the marathon composes with whatever loop mechanism the harness provides: `/loop /fable-marathon` for self-paced recurring cycles, or a scheduled task for fixed intervals. When invoked by a loop, run one full cycle (or finish the in-progress item) per invocation and let the state file carry continuity.

If the Workflow tool is unavailable, run the same cycle using Agent-tool subagents per the fallback in `.claude/fable/FABLE.md`.
