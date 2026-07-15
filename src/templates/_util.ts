/** Shared helpers for recipe build() functions. */

import type { RawExpr, VarDomain, VariableRef } from '@/core/ast';
import { raw, ref } from '@/core/builder';

const DOMAINS: VarDomain[] = [
  'ri',
  'local',
  'pv',
  'ac',
  'cons',
  'rule',
  'fv',
  'tp',
  'rf',
  'rp',
  'pp',
];

/**
 * Parse a `variableRef` slot string into a proper VariableRef node when it is a
 * bare `domain!name` (so the validator can resolve it against declared
 * variables); anything with a dot/index accessor (`ri!case.status`,
 * `ri!items[1]`) falls back to a raw expression, which serializes verbatim and
 * carries no unresolved-ref diagnostic. This avoids folding an accessor path
 * into the variable name, which would make the validator flag a valid binding
 * as unresolved.
 */
/** Trim a slot value to a string; '' for anything empty/whitespace-only so
 * optional slots prune cleanly instead of emitting a blank argument. */
export function trimmed(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function parseRef(s: string): VariableRef | RawExpr {
  const t = s.trim();
  const m = /^([a-z]+)!([A-Za-z0-9_]+)$/.exec(t);
  if (m && (DOMAINS as string[]).includes(m[1])) {
    return ref(m[1] as VarDomain, m[2]);
  }
  return raw(t);
}
