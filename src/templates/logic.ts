import { call, kw, pos, raw } from '@/core/builder';
import type { Recipe } from '@/core/recipe';

export const ifElse: Recipe = {
  id: 'if-else',
  name: 'If / Else',
  category: 'logic',
  description: 'Return one of two values based on a condition.',
  slots: [
    {
      id: 'condition',
      label: 'Condition',
      required: true,
      slot: { type: 'expression' },
      placeholder: 'ri!amount > 100',
    },
    {
      id: 'valueIfTrue',
      label: 'Value if true',
      required: true,
      slot: { type: 'expression' },
    },
    {
      id: 'valueIfFalse',
      label: 'Value if false',
      required: true,
      slot: { type: 'expression' },
    },
  ],
  build: (v) =>
    call('if', [
      pos(raw(v.condition as string)),
      pos(raw(v.valueIfTrue as string)),
      pos(raw(v.valueIfFalse as string)),
    ]),
};

export const localVariables: Recipe = {
  id: 'local-variables',
  name: 'Local Variables',
  category: 'logic',
  description: 'Declare local variables, then an expression that uses them.',
  slots: [
    {
      id: 'names',
      label: 'Variable names',
      slot: { type: 'list', item: { type: 'text' } },
      help: 'Names without the local! prefix, e.g. total.',
    },
    {
      id: 'values',
      label: 'Variable values (expressions)',
      slot: { type: 'list', item: { type: 'expression' } },
      help: 'Positionally paired with the names above.',
    },
    {
      id: 'body',
      label: 'Body expression',
      required: true,
      slot: { type: 'expression' },
    },
  ],
  build: (v) => {
    const names = (v.names as string[] | undefined) ?? [];
    const values = (v.values as string[] | undefined) ?? [];
    const decls = names
      .map((n, i) => ({ name: (n ?? '').trim(), value: (values[i] ?? '').trim() }))
      .filter((d) => d.name !== '');
    for (const d of decls) {
      if (!/^[A-Za-z_]\w*$/.test(d.name)) {
        throw new Error(
          `Invalid local variable name "${d.name}" — use letters, digits, and underscores only, not starting with a digit.`,
        );
      }
    }
    return call('a!localVariables', [
      ...decls.map((d) => kw(`local!${d.name}`, raw(d.value === '' ? 'null' : d.value))),
      pos(raw(v.body as string)),
    ]);
  },
};
