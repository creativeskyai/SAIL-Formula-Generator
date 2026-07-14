# SAIL Formula Generator — Build Plan

A standalone, fully deterministic (no LLM at runtime), offline, client-only web app that generates valid Appian SAIL expressions for common workflow scenarios via guided forms and composable templates.

> **How to build this:** run `/ultra` with this plan as the spec. Phases are in §13. The amendments in §0 are mandatory corrections from review — they override anything contradictory in the original plan below.

## 0. Mandatory amendments (from plan review — apply these)

**SAIL language corrections (fix before writing Phase 1 golden tests):**

1. **String escaping**: SAIL escapes embedded double quotes by **doubling them** (`"He said ""hi"""`), not with backslashes. There is no backslash escape. Verify against Appian docs during Phase 1 and encode the verified behavior in golden tests.
2. **`and`/`or`/`not` are functions, not infix operators** in SAIL (`and(a, b)`, `or(a, b)`, `not(a)`). Remove `'and' | 'or'` from `BinOp` and `'not'` from `UnaryOp`; model them as ordinary `FunctionCall`s. Precedence table reduces to roughly: `^` > `* /` > `+ -` > `&` (concat) > comparisons — verify `&` placement against docs.
3. **No trailing commas** in SAIL. Explicit serializer invariant with a golden test.

**Design hardening:**

4. **`RawExpr` safety**: (a) always parenthesize a raw expr when it appears as an operand of any operator node — this is the one place over-parenthesizing is correct; (b) bracket-balance checking of raw text must be string-aware (skip quoted strings, honoring `""` doubling) or `raw('if(a = ")", 1, 2)')` breaks the counter.
5. **Record references get their own AST node** — `RecordRef { kind: 'recordRef'; text: string }` instead of overloading `raw`. Real Appian record references are UUID-qualified when copied from an environment; symbolic docs-style refs (`recordType!Case.fields.status`) generally won't paste-and-run and must be re-linked in Appian's editor. Show this caveat in the UI near the Copy button, and let the validator issue a targeted info diagnostic on record refs.
6. **`fv!` scoping**: `fv!item`/`fv!index`/`fv!isFirst` etc. are implicitly valid inside `a!forEach` (and similar) and are never user-declared. Make the unresolved-ref check scope-aware for `fv!`, or (MVP) downgrade all `fv!` refs to info severity. Decide explicitly whether the Variables manager is the only `local!` declaration source or whether the validator also reads `a!localVariables` declarations out of the AST.
7. **Typed recipe boundary**: define each recipe's slot values with a zod schema (or derive one from `SlotSpec[]`) so `build()` gets typed input and **preset import is validated** rather than crashing on malformed/stale JSON. Add `schemaVersion` to the preset export format from day one.
8. **Pin the line-breaking algorithm as a spec**: greedy rule — measure the single-line rendering at current indent; if it fits within `maxWidth`, inline; else break every arg onto its own line and recurse into children at deeper indent. Arrays break all-or-nothing the same way. Golden test at the exact boundary width.
9. **`DotAccess`/`IndexAccess`**: make each represent a single step and chain them (supports mixed `a.b[1].c`), rather than `path: string[]`.
10. **Date/time literals**: SAIL date/time values are constructed via function calls (`date(...)`, `now()`); the `Literal` node deliberately has no date kind. Note this in `ast.ts` so nobody adds one.

**Scope/process changes:**

11. **Compose mode v1 is simplified**: a searchable catalog browser that inserts a skeleton snippet (function with all params stubbed) into a free-text CodeMirror pane, validated with bracket balance + function-name recognition only. The full tree editor is post-MVP (v2). Guided-mode `expression` slots remain the in-recipe escape hatch.
12. **Catalog ETL is a stretch goal, not a phase**. Hand-curate ~80–100 functions; add a CI JSON-schema check for `catalog.data.json` (valid types, enum defaults ∈ enumValues, no duplicate names). That's where catalog quality comes from — not scraping.
13. **Empirical validation gate (Phase 3 acceptance)**: paste each seed recipe's golden output into a real Appian expression editor once; record pass/fail per recipe in `VALIDATION.md` committed to the repo. This grounds the snapshot suite in reality — a systematic serializer error would otherwise get faithfully snapshot-tested forever. (This step requires the user — surface the checklist and ask them to run it.)
14. **Phase 1 goldens include** operator precedence, raw-parenthesization, and string-escaping cases from day one.

---

## 1. Objective & non-negotiables

Build a tool that turns a user's scenario choice + filled-in slots into correct, well-formatted SAIL — with zero AI inference at runtime. All "intelligence" lives in three data/logic layers: a function catalog, a recipe (template) library, and a composition engine.

Non-negotiables:

* **No AI at runtime.** Output is a pure function of inputs. Same inputs → byte-identical output, always.
* **Offline / self-contained.** Static client-side app, no backend, no network calls. Deployable as static files anywhere.
* **Deterministic & testable.** Every layer is unit-testable with golden/snapshot tests.
* **Easy to use.** Guided form mode as the default path; power-user compose mode as the escape hatch.

## 2. Core design insight (why this works without AI)

SAIL is a functional language: every construct — components, layouts, queries, logic — is a documented function call with a known parameter list, types, and defaults (`a!textField(label:, value:, saveInto:, ...)`). There is no imperative control flow to infer. The language maps cleanly onto:

* an AST (function calls, literals, arrays, maps, variable refs, operators),
* a catalog (each function = a schema of typed params), and
* a serializer (AST → formatted SAIL string).

Because the target is structured and finite per-function, a form-driven builder + template composition covers the real workflow space deterministically. This is a compiler front-end problem, not an ML problem.

## 3. Honest scope boundary

A finite deterministic tool cannot dream up arbitrary novel logic. What this delivers:

1. **Template coverage** of high-frequency scenarios (queries, forms, grids, conditional logic, validation, looping, saves, data transforms) — the 80%.
2. **Composition** — recipes accept other recipes and lists as slot values (`nestedRecipe`, `list` slots), so a finite set of templates covers a large combinatorial space.
3. **Free-compose mode** (v1 simplified per amendment 11) — assembly from catalog primitives with validation for anything the templates don't cover.

What it does **not** do: guarantee semantic correctness against a specific Appian app's data model (real record type/field names, security, data shapes). It guarantees syntactic well-formedness + catalog conformance. Don't over-promise in the UI.

## 4. Architecture — 8 layers

```
┌─────────────────────────────────────────────────────────────┐
│ 8. UI (React): Guided mode · Compose mode · Variables mgr   │
│    live preview · validation panel · copy/export            │
├─────────────────────────────────────────────────────────────┤
│ 7. Scenario registry — groups recipes by workflow category  │
├─────────────────────────────────────────────────────────────┤
│ 6. Recipe library — templates/*.ts, each: slots + build()   │
├─────────────────────────────────────────────────────────────┤
│ 5. Validator — structural + catalog-driven diagnostics      │
├─────────────────────────────────────────────────────────────┤
│ 4. Serializer — AST → formatted SAIL (deterministic)        │
├─────────────────────────────────────────────────────────────┤
│ 3. Builder API — ergonomic pure constructors for AST nodes  │
├─────────────────────────────────────────────────────────────┤
│ 2. AST + Type system — node types, SAIL type enum           │
├─────────────────────────────────────────────────────────────┤
│ 1. Catalog — functions.json (typed FunctionSpec[])          │
└─────────────────────────────────────────────────────────────┘
```

Layers 1–5 are the deterministic engine (framework-agnostic, no React). Keep them in `src/core/` with zero UI dependencies so they're independently testable and reusable (e.g., later as a CLI or a Skill).

## 5. Stack

**Vite + React 19 + TypeScript (strict) + Tailwind v4 + shadcn/ui.** Client-only, static build.

* State: Zustand.
* Code display + highlighting: CodeMirror 6 with a small custom SAIL StreamLanguage tokenizer (no Lezer grammar in MVP).
* Testing: Vitest + snapshot/golden tests (+ fast-check for property tests).
* No other heavy deps. `localStorage` for presets, plus file export/import of presets as JSON.

## 6. Data model / type definitions

Files: `core/ast.ts`, `core/types.ts`, `core/catalog.ts`, `core/recipe.ts`.

### 6.1 AST (`core/ast.ts`) — incorporating amendments 2, 5, 9, 10

```ts
export type SailType =
  | 'Text' | 'Number' | 'Integer' | 'Decimal' | 'Boolean'
  | 'Date' | 'Time' | 'DateTime'
  | 'List' | 'Map' | 'Dictionary' | 'CDT' | 'RecordType'
  | 'Component' | 'Any' | 'Null';

export type SailNode =
  | FunctionCall
  | Literal          // Text | Number | Boolean | Null only; dates are function calls
  | ArrayLiteral
  | MapLiteral
  | VariableRef
  | RecordRef        // recordType!... reference (may be UUID-qualified)
  | DotAccess        // single step; chain nodes for a.b[1].c
  | IndexAccess      // single step
  | BinaryOp         // arithmetic/comparison/concat ONLY — and/or/not are function calls
  | UnaryOp          // '-' only
  | RawExpr;         // user-typed raw SAIL sub-expression

export interface Arg { name?: string; value: SailNode | null; }
export interface FunctionCall { kind: 'call'; fn: string; args: Arg[]; }
export interface Literal {
  kind: 'lit';
  type: 'Text' | 'Number' | 'Boolean' | 'Null';
  value: string | number | boolean | null;
}
export interface ArrayLiteral { kind: 'array'; items: SailNode[]; }
export interface MapLiteral { kind: 'map'; entries: { key: string; value: SailNode }[]; }
export type VarDomain =
  | 'ri' | 'local' | 'pv' | 'ac' | 'cons' | 'rule'
  | 'fv' | 'tp' | 'rf' | 'rp' | 'pp';
export interface VariableRef { kind: 'var'; domain: VarDomain; name: string; }
export interface RecordRef { kind: 'recordRef'; text: string; }
export interface DotAccess { kind: 'dot'; target: SailNode; field: string; }
export interface IndexAccess { kind: 'index'; target: SailNode; index: SailNode; }
export type BinOp = '+' | '-' | '*' | '/' | '^' | '<' | '>' | '<=' | '>=' | '=' | '<>' | '&';
export interface BinaryOp { kind: 'binop'; op: BinOp; left: SailNode; right: SailNode; }
export interface UnaryOp { kind: 'unop'; op: '-'; operand: SailNode; }
export interface RawExpr { kind: 'raw'; text: string; }
```

### 6.2 Catalog (`core/catalog.ts`)

```ts
export interface ParamSpec {
  name: string;
  type: SailType | SailType[];
  required?: boolean;
  keywordOnly?: boolean;
  variadic?: boolean;
  enumValues?: string[];
  default?: string | number | boolean;
  doc?: string;
}

export interface FunctionSpec {
  name: string;                 // "a!textField"
  category: FunctionCategory;
  summary: string;
  params: ParamSpec[];
  returns: SailType;
  deprecated?: boolean;
  minVersion?: string;
  docUrl?: string;
}

export type FunctionCategory =
  | 'component' | 'layout' | 'query' | 'logic' | 'looping'
  | 'validation' | 'save' | 'text' | 'date' | 'math'
  | 'array' | 'map' | 'conversion' | 'system' | 'integration';
```

### 6.3 Recipe + Slot (`core/recipe.ts`) — incorporating amendment 7

```ts
export type SlotType =
  | { type: 'text' | 'number' | 'boolean' }
  | { type: 'enum'; options: string[] }
  | { type: 'expression' }                              // free SAIL sub-expr
  | { type: 'recordTypeRef' }
  | { type: 'fieldRef' }
  | { type: 'variableRef'; domains?: VarDomain[] }
  | { type: 'list'; item: SlotType }
  | { type: 'nestedRecipe'; recipeId?: string };

export interface SlotSpec {
  id: string;
  label: string;
  slot: SlotType;
  required?: boolean;
  default?: unknown;
  placeholder?: string;
  help?: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  description: string;
  slots: SlotSpec[];
  // Slot values validated by a zod schema derived from slots before build() runs.
  build: (values: Record<string, unknown>, ctx: BuildContext) => SailNode;
}

export interface BuildContext {
  buildRecipe: (recipeId: string, values: Record<string, unknown>) => SailNode;
  variables: DeclaredVariable[];
}
```

Preset export format: `{ schemaVersion: 1, recipeId, slotValues, variables }` — validate on import.

## 7. Builder API (`core/builder.ts`)

Ergonomic pure constructors; null-valued keyword args pruned automatically:

```ts
export const call = (fn: string, args: Arg[]): FunctionCall =>
  ({ kind: 'call', fn, args: args.filter(a => a.value !== null) });
export const kw = (name: string, value: SailNode | null): Arg => ({ name, value });
export const pos = (value: SailNode | null): Arg => ({ value });
export const text = (v: string): Literal => ({ kind: 'lit', type: 'Text', value: v });
export const num = (v: number): Literal => ({ kind: 'lit', type: 'Number', value: v });
export const bool = (v: boolean): Literal => ({ kind: 'lit', type: 'Boolean', value: v });
export const nul = (): Literal => ({ kind: 'lit', type: 'Null', value: null });
export const arr = (items: (SailNode | null)[]): ArrayLiteral =>
  ({ kind: 'array', items: items.filter((i): i is SailNode => i !== null) });
export const ref = (domain: VarDomain, name: string): VariableRef =>
  ({ kind: 'var', domain, name });
export const recordRef = (t: string): RecordRef => ({ kind: 'recordRef', text: t });
export const raw = (t: string): RawExpr => ({ kind: 'raw', text: t });
// Logical helpers (SAIL has no infix and/or/not):
export const and = (...xs: SailNode[]) => call('and', xs.map(pos));
export const or  = (...xs: SailNode[]) => call('or',  xs.map(pos));
export const not = (x: SailNode)       => call('not', [pos(x)]);
```

Convention: recipe `build()` functions use only these constructors + `ctx.buildRecipe(...)`. No string concatenation of SAIL anywhere except the serializer.

## 8. Serializer (`core/serialize.ts`)

AST → formatted SAIL string. Highest-value component; golden-test exhaustively.

* Keyword args print as `name: value`; positional args bare. **No trailing commas.**
* Line breaking (amendment 8): greedy — measure single-line rendering at current indent; fits within `maxWidth` (default 80) → inline; else every arg on its own line at `indent` (default 2), recurse. Arrays same, all-or-nothing.
* String escaping: wrap in `"`, escape embedded `"` by **doubling** (`""`). No backslash escapes.
* Arrays `{ }`; maps `a!map(key: value, ...)`.
* Operators: correct spacing; parenthesize by precedence (`^` > `* /` > `+ -` > `&` > comparisons — verify `&` placement). Only parenthesize when a child's precedence is lower than its parent's — **except `RawExpr` operands, which are always parenthesized** (amendment 4a).
* Variable refs `domain!name`; record refs and raw exprs verbatim.
* Deterministic arg ordering: catalog-declared order for known functions.
* Config `{ maxWidth, indent }`; UI exposes compact/expanded presets.

## 9. Validator (`core/validate.ts`)

Pure `validate(node, catalog, variables): Diagnostic[]`:

* Bracket/paren/brace balance — **string-aware** inside `raw` (amendment 4b).
* Unknown function: `a!`/`fn!` → warning; `rule!` → info.
* Missing required params → error. Unknown param name → warning. Enum violation → warning.
* Type mismatch → warning (SAIL typing is loose; keep advisory).
* Unresolved `ri!`/`local!` ref → error; `fv!` handled per amendment 6.
* `RecordRef` → info about re-linking in Appian (amendment 5).
* Deprecated function → warning with replacement note.

```ts
export interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  path: (string | number)[];
}
```

Errors block the "copy as valid" affordance but never block viewing output.

## 10. Recipe library — scenario taxonomy

Categories: **1 Data/Queries** (`a!queryRecordType`, `a!queryFilter`, `a!queryLogicalExpression`, `a!pagingInfo`/`a!sortInfo`, `a!recordData`), **2 Forms & Inputs** (field components, `saveInto`, layouts, form scaffold), **3 Read-only/Display**, **4 Logic & Conditionals** (`if`, `a!match`, `choose`, `showWhen`, `a!localVariables`), **5 Looping/Transforms** (`a!forEach`, `reduce`, `a!update`, `merge`, `a!flatten`), **6 Validation**, **7 Save & Actions**, **8 Text/Date/Math**, **9 Integration**.

Seed 10–15 recipes for MVP spanning groups 1, 2, 4, 5, 6 — including at least one `list` slot and one `nestedRecipe` pair (query + query-filter, worked example below). Everything else is reachable via compose mode.

### Worked example — "Query a Record Type"

```ts
// templates/query/queryRecordType.ts
export const queryRecordType: Recipe = {
  id: 'query-record-type',
  name: 'Query a Record Type',
  category: 'data',
  description: 'Retrieve records with optional filters, sort, and paging.',
  slots: [
    { id: 'recordType', label: 'Record Type', required: true,
      slot: { type: 'recordTypeRef' }, placeholder: 'recordType!Case' },
    { id: 'filters', label: 'Filters',
      slot: { type: 'list', item: { type: 'nestedRecipe', recipeId: 'query-filter' } } },
    { id: 'batchSize', label: 'Batch Size', slot: { type: 'number' }, default: 100 },
    { id: 'sortField', label: 'Sort Field', slot: { type: 'fieldRef' } },
    { id: 'sortAscending', label: 'Sort Ascending', slot: { type: 'boolean' }, default: true },
  ],
  build: (v, ctx) => call('a!queryRecordType', [
    kw('recordType', recordRef(v.recordType)),
    kw('filters', v.filters?.length
      ? call('a!queryLogicalExpression', [
          kw('operator', text('AND')),
          kw('filters', arr(v.filters.map((f) => ctx.buildRecipe('query-filter', f)))),
          kw('ignoreFiltersWithEmptyValues', bool(true)),
        ])
      : null),
    kw('pagingInfo', call('a!pagingInfo', [
      kw('startIndex', num(1)),
      kw('batchSize', num(v.batchSize ?? 100)),
      kw('sort', v.sortField
        ? call('a!sortInfo', [
            kw('field', recordRef(v.sortField)),
            kw('ascending', bool(v.sortAscending ?? true)),
          ])
        : null),
    ])),
  ]),
};
```

Companion `query-filter` recipe: slots `field` (fieldRef, required), `operator` (enum of `=`, `<>`, `>`, `>=`, `<`, `<=`, `in`, `not in`, `starts with`, `not starts with`, `includes`, `is null`, `not null`; required), `value` (expression) → `a!queryFilter(field:, operator:, value:)`.

## 11. UI spec

Three modes (tabs), sharing a live-preview panel:

1. **Guided (default).** Left: category → recipe picker. Center: dynamic slot form. Right: live SAIL preview (CodeMirror read-only) + validation panel + Copy/Export. Nested/list slots render as add/remove sub-forms.
2. **Compose (v1, simplified per amendment 11).** Searchable catalog browser (grouped by category, param hints) that inserts skeleton snippets into a free-text CodeMirror pane; validation = bracket balance + function-name recognition. Full tree editor is post-MVP.
3. **Variables.** Declare `ri!`/`local!` with names + types; feeds `variableRef` slot dropdowns and the unresolved-ref check. Optional `a!localVariables(...)` wrap on export.

Cross-cutting: live preview on every change; compact/expanded toggle; Copy disabled (with tooltip) on error diagnostics; record-reference caveat shown near Copy (amendment 5); preset save/load via localStorage + file (validated on import); SAIL syntax highlighting via StreamLanguage tokenizer (domains, function names, strings, numbers, booleans, operators, brackets). Developer-tool aesthetic: density, monospace output, keyboard-friendly.

## 12. Directory structure

```
├─ package.json / vite.config.ts / tsconfig.json (strict) / index.html
├─ src/
│  ├─ core/                      # deterministic engine — NO React imports
│  │  ├─ ast.ts  types.ts  builder.ts  serialize.ts  validate.ts
│  │  ├─ recipe.ts  catalog.ts  catalog.data.json
│  ├─ templates/                 # recipe library
│  │  ├─ index.ts (registry)  query/  forms/  logic/  looping/  validation/
│  ├─ ui/
│  │  ├─ App.tsx  store.ts
│  │  ├─ modes/GuidedMode.tsx  modes/ComposeMode.tsx  modes/VariablesMode.tsx
│  │  ├─ SlotForm.tsx  Preview.tsx  Diagnostics.tsx  sail-language.ts
│  └─ main.tsx
├─ scripts/check-catalog.ts      # CI schema check for catalog.data.json (amendment 12)
├─ VALIDATION.md                 # real-Appian paste checklist (amendment 13)
└─ test/
   ├─ serialize.golden.test.ts  builder.test.ts  validate.test.ts
   └─ recipes/*.snapshot.test.ts
```

## 13. Phased milestones with acceptance criteria

**Phase 0 — Scaffold.** Vite + React + TS strict + Tailwind v4 + shadcn + Zustand + CodeMirror + Vitest wired. Done when: app boots, `npm test` runs, `tsc --noEmit` passes.

**Phase 1 — Core engine.** `ast.ts`, `builder.ts`, `serialize.ts` + exhaustive golden tests. Done when: a hand-built AST for `a!queryRecordType` (nested filters + paging + sort) serializes to the exact expected string in compact and expanded modes; **string escaping (`""` doubling), operator precedence, raw-expr parenthesization, no-trailing-comma, and line-width breaking (including exact-boundary case) all covered by passing goldens** (amendments 1–4, 8, 14). Rock-solid before anything else.

**Phase 2 — Catalog + validator.** Hand-curate ~80–100 highest-frequency functions into `catalog.data.json` + CI schema check; implement `validate.ts`. Done when: each diagnostic type (missing required, unknown param, enum violation, string-aware bracket imbalance, unresolved var ref with `fv!` scoping, deprecated) proven by a unit test.

**Phase 3 — Recipe framework + first recipes.** `recipe.ts` with zod-validated slot values, registry, 10–15 recipes across groups 1/2/4/5/6 incl. nested query/query-filter. Done when: each recipe has a snapshot test; nested composition works; **VALIDATION.md checklist created listing each recipe's golden output for one-time paste-testing in a real Appian editor** (requires the user — surface and ask).

**Phase 4 — Guided UI.** Scenario picker → dynamic SlotForm → live preview + diagnostics + copy/export. Done when: user picks "Query a Record Type," fills slots (incl. adding filters), sees live valid SAIL, copies it; empty optional slots vanish from output.

**Phase 5 — Compose v1 + Variables manager.** Catalog browser + skeleton-snippet insertion into free-text pane; `ri!`/`local!` declaration feeding slots + validator; optional `a!localVariables` wrap. Done when: a user can assemble an arbitrary expression from catalog snippets with balance/name validation, and declared variables resolve.

**Phase 6 — Polish.** Syntax highlighting, compact/expanded toggle, preset save/load (localStorage + file, schema-validated import), dark mode, keyboard shortcuts, empty/error states, record-ref UI caveat, design pass. Done when: it feels like a finished dev tool; diagnostics render with AST-path highlighting.

## 14. Testing strategy

* **Golden/serializer tests** — fixed AST → exact expected SAIL. Cover escaping (`""`), precedence, raw-parenthesization, line breaking (incl. boundary), keyword vs positional, arrays, maps, var/record refs, no trailing commas.
* **Recipe snapshot tests** — `(recipeId, slotValues)` → serialized SAIL, committed snapshots. The snapshot suite is the spec.
* **Property tests** (fast-check) — every builder-produced AST serializes bracket-balanced; validator on generated output returns zero errors.
* **Validator unit tests** — one per diagnostic type.
* **Empirical gate** — VALIDATION.md real-Appian paste checklist (amendment 13).

## 15. Catalog seeding

1. Hand-curate ~80–100 core functions (MVP recipe needs + common text/date/math/array). Unblocks Phases 2–4.
2. CI JSON-schema check on `catalog.data.json` (amendment 12). Docs-scraping ETL is a **stretch goal only**.
3. Version-tag: `minVersion` per function + top-level `appianVersion`; surface in UI footer.

Sourcing note: keep the catalog as structured metadata (names, params, types) derived from Appian's public function reference — facts, not copied prose. Don't redistribute docs content wholesale.

## 16. Extensibility & stretch goals

* Data-driven JSON recipes loaded at runtime (TS stays primary).
* Full SAIL parser (Lezer) for import/round-trip — out of MVP scope; the AST is already the right target.
* CLI / Skill reuse of `core/` (`sailgen <recipe> --slots ...`).
* Deep-link/shareable preset state in URL.
* Deterministic complexity/lint score on output.
* Compose mode v2: full tree editor.
* Docs-scraping catalog ETL.

## 17. Risks / limitations (state plainly, incl. in UI)

* **Syntactic, not semantic.** Well-formed, catalog-conformant SAIL only; cannot verify a given app's record types/fields/security. Record references usually need re-linking in Appian (amendment 5).
* **Catalog drift.** Appian ships ~quarterly; refresh + version tag mitigate.
* **Coverage is finite by construction.** Templates cover the common cases; compose mode covers the rest but demands SAIL knowledge.
* **Loose typing.** Type checks are advisory warnings, never guarantees.
* **No official grammar.** Highlighting is built from documented token domains, best-effort.

## 18. Definition of done (MVP)

A user opens the app offline, picks a workflow scenario, fills a guided form, watches valid formatted SAIL generate live with zero AI, sees deterministic validation, and copies or exports it — everything reproducible and snapshot-tested, with the seed recipes' outputs verified once against a real Appian editor. Compose mode + Variables manager provide the escape hatch. Catalog is version-tagged. Deploys as static files.
