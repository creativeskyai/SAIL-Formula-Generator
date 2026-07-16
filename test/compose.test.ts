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
      unresolvedVariables: [],
    });
  });
  it('flags an unknown function', () => {
    expect(analyzeCompose('foo(1)').unknownFunctions).toEqual(['foo']);
  });
  it('ignores brackets and parens inside strings', () => {
    expect(analyzeCompose('a!textField(label: "a ) b (")')).toEqual({
      balanced: true,
      unknownFunctions: [],
      unresolvedVariables: [],
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
    expect(analyzeCompose(text)).toEqual({
      balanced: true,
      unknownFunctions: [],
      unresolvedVariables: [],
    });
  });
});

describe('analyzeCompose unresolved variables', () => {
  it('flags a ri!/local! reference not declared in the manager', () => {
    expect(analyzeCompose('ri!missing + local!x').unresolvedVariables).toEqual([
      'ri!missing',
      'local!x',
    ]);
  });

  it('resolves references declared in the Variables manager', () => {
    expect(
      analyzeCompose('ri!caseId', [{ domain: 'ri', name: 'caseId', type: 'Text' }])
        .unresolvedVariables,
    ).toEqual([]);
  });

  it('treats a local!name: assignment as its own declaration', () => {
    // Inside a!localVariables the `local!x:` keyword position IS the declaration,
    // so a later `local!x` reference must not be flagged.
    const text = 'a!localVariables(local!x: 1, ri!input + local!x)';
    expect(analyzeCompose(text).unresolvedVariables).toEqual(['ri!input']);
  });

  it('ignores ri!/local! tokens inside string literals', () => {
    expect(analyzeCompose('"ri!notAVar"').unresolvedVariables).toEqual([]);
  });

  it('does not confuse other domains (recordType!, cons!) for declarable vars', () => {
    expect(analyzeCompose('recordType!Case + cons!X').unresolvedVariables).toEqual([]);
  });

  it('deduplicates a repeated unresolved reference', () => {
    expect(analyzeCompose('ri!x + ri!x').unresolvedVariables).toEqual(['ri!x']);
  });
});
