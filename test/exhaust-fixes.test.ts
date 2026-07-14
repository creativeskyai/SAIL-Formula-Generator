import { describe, it, expect } from 'vitest';
import { generate, getRecipe } from '@/templates';
import { serialize, COMPACT } from '@/core/serialize';
import { analyzeCompose } from '@/ui/lib/compose';
import { initialValues } from '@/ui/components/SlotForm';

const gen = (id: string, v: Record<string, unknown>) => serialize(generate(id, v), COMPACT);

describe('exhaustive-hunt fixes', () => {
  it('rejects non-finite (Infinity) number-slot values', () => {
    expect(() =>
      generate('query-record-type', { recordType: 'recordType!Case', batchSize: Infinity }),
    ).toThrow();
    // a finite value still works
    expect(gen('query-record-type', { recordType: 'recordType!Case', batchSize: 50 })).toContain(
      'batchSize: 50',
    );
  });

  it('rejects local-variable names that are not valid identifiers', () => {
    expect(() =>
      generate('local-variables', { names: ['order total'], values: ['1'], body: 'x' }),
    ).toThrow(/Invalid local variable name/);
    expect(() =>
      generate('local-variables', { names: ['1st'], values: ['1'], body: 'x' }),
    ).toThrow(/Invalid local variable name/);
    // valid identifiers still work
    expect(
      gen('local-variables', { names: ['total_1'], values: ['1'], body: 'local!total_1' }),
    ).toContain('local!total_1: 1');
  });

  it('rejects whitespace-only required slot values', () => {
    expect(() =>
      generate('if-else', { condition: '   ', valueIfTrue: '1', valueIfFalse: '2' }),
    ).toThrow();
  });

  it('does not force-seed an optional enum, so it can be omitted', () => {
    const recipe = getRecipe('required-validation')!;
    expect(initialValues(recipe.slots)).not.toHaveProperty('validateAfter');
    expect(gen('required-validation', { message: 'x' })).toBe(
      'a!validationMessage(message: "x")',
    );
  });

  it('compose analysis recognizes fn!-prefixed built-in functions', () => {
    expect(analyzeCompose('fn!sum(ri!amounts)').unknownFunctions).toEqual([]);
    // a genuinely unknown function is still flagged
    expect(analyzeCompose('fn!notARealFn(1)').unknownFunctions).toEqual(['fn!notARealFn']);
  });
});
