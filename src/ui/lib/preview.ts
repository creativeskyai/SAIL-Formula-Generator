/** Compute the live preview: build the AST, serialize it, and validate it.
 * `generate` throws a ZodError while required slots are still empty/invalid;
 * that is surfaced as `buildIssues` rather than crashing the UI. */

import { z } from 'zod';
import { catalog } from '@/core/catalog';
import { serialize, type SerializeConfig } from '@/core/serialize';
import type { DeclaredVariable, Diagnostic } from '@/core/types';
import { validate } from '@/core/validate';
import { generate } from '@/templates';

export interface PreviewResult {
  sail: string;
  diagnostics: Diagnostic[];
  /** Slot-level problems that prevented building (empty/invalid required slots). */
  buildIssues: string[] | null;
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
      const buildIssues = e.errors.map((err) => {
        const where = err.path.join('.') || '(value)';
        return `${where}: ${err.message}`;
      });
      return { sail: '', diagnostics: [], buildIssues };
    }
    return { sail: '', diagnostics: [], buildIssues: [String(e)] };
  }
}
