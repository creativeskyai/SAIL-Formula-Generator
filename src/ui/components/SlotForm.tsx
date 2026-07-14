/**
 * Recursive slot form. Renders a recipe's slots as inputs, driven purely by the
 * slot type. `list` slots get add/remove sub-rows; `nestedRecipe` slots render
 * the referenced recipe's slots inline as a sub-form. Fully controlled: every
 * edit calls `onChange` with the next values object.
 */

import type { SlotSpec, SlotType } from '@/core/recipe';
import { getRecipe } from '@/templates';
import { Button, Field, Select, TextInput } from './primitives';

/** Seed a values object with each slot's default (and enum first-option), so
 * forms show sensible starting values rather than blanks. */
export function initialValues(slots: SlotSpec[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const s of slots) {
    if (s.default !== undefined) values[s.id] = s.default;
    else if (s.slot.type === 'enum') values[s.id] = s.slot.options[0];
  }
  return values;
}

function defaultForSlot(slot: SlotType): unknown {
  switch (slot.type) {
    case 'number':
      return undefined;
    case 'boolean':
      return false;
    case 'enum':
      return slot.options[0] ?? '';
    case 'list':
      return [];
    case 'nestedRecipe': {
      const recipe = slot.recipeId ? getRecipe(slot.recipeId) : undefined;
      return recipe ? initialValues(recipe.slots) : {};
    }
    default:
      return '';
  }
}

interface SlotInputProps {
  slot: SlotType;
  value: unknown;
  onChange: (v: unknown) => void;
  placeholder?: string;
}

function SlotInput({ slot, value, onChange, placeholder }: SlotInputProps) {
  switch (slot.type) {
    case 'text':
    case 'expression':
    case 'recordTypeRef':
    case 'fieldRef':
    case 'variableRef':
      return (
        <TextInput
          value={(value as string) ?? ''}
          placeholder={placeholder}
          className={slot.type !== 'text' ? 'font-mono' : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'number':
      return (
        <TextInput
          type="number"
          value={value === undefined || value === null ? '' : String(value)}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />
      );
    case 'boolean':
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-[var(--primary)]"
        />
      );
    case 'enum':
      return (
        <Select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
          {slot.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      );
    case 'list': {
      const items = (value as unknown[]) ?? [];
      return (
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1">
                <SlotInput
                  slot={slot.item}
                  value={item}
                  placeholder={placeholder}
                  onChange={(nv) => {
                    const next = items.slice();
                    next[i] = nv;
                    onChange(next);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                aria-label="Remove item"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              >
                ✕
              </Button>
            </div>
          ))}
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange([...items, defaultForSlot(slot.item)])}
            >
              + Add
            </Button>
          </div>
        </div>
      );
    }
    case 'nestedRecipe': {
      const recipe = slot.recipeId ? getRecipe(slot.recipeId) : undefined;
      if (!recipe) {
        return <div className="text-xs text-muted-foreground">No recipe bound to this slot.</div>;
      }
      return (
        <div className="rounded-md border border-border/60 bg-muted/30 p-2">
          <SlotForm
            slots={recipe.slots}
            values={(value as Record<string, unknown>) ?? {}}
            onChange={(v) => onChange(v)}
          />
        </div>
      );
    }
  }
}

export interface SlotFormProps {
  slots: SlotSpec[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}

export function SlotForm({ slots, values, onChange }: SlotFormProps) {
  return (
    <div className="flex flex-col gap-3">
      {slots.map((s) => (
        <Field key={s.id} label={s.label} help={s.help} required={s.required}>
          <SlotInput
            slot={s.slot}
            value={values[s.id]}
            placeholder={s.placeholder}
            onChange={(v) => onChange({ ...values, [s.id]: v })}
          />
        </Field>
      ))}
    </div>
  );
}
