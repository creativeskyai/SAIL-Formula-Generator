import { describe, it, expect } from 'vitest';
import { analyzeCompose, buildSkeleton } from '@/ui/lib/compose';
import { catalog } from '@/core/catalog';

describe('buildSkeleton', () => {
  it('zero-arg function', () => {
    expect(buildSkeleton(catalog.get('now')!)).toBe('now()');
  });
  it('positional function stubs param-name placeholders', () => {
    expect(buildSkeleton(catalog.get('if')!)).toBe(
      'if(\n  condition,\n  valueIfTrue,\n  valueIfFalse\n)',
    );
  });
  it('keyword function stubs name: slots', () => {
    expect(buildSkeleton(catalog.get('a!pagingInfo')!)).toBe(
      'a!pagingInfo(\n  startIndex: ,\n  batchSize: ,\n  sort: \n)',
    );
  });
});

describe('analyzeCompose', () => {
  it('recognizes balanced, known-function text', () => {
    expect(analyzeCompose('a!textField(label: "x")')).toEqual({
      balanced: true,
      unknownFunctions: [],
    });
  });
  it('flags an unknown function', () => {
    expect(analyzeCompose('foo(1)').unknownFunctions).toEqual(['foo']);
  });
  it('ignores brackets and parens inside strings', () => {
    expect(analyzeCompose('a!textField(label: "a ) b (")')).toEqual({
      balanced: true,
      unknownFunctions: [],
    });
  });
  it('does not treat a function name inside a string as a call', () => {
    expect(analyzeCompose('concat("nope(")').unknownFunctions).toEqual([]);
  });
  it('detects imbalance', () => {
    expect(analyzeCompose('a!textField(label: "x"').balanced).toBe(false);
  });
  it('treats rule! calls as known (application rules)', () => {
    expect(analyzeCompose('rule!myAppRule()').unknownFunctions).toEqual([]);
  });
  it('recognizes nested known calls', () => {
    const text = 'a!queryRecordType(recordType: recordType!Case, pagingInfo: a!pagingInfo())';
    expect(analyzeCompose(text)).toEqual({ balanced: true, unknownFunctions: [] });
  });
});
