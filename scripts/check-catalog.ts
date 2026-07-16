/**
 * CI schema check for catalog.data.json (PLAN.md amendment 12).
 *
 * Validates the hand-curated catalog: valid categories and types, enum defaults
 * within their enum values, no duplicate function names, non-empty unique param
 * names. Exits non-zero on any violation so CI fails loudly.
 *
 * Run with: npm run check:catalog
 */

import {
  FUNCTION_CATEGORIES,
  SAIL_TYPES,
  type CatalogFile,
  type FunctionSpec,
  type ParamSpec,
} from '../src/core/catalog';
import catalogData from '../src/core/catalog.data.json';

const categories = new Set<string>(FUNCTION_CATEGORIES);
const types = new Set<string>(SAIL_TYPES);
const errors: string[] = [];

function checkType(where: string, t: unknown): void {
  const list = Array.isArray(t) ? t : [t];
  for (const one of list) {
    if (typeof one !== 'string' || !types.has(one)) {
      errors.push(`${where}: invalid SAIL type ${JSON.stringify(one)}`);
    }
  }
}

function checkParam(fnName: string, p: ParamSpec): void {
  const where = `${fnName} param "${p.name}"`;
  if (!p.name || typeof p.name !== 'string') {
    errors.push(`${fnName}: a param has an empty or non-string name`);
  }
  checkType(where, p.type);
  if (p.enumValues !== undefined) {
    if (!Array.isArray(p.enumValues) || p.enumValues.length === 0) {
      errors.push(`${where}: enumValues must be a non-empty array`);
    }
    if (p.default !== undefined && !p.enumValues.includes(String(p.default))) {
      errors.push(
        `${where}: default ${JSON.stringify(p.default)} is not among enumValues`,
      );
    }
  }
}

function checkFunction(fn: FunctionSpec): void {
  if (!fn.name) errors.push('a function has an empty name');
  if (!categories.has(fn.category)) {
    errors.push(`${fn.name}: invalid category ${JSON.stringify(fn.category)}`);
  }
  if (!fn.summary) errors.push(`${fn.name}: missing summary`);
  checkType(`${fn.name} returns`, fn.returns);
  if (!Array.isArray(fn.params)) {
    errors.push(`${fn.name}: params must be an array`);
    return;
  }
  const seen = new Set<string>();
  for (const p of fn.params) {
    if (seen.has(p.name)) errors.push(`${fn.name}: duplicate param name "${p.name}"`);
    seen.add(p.name);
    checkParam(fn.name, p);
  }
}

const file = catalogData as CatalogFile;

if (!file.appianVersion) errors.push('catalog is missing appianVersion');
if (!Array.isArray(file.functions) || file.functions.length === 0) {
  errors.push('catalog has no functions');
} else {
  const names = new Set<string>();
  for (const fn of file.functions) {
    if (names.has(fn.name)) errors.push(`duplicate function name "${fn.name}"`);
    names.add(fn.name);
    checkFunction(fn);
  }
}

if (errors.length > 0) {
  console.error(`catalog.data.json FAILED schema check (${errors.length} error(s)):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `catalog.data.json OK: ${file.functions.length} functions, Appian ${file.appianVersion}`,
);
