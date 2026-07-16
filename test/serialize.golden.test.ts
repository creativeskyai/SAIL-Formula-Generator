import { describe, it, expect } from 'vitest';
import {
  and,
  arr,
  binop,
  bool,
  call,
  dot,
  index,
  kw,
  map,
  neg,
  not,
  nul,
  num,
  or,
  pos,
  raw,
  recordRef,
  ref,
  text,
} from '@/core/builder';
import { serialize, COMPACT, EXPANDED } from '@/core/serialize';
import type { SailNode } from '@/core/ast';

/** Convenience: serialize with an ad-hoc width for boundary tests. */
const at = (node: SailNode, maxWidth: number, indent = 2) =>
  serialize(node, { maxWidth, indent });

describe('literals', () => {
  it('numbers, booleans, null', () => {
    expect(serialize(num(100), COMPACT)).toBe('100');
    expect(serialize(num(1.5), COMPACT)).toBe('1.5');
    expect(serialize(num(0), COMPACT)).toBe('0');
    expect(serialize(bool(true), COMPACT)).toBe('true');
    expect(serialize(bool(false), COMPACT)).toBe('false');
    expect(serialize(nul(), COMPACT)).toBe('null');
  });
});

describe('string escaping (amendment 1: double the quotes, no backslash)', () => {
  it('plain string', () => {
    expect(serialize(text('Open'), COMPACT)).toBe('"Open"');
  });
  it('empty string', () => {
    expect(serialize(text(''), COMPACT)).toBe('""');
  });
  it('embedded quotes are doubled', () => {
    expect(serialize(text('He said "hi"'), COMPACT)).toBe('"He said ""hi"""');
  });
  it('a lone quote becomes four quotes', () => {
    expect(serialize(text('"'), COMPACT)).toBe('""""');
  });
  it('does not use backslash escapes', () => {
    expect(serialize(text('a"b'), COMPACT)).toBe('"a""b"');
  });
});

describe('variable and record references', () => {
  it('variable domains', () => {
    expect(serialize(ref('ri', 'case'), COMPACT)).toBe('ri!case');
    expect(serialize(ref('local', 'x'), COMPACT)).toBe('local!x');
    expect(serialize(ref('fv', 'item'), COMPACT)).toBe('fv!item');
  });
  it('record refs print verbatim', () => {
    expect(serialize(recordRef('recordType!Case'), COMPACT)).toBe('recordType!Case');
    expect(serialize(recordRef('recordType!Case.fields.status'), COMPACT)).toBe(
      'recordType!Case.fields.status',
    );
  });
});

describe('arrays and maps', () => {
  it('array inline', () => {
    expect(serialize(arr([num(1), num(2), num(3)]), COMPACT)).toBe('{1, 2, 3}');
  });
  it('empty array', () => {
    expect(serialize(arr([]), COMPACT)).toBe('{}');
  });
  it('map renders as a!map with keyword entries', () => {
    expect(
      serialize(map([{ key: 'a', value: num(1) }, { key: 'b', value: text('x') }]), COMPACT),
    ).toBe('a!map(a: 1, b: "x")');
  });
  it('empty map', () => {
    expect(serialize(map([]), COMPACT)).toBe('a!map()');
  });
});

describe('function calls: keyword vs positional', () => {
  it('keyword args print name: value', () => {
    expect(serialize(call('a!textField', [kw('label', text('Name'))]), COMPACT)).toBe(
      'a!textField(label: "Name")',
    );
  });
  it('positional args print bare', () => {
    expect(serialize(call('sum', [pos(num(1)), pos(num(2))]), COMPACT)).toBe('sum(1, 2)');
  });
  it('zero-arg call', () => {
    expect(serialize(call('now', []), COMPACT)).toBe('now()');
  });
  it('and/or/not are function calls, not operators', () => {
    expect(
      serialize(and(binop('=', ref('ri', 'x'), num(1)), bool(true)), COMPACT),
    ).toBe('and(ri!x = 1, true)');
    expect(serialize(or(bool(true), bool(false)), COMPACT)).toBe('or(true, false)');
    expect(serialize(not(bool(false)), COMPACT)).toBe('not(false)');
  });
});

describe('operator precedence and parenthesization (amendment 2)', () => {
  it('adds parens when child precedence is lower', () => {
    expect(serialize(binop('*', binop('+', num(1), num(2)), num(3)), COMPACT)).toBe(
      '(1 + 2) * 3',
    );
  });
  it('omits parens when child precedence is higher', () => {
    expect(serialize(binop('+', num(1), binop('*', num(2), num(3))), COMPACT)).toBe(
      '1 + 2 * 3',
    );
  });
  it('left-associative: right same-precedence child gets parens', () => {
    expect(serialize(binop('-', num(1), binop('-', num(2), num(3))), COMPACT)).toBe(
      '1 - (2 - 3)',
    );
  });
  it('left-associative: left same-precedence child stays bare', () => {
    expect(serialize(binop('-', binop('-', num(1), num(2)), num(3)), COMPACT)).toBe(
      '1 - 2 - 3',
    );
  });
  it('right-associative ^: right child stays bare', () => {
    expect(serialize(binop('^', num(2), binop('^', num(2), num(3))), COMPACT)).toBe(
      '2 ^ 2 ^ 3',
    );
  });
  it('right-associative ^: left child gets parens', () => {
    expect(serialize(binop('^', binop('^', num(2), num(3)), num(2)), COMPACT)).toBe(
      '(2 ^ 3) ^ 2',
    );
  });
  it('concat & binds looser than +', () => {
    expect(serialize(binop('&', text('a'), binop('+', num(1), num(2))), COMPACT)).toBe(
      '"a" & 1 + 2',
    );
  });
  it('comparison is loosest', () => {
    expect(serialize(binop('=', binop('+', num(1), num(2)), num(3)), COMPACT)).toBe(
      '1 + 2 = 3',
    );
  });
  it('unary minus over a sum parenthesizes', () => {
    expect(serialize(neg(binop('+', num(1), num(2))), COMPACT)).toBe('-(1 + 2)');
  });
  it('unary minus binds tighter than *', () => {
    expect(serialize(binop('*', neg(num(1)), num(2)), COMPACT)).toBe('-1 * 2');
  });
});

describe('raw expressions (amendment 4a: always parenthesized as an operand)', () => {
  it('raw operand of a binop is parenthesized', () => {
    expect(serialize(binop('+', raw('a + b'), num(1)), COMPACT)).toBe('(a + b) + 1');
  });
  it('raw operand of a unary op is parenthesized', () => {
    expect(serialize(neg(raw('x')), COMPACT)).toBe('-(x)');
  });
  it('raw as a plain function arg is NOT parenthesized', () => {
    expect(serialize(call('foo', [pos(raw('a + b'))]), COMPACT)).toBe('foo(a + b)');
  });
  it('raw at top level is verbatim', () => {
    expect(serialize(raw('1 + 2'), COMPACT)).toBe('1 + 2');
  });
});

describe('dot and index access (amendment 9: single-step chaining)', () => {
  it('single dot', () => {
    expect(serialize(dot(ref('ri', 'case'), 'status'), COMPACT)).toBe('ri!case.status');
  });
  it('single index', () => {
    expect(serialize(index(ref('local', 'items'), num(1)), COMPACT)).toBe('local!items[1]');
  });
  it('mixed chain a.b[1].c', () => {
    const node = dot(index(dot(ref('ri', 'a'), 'b'), num(1)), 'c');
    expect(serialize(node, COMPACT)).toBe('ri!a.b[1].c');
  });
  it('operator target is parenthesized', () => {
    expect(serialize(dot(binop('+', num(1), num(2)), 'x'), COMPACT)).toBe('(1 + 2).x');
  });
});

describe('line breaking (amendment 8, greedy)', () => {
  const boundaryNode = call('func', [kw('a', num(1)), kw('b', num(2))]);

  it('flat form fitting exactly at maxWidth stays inline (boundary)', () => {
    // flat("func(a: 1, b: 2)") is 16 chars; at width 16 it fits.
    expect(at(boundaryNode, 16)).toBe('func(a: 1, b: 2)');
  });

  it('one char over maxWidth breaks every arg (boundary)', () => {
    expect(at(boundaryNode, 15)).toBe(
      ['func(', '  a: 1,', '  b: 2', ')'].join('\n'),
    );
  });

  it('array breaks all-or-nothing', () => {
    const node = arr([num(111), num(222), num(333)]);
    // flat "{111, 222, 333}" is 15 chars; force a break at width 10.
    expect(at(node, 10)).toBe(['{', '  111,', '  222,', '  333', '}'].join('\n'));
  });

  it('no trailing comma after the final broken arg', () => {
    const out = at(boundaryNode, 15);
    expect(out.includes(',\n)')).toBe(false);
    expect(out.endsWith('2\n)')).toBe(true);
  });
});

describe('number literals never use scientific notation (SAIL grammar)', () => {
  it('small magnitude expands to plain decimal', () => {
    expect(serialize(num(0.0000001), COMPACT)).toBe('0.0000001');
    expect(serialize(num(1e-7), COMPACT)).toBe('0.0000001');
  });
  it('large magnitude expands to plain integer', () => {
    expect(serialize(num(1e21), COMPACT)).toBe('1000000000000000000000');
    expect(serialize(num(1.5e21), COMPACT)).toBe('1500000000000000000000');
  });
  it('negative small magnitude', () => {
    expect(serialize(num(-2.3e-8), COMPACT)).toBe('-0.000000023');
  });
  it('ordinary numbers are unaffected', () => {
    expect(serialize(num(3.14), COMPACT)).toBe('3.14');
    expect(serialize(num(1000000), COMPACT)).toBe('1000000');
  });
});

describe('line breaking accounts for the trailing separator comma', () => {
  it('a non-final inline value plus its comma is not left one column over width', () => {
    // Outer flat "f(a: g(x: 1), bb: 2)" is 20 chars -> f breaks. Arg `a` sits at
    // col 5; g's flat "g(x: 1)" is 7 (5+7=12 fits) but the comma after it would
    // push the line to 13, so g must break too.
    const node = call('f', [
      kw('a', call('g', [kw('x', num(1))])),
      kw('bb', num(2)),
    ]);
    const out = at(node, 12);
    expect(out).toBe(
      ['f(', '  a: g(', '    x: 1', '  ),', '  bb: 2', ')'].join('\n'),
    );
    expect(Math.max(...out.split('\n').map((l) => l.length))).toBeLessThanOrEqual(12);
  });
});

describe('golden: a!queryRecordType (nested filters + paging + sort)', () => {
  const query: SailNode = call('a!queryRecordType', [
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
      call('a!pagingInfo', [
        kw('startIndex', num(1)),
        kw('batchSize', num(100)),
        kw(
          'sort',
          call('a!sortInfo', [
            kw('field', recordRef('recordType!Case.fields.createdOn')),
            kw('ascending', bool(true)),
          ]),
        ),
      ]),
    ),
  ]);

  it('compact mode: single line', () => {
    expect(serialize(query, COMPACT)).toBe(
      'a!queryRecordType(recordType: recordType!Case, filters: a!queryLogicalExpression(operator: "AND", filters: {a!queryFilter(field: recordType!Case.fields.status, operator: "=", value: "Open")}, ignoreFiltersWithEmptyValues: true), pagingInfo: a!pagingInfo(startIndex: 1, batchSize: 100, sort: a!sortInfo(field: recordType!Case.fields.createdOn, ascending: true)))',
    );
  });

  it('expanded mode: greedy break at width 80', () => {
    expect(serialize(query, EXPANDED)).toBe(
      [
        'a!queryRecordType(',
        '  recordType: recordType!Case,',
        '  filters: a!queryLogicalExpression(',
        '    operator: "AND",',
        '    filters: {',
        '      a!queryFilter(',
        '        field: recordType!Case.fields.status,',
        '        operator: "=",',
        '        value: "Open"',
        '      )',
        '    },',
        '    ignoreFiltersWithEmptyValues: true',
        '  ),',
        '  pagingInfo: a!pagingInfo(',
        '    startIndex: 1,',
        '    batchSize: 100,',
        '    sort: a!sortInfo(field: recordType!Case.fields.createdOn, ascending: true)',
        '  )',
        ')',
      ].join('\n'),
    );
  });
});
