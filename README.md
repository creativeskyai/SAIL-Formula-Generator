# SAIL Formula Generator

A deterministic, offline, client-only web app that generates valid Appian SAIL
expressions from guided forms and composable templates — **no AI at runtime**.
The same inputs always produce byte-identical output.

## Why it works without AI

SAIL is a functional language: every construct is a documented function call
with a known parameter list. That maps cleanly onto an AST, a function catalog,
and a serializer — a compiler front-end problem, not an ML one. See `PLAN.md`
for the full design and `PLAN.md` §0 for the SAIL-correctness amendments the
build follows.

## Three modes

- **Guided** — pick a scenario, fill a form, watch valid formatted SAIL generate
  live with deterministic validation, then copy or export it. Nested and list
  slots render as add/remove sub-forms.
- **Compose** — a searchable catalog browser inserts skeleton snippets into a
  free-text editor, validated by bracket balance + function-name recognition.
- **Variables** — declare `ri!` / `local!` variables that feed the guided
  reference suggestions and resolve the validator's unresolved-reference check.

## Architecture

The deterministic engine lives in `src/core/` with zero UI dependencies:

| Layer | File |
|-------|------|
| AST + types | `src/core/ast.ts` |
| Builder (pure constructors) | `src/core/builder.ts` |
| Serializer (AST → formatted SAIL) | `src/core/serialize.ts` |
| Function catalog | `src/core/catalog.ts` · `catalog.data.json` |
| Validator | `src/core/validate.ts` |
| Recipes (templates + zod slots) | `src/core/recipe.ts` · `src/templates/` |
| UI (React) | `src/ui/` |

## Develop

```bash
npm install
npm run dev           # start the app
npm test              # run the Vitest suite
npm run typecheck     # tsc --noEmit (strict)
npm run check:catalog # validate catalog.data.json against its schema
npm run build         # type-check + production build (static files)
```

## Scope & honesty

The tool guarantees **syntactic** well-formedness and catalog conformance — not
semantic correctness against a specific Appian app's data model. Record
references are UUID-qualified when copied from a real environment, so the
symbolic forms this tool emits usually need re-linking in Appian's editor.
`VALIDATION.md` tracks a one-time paste-test of each seed recipe against a real
Appian editor.
