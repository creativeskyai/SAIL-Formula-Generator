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
 * Parse a `variableRef` slot string into a proper VariableRef node when it
 * looks like `domain!name` (so the validator can resolve it); otherwise fall
 * back to a raw expression. Keeps refs as first-class AST nodes rather than
 * opaque text where possible.
 */
export function parseRef(s: string): VariableRef | RawExpr {
  const m = /^([a-z]+)!(.+)$/.exec(s.trim());
  if (m && (DOMAINS as string[]).includes(m[1])) {
    return ref(m[1] as VarDomain, m[2]);
  }
  return raw(s);
}
