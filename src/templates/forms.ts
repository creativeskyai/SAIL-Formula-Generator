import { arr, bool, call, kw, raw, text } from '@/core/builder';
import type { Recipe } from '@/core/recipe';
import { parseRef, trimmed } from './_util';

/** A variableRef slot -> a ref node, or null when empty/whitespace-only so the
 * optional arg prunes instead of emitting a blank value. */
const optRef = (v: unknown) => {
  const t = trimmed(v);
  return t ? parseRef(t) : null;
};

export const textField: Recipe = {
  id: 'text-field',
  name: 'Text Field',
  category: 'forms',
  description: 'A single-line text input bound to a variable.',
  slots: [
    {
      id: 'label',
      label: 'Label',
      required: true,
      slot: { type: 'text' },
      placeholder: 'Customer Name',
    },
    {
      id: 'value',
      label: 'Value',
      slot: { type: 'variableRef' },
      placeholder: 'ri!name',
      help: 'The variable whose current value the field shows.',
    },
    {
      id: 'saveInto',
      label: 'Save Into',
      slot: { type: 'variableRef' },
      placeholder: 'ri!name',
      help: 'Where the user’s input is saved — usually the same variable as Value.',
    },
    {
      id: 'placeholder',
      label: 'Placeholder',
      slot: { type: 'text' },
      placeholder: 'Enter a name…',
      help: 'Hint text shown inside the empty field.',
    },
    { id: 'required', label: 'Required', slot: { type: 'boolean' }, default: false },
    { id: 'readOnly', label: 'Read Only', slot: { type: 'boolean' }, default: false },
  ],
  build: (v) =>
    call('a!textField', [
      kw('label', text(v.label as string)),
      kw('value', optRef(v.value)),
      kw('saveInto', optRef(v.saveInto)),
      kw('placeholder', v.placeholder ? text(v.placeholder as string) : null),
      kw('required', v.required ? bool(true) : null),
      kw('readOnly', v.readOnly ? bool(true) : null),
    ]),
};

export const integerField: Recipe = {
  id: 'integer-field',
  name: 'Integer Field',
  category: 'forms',
  description: 'A numeric input restricted to integers.',
  slots: [
    {
      id: 'label',
      label: 'Label',
      required: true,
      slot: { type: 'text' },
      placeholder: 'Quantity',
    },
    { id: 'value', label: 'Value', slot: { type: 'variableRef' }, placeholder: 'ri!count' },
    {
      id: 'saveInto',
      label: 'Save Into',
      slot: { type: 'variableRef' },
      placeholder: 'ri!count',
    },
    { id: 'required', label: 'Required', slot: { type: 'boolean' }, default: false },
  ],
  build: (v) =>
    call('a!integerField', [
      kw('label', text(v.label as string)),
      kw('value', optRef(v.value)),
      kw('saveInto', optRef(v.saveInto)),
      kw('required', v.required ? bool(true) : null),
    ]),
};

export const dropdownField: Recipe = {
  id: 'dropdown-field',
  name: 'Dropdown Field',
  category: 'forms',
  description: 'A single-select dropdown with parallel label/value lists.',
  slots: [
    {
      id: 'label',
      label: 'Label',
      required: true,
      slot: { type: 'text' },
      placeholder: 'Status',
    },
    {
      id: 'choiceLabels',
      label: 'Choice Labels',
      slot: { type: 'list', item: { type: 'text' } },
      placeholder: 'Open',
      help: 'What the user sees in the dropdown.',
    },
    {
      id: 'choiceValues',
      label: 'Choice Values (expressions)',
      slot: { type: 'list', item: { type: 'expression' } },
      placeholder: '"OPEN"',
      help: 'Positionally paired with the labels above — incomplete pairs are dropped.',
    },
    { id: 'value', label: 'Value', slot: { type: 'variableRef' }, placeholder: 'ri!status' },
    {
      id: 'saveInto',
      label: 'Save Into',
      slot: { type: 'variableRef' },
      placeholder: 'ri!status',
    },
    { id: 'required', label: 'Required', slot: { type: 'boolean' }, default: false },
  ],
  build: (v) => {
    const labels = (v.choiceLabels as string[] | undefined) ?? [];
    const values = (v.choiceValues as string[] | undefined) ?? [];
    // Labels and values are positionally paired; drop any incomplete pair so
    // the two arrays stay aligned and no empty element is emitted.
    const pairs = labels
      .map((l, i) => ({ label: (l ?? '').trim(), value: (values[i] ?? '').trim() }))
      .filter((p) => p.label !== '' && p.value !== '');
    return call('a!dropdownField', [
      kw('label', text(v.label as string)),
      kw('choiceLabels', pairs.length ? arr(pairs.map((p) => text(p.label))) : null),
      kw('choiceValues', pairs.length ? arr(pairs.map((p) => raw(p.value))) : null),
      kw('value', optRef(v.value)),
      kw('saveInto', optRef(v.saveInto)),
      kw('required', v.required ? bool(true) : null),
    ]);
  },
};

export const sectionLayout: Recipe = {
  id: 'section-layout',
  name: 'Section Layout',
  category: 'forms',
  description: 'A titled section wrapping a list of component expressions.',
  slots: [
    {
      id: 'label',
      label: 'Section Label',
      slot: { type: 'text' },
      placeholder: 'Case Details',
    },
    {
      id: 'contents',
      label: 'Contents (expressions)',
      slot: { type: 'list', item: { type: 'expression' } },
      placeholder: 'a!textField(label: "Name")',
      help: 'Each item is a SAIL component expression.',
    },
  ],
  build: (v) => {
    const contents = ((v.contents as string[] | undefined) ?? [])
      .map((s) => (s ?? '').trim())
      .filter((s) => s !== '');
    return call('a!sectionLayout', [
      kw('label', v.label ? text(v.label as string) : null),
      kw('contents', contents.length ? arr(contents.map((s) => raw(s))) : null),
    ]);
  },
};
