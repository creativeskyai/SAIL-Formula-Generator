/**
 * Ergonomic pure constructors for AST nodes.
 *
 * Recipe `build()` functions use ONLY these constructors (plus
 * `ctx.buildRecipe(...)`). No string concatenation of SAIL anywhere except the
 * serializer.
 *
 * Null-valued keyword args are pruned automatically by `call` / `arr`, so a
 * recipe can pass `kw('sort', condition ? sortInfo : null)` and the arg simply
 * disappears when the condition is false.
 */

import type {
  Arg,
  ArrayLiteral,
  BinaryOp,
  BinOp,
  DotAccess,
  FunctionCall,
  IndexAccess,
  Literal,
  MapLiteral,
  RawExpr,
  RecordRef,
  SailNode,
  UnaryOp,
  VarDomain,
  VariableRef,
} from './ast';

export const call = (fn: string, args: Arg[]): FunctionCall => ({
  kind: 'call',
  fn,
  args: args.filter((a) => a.value !== null),
});

export const kw = (name: string, value: SailNode | null): Arg => ({ name, value });
export const pos = (value: SailNode | null): Arg => ({ value });

export const text = (v: string): Literal => ({ kind: 'lit', type: 'Text', value: v });
export const num = (v: number): Literal => ({ kind: 'lit', type: 'Number', value: v });
export const bool = (v: boolean): Literal => ({ kind: 'lit', type: 'Boolean', value: v });
export const nul = (): Literal => ({ kind: 'lit', type: 'Null', value: null });

export const arr = (items: (SailNode | null)[]): ArrayLiteral => ({
  kind: 'array',
  items: items.filter((i): i is SailNode => i !== null),
});

export const map = (entries: { key: string; value: SailNode | null }[]): MapLiteral => ({
  kind: 'map',
  entries: entries.filter(
    (e): e is { key: string; value: SailNode } => e.value !== null,
  ),
});

export const ref = (domain: VarDomain, name: string): VariableRef => ({
  kind: 'var',
  domain,
  name,
});

export const recordRef = (t: string): RecordRef => ({ kind: 'recordRef', text: t });
export const raw = (t: string): RawExpr => ({ kind: 'raw', text: t });

export const dot = (target: SailNode, field: string): DotAccess => ({
  kind: 'dot',
  target,
  field,
});

export const index = (target: SailNode, idx: SailNode): IndexAccess => ({
  kind: 'index',
  target,
  index: idx,
});

export const binop = (op: BinOp, left: SailNode, right: SailNode): BinaryOp => ({
  kind: 'binop',
  op,
  left,
  right,
});

export const neg = (operand: SailNode): UnaryOp => ({ kind: 'unop', op: '-', operand });

// Logical helpers — SAIL has no infix and/or/not; they are function calls.
export const and = (...xs: SailNode[]): FunctionCall => call('and', xs.map(pos));
export const or = (...xs: SailNode[]): FunctionCall => call('or', xs.map(pos));
export const not = (x: SailNode): FunctionCall => call('not', [pos(x)]);
