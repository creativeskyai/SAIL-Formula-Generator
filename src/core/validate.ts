/**
 * Validator: structural + catalog-driven diagnostics over an AST.
 *
 * Pure `validate(node, catalog, variables) -> Diagnostic[]`. Errors block the
 * "copy as valid" affordance in the UI but never block viewing the output.
 *
 * The AST is structurally balanced by construction, so the only place brackets
 * can become unbalanced is inside a user-typed `RawExpr`; that check is
 * string-aware, honoring SAIL's `""` quote doubling (amendment 4b). `fv!`
 * references are implicitly scoped inside a!forEach and are never treated as
 * unresolved (amendment 6).
 */

import type { FunctionCall, Literal, SailNode, SailType, VariableRef } from './ast';
import type { Catalog, ParamSpec } from './catalog';
import type { DeclaredVariable, Diagnostic } from './types';

/** True when brackets/quotes in raw SAIL text are balanced. Skips the contents
 * of string literals, treating `""` inside a string as an escaped quote. */
export function isRawTextBalanced(text: string): boolean {
  const closeToOpen: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const stack: string[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '*') {
      // Skip a /* ... */ block comment; brackets inside it are not code.
      i += 2;
      let closed = false;
      while (i < text.length) {
        if (text[i] === '*' && text[i + 1] === '/') {
          i += 2;
          closed = true;
          break;
        }
        i++;
      }
      if (!closed) return false; // unterminated comment — not valid SAIL
      continue;
    }
    if (c === '"') {
      i++;
      let closed = false;
      while (i < text.length) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') {
            i += 2;
            continue;
          }
          i++;
          closed = true;
          break;
        }
        i++;
      }
      if (!closed) return false; // unterminated string
      continue;
    }
    if (c === '(' || c === '[' || c === '{') {
      stack.push(c);
    } else if (c === ')' || c === ']' || c === '}') {
      if (stack.pop() !== closeToOpen[c]) return false;
    }
    i++;
  }
  return stack.length === 0;
}

function asArray<T>(v: T | T[]): T[] {
  return Array.isArray(v) ? v : [v];
}

/** High-confidence, low-false-positive literal type check. Only flags a
 * literal that clearly conflicts with a param typed as exactly Boolean, since
 * SAIL coerces most other scalar combinations. */
function literalTypeMismatch(
  lit: Literal,
  expected: SailType | SailType[],
): { expected: string; got: string } | null {
  if (lit.type === 'Null') return null;
  const exp = asArray(expected);
  if (exp.includes('Any')) return null;
  if (exp.length === 1 && exp[0] === 'Boolean' && lit.type !== 'Boolean') {
    return { expected: 'Boolean', got: lit.type };
  }
  return null;
}

export function validate(
  root: SailNode,
  catalog: Catalog,
  variables: DeclaredVariable[],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const declared = new Set(variables.map((v) => `${v.domain}!${v.name}`));

  function checkVar(node: VariableRef, path: (string | number)[]): void {
    if (node.domain === 'ri' || node.domain === 'local') {
      if (!declared.has(`${node.domain}!${node.name}`)) {
        diagnostics.push({
          severity: 'error',
          message: `Unresolved variable ${node.domain}!${node.name} — declare it in the Variables manager.`,
          path,
        });
      }
    }
    // fv! is implicitly scoped (valid inside a!forEach and similar); other
    // domains are environment-provided. Neither is checked here.
  }

  function checkCall(node: FunctionCall, path: (string | number)[]): void {
    const spec = catalog.get(node.fn);
    if (!spec) {
      if (node.fn.startsWith('rule!')) {
        diagnostics.push({
          severity: 'info',
          message: `${node.fn} is not in the catalog; assumed to be an application rule.`,
          path,
        });
      } else {
        diagnostics.push({
          severity: 'warning',
          message: `Unknown function ${node.fn} — not in the catalog.`,
          path,
        });
      }
      return;
    }

    if (spec.deprecated) {
      const rep = spec.replacement ? ` Use ${spec.replacement} instead.` : '';
      diagnostics.push({
        severity: 'warning',
        message: `${node.fn} is deprecated.${rep}`,
        path,
      });
    }

    const providedKw = new Set<string>();
    let positionalCount = 0;
    for (const a of node.args) {
      if (a.name) providedKw.add(a.name);
      else positionalCount++;
    }
    const paramNames = new Set(spec.params.map((p) => p.name));
    const positionalParams = spec.params.filter((p) => !p.keywordOnly);
    const hasVariadic = spec.params.some((p) => p.variadic);

    // Missing required params.
    for (const p of spec.params) {
      if (!p.required) continue;
      if (providedKw.has(p.name)) continue;
      if (!p.keywordOnly) {
        const posIdx = positionalParams.indexOf(p);
        if (posIdx >= 0 && posIdx < positionalCount) continue;
      }
      diagnostics.push({
        severity: 'error',
        message: `${node.fn} is missing required parameter "${p.name}".`,
        path,
      });
    }

    // Per-argument checks (keyword args only).
    node.args.forEach((a, i) => {
      if (!a.name) return;
      const argPath = [...path, i];
      if (!paramNames.has(a.name)) {
        if (!hasVariadic) {
          diagnostics.push({
            severity: 'warning',
            message: `${node.fn} has no parameter "${a.name}".`,
            path: argPath,
          });
        }
        return;
      }
      const p = spec.params.find((pp) => pp.name === a.name) as ParamSpec;
      const value = a.value;
      if (value && value.kind === 'lit') {
        if (p.enumValues && value.type === 'Text') {
          const v = value.value as string;
          if (!p.enumValues.includes(v)) {
            diagnostics.push({
              severity: 'warning',
              message: `"${v}" is not a valid value for ${node.fn} parameter "${a.name}". Expected one of: ${p.enumValues.join(', ')}.`,
              path: argPath,
            });
          }
        }
        const mismatch = literalTypeMismatch(value, p.type);
        if (mismatch) {
          diagnostics.push({
            severity: 'warning',
            message: `${node.fn} parameter "${a.name}" expects ${mismatch.expected}, got ${mismatch.got}.`,
            path: argPath,
          });
        }
      }
    });
  }

  function walk(node: SailNode, path: (string | number)[]): void {
    switch (node.kind) {
      case 'call':
        checkCall(node, path);
        node.args.forEach((a, i) => {
          if (a.value) walk(a.value, [...path, i]);
        });
        break;
      case 'array':
        node.items.forEach((it, i) => walk(it, [...path, i]));
        break;
      case 'map':
        node.entries.forEach((e, i) => walk(e.value, [...path, i]));
        break;
      case 'binop':
        walk(node.left, [...path, 'left']);
        walk(node.right, [...path, 'right']);
        break;
      case 'unop':
        walk(node.operand, [...path, 'operand']);
        break;
      case 'dot':
        walk(node.target, [...path, 'target']);
        break;
      case 'index':
        walk(node.target, [...path, 'target']);
        walk(node.index, [...path, 'index']);
        break;
      case 'var':
        checkVar(node, path);
        break;
      case 'recordRef':
        diagnostics.push({
          severity: 'info',
          message: `Record reference "${node.text}" may need re-linking in Appian — record references are UUID-qualified when copied from a real environment.`,
          path,
        });
        break;
      case 'raw':
        if (!isRawTextBalanced(node.text)) {
          diagnostics.push({
            severity: 'error',
            message: 'Unbalanced brackets or unterminated string in raw expression.',
            path,
          });
        }
        break;
      case 'lit':
        break;
    }
  }

  walk(root, []);
  return diagnostics;
}
