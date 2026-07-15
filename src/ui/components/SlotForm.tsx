/**
 * Recursive slot form. Renders a recipe's slots as inputs, driven purely by the
 * slot type. `list` slots get add/remove sub-rows; `nestedRecipe` slots render
 * the referenced recipe's slots inline as a sub-form. Fully controlled: every
 * edit calls `onChange` with the next values object.
 */

import { useId } from 'react';
import { X } from 'lucide-react';
import type { SlotSpec, SlotType } from '@/core/recipe';
import type { DeclaredVariable } from '@/core/types';
import { getRecipe } from '@/templates';
import { Button, Checkbox, Field, Select, TextInput } from './primitives';

/** Seed a values object with each slot's default (and enum first-option), so
 * forms show sensible starting values rather than blanks. */
export function initialValues(
  slots: SlotSpec[],
  recordTypeRef?: string,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const s of slots) {
    if (s.default !== undefined) values[s.id] = s.default;
    // Prefill record-type references from the global setting the user pasted.
    else if (s.slot.type === 'recordTypeRef' && recordTypeRef) values[s.id] = recordTypeRef;
    // Seed a first-option only for REQUIRED enums; an optional enum must be
    // omittable, so it starts unset (and offers a "(none)" choice).
    else if (s.slot.type === 'enum' && s.required) values[s.id] = s.slot.options[0];
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
  variables: DeclaredVariable[];
  required?: boolean;
}

function SlotInput({ slot, value, onChange, placeholder, variables, required }: SlotInputProps) {
  const listId = useId();
  switch (slot.type) {
    case 'text':
    case 'expression':
    case 'recordTypeRef':
    case 'fieldRef':
      return (
        <TextInput
          value={(value as string) ?? ''}
          placeholder={placeholder}
          className={slot.type !== 'text' ? 'font-mono' : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'variableRef': {
      const options = variables
        .filter((v) => !slot.domains || slot.domains.includes(v.domain))
        .map((v) => `${v.domain}!${v.name}`);
      const hintId = `${listId}-hint`;
      return (
        <>
          <TextInput
            value={(value as string) ?? ''}
            placeholder={placeholder}
            className="font-mono"
            list={options.length ? listId : undefined}
            aria-describedby={options.length ? undefined : hintId}
            onChange={(e) => onChange(e.target.value)}
          />
          {options.length > 0 ? (
            <datalist id={listId}>
              {options.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          ) : (
            // aria-hidden keeps this out of the wrapping <label>'s accessible-
            // name subtree; aria-describedby still surfaces it as a description.
            <span id={hintId} aria-hidden="true" className="text-[11px] text-muted-foreground/80">
              Tip: declare variables in the Variables tab to get suggestions here.
            </span>
          )}
        </>
      );
    }
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
        <Checkbox
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case 'enum':
      return (
        <Select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
        >
          {/* An optional enum can be cleared back to "no value". */}
          {!required && <option value="">(none)</option>}
          {slot.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      );
    case 'list': {
      // Tolerate any value shape — a stale/hand-edited preset may carry a
      // non-array here; render it as empty rather than crashing on .map, and
      // let generate()'s zod check surface the mismatch as a build issue.
      const items = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1">
                <SlotInput
                  slot={slot.item}
                  value={item}
                  placeholder={placeholder}
                  variables={variables}
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
                <X className="h-4 w-4" />
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
        <div className="border border-border bg-muted p-2">
          <SlotForm
            slots={recipe.slots}
            values={
              value && typeof value === 'object' && !Array.isArray(value)
                ? (value as Record<string, unknown>)
                : {}
            }
            variables={variables}
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
  variables?: DeclaredVariable[];
}

export function SlotForm({ slots, values, onChange, variables = [] }: SlotFormProps) {
  return (
    <div className="flex flex-col gap-3">
      {slots.map((s) => (
        <Field
          key={s.id}
          label={s.label}
          help={s.help}
          required={s.required}
          asGroup={s.slot.type === 'list' || s.slot.type === 'nestedRecipe'}
        >
          <SlotInput
            slot={s.slot}
            value={values[s.id]}
            placeholder={s.placeholder}
            variables={variables}
            required={s.required}
            onChange={(v) => onChange({ ...values, [s.id]: v })}
          />
        </Field>
      ))}
    </div>
  );
}
