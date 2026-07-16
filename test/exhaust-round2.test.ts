import { describe, it, expect } from 'vitest';
import { generate } from '@/templates';
import { serialize, COMPACT } from '@/core/serialize';
import { isRawTextBalanced } from '@/core/validate';
import { analyzeCompose } from '@/ui/lib/compose';
import { useStore } from '@/ui/store';
import { PRESET_SCHEMA_VERSION } from '@/core/recipe';

const gen = (id: string, v: Record<string, unknown>) => serialize(generate(id, v), COMPACT);

describe('reference validation (findings: parseRef / bare refs)', () => {
  it('rejects a variableRef containing a space', () => {
    expect(() => generate('text-field', { label: 'x', value: 'ri!my case' })).toThrow();
  });
  it('rejects a variableRef with a leading-digit name', () => {
    expect(() => generate('text-field', { label: 'x', value: 'ri!1id' })).toThrow();
  });
  it('rejects a bare (non recordType!) record reference', () => {
    expect(() => generate('query-record-type', { recordType: 'Case' })).toThrow();
  });
  it('accepts valid refs and dotted accessors', () => {
    expect(gen('text-field', { label: 'x', value: 'ri!case.status' })).toContain(
      'value: ri!case.status',
    );
  });
});

describe('whitespace-only optional slots prune instead of emitting a blank arg', () => {
  it('text-field value', () => {
    expect(gen('text-field', { label: 'x', value: '   ' })).toBe('a!textField(label: "x")');
  });
  it('query-record-type sort field', () => {
    expect(gen('query-record-type', { recordType: 'recordType!Case', sortField: '   ' })).toBe(
      'a!queryRecordType(recordType: recordType!Case, pagingInfo: a!pagingInfo(startIndex: 1, batchSize: 100))',
    );
  });
});

describe('query-filter operator/value coupling', () => {
  it('a list/range operator requires a value', () => {
    expect(() =>
      generate('query-filter', { field: 'recordType!Case.fields.status', operator: 'in' }),
    ).toThrow(/requires a value/);
  });
  it('is null / not null do not require a value', () => {
    expect(
      gen('query-filter', { field: 'recordType!Case.fields.status', operator: 'is null' }),
    ).toBe('a!queryFilter(field: recordType!Case.fields.status, operator: "is null")');
  });
});

describe('batchSize is a positive integer', () => {
  const rt = 'recordType!Case';
  it('rejects a decimal', () => {
    expect(() => generate('query-record-type', { recordType: rt, batchSize: 2.5 })).toThrow();
  });
  it('rejects zero and negatives', () => {
    expect(() => generate('query-record-type', { recordType: rt, batchSize: 0 })).toThrow();
    expect(() => generate('query-record-type', { recordType: rt, batchSize: -5 })).toThrow();
  });
});

describe('local-variables rejects duplicate names', () => {
  it('throws on a repeated name', () => {
    expect(() =>
      generate('local-variables', { names: ['total', 'total'], values: ['1', '2'], body: 'local!total' }),
    ).toThrow(/[Dd]uplicate/);
  });
});

describe('compose analysis: case-insensitive + a!map recognized', () => {
  it('uppercase/mixed-case built-ins are recognized', () => {
    expect(analyzeCompose('SUM(ri!x)').unknownFunctions).toEqual([]);
    expect(analyzeCompose('If(a, b, c)').unknownFunctions).toEqual([]);
  });
  it('a!map is recognized', () => {
    expect(analyzeCompose('a!map(a: 1)').unknownFunctions).toEqual([]);
  });
});

describe('isRawTextBalanced treats an unterminated block comment as invalid', () => {
  it('unterminated /* ... is not balanced', () => {
    expect(isRawTextBalanced('a!foo(1) /* note')).toBe(false);
    expect(isRawTextBalanced('x /* note')).toBe(false);
  });
  it('a closed comment is still fine', () => {
    expect(isRawTextBalanced('a!foo(/* c */ 1)')).toBe(true);
  });
});

describe('loadPresetState merges variables (never discards declared ones)', () => {
  it('keeps existing declarations and adds the preset ones', () => {
    useStore.setState({ variables: [{ domain: 'ri', name: 'a' }] });
    useStore.getState().loadPresetState({
      schemaVersion: PRESET_SCHEMA_VERSION,
      recipeId: 'if-else',
      slotValues: {},
      variables: [{ domain: 'ri', name: 'b' }],
    });
    const names = useStore.getState().variables.map((v) => `${v.domain}!${v.name}`);
    expect(names).toContain('ri!a');
    expect(names).toContain('ri!b');
  });
  it('an empty-variables preset does not wipe declarations', () => {
    useStore.setState({ variables: [{ domain: 'ri', name: 'keep' }] });
    useStore.getState().loadPresetState({
      schemaVersion: PRESET_SCHEMA_VERSION,
      recipeId: 'if-else',
      slotValues: {},
      variables: [],
    });
    expect(useStore.getState().variables.map((v) => v.name)).toContain('keep');
  });
});
