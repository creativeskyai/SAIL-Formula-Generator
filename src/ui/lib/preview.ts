/** Compute the live preview: build the AST, serialize it, and validate it.
 * `generate` throws a ZodError while required slots are still empty/invalid;
 * that is surfaced as `buildIssues` rather than crashing the UI. */

import { z } from 'zod';
import { catalog } from '@/core/catalog';
import { serialize, type SerializeConfig } from '@/core/serialize';
import type { DeclaredVariable, Diagnostic } from '@/core/types';
import { validate } from '@/core/validate';
import { generate, getRecipe } from '@/templates';

/** One slot-level problem that prevented building. `slotId` (the top-level
 * slot, when identifiable) lets the form highlight the offending field. */
export interface BuildIssue {
  slotId: string | null;
  message: string;
}

export interface PreviewResult {
  sail: string;
  diagnostics: Diagnostic[];
  /** Slot-level problems that prevented building (empty/invalid required slots). */
  buildIssues: BuildIssue[] | null;
}

export function computePreview(
  recipeId: string,
  values: Record<string, unknown>,
  variables: DeclaredVariable[],
  config: SerializeConfig,
): PreviewResult {
  try {
    const ast = generate(recipeId, values, variables);
    return {
      sail: serialize(ast, config),
      diagnostics: validate(ast, catalog, variables),
      buildIssues: null,
    };
  } catch (e) {
    if (e instanceof z.ZodError) {
      const recipe = getRecipe(recipeId);
      const buildIssues = e.errors.map((err): BuildIssue => {
        const [head, ...rest] = err.path;
        // Show the field's visible label, not its internal slot id; keep any
        // deeper segments readable ("item 2" instead of a raw index).
        const slot =
          typeof head === 'string' ? recipe?.slots.find((s) => s.id === head) : undefined;
        const label = slot?.label ?? (head !== undefined ? String(head) : '(value)');
        const restStr = rest
          .map((seg) => (typeof seg === 'number' ? `item ${seg + 1}` : String(seg)))
          .join(' › ');
        return {
          slotId: typeof head === 'string' ? head : null,
          message: `${label}${restStr ? ` › ${restStr}` : ''}: ${err.message}`,
        };
      });
      return { sail: '', diagnostics: [], buildIssues };
    }
    return { sail: '', diagnostics: [], buildIssues: [{ slotId: null, message: String(e) }] };
  }
}
