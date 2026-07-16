import { describe, it, expect } from 'vitest';
import {
  arr,
  bool,
  call,
  kw,
  num,
  pos,
  raw,
  recordRef,
  ref,
  text,
} from '@/core/builder';
import { catalog, createCatalog, type CatalogFile } from '@/core/catalog';
import { validate, isRawTextBalanced } from '@/core/validate';
import type { DeclaredVariable, Diagnostic } from '@/core/types';

const NO_VARS: DeclaredVariable[] = [];
const errs = (ds: Diagnostic[]) => ds.filter((d) => d.severity === 'error');
const warns = (ds: Diagnostic[]) => ds.filter((d) => d.severity === 'warning');
const infos = (ds: Diagnostic[]) => ds.filter((d) => d.severity === 'info');

describe('missing required parameter -> error', () => {
  it('flags a keyword-only required param that is absent', () => {
    // a!pagingInfo requires startIndex and batchSize.
    const node = call('a!pagingInfo', [kw('startIndex', num(1))]);
    const d = validate(node, catalog, NO_VARS);
    expect(errs(d)).toHaveLength(1);
    expect(errs(d)[0].message).toContain('batchSize');
  });

  it('flags a missing positional required param', () => {
    // if(condition, valueIfTrue, valueIfFalse) — only two provided.
    const node = call('if', [pos(bool(true)), pos(num(1))]);
    const d = validate(node, catalog, NO_VARS);
    expect(errs(d)).toHaveLength(1);
    expect(errs(d)[0].message).toContain('valueIfFalse');
  });

  it('accepts all-positional required params', () => {
    const node = call('if', [pos(bool(true)), pos(num(1)), pos(num(2))]);
    expect(errs(validate(node, catalog, NO_VARS))).toHaveLength(0);
  });
});

describe('unknown parameter name -> warning', () => {
  it('flags a keyword not in the spec', () => {
    const node = call('a!textField', [kw('label', text('Name')), kw('bogus', num(1))]);
    const d = validate(node, catalog, NO_VARS);
    expect(warns(d)).toHaveLength(1);
    expect(warns(d)[0].message).toContain('bogus');
  });

  it('does not flag unknown keywords on variadic functions', () => {
    // a!localVariables is variadic; arbitrary keyword locals are expected.
    const node = call('a!localVariables', [kw('local!x', num(1)), pos(ref('local', 'x'))]);
    const vars: DeclaredVariable[] = [{ domain: 'local', name: 'x' }];
    expect(warns(validate(node, catalog, vars)).length).toBe(0);
  });
});

describe('enum violation -> warning', () => {
  it('flags a text value outside the enum', () => {
    const node = call('a!queryFilter', [
      kw('field', recordRef('recordType!Case.fields.status')),
      kw('operator', text('==')),
      kw('value', text('Open')),
    ]);
    const d = validate(node, catalog, NO_VARS);
    expect(warns(d).some((w) => w.message.includes('=='))).toBe(true);
  });

  it('accepts a valid enum value', () => {
    const node = call('a!queryFilter', [
      kw('field', recordRef('recordType!Case.fields.status')),
      kw('operator', text('=')),
      kw('value', text('Open')),
    ]);
    expect(warns(validate(node, catalog, NO_VARS))).toHaveLength(0);
  });
});

describe('string-aware bracket balance (amendment 4b)', () => {
  it('balanced raw text passes', () => {
    expect(isRawTextBalanced('if(a = 1, {1, 2}, [3])')).toBe(true);
  });
  it('a bracket inside a string does not count', () => {
    expect(isRawTextBalanced('if(a = ")", 1, 2)')).toBe(true);
  });
  it('doubled quotes inside a string are handled', () => {
    expect(isRawTextBalanced('concat("he said ""(hi)""", x)')).toBe(true);
  });
  it('genuine imbalance fails', () => {
    expect(isRawTextBalanced('a + (b')).toBe(false);
  });
  it('unterminated string fails', () => {
    expect(isRawTextBalanced('concat("oops)')).toBe(false);
  });
  it('validator emits an error for imbalanced raw', () => {
    const d = validate(raw('a + (b'), catalog, NO_VARS);
    expect(errs(d)).toHaveLength(1);
    expect(errs(d)[0].message).toContain('Unbalanced');
  });
  it('validator accepts a raw with a bracket inside a string', () => {
    expect(errs(validate(raw('if(a = ")", 1, 2)'), catalog, NO_VARS))).toHaveLength(0);
  });
});

describe('unresolved variable references with fv! scoping (amendment 6)', () => {
  // Unresolved ri!/local! are WARNINGS (non-blocking, with a declare fix), the
  // same treatment the reference gets in Compose mode — the reference is valid
  // SAIL and may exist in the target Appian object.
  it('undeclared ri! is a warning with a declare fix', () => {
    const d = validate(ref('ri', 'caseId'), catalog, NO_VARS);
    expect(errs(d)).toHaveLength(0);
    expect(warns(d)).toHaveLength(1);
    expect(warns(d)[0].message).toContain('ri!caseId');
    expect(warns(d)[0].fix).toEqual({ kind: 'declareVariable', domain: 'ri', name: 'caseId' });
  });
  it('undeclared local! is a warning', () => {
    expect(warns(validate(ref('local', 'x'), catalog, NO_VARS))).toHaveLength(1);
  });
  it('declared ri! resolves', () => {
    const vars: DeclaredVariable[] = [{ domain: 'ri', name: 'caseId', type: 'Integer' }];
    expect(validate(ref('ri', 'caseId'), catalog, vars)).toHaveLength(0);
  });
  it('fv! is never unresolved (implicitly scoped in a!forEach)', () => {
    expect(validate(ref('fv', 'item'), catalog, NO_VARS)).toHaveLength(0);
  });
  it('environment domains (pv!, cons!) are not checked', () => {
    expect(validate(ref('cons', 'MY_CONST'), catalog, NO_VARS)).toHaveLength(0);
  });
});

describe('unknown function', () => {
  it('unknown a! function -> warning', () => {
    const d = validate(call('a!madeUpComponent', []), catalog, NO_VARS);
    expect(warns(d)).toHaveLength(1);
    expect(warns(d)[0].message).toContain('a!madeUpComponent');
  });
  it('unknown rule! -> info', () => {
    const d = validate(call('rule!myAppRule', []), catalog, NO_VARS);
    expect(infos(d)).toHaveLength(1);
  });
});

describe('deprecated function -> warning', () => {
  it('flags a deprecated function with its replacement', () => {
    const custom: CatalogFile = {
      appianVersion: 'test',
      functions: [
        {
          name: 'oldFn',
          category: 'text',
          summary: 'Legacy.',
          returns: 'Text',
          params: [],
          deprecated: true,
          replacement: 'newFn',
        },
      ],
    };
    const d = validate(call('oldFn', []), createCatalog(custom), NO_VARS);
    expect(warns(d)).toHaveLength(1);
    expect(warns(d)[0].message).toContain('deprecated');
    expect(warns(d)[0].message).toContain('newFn');
  });
});

describe('record reference -> info (amendment 5)', () => {
  it('emits a re-linking info diagnostic', () => {
    const d = validate(recordRef('recordType!Case'), catalog, NO_VARS);
    expect(infos(d)).toHaveLength(1);
    expect(infos(d)[0].message).toContain('re-linking');
  });
});

describe('type mismatch (conservative, Boolean) -> warning', () => {
  it('flags a text literal where Boolean is expected', () => {
    const node = call('a!textField', [kw('required', text('yes'))]);
    const d = validate(node, catalog, NO_VARS);
    expect(warns(d).some((w) => w.message.includes('Boolean'))).toBe(true);
  });
  it('accepts a boolean literal for a Boolean param', () => {
    const node = call('a!textField', [kw('required', bool(true))]);
    expect(warns(validate(node, catalog, NO_VARS))).toHaveLength(0);
  });
});

describe('a clean, fully-valid expression produces no errors or warnings', () => {
  it('the query recipe output validates cleanly (only record-ref infos)', () => {
    const query = call('a!queryRecordType', [
      kw('recordType', recordRef('recordType!Case')),
      kw(
        'filters',
        call('a!queryLogicalExpression', [
          kw('operator', text('AND')),
          kw(
            'filters',
            arr([
              call('a!queryFilter', [
                kw('field', recordRef('recordType!Case.fields.status')),
                kw('operator', text('=')),
                kw('value', text('Open')),
              ]),
            ]),
          ),
          kw('ignoreFiltersWithEmptyValues', bool(true)),
        ]),
      ),
      kw(
        'pagingInfo',
        call('a!pagingInfo', [kw('startIndex', num(1)), kw('batchSize', num(100))]),
      ),
    ]);
    const d = validate(query, catalog, NO_VARS);
    expect(errs(d)).toHaveLength(0);
    expect(warns(d)).toHaveLength(0);
    expect(infos(d).length).toBeGreaterThan(0); // record-ref re-linking notes
  });
});
