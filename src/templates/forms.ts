import { arr, bool, call, kw, raw, text } from '@/core/builder';
import type { Recipe } from '@/core/recipe';
import { parseRef } from './_util';

export const textField: Recipe = {
  id: 'text-field',
  name: 'Text Field',
  category: 'forms',
  description: 'A single-line text input bound to a variable.',
  slots: [
    { id: 'label', label: 'Label', required: true, slot: { type: 'text' } },
    {
      id: 'value',
      label: 'Value',
      slot: { type: 'variableRef' },
      placeholder: 'ri!name',
    },
    {
      id: 'saveInto',
      label: 'Save Into',
      slot: { type: 'variableRef' },
      placeholder: 'ri!name',
    },
    { id: 'placeholder', label: 'Placeholder', slot: { type: 'text' } },
    { id: 'required', label: 'Required', slot: { type: 'boolean' }, default: false },
    { id: 'readOnly', label: 'Read Only', slot: { type: 'boolean' }, default: false },
  ],
  build: (v) =>
    call('a!textField', [
      kw('label', text(v.label as string)),
      kw('value', v.value ? parseRef(v.value as string) : null),
      kw('saveInto', v.saveInto ? parseRef(v.saveInto as string) : null),
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
    { id: 'label', label: 'Label', required: true, slot: { type: 'text' } },
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
      kw('value', v.value ? parseRef(v.value as string) : null),
      kw('saveInto', v.saveInto ? parseRef(v.saveInto as string) : null),
      kw('required', v.required ? bool(true) : null),
    ]),
};

export const dropdownField: Recipe = {
  id: 'dropdown-field',
  name: 'Dropdown Field',
  category: 'forms',
  description: 'A single-select dropdown with parallel label/value lists.',
  slots: [
    { id: 'label', label: 'Label', required: true, slot: { type: 'text' } },
    {
      id: 'choiceLabels',
      label: 'Choice Labels',
      slot: { type: 'list', item: { type: 'text' } },
    },
    {
      id: 'choiceValues',
      label: 'Choice Values (expressions)',
      slot: { type: 'list', item: { type: 'expression' } },
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
    return call('a!dropdownField', [
      kw('label', text(v.label as string)),
      kw('choiceLabels', labels.length ? arr(labels.map(text)) : null),
      kw('choiceValues', values.length ? arr(values.map((s) => raw(s))) : null),
      kw('value', v.value ? parseRef(v.value as string) : null),
      kw('saveInto', v.saveInto ? parseRef(v.saveInto as string) : null),
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
    { id: 'label', label: 'Section Label', slot: { type: 'text' } },
    {
      id: 'contents',
      label: 'Contents (expressions)',
      slot: { type: 'list', item: { type: 'expression' } },
      help: 'Each item is a SAIL component expression.',
    },
  ],
  build: (v) => {
    const contents = (v.contents as string[] | undefined) ?? [];
    return call('a!sectionLayout', [
      kw('label', v.label ? text(v.label as string) : null),
      kw('contents', contents.length ? arr(contents.map((s) => raw(s))) : null),
    ]);
  },
};
