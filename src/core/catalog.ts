/**
 * Function catalog: typed metadata for the SAIL functions the tool knows about.
 *
 * The catalog is the single source of truth for parameter names, types, enum
 * values and requiredness — this is where output quality comes from (PLAN.md
 * amendment 12), so `catalog.data.json` is hand-curated and guarded by a CI
 * schema check (`scripts/check-catalog.ts`).
 */

import type { SailType } from './ast';
import catalogData from './catalog.data.json';

/** All valid SAIL types — the runtime companion to the `SailType` union, used
 * by the schema check to validate the data file. */
export const SAIL_TYPES = [
  'Text',
  'Number',
  'Integer',
  'Decimal',
  'Boolean',
  'Date',
  'Time',
  'DateTime',
  'List',
  'Map',
  'Dictionary',
  'CDT',
  'RecordType',
  'Component',
  'Any',
  'Null',
] as const;

export const FUNCTION_CATEGORIES = [
  'component',
  'layout',
  'query',
  'logic',
  'looping',
  'validation',
  'save',
  'text',
  'date',
  'math',
  'array',
  'map',
  'conversion',
  'system',
  'integration',
] as const;

export type FunctionCategory = (typeof FUNCTION_CATEGORIES)[number];

export interface ParamSpec {
  name: string;
  type: SailType | SailType[];
  required?: boolean;
  keywordOnly?: boolean;
  variadic?: boolean;
  enumValues?: string[];
  default?: string | number | boolean;
  doc?: string;
}

export interface FunctionSpec {
  name: string;
  category: FunctionCategory;
  summary: string;
  params: ParamSpec[];
  returns: SailType;
  deprecated?: boolean;
  replacement?: string;
  minVersion?: string;
  docUrl?: string;
}

export interface CatalogFile {
  appianVersion: string;
  functions: FunctionSpec[];
}

export interface Catalog {
  appianVersion: string;
  get(name: string): FunctionSpec | undefined;
  has(name: string): boolean;
  all(): FunctionSpec[];
  byCategory(category: FunctionCategory): FunctionSpec[];
}

export function createCatalog(file: CatalogFile): Catalog {
  const byName = new Map<string, FunctionSpec>();
  for (const fn of file.functions) byName.set(fn.name, fn);
  return {
    appianVersion: file.appianVersion,
    get: (name) => byName.get(name),
    has: (name) => byName.has(name),
    all: () => file.functions,
    byCategory: (category) => file.functions.filter((f) => f.category === category),
  };
}

export const catalog: Catalog = createCatalog(catalogData as CatalogFile);
