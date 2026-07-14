/**
 * Serializer: AST -> formatted SAIL string. Deterministic and pure.
 *
 * Line breaking (PLAN.md amendment 8, greedy): render a node's single-line
 * form; if it fits within `maxWidth` at its current column, emit it inline;
 * otherwise break every argument onto its own line indented one step deeper and
 * recurse. Arrays break all-or-nothing the same way.
 *
 * Two positions are tracked per node:
 *  - `col`        column of the node's first character, used ONLY for the fit
 *                 test (so `pagingInfo: a!pagingInfo(...)` measures the value
 *                 from after the `pagingInfo: ` prefix);
 *  - `indent`     the block-indent level of the current line, used for layout
 *                 (broken args go to `indent + 1`; the closing delimiter aligns
 *                 with `indent`).
 *
 * Operators never break; they always render on one line. Parenthesization is
 * shared between the flat and broken paths and is precedence-driven, with one
 * exception: a `RawExpr` operand of an operator is ALWAYS parenthesized
 * (amendment 4a).
 */

import type { BinOp, SailNode } from './ast';

export interface SerializeConfig {
  maxWidth: number;
  indent: number;
}

export const EXPANDED: SerializeConfig = { maxWidth: 80, indent: 2 };
export const COMPACT: SerializeConfig = { maxWidth: Infinity, indent: 2 };

/** Escape a SAIL text literal: wrap in double quotes, double embedded quotes.
 * SAIL has no backslash escape (amendment 1). */
function serializeString(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

// --- Operator precedence -----------------------------------------------------
// Higher binds tighter. Comparisons loosest, `^` tightest, unary `-` above all
// binary operators (amendment 2). `&` (concat) sits between `+ -` and
// comparisons.
const BINOP_PREC: Record<BinOp, number> = {
  '<': 1,
  '>': 1,
  '<=': 1,
  '>=': 1,
  '=': 1,
  '<>': 1,
  '&': 2,
  '+': 3,
  '-': 3,
  '*': 4,
  '/': 4,
  '^': 5,
};
const UNARY_PREC = 6;
// `^` is right-associative; every other binary operator is left-associative.
const RIGHT_ASSOC: ReadonlySet<BinOp> = new Set<BinOp>(['^']);

/** Precedence of a node as an operator operand. Non-operator nodes are atomic
 * (never need parens) and report Infinity. */
function precedenceOf(node: SailNode): number {
  switch (node.kind) {
    case 'binop':
      return BINOP_PREC[node.op];
    case 'unop':
      return UNARY_PREC;
    default:
      return Infinity;
  }
}

/**
 * Whether a child operand needs parentheses under a parent operator.
 *  - RawExpr operands are always parenthesized.
 *  - Lower-precedence children are parenthesized.
 *  - Equal-precedence children are parenthesized on the associativity-losing
 *    side (right side for left-assoc parents, left side for right-assoc).
 */
function operandNeedsParens(
  child: SailNode,
  parentPrec: number,
  side: 'left' | 'right',
  parentOp: BinOp | 'unary',
): boolean {
  if (child.kind === 'raw') return true;
  const childPrec = precedenceOf(child);
  if (childPrec === Infinity) return false;
  if (childPrec < parentPrec) return true;
  if (childPrec > parentPrec) return false;
  // Equal precedence: keep parens on the associativity-losing side.
  if (parentOp === 'unary') return true;
  const rightAssoc = RIGHT_ASSOC.has(parentOp);
  return rightAssoc ? side === 'left' : side === 'right';
}

export function serialize(node: SailNode, config: SerializeConfig = EXPANDED): string {
  const { maxWidth, indent } = config;
  const pad = (level: number): string => ' '.repeat(level * indent);

  // --- Flat (single-line) rendering ------------------------------------------
  function flat(node: SailNode): string {
    switch (node.kind) {
      case 'lit':
        if (node.type === 'Text') return serializeString(node.value as string);
        if (node.type === 'Null') return 'null';
        return String(node.value);
      case 'var':
        return `${node.domain}!${node.name}`;
      case 'recordRef':
        return node.text;
      case 'raw':
        return node.text;
      case 'call':
        return `${node.fn}(${node.args
          .map((a) => (a.name ? `${a.name}: ` : '') + flat(a.value as SailNode))
          .join(', ')})`;
      case 'array':
        return `{${node.items.map(flat).join(', ')}}`;
      case 'map':
        return `a!map(${node.entries
          .map((e) => `${e.key}: ${flat(e.value)}`)
          .join(', ')})`;
      case 'dot':
        return `${flatAccessTarget(node.target)}.${node.field}`;
      case 'index':
        return `${flatAccessTarget(node.target)}[${flat(node.index)}]`;
      case 'binop': {
        const l = flatOperand(node.left, BINOP_PREC[node.op], 'left', node.op);
        const r = flatOperand(node.right, BINOP_PREC[node.op], 'right', node.op);
        return `${l} ${node.op} ${r}`;
      }
      case 'unop': {
        const o = flatOperand(node.operand, UNARY_PREC, 'right', 'unary');
        return `-${o}`;
      }
    }
  }

  function flatOperand(
    child: SailNode,
    parentPrec: number,
    side: 'left' | 'right',
    parentOp: BinOp | 'unary',
  ): string {
    const s = flat(child);
    return operandNeedsParens(child, parentPrec, side, parentOp) ? `(${s})` : s;
  }

  // Dot/index targets are parenthesized when they are operators or raw exprs,
  // otherwise printed bare.
  function flatAccessTarget(target: SailNode): string {
    const s = flat(target);
    if (target.kind === 'binop' || target.kind === 'unop' || target.kind === 'raw') {
      return `(${s})`;
    }
    return s;
  }

  // --- Greedy rendering with line breaks -------------------------------------
  function render(node: SailNode, col: number, level: number): string {
    const single = flat(node);
    if (col + single.length <= maxWidth) return single;

    switch (node.kind) {
      case 'call': {
        if (node.args.length === 0) return single;
        const inner = pad(level + 1);
        const lines = node.args.map((a) => {
          const prefix = a.name ? `${a.name}: ` : '';
          const valueCol = inner.length + prefix.length;
          return inner + prefix + render(a.value as SailNode, valueCol, level + 1);
        });
        return `${node.fn}(\n${lines.join(',\n')}\n${pad(level)})`;
      }
      case 'array': {
        if (node.items.length === 0) return single;
        const inner = pad(level + 1);
        const lines = node.items.map(
          (it) => inner + render(it, inner.length, level + 1),
        );
        return `{\n${lines.join(',\n')}\n${pad(level)}}`;
      }
      case 'map': {
        if (node.entries.length === 0) return single;
        const inner = pad(level + 1);
        const lines = node.entries.map((e) => {
          const prefix = `${e.key}: `;
          const valueCol = inner.length + prefix.length;
          return inner + prefix + render(e.value, valueCol, level + 1);
        });
        return `a!map(\n${lines.join(',\n')}\n${pad(level)})`;
      }
      case 'dot': {
        if (isBreakable(node.target)) {
          return `${render(node.target, col, level)}.${node.field}`;
        }
        return single;
      }
      case 'index': {
        if (isBreakable(node.target)) {
          return `${render(node.target, col, level)}[${flat(node.index)}]`;
        }
        return single;
      }
      // Operators, literals, refs and raw exprs never break.
      default:
        return single;
    }
  }

  function isBreakable(node: SailNode): boolean {
    return node.kind === 'call' || node.kind === 'array' || node.kind === 'map';
  }

  return render(node, 0, 0);
}
