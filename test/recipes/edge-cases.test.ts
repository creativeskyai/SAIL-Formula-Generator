import { describe, it, expect } from 'vitest';
import { generate } from '@/templates';
import { serialize, COMPACT } from '@/core/serialize';
import { validate, isRawTextBalanced } from '@/core/validate';
import { catalog } from '@/core/catalog';
import { parseRef } from '@/templates/_util';
import type { DeclaredVariable } from '@/core/types';

const gen = (id: string, v: Record<string, unknown>) => serialize(generate(id, v), COMPACT);

describe('empty-string handling never produces invalid SAIL (review findings 1, 2)', () => {
  it('local-variables: a blank value becomes null, a blank name is dropped', () => {
    expect(
      gen('local-variables', {
        names: ['total', '', 'tax'],
        values: ['1', 'x', ''],
        body: 'local!total',
      }),
    ).toBe('a!localVariables(local!total: 1, local!tax: null, local!total)');
  });

  it('dropdown-field: an incomplete label/value pair is dropped, keeping alignment', () => {
    expect(
      gen('dropdown-field', {
        label: 'Status',
        choiceLabels: ['Open', 'Closed'],
        choiceValues: ['"OPEN"', ''],
      }),
    ).toBe('a!dropdownField(label: "Status", choiceLabels: {"Open"}, choiceValues: {"OPEN"})');
  });

  it('section-layout: blank content rows are filtered out', () => {
    expect(
      gen('section-layout', { label: 'D', contents: ['a!x()', '', '  ', 'a!y()'] }),
    ).toBe('a!sectionLayout(label: "D", contents: {a!x(), a!y()})');
  });
});

describe('parseRef keeps accessor paths as raw, avoiding false unresolved errors (finding 3)', () => {
  it('a bare ref becomes a VariableRef', () => {
    expect(parseRef('ri!case')).toEqual({ kind: 'var', domain: 'ri', name: 'case' });
  });
  it('a dotted binding becomes raw and serializes verbatim', () => {
    expect(parseRef('ri!case.status')).toEqual({ kind: 'raw', text: 'ri!case.status' });
    expect(parseRef('ri!items[1]')).toEqual({ kind: 'raw', text: 'ri!items[1]' });
  });
  it('a dotted binding on a declared base var raises no unresolved-variable error', () => {
    const vars: DeclaredVariable[] = [{ domain: 'ri', name: 'case' }];
    const node = generate('text-field', { label: 'X', value: 'ri!case.status' });
    const d = validate(node, catalog, vars);
    expect(d.filter((x) => x.severity === 'error')).toHaveLength(0);
  });
});

describe('isRawTextBalanced is comment-aware (finding 4)', () => {
  it('brackets inside a block comment do not count', () => {
    expect(isRawTextBalanced('a!foo(/* ] */ 1)')).toBe(true);
    expect(isRawTextBalanced('1 /* ) */')).toBe(true);
  });
  it('still catches genuine imbalance outside comments', () => {
    expect(isRawTextBalanced('a!foo(/* */ 1')).toBe(false);
  });
});

describe('required slots reject empty strings before build (finding 5)', () => {
  it('an empty required expression throws instead of emitting if(, ...)', () => {
    expect(() =>
      generate('if-else', { condition: '', valueIfTrue: '"a"', valueIfFalse: '"b"' }),
    ).toThrow();
  });
  it('an empty required label throws', () => {
    expect(() => generate('text-field', { label: '' })).toThrow();
  });
});
