import { call, kw, raw } from '@/core/builder';
import type { Recipe } from '@/core/recipe';

export const forEach: Recipe = {
  id: 'for-each',
  name: 'For Each',
  category: 'looping',
  description: 'Apply an expression to each item of a list. Use fv!item / fv!index.',
  slots: [
    {
      id: 'items',
      label: 'Items (expression)',
      required: true,
      slot: { type: 'expression' },
      placeholder: 'ri!cases',
    },
    {
      id: 'expression',
      label: 'Expression per item',
      required: true,
      slot: { type: 'expression' },
      placeholder: 'fv!item.name',
    },
  ],
  build: (v) =>
    call('a!forEach', [
      kw('items', raw(v.items as string)),
      kw('expression', raw(v.expression as string)),
    ]),
};
