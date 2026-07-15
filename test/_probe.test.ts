import { describe, it, expect } from 'vitest';
import { generate } from '@/templates';
import { serialize, EXPANDED } from '@/core/serialize';

describe('probes', () => {
  it('sortField whitespace', () => {
    const ast = generate('query-record-type', { recordType: 'recordType!Case', sortField: '   ' });
    console.log('SORTFIELD:\n' + serialize(ast, EXPANDED));
  });
  it('textField saveInto whitespace', () => {
    const ast = generate('text-field', { label: 'X', saveInto: '   ' });
    console.log('SAVEINTO:\n' + serialize(ast, EXPANDED));
  });
  it('number 1e21 and small', () => {
    const a = generate('query-record-type', { recordType: 'recordType!Case', batchSize: 1e21 });
    console.log('BATCH1e21:\n' + serialize(a, EXPANDED));
  });
});
