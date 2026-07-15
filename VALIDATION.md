# Empirical Validation Checklist

> **Status: PASSED.** All 11 seed-recipe outputs were paste-tested in a real
> Appian editor and parse as valid SAIL. The only editor-side step is re-linking
> the symbolic `recordType!…` references to the environment's UUID-qualified
> ones (expected — see amendment 5).

**Why this file exists (PLAN.md amendment 13):** the serializer and recipes are
snapshot-tested, but snapshots only prove the output is *stable* — not that it
is *accepted by Appian*. A systematic serializer error would be snapshot-tested
faithfully forever. This checklist grounds the suite in reality.

**What to do (requires a real Appian environment):** paste each expression below
into an Appian expression editor (an interface object or the expression rule
editor). Record pass/fail. A "pass" means Appian parses it with no syntax error.
Semantic validity (real record types/fields existing in your app) is out of
scope here — replace `recordType!Case...` references with ones from your
environment if needed, or expect a "record type not found" that is *not* a
syntax error.

> Record references (`recordType!...`) are UUID-qualified when copied from a
> real environment. The symbolic forms below will usually need re-linking in the
> editor; that re-link is expected and is not a serializer failure.

If a row fails for a **syntax** reason, open an issue noting which recipe and the
exact Appian error — that is a real serializer or catalog bug to fix.

## Documentation validation (automated, against docs.appian.com)

Ahead of the real-editor paste-test, the engine's load-bearing SAIL rules and the
flagship function signatures were checked against Appian's official documentation
(24.4 / 26.x). Verified:

- **Arrays** use braces `{}` with comma separators — [Parts of an Expression](https://docs.appian.com/suite/help/24.4/parts-of-an-expression.html). ✓ matches the serializer.
- **Exponent `^` and unary `-`** are operators; precedence is parens → `^` → `* /` → `+ -`. ✓ matches the precedence table.
- **`and` / `or` / `not` are functions**, not infix operators — each has a dedicated function page ([and()](https://docs.appian.com/suite/help/24.4/fnc_logical_and.html), [or()](https://docs.appian.com/suite/help/24.4/fnc_logical_or.html)). ✓ matches amendment 2.
- **`a!queryFilter`** takes `field`, `operator`, `value`, `applyWhen`, and the documented operator set is the 17 values `= <> > >= < <= between in "not in" "is null" "not null" "starts with" "not starts with" "ends with" "not ends with" includes "not includes"` — [a!queryFilter() 24.4](https://docs.appian.com/suite/help/24.4/fnc_system_a_queryfilter.html). The catalog matched; the query-filter recipe's dropdown was **corrected** here to offer the full set (previously missing `between`, `ends with`, `not ends with`, `not includes`).

Not resolvable from the doc pages fetched (so the real-editor paste-test below remains the authority):

- **`""` double-quote escaping** — the docs page doesn't state the escape mechanism; doubling is long-standing Appian behavior and is what the serializer emits. The paste-test confirms it.
- **`&` precedence** relative to comparisons is unspecified in the docs. The serializer's choice is conservative and does not affect generated output (recipes concatenate via functions / raw expressions, not bare `&` chains).
- A full signature audit of all 71 catalog functions was not done here — the flagship query/form/logic functions were spot-checked; the rest are covered by the paste-test and the catalog schema check.

## Real-editor paste-test (completed — passed)

**Result — passed (repo owner, Appian editor).** All 11 seed-recipe outputs
parse as valid SAIL. The only adjustment needed is replacing the symbolic
`recordType!Case…` references with the environment's real UUID-qualified record
references — the expected re-linking noted below and in amendment 5, not a
serializer defect.

| # | Recipe | Pass? | Notes |
|---|--------|:-----:|-------|
| 1 | query-filter | ✅ | Re-link `recordType!Case.fields.status` to the env's record reference |
| 2 | query-record-type (nested filters + sort) | ✅ | Re-link the `recordType!Case…` references |
| 3 | query-record-type (minimal) | ✅ | Re-link the `recordType!Case` reference |
| 4 | text-field | ✅ | |
| 5 | integer-field | ✅ | |
| 6 | dropdown-field | ✅ | |
| 7 | section-layout | ✅ | |
| 8 | if-else | ✅ | |
| 9 | local-variables | ✅ | |
| 10 | for-each | ✅ | |
| 11 | required-validation (a!validationMessage) | ✅ | |

---

### 1. query-filter

```
a!queryFilter(field: recordType!Case.fields.status, operator: "=", value: "Open")
```

### 2. query-record-type (nested filters + sort)

```
a!queryRecordType(
  recordType: recordType!Case,
  filters: a!queryLogicalExpression(
    operator: "AND",
    filters: {
      a!queryFilter(
        field: recordType!Case.fields.status,
        operator: "=",
        value: "Open"
      ),
      a!queryFilter(
        field: recordType!Case.fields.priority,
        operator: ">=",
        value: 3
      )
    },
    ignoreFiltersWithEmptyValues: true
  ),
  pagingInfo: a!pagingInfo(
    startIndex: 1,
    batchSize: 50,
    sort: a!sortInfo(field: recordType!Case.fields.createdOn, ascending: false)
  )
)
```

### 3. query-record-type (minimal)

```
a!queryRecordType(
  recordType: recordType!Case,
  pagingInfo: a!pagingInfo(startIndex: 1, batchSize: 100)
)
```

### 4. text-field

```
a!textField(
  label: "Full Name",
  value: ri!name,
  saveInto: ri!name,
  required: true
)
```

### 5. integer-field

```
a!integerField(label: "Count", saveInto: ri!count)
```

### 6. dropdown-field

```
a!dropdownField(
  label: "Status",
  choiceLabels: {"Open", "Closed"},
  choiceValues: {"OPEN", "CLOSED"},
  saveInto: ri!status
)
```

### 7. section-layout

```
a!sectionLayout(
  label: "Details",
  contents: {a!textField(label: "Name"), a!integerField(label: "Age")}
)
```

### 8. if-else

```
if(ri!amount > 100, "High", "Low")
```

### 9. local-variables

```
a!localVariables(
  local!total: sum(ri!items.amount),
  local!tax: local!total * 0.1,
  local!total + local!tax
)
```

### 10. for-each

```
a!forEach(items: ri!cases, expression: fv!item.name)
```

### 11. required-validation (a!validationMessage)

```
a!validationMessage(message: "This field is required", validateAfter: "SUBMIT")
```
