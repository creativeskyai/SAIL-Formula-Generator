/**
 * Recipe + Slot model, with zod-validated slot values (PLAN.md amendment 7).
 *
 * A recipe is a template: a list of typed slots plus a pure `build()` that turns
 * validated slot values into an AST. Slot values are validated by a zod schema
 * derived from the slots BEFORE `build()` runs, so malformed or stale input
 * (e.g. an imported preset) fails loudly instead of crashing inside `build()`.
 */

import { z } from 'zod';
import type { SailNode, VarDomain } from './ast';
import type { DeclaredVariable } from './types';
import { hasTopLevelComma } from './validate';

export type SlotType =
  | { type: 'text' | 'boolean' }
  | { type: 'number'; integer?: boolean; min?: number }
  | { type: 'enum'; options: string[] }
  | { type: 'expression' }
  | { type: 'recordTypeRef' }
  | { type: 'fieldRef' }
  | { type: 'variableRef'; domains?: VarDomain[] }
  | { type: 'list'; item: SlotType }
  | { type: 'nestedRecipe'; recipeId?: string };

export interface SlotSpec {
  id: string;
  label: string;
  slot: SlotType;
  required?: boolean;
  default?: unknown;
  placeholder?: string;
  help?: string;
}

export interface BuildContext {
  buildRecipe: (recipeId: string, values: Record<string, unknown>) => SailNode;
  variables: DeclaredVariable[];
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  description: string;
  slots: SlotSpec[];
  build: (values: Record<string, unknown>, ctx: BuildContext) => SailNode;
}

// --- zod derivation ----------------------------------------------------------

// Reference-shape validators. A variable reference is `domain!name` with
// optional dotted/indexed accessors. A record/field reference starts with
// `recordType!` and may contain interior spaces — real UUID-qualified
// references copied from an Appian environment look like
// `recordType!{608f...}PSFS Case.fields.{...}status`, and record type names
// routinely contain spaces. Both still reject the malformed refs the audit
// found (e.g. `ri!my case`, `ri!1id`, a bare `Case`).
const IDENT = String.raw`[A-Za-z_]\w*`;
const ACCESSOR = String.raw`(?:\.${IDENT}|\[[^\]]*\])`;
const VAR_REF_RE = new RegExp(
  `^(?:ri|local|pv|ac|cons|rule|fv|tp|rf|rp|pp)!${IDENT}${ACCESSOR}*$`,
);
const RECORD_REF_RE = /^recordType!\S(?:.*\S)?$/;

function isValidRef(type: 'variableRef' | 'recordTypeRef' | 'fieldRef', value: string): boolean {
  const t = value.trim();
  if (t === '') return true; // empty is handled by required/optional rules
  return (type === 'variableRef' ? VAR_REF_RE : RECORD_REF_RE).test(t);
}

function slotToZod(slot: SlotType): z.ZodTypeAny {
  switch (slot.type) {
    case 'text':
      return z.string();
    case 'number': {
      // Reject NaN and ±Infinity — String(Infinity) is "Infinity", not a legal
      // SAIL number literal. Apply integer / minimum constraints when declared.
      let n = z.number().finite();
      if (slot.integer) n = n.int();
      if (slot.min !== undefined) n = n.min(slot.min);
      return n;
    }
    case 'boolean':
      return z.boolean();
    case 'enum':
      return z.string().refine((v) => slot.options.includes(v), {
        message: `must be one of: ${slot.options.join(', ')}`,
      });
    case 'expression':
      // An expression slot holds exactly ONE expression. A comma at bracket
      // depth 0 means the text would splice extra arguments into the call it's
      // embedded in (`value: 1, 10`) — corrupt output that brackets-balance
      // checking can't see.
      return z.string().refine((v) => !hasTopLevelComma(v), {
        message:
          'looks like multiple expressions — wrap a list in { } or remove the extra comma',
      });
    case 'recordTypeRef':
    case 'fieldRef':
    case 'variableRef':
      return z.string();
    case 'list':
      return z.array(slotToZod(slot.item));
    case 'nestedRecipe':
      return z.record(z.unknown());
  }
}

export function slotsToZodSchema(slots: SlotSpec[]): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};
  for (const s of slots) {
    let schema = slotToZod(s.slot);
    // A required text/expression/ref slot must have non-whitespace content — an
    // empty or all-spaces value would otherwise serialize to nothing (or a
    // blank argument) and produce invalid SAIL. Keyed off the slot type, not
    // `instanceof z.ZodString`, because the expression schema is already a
    // refined ZodEffects.
    const t = s.slot.type;
    if (
      t === 'text' ||
      t === 'expression' ||
      t === 'variableRef' ||
      t === 'recordTypeRef' ||
      t === 'fieldRef'
    ) {
      let str = schema as z.ZodType<string>;
      if (s.required) {
        str = str.refine((v) => v.trim().length > 0, {
          message: `${s.label} is required`,
        });
      }
      if (t === 'variableRef' || t === 'recordTypeRef' || t === 'fieldRef') {
        str = str.refine((v) => isValidRef(t, v), {
          message: `${s.label} must be a valid ${t === 'variableRef' ? 'variable' : 'record'} reference`,
        });
      }
      schema = str;
    }
    if (s.default !== undefined) schema = schema.default(s.default as never);
    else if (!s.required) schema = schema.optional();
    shape[s.id] = schema;
  }
  return z.object(shape);
}

/** Validate raw slot values against a recipe's slots, applying defaults.
 * Throws a ZodError on invalid input. */
export function validateSlotValues(
  slots: SlotSpec[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  return slotsToZodSchema(slots).parse(values);
}

// --- Preset import/export (amendment 7: schemaVersion from day one) ----------

export const PRESET_SCHEMA_VERSION = 1;

export interface Preset {
  schemaVersion: number;
  recipeId: string;
  slotValues: Record<string, unknown>;
  variables: DeclaredVariable[];
}

const presetSchema = z.object({
  schemaVersion: z.literal(PRESET_SCHEMA_VERSION),
  recipeId: z.string(),
  slotValues: z.record(z.unknown()),
  variables: z.array(
    z.object({
      domain: z.string(),
      name: z.string(),
      type: z.string().optional(),
    }),
  ),
});

/** Parse and validate an imported preset. Throws a ZodError on malformed or
 * stale JSON rather than letting bad data reach `build()`. */
export function parsePreset(data: unknown): Preset {
  return presetSchema.parse(data) as Preset;
}
