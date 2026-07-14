import { describe, it, expect } from 'vitest';
import { arr, bool, call, kw, map, num, nul, pos, text } from '@/core/builder';
import { serialize, COMPACT } from '@/core/serialize';

describe('builder null-pruning', () => {
  it('call() drops null-valued args', () => {
    const node = call('a!textField', [
      kw('label', text('Name')),
      kw('value', null),
      kw('required', bool(true)),
    ]);
    expect(node.args).toHaveLength(2);
    expect(serialize(node, COMPACT)).toBe('a!textField(label: "Name", required: true)');
  });

  it('arr() drops null items', () => {
    const node = arr([num(1), null, num(2)]);
    expect(node.items).toHaveLength(2);
    expect(serialize(node, COMPACT)).toBe('{1, 2}');
  });

  it('map() drops null-valued entries', () => {
    const node = map([
      { key: 'a', value: num(1) },
      { key: 'b', value: null },
    ]);
    expect(node.entries).toHaveLength(1);
    expect(serialize(node, COMPACT)).toBe('a!map(a: 1)');
  });

  it('explicit null literal is preserved (nul() is a value, not a pruned arg)', () => {
    const node = call('foo', [kw('x', nul())]);
    expect(node.args).toHaveLength(1);
    expect(serialize(node, COMPACT)).toBe('foo(x: null)');
  });

  it('positional null is also pruned', () => {
    const node = call('foo', [pos(num(1)), pos(null), pos(num(3))]);
    expect(node.args).toHaveLength(2);
    expect(serialize(node, COMPACT)).toBe('foo(1, 3)');
  });
});
