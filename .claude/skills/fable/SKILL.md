---
name: fable
description: Session doctrine loader — reads the Fable Mode operating contract (phase discipline, workflow orchestration, adversarial verification, readable reporting) and applies it for the rest of the session. Use at session start, or whenever the doctrine is not already loaded via CLAUDE.md.
argument-hint: "[task]"
---

Read `.claude/fable/FABLE.md` in the project root and follow it as your operating doctrine for the rest of the session. It governs pacing, orchestration, verification, and reporting; explicit user instructions in the conversation always override it.

If the file does not exist, tell the user the Fable Mode pack is only partially installed (the doctrine file is missing) and continue without it.

If arguments were passed to this command, treat them as the user's task and start on it immediately under the doctrine, beginning with the Understand phase. If there are no arguments, confirm in one line that Fable Mode is active and wait for the user's task.
