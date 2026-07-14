# Empirical Validation Checklist

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

| # | Recipe | Pass? | Notes |
|---|--------|:-----:|-------|
| 1 | query-filter | ☐ | |
| 2 | query-record-type (nested filters + sort) | ☐ | |
| 3 | query-record-type (minimal) | ☐ | |
| 4 | text-field | ☐ | |
| 5 | integer-field | ☐ | |
| 6 | dropdown-field | ☐ | |
| 7 | section-layout | ☐ | |
| 8 | if-else | ☐ | |
| 9 | local-variables | ☐ | |
| 10 | for-each | ☐ | |
| 11 | required-validation (a!validationMessage) | ☐ | |

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
