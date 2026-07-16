import { describe, it, expect } from 'vitest';
import { generate } from '@/templates';
import { serialize, COMPACT, EXPANDED } from '@/core/serialize';
import { validate } from '@/core/validate';
import { catalog } from '@/core/catalog';
import type { DeclaredVariable } from '@/core/types';

const expanded = (id: string, values: Record<string, unknown>) =>
  serialize(generate(id, values), EXPANDED);
const compact = (id: string, values: Record<string, unknown>) =>
  serialize(generate(id, values), COMPACT);

describe('query recipes', () => {
  it('query-filter', () => {
    expect(
      compact('query-filter', {
        field: 'recordType!Case.fields.status',
        operator: '=',
        value: '"Open"',
      }),
    ).toMatchInlineSnapshot(`"a!queryFilter(field: recordType!Case.fields.status, operator: "=", value: "Open")"`);
  });

  it('query-record-type with nested filters + sort (expanded)', () => {
    expect(
      expanded('query-record-type', {
        recordType: 'recordType!Case',
        filters: [
          { field: 'recordType!Case.fields.status', operator: '=', value: '"Open"' },
          { field: 'recordType!Case.fields.priority', operator: '>=', value: '3' },
        ],
        batchSize: 50,
        sortField: 'recordType!Case.fields.createdOn',
        sortAscending: false,
      }),
    ).toMatchInlineSnapshot(`
      "a!queryRecordType(
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
      )"
    `);
  });

  it('query-record-type minimal (defaults applied)', () => {
    expect(
      expanded('query-record-type', { recordType: 'recordType!Case' }),
    ).toMatchInlineSnapshot(`
      "a!queryRecordType(
        recordType: recordType!Case,
        pagingInfo: a!pagingInfo(startIndex: 1, batchSize: 100)
      )"
    `);
  });
});

describe('form recipes', () => {
  it('text-field', () => {
    expect(
      expanded('text-field', {
        label: 'Full Name',
        value: 'ri!name',
        saveInto: 'ri!name',
        required: true,
      }),
    ).toMatchInlineSnapshot(`
      "a!textField(
        label: "Full Name",
        value: ri!name,
        saveInto: ri!name,
        required: true
      )"
    `);
  });

  it('integer-field', () => {
    expect(
      compact('integer-field', { label: 'Count', saveInto: 'ri!count' }),
    ).toMatchInlineSnapshot(`"a!integerField(label: "Count", saveInto: ri!count)"`);
  });

  it('dropdown-field', () => {
    expect(
      expanded('dropdown-field', {
        label: 'Status',
        choiceLabels: ['Open', 'Closed'],
        choiceValues: ['"OPEN"', '"CLOSED"'],
        saveInto: 'ri!status',
      }),
    ).toMatchInlineSnapshot(`
      "a!dropdownField(
        label: "Status",
        choiceLabels: {"Open", "Closed"},
        choiceValues: {"OPEN", "CLOSED"},
        saveInto: ri!status
      )"
    `);
  });

  it('section-layout', () => {
    expect(
      expanded('section-layout', {
        label: 'Details',
        contents: ['a!textField(label: "Name")', 'a!integerField(label: "Age")'],
      }),
    ).toMatchInlineSnapshot(`
      "a!sectionLayout(
        label: "Details",
        contents: {a!textField(label: "Name"), a!integerField(label: "Age")}
      )"
    `);
  });
});

describe('logic recipes', () => {
  it('if-else', () => {
    expect(
      compact('if-else', {
        condition: 'ri!amount > 100',
        valueIfTrue: '"High"',
        valueIfFalse: '"Low"',
      }),
    ).toMatchInlineSnapshot(`"if(ri!amount > 100, "High", "Low")"`);
  });

  it('local-variables', () => {
    expect(
      expanded('local-variables', {
        names: ['total', 'tax'],
        values: ['sum(ri!items.amount)', 'local!total * 0.1'],
        body: 'local!total + local!tax',
      }),
    ).toMatchInlineSnapshot(`
      "a!localVariables(
        local!total: sum(ri!items.amount),
        local!tax: local!total * 0.1,
        local!total + local!tax
      )"
    `);
  });
});

describe('looping recipes', () => {
  it('for-each', () => {
    expect(
      compact('for-each', { items: 'ri!cases', expression: 'fv!item.name' }),
    ).toMatchInlineSnapshot(`"a!forEach(items: ri!cases, expression: fv!item.name)"`);
  });
});

describe('validation recipes', () => {
  it('required-validation', () => {
    expect(
      compact('required-validation', {
        message: 'This field is required',
        validateAfter: 'SUBMIT',
      }),
    ).toMatchInlineSnapshot(`"a!validationMessage(message: "This field is required", validateAfter: "SUBMIT")"`);
  });
});

describe('nested composition and validation', () => {
  it('the generated query validates cleanly (no errors/warnings, only record-ref infos)', () => {
    const vars: DeclaredVariable[] = [];
    const node = generate('query-record-type', {
      recordType: 'recordType!Case',
      filters: [{ field: 'recordType!Case.fields.status', operator: '=', value: '"Open"' }],
    });
    const d = validate(node, catalog, vars);
    expect(d.filter((x) => x.severity === 'error')).toHaveLength(0);
    expect(d.filter((x) => x.severity === 'warning')).toHaveLength(0);
  });

  it('invalid slot values throw (zod) before build', () => {
    // operator must be one of the enum options.
    expect(() =>
      generate('query-filter', { field: 'x', operator: 'BOGUS', value: '1' }),
    ).toThrow();
  });

  it('missing required slot throws', () => {
    expect(() => generate('if-else', { condition: 'true' })).toThrow();
  });
});
