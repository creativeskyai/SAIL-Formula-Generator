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

export type SlotType =
  | { type: 'text' | 'number' | 'boolean' }
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

function slotToZod(slot: SlotType): z.ZodTypeAny {
  switch (slot.type) {
    case 'text':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'enum':
      return z.string().refine((v) => slot.options.includes(v), {
        message: `must be one of: ${slot.options.join(', ')}`,
      });
    case 'expression':
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
