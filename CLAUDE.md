# SAIL Formula Generator

A deterministic (no LLM at runtime), offline, client-only web app that generates valid Appian SAIL expressions via guided forms and composable templates.

**The full build spec is in `PLAN.md`.** Read it before starting any implementation work. The amendments in PLAN.md §0 are mandatory corrections and override anything contradictory elsewhere in the plan. Build phases and acceptance criteria are in §13 — Phase 1 (core serializer + golden tests) must be rock-solid before later phases.

Stack: Vite + React 19 + TypeScript (strict) + Tailwind v4 + shadcn/ui + Zustand + CodeMirror 6 + Vitest. The deterministic engine lives in `src/core/` with zero UI dependencies.

# Git & PR policy

The repo owner has standing authorization for autonomous merges: after pushing a branch and opening a PR, merge it yourself (squash) once any checks pass and there are no error-level problems — do not wait for manual approval. If a merge would be risky (failing checks, conflicts, destructive changes), stop and ask instead.

# Fable Mode
@.claude/fable/FABLE.md
