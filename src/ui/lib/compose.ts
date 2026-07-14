/**
 * Compose-mode helpers (PLAN.md amendment 11): build a skeleton snippet for a
 * catalog function, and validate free-text SAIL with bracket-balance +
 * function-name recognition only (no full parse).
 */

import { catalog, type FunctionSpec } from '@/core/catalog';
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
}

const FN_CALL = /((?:a!|fn!|rule!)?[A-Za-z_]\w*)\s*\(/g;

export function analyzeCompose(text: string): ComposeAnalysis {
  const balanced = isRawTextBalanced(text);
  const stripped = stripLiteralsAndComments(text);
  const names = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = FN_CALL.exec(stripped)) !== null) names.add(m[1]);
  FN_CALL.lastIndex = 0;
  const unknownFunctions = [...names].filter((n) => {
    if (n.startsWith('rule!')) return false; // application rules aren't in the catalog
    // fn! is a disambiguation prefix for built-in functions; look up the bare name.
    const bare = n.startsWith('fn!') ? n.slice(3) : n;
    return !catalog.has(bare);
  });
  return { balanced, unknownFunctions };
}
