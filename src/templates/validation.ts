import { call, kw, text } from '@/core/builder';
import type { Recipe } from '@/core/recipe';

export const requiredValidation: Recipe = {
  id: 'required-validation',
  name: 'Validation Message',
  category: 'validation',
  description: 'A validation message shown when its conditions are met.',
  slots: [
    {
      id: 'message',
      label: 'Message',
      required: true,
      slot: { type: 'text' },
      placeholder: 'A value is required.',
    },
    {
      id: 'validateAfter',
      label: 'Validate After',
      slot: { type: 'enum', options: ['KEYSTROKE', 'UNFOCUS', 'SUBMIT', 'REFRESH'] },
      help: 'When Appian evaluates the validation. Leave (none) for the default.',
    },
  ],
  build: (v) =>
    call('a!validationMessage', [
      kw('message', text(v.message as string)),
      kw('validateAfter', v.validateAfter ? text(v.validateAfter as string) : null),
    ]),
};
