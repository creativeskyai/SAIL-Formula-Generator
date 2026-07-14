/**
 * Recipe registry + build runner.
 *
 * `createContext` builds a BuildContext whose `buildRecipe` validates slot
 * values against the target recipe's zod schema before calling its `build()`,
 * and passes itself down so recipes can nest other recipes (e.g.
 * query-record-type nests query-filter).
 */

import type { SailNode } from '@/core/ast';
import type { BuildContext, Recipe } from '@/core/recipe';
import { validateSlotValues } from '@/core/recipe';
import type { DeclaredVariable } from '@/core/types';
import { queryFilter, queryRecordType } from './query';
import { dropdownField, integerField, sectionLayout, textField } from './forms';
import { ifElse, localVariables } from './logic';
import { forEach } from './looping';
import { requiredValidation } from './validation';

export const recipeList: Recipe[] = [
  queryRecordType,
  queryFilter,
  textField,
  integerField,
  dropdownField,
  sectionLayout,
  ifElse,
  localVariables,
  forEach,
  requiredValidation,
];

export const recipes: Record<string, Recipe> = Object.fromEntries(
  recipeList.map((r) => [r.id, r]),
);

export function getRecipe(id: string): Recipe | undefined {
  return recipes[id];
}

/** Scenario registry: recipes grouped by category for the UI picker. */
export function recipesByCategory(): Record<string, Recipe[]> {
  const groups: Record<string, Recipe[]> = {};
  for (const r of recipeList) (groups[r.category] ??= []).push(r);
  return groups;
}

export function createContext(variables: DeclaredVariable[] = []): BuildContext {
  const ctx: BuildContext = {
    variables,
    buildRecipe: (recipeId, values) => {
      const recipe = recipes[recipeId];
      if (!recipe) throw new Error(`Unknown recipe: ${recipeId}`);
      const parsed = validateSlotValues(recipe.slots, values);
      return recipe.build(parsed, ctx);
    },
  };
  return ctx;
}

/** Validate slot values and build a recipe's AST. */
export function generate(
  recipeId: string,
  values: Record<string, unknown>,
  variables: DeclaredVariable[] = [],
): SailNode {
  return createContext(variables).buildRecipe(recipeId, values);
}
