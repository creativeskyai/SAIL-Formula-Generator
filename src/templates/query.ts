import { arr, bool, call, kw, num, raw, recordRef, text } from '@/core/builder';
import type { Recipe } from '@/core/recipe';
import { trimmed } from './_util';

// The complete operator set documented for a!queryFilter (Appian 24.4).
const FILTER_OPERATORS = [
  '=',
  '<>',
  '>',
  '>=',
  '<',
  '<=',
  'between',
  'in',
  'not in',
  'is null',
  'not null',
  'starts with',
  'not starts with',
  'ends with',
  'not ends with',
  'includes',
  'not includes',
];

export const queryFilter: Recipe = {
  id: 'query-filter',
  name: 'Query Filter',
  category: 'query',
  description: 'A single filter condition on a record field.',
  slots: [
    {
      id: 'field',
      label: 'Field',
      required: true,
      slot: { type: 'fieldRef' },
      placeholder: 'recordType!Case.fields.status',
    },
    {
      id: 'operator',
      label: 'Operator',
      required: true,
      slot: { type: 'enum', options: FILTER_OPERATORS },
      default: '=',
    },
    {
      id: 'value',
      label: 'Value (expression)',
      slot: { type: 'expression' },
      placeholder: '"Open"',
      help: 'A SAIL expression. Leave empty for is null / not null.',
    },
  ],
  build: (v) => {
    const operator = v.operator as string;
    const value = trimmed(v.value);
    // Every operator except is null / not null needs a value.
    if (operator !== 'is null' && operator !== 'not null' && value === '') {
      throw new Error(`The "${operator}" operator requires a value.`);
    }
    return call('a!queryFilter', [
      kw('field', recordRef(trimmed(v.field))),
      kw('operator', text(operator)),
      kw('value', value ? raw(value) : null),
    ]);
  },
};

export const queryRecordType: Recipe = {
  id: 'query-record-type',
  name: 'Query a Record Type',
  category: 'query',
  description: 'Retrieve records with optional filters, sort, and paging.',
  slots: [
    {
      id: 'recordType',
      label: 'Record Type',
      required: true,
      slot: { type: 'recordTypeRef' },
      placeholder: 'recordType!Case',
    },
    {
      id: 'filters',
      label: 'Filters',
      slot: { type: 'list', item: { type: 'nestedRecipe', recipeId: 'query-filter' } },
    },
    {
      id: 'batchSize',
      label: 'Batch Size',
      slot: { type: 'number', integer: true, min: 1 },
      default: 100,
    },
    { id: 'sortField', label: 'Sort Field', slot: { type: 'fieldRef' } },
    {
      id: 'sortAscending',
      label: 'Sort Ascending',
      slot: { type: 'boolean' },
      default: true,
    },
  ],
  build: (v, ctx) => {
    const filters = (v.filters as Record<string, unknown>[] | undefined) ?? [];
    const sortField = trimmed(v.sortField);
    return call('a!queryRecordType', [
      kw('recordType', recordRef(trimmed(v.recordType))),
      kw(
        'filters',
        filters.length
          ? call('a!queryLogicalExpression', [
              kw('operator', text('AND')),
              kw('filters', arr(filters.map((f) => ctx.buildRecipe('query-filter', f)))),
              kw('ignoreFiltersWithEmptyValues', bool(true)),
            ])
          : null,
      ),
      kw(
        'pagingInfo',
        call('a!pagingInfo', [
          kw('startIndex', num(1)),
          kw('batchSize', num((v.batchSize as number) ?? 100)),
          kw(
            'sort',
            sortField
              ? call('a!sortInfo', [
                  kw('field', recordRef(sortField)),
                  kw('ascending', bool((v.sortAscending as boolean) ?? true)),
                ])
              : null,
          ),
        ]),
      ),
    ]);
  },
};
