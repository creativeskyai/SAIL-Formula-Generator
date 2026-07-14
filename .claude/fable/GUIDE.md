# Fable Mode — user guide

One page: what to run, when to run it, and what runs itself. Ships with the pack
(`.claude/fable/GUIDE.md`) so it's in every project that has Fable Mode installed;
it is never loaded into context — it's for you, not the model.

## The default: run nothing

With the pack installed, the doctrine (`FABLE.md`) is in every session's context and
the model orchestrates on its own: it maps unfamiliar code before designing, panels
wide decisions, reviews its own diffs with skeptics, and gates releases. Ask for work
in plain language. The slash commands below are for when you want specific machinery,
a specific scale, or a run the doctrine wouldn't start by itself (marathon).

**What the pack reads from your repo:** workflows treat your project's own docs as
authoritative before self-detecting — the root CLAUDE.md and its `@path` imports,
AGENTS.md, a decision log (DECISIONS.md or docs/DECISIONS.md, where entries marked
Locked are settled constraints), and FABLE-RUN.md's Walls. Document your commands
and rules once, in your own files, and every fleet uses them.

## Ad-hoc: pick by the question you're asking

In lifecycle order — the order you'd use them building a feature from scratch:

| Your question | Run | Cost feel |
|---|---|---|
| "How is this codebase / subsystem organized?" (new territory) | `/fable-understand` | medium |
| "Where is X handled? What breaks if I change Y?" | `/fable-research` | medium |
| "How should I build X?" (wide-open approach, decision only) | `/fable-plan` | medium |
| "Build X" (substantive feature, end to end) | `/ultra` | high |
| "Apply this same change everywhere" | `/fable-migrate` | scales with sites |
| "Review this diff / branch / PR" | `/fable-review` | ~16 agents |
| "Find ALL the bugs / audit this module" | `/fable-exhaust` | highest — loops until dry |
| "Are we ready to release / deploy?" | `/fable-ship` | medium |
| "Keep working on this for hours / days" | `/fable-marathon` | open-ended |
| Doctrine isn't loaded (fresh clone, no CLAUDE.md wiring) | `/fable` | free |

**Look-alikes, disambiguated:**

- `/fable-research` vs `/fable-exhaust` — a scoped question gets one bounded sweep;
  "find all the…" loops until two rounds come up dry. Prefer research unless you
  really mean *all*.
- `/fable-plan` vs `/ultra` — plan stops at a synthesized design; ultra carries it
  through implement and review. Use plan when you want to read the design first.
- `/fable-review` vs `/fable-ship` — review judges the change; ship judges the
  release (project checks, hygiene, docs, then a skeptic attacks "ready").
- `/fable-understand` vs `/fable-research` — a map of territory vs an answer to a
  question. If you can phrase it as a question, use research.

## Building a feature by hand

If you're driving phases yourself instead of using `/ultra`:

1. `/fable-understand` — only if the territory is unfamiliar this session.
2. `/fable-plan` — only if more than one reasonable approach exists.
3. Implement (ask normally; `/fable-migrate` if it's one change across many files).
4. `/fable-review` — fix confirmed findings, re-run tests.
5. `/fable-ship` — only when this lands in a release or deploy.

Skipping a step you don't need is correct, not lazy — the doctrine says the same.

## What marathon runs for you

In a `/fable-marathon` run you don't invoke any of the above ad-hoc — the cycle calls
them as needed: `fable-understand` or `fable-design` to ground a new backlog,
`fable-design` when an item's approach is genuinely open, `fable-review` plus the
project's own checks to verify every item, and `fable-ship` to gate anything
deploy-shaped. Your job is the run file, `FABLE-RUN.md` at the project root:

- **Goal / Backlog** — edit these to steer the run; it re-reads them every cycle.
- **Walls** — actions that always stop and queue for you (secrets, payments,
  deploys, anything destructive). Add your own; the run never crosses them.
- **`- [?]` blocked items** — questions only you can answer; the run keeps cycling
  past them. Answer in the file or in chat to unblock.
- **Proposals** — Walls/Invariants the run suggests after failures; they take
  effect only when you move them up yourself.

For unattended runs: `/loop /fable-marathon` (self-paced) or `/loop 30m /fable-marathon`.

**Loop types, mapped:** a plain prompt is one agentic turn (the doctrine handles it);
work with a verifiable finish line is a marathon backlog item with a `done-when:`
command — or the harness's `/goal` for a single task; recurring or time-driven work
is `/loop` or a scheduled task wrapped around `/fable-marathon`. The pack supplies
the process; the harness supplies the trigger.

## Scale and cost dial

Words in your request are the dial: "quick" or "no agents" → solo work; nothing
special → default fleets; "thorough" / "audit" / "make sure" → bigger pools and
5-vote verification. A budget you state ("+500k") is a hard cap. Every workflow
logs every bound it applies — a stopped run always says what it skipped.

## If something breaks

- "Agent type not found" everywhere → the pack was just installed; restart the
  session (runs still finish via a fallback in the meantime).
- A workflow died mid-run → re-invoke the skill with narrower args; no repo state
  is lost. Marathon resumes from `FABLE-RUN.md` alone.
- Edited a skill or workflow → takes effect immediately. Edited an agent or the
  CLAUDE.md wiring → restart the session.
