import { describe, it, expect } from 'vitest';
import {
  catalog,
  FUNCTION_CATEGORIES,
  SAIL_TYPES,
} from '@/core/catalog';

const types = new Set<string>(SAIL_TYPES);
const categories = new Set<string>(FUNCTION_CATEGORIES);

describe('catalog integrity', () => {
  it('loads a non-empty, version-tagged catalog', () => {
    expect(catalog.all().length).toBeGreaterThan(0);
    expect(catalog.appianVersion).toBeTruthy();
  });

  it('resolves the query-recipe functions', () => {
    for (const name of [
      'a!queryRecordType',
      'a!queryFilter',
      'a!queryLogicalExpression',
      'a!pagingInfo',
      'a!sortInfo',
    ]) {
      expect(catalog.get(name), name).toBeDefined();
    }
  });

  it('has no duplicate function names', () => {
    const names = catalog.all().map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every function has a valid category and return type', () => {
    for (const fn of catalog.all()) {
      expect(categories.has(fn.category), `${fn.name} category`).toBe(true);
      const returns = Array.isArray(fn.returns) ? fn.returns : [fn.returns];
      for (const r of returns) expect(types.has(r), `${fn.name} returns ${r}`).toBe(true);
    }
  });

  it('every param has a valid type and unique name; enum defaults are in range', () => {
    for (const fn of catalog.all()) {
      const seen = new Set<string>();
      for (const p of fn.params) {
        expect(seen.has(p.name), `${fn.name} dup param ${p.name}`).toBe(false);
        seen.add(p.name);
        const t = Array.isArray(p.type) ? p.type : [p.type];
        for (const one of t) expect(types.has(one), `${fn.name}.${p.name}: ${one}`).toBe(true);
        if (p.enumValues && p.default !== undefined) {
          expect(p.enumValues.includes(String(p.default))).toBe(true);
        }
      }
    }
  });
});
