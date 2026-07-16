/**
 * Regression tests for the v1.0.0 pre-release QA findings: comma-splice
 * protection for expression slots, record references with spaces, raw-text
 * unresolved-variable warnings, catalog-backed validateAfter options, and
 * prototype-key-safe preset storage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { catalog } from '@/core/catalog';
import { hasTopLevelComma, validate } from '@/core/validate';
import { raw } from '@/core/builder';
import { validateSlotValues } from '@/core/recipe';
import { generate, getRecipe } from '@/templates';
import {
  buildPreset,
  listPresetNames,
  listPresets,
  loadPreset,
  savePreset,
} from '@/ui/lib/presets';

describe('expression slots reject top-level commas (comma splice)', () => {
  it('hasTopLevelComma is string-, comment-, and bracket-aware', () => {
    expect(hasTopLevelComma('1, 10')).toBe(true);
    expect(hasTopLevelComma('{1, 10}')).toBe(false);
    expect(hasTopLevelComma('if(a, b, c)')).toBe(false);
    expect(hasTopLevelComma('"a, b"')).toBe(false);
    expect(hasTopLevelComma('/* a, b */ 1')).toBe(false);
    expect(hasTopLevelComma('concat(a, b), 2')).toBe(true);
  });

  it('a filter value of "1, 10" fails slot validation instead of splicing an extra argument', () => {
    const filter = getRecipe('query-filter')!;
    expect(() =>
      validateSlotValues(filter.slots, { field: 'recordType!Case.fields.id', operator: 'between', value: '1, 10' }),
    ).toThrow(/multiple expressions/);
    // The corrected form — a SAIL list literal — passes.
    expect(() =>
      validateSlotValues(filter.slots, { field: 'recordType!Case.fields.id', operator: 'between', value: '{1, 10}' }),
    ).not.toThrow();
  });
});

describe('record references may contain spaces (real UUID-qualified refs)', () => {
  it('accepts a pasted reference with a spaced record type name', () => {
    const sail = generate(
      'query-record-type',
      {
        recordType: 'recordType!{608f1e4c-aaaa-bbbb-cccc-0123456789ab}PSFS Case',
        batchSize: 10,
        sortAscending: true,
      },
      [],
    );
    expect(sail).toBeTruthy();
  });

  it('still rejects leading/trailing garbage and non-recordType text', () => {
    const q = getRecipe('query-record-type')!;
    expect(() => validateSlotValues(q.slots, { recordType: 'Case' })).toThrow();
  });
});

describe('raw expressions get the same unresolved-variable warning as everywhere else', () => {
  it('flags an undeclared ri! inside an expression, with a declare fix', () => {
    const d = validate(raw('ri!amonut > 100'), catalog, []);
    const w = d.filter((x) => x.severity === 'warning');
    expect(w).toHaveLength(1);
    expect(w[0].message).toContain('ri!amonut');
    expect(w[0].fix).toEqual({ kind: 'declareVariable', domain: 'ri', name: 'amonut' });
  });

  it('does not flag declared variables, local! keyword declarations, or strings', () => {
    expect(
      validate(raw('ri!amount > 100'), catalog, [{ domain: 'ri', name: 'amount', type: 'Decimal' }]),
    ).toHaveLength(0);
    expect(validate(raw('a!localVariables(local!x: 1, local!x + 1)'), catalog, []).filter((x) => x.fix)).toHaveLength(0);
    expect(validate(raw('"ri!notARef"'), catalog, [])).toHaveLength(0);
  });
});

describe('validation message recipe offers only values Appian accepts', () => {
  it('slot options match the catalog enumValues for a!validationMessage.validateAfter', () => {
    const recipe = getRecipe('required-validation')!;
    const slot = recipe.slots.find((s) => s.id === 'validateAfter')!;
    const options = (slot.slot as { type: 'enum'; options: string[] }).options;
    const spec = catalog.get('a!validationMessage')!;
    const param = spec.params.find((p) => p.name === 'validateAfter')!;
    expect(options).toEqual(['UNFOCUS', 'SUBMIT']);
    expect(param.enumValues).toEqual(['UNFOCUS', 'SUBMIT']);
  });

  it('dropdown/checkbox choice params are required, so pruned choices raise an error', () => {
    const sail = generate('dropdown-field', { label: 'Status', required: false, choiceLabels: [], choiceValues: [] }, []);
    const d = validate(sail, catalog, []);
    const missing = d.filter((x) => x.severity === 'error' && /choice(Labels|Values)/.test(x.message));
    expect(missing).toHaveLength(2);
  });
});

describe('preset storage is safe for prototype-colliding names', () => {
  beforeEach(() => localStorage.clear());

  it('a preset named "__proto__" saves, lists, and loads like any other', () => {
    const preset = buildPreset('text-field', { label: 'X' }, []);
    expect(savePreset('__proto__', preset)).toBe(true);
    expect(listPresetNames()).toContain('__proto__');
    expect(loadPreset('__proto__')?.recipeId).toBe('text-field');
    // And it never polluted Object.prototype.
    expect(({} as Record<string, unknown>).recipeId).toBeUndefined();
  });

  it('listPresets reports each preset with the scenario it belongs to', () => {
    savePreset('mine', buildPreset('if-else', { condition: 'true' }, []));
    expect(listPresets()).toEqual([{ name: 'mine', recipeId: 'if-else' }]);
  });
});
