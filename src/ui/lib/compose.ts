/**
 * Compose-mode helpers (PLAN.md amendment 11): build a skeleton snippet for a
 * catalog function, and validate free-text SAIL with bracket-balance +
 * function-name recognition only (no full parse).
 */

import { catalog, type FunctionSpec } from '@/core/catalog';
import type { DeclaredVariable } from '@/core/types';
import { isRawTextBalanced } from '@/core/validate';

/** A function-with-params stub to drop into the free-text pane. */
export function buildSkeleton(spec: FunctionSpec): string {
  if (spec.params.length === 0) return `${spec.name}()`;
  const keywordStyle = spec.params.some((p) => p.keywordOnly);
  const parts = spec.params.map((p) =>
    p.keywordOnly || keywordStyle ? `${p.name}: ` : p.name,
  );
  if (parts.length <= 2 && !keywordStyle) {
    return `${spec.name}(${parts.join(', ')})`;
  }
  return `${spec.name}(\n  ${parts.join(',\n  ')}\n)`;
}

/** Blank out string literals and block comments so scanning ignores their
 * contents (brackets/parens inside strings must not count). */
function stripLiteralsAndComments(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '*') {
      out += '  ';
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
        out += ' ';
        i++;
      }
      if (i < text.length) {
        out += '  ';
        i += 2;
      }
      continue;
    }
    if (c === '"') {
      out += ' ';
      i++;
      while (i < text.length) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') {
            out += '  ';
            i += 2;
            continue;
          }
          out += ' ';
          i++;
          break;
        }
        out += ' ';
        i++;
      }
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

export interface ComposeAnalysis {
  balanced: boolean;
  unknownFunctions: string[];
  /** `ri!`/`local!` references not declared in the Variables manager (and, for
   * `local!`, not assigned inline in the text itself). */
  unresolvedVariables: string[];
}

const FN_CALL = /((?:a!|fn!|rule!)?[A-Za-z_]\w*)\s*\(/g;
const VAR_REF = /(?<![\w!])(ri|local)!([A-Za-z_]\w*)/g;
/** `local!name:` is keyword-assignment position inside a!localVariables — that
 * IS the declaration, so such names must not be flagged as unresolved. */
const LOCAL_DECL = /(?<![\w!])local!([A-Za-z_]\w*)\s*:/g;

export function analyzeCompose(
  text: string,
  variables: DeclaredVariable[] = [],
): ComposeAnalysis {
  const balanced = isRawTextBalanced(text);
  const stripped = stripLiteralsAndComments(text);
  const names = new Set<string>();
  for (const m of stripped.matchAll(FN_CALL)) names.add(m[1]);
  // SAIL function names are case-insensitive; the catalog stores canonical case.
  const known = new Set(catalog.all().map((f) => f.name.toLowerCase()));
  const unknownFunctions = [...names].filter((n) => {
    if (n.startsWith('rule!')) return false; // application rules aren't in the catalog
    // fn! is a disambiguation prefix for built-in functions; look up the bare name.
    const bare = (n.startsWith('fn!') ? n.slice(3) : n).toLowerCase();
    return !known.has(bare);
  });

  const declared = new Set(variables.map((v) => `${v.domain}!${v.name}`));
  for (const m of stripped.matchAll(LOCAL_DECL)) declared.add(`local!${m[1]}`);
  const unresolved = new Set<string>();
  for (const m of stripped.matchAll(VAR_REF)) {
    const ref = `${m[1]}!${m[2]}`;
    if (!declared.has(ref)) unresolved.add(ref);
  }
  return { balanced, unknownFunctions, unresolvedVariables: [...unresolved] };
}
