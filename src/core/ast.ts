/**
 * SAIL Abstract Syntax Tree.
 *
 * This is the single source of truth for the shape of a SAIL expression.
 * The engine never manipulates SAIL as strings except inside the serializer;
 * everything upstream produces and consumes these nodes.
 *
 * Design notes (see PLAN.md §0 amendments):
 *  - `and` / `or` / `not` are ordinary function calls in SAIL, NOT infix
 *    operators, so they are modelled as `FunctionCall` and are absent from
 *    `BinOp` / `UnaryOp`.
 *  - SAIL has no date/time literal syntax. Dates are constructed via function
 *    calls (`date(...)`, `now()`, ...), so `Literal` deliberately has no date
 *    kind. Do not add one.
 *  - `DotAccess` / `IndexAccess` each represent a SINGLE step and chain via
 *    their `target`, so `a.b[1].c` is a nest of single-step nodes.
 */

export type SailType =
  | 'Text'
  | 'Number'
  | 'Integer'
  | 'Decimal'
  | 'Boolean'
  | 'Date'
  | 'Time'
  | 'DateTime'
  | 'List'
  | 'Map'
  | 'Dictionary'
  | 'CDT'
  | 'RecordType'
  | 'Component'
  | 'Any'
  | 'Null';

export type SailNode =
  | FunctionCall
  | Literal
  | ArrayLiteral
  | MapLiteral
  | VariableRef
  | RecordRef
  | DotAccess
  | IndexAccess
  | BinaryOp
  | UnaryOp
  | RawExpr;

export interface Arg {
  name?: string;
  value: SailNode | null;
}

export interface FunctionCall {
  kind: 'call';
  fn: string;
  args: Arg[];
}

export interface Literal {
  kind: 'lit';
  type: 'Text' | 'Number' | 'Boolean' | 'Null';
  value: string | number | boolean | null;
}

export interface ArrayLiteral {
  kind: 'array';
  items: SailNode[];
}

export interface MapLiteral {
  kind: 'map';
  entries: { key: string; value: SailNode }[];
}

export type VarDomain =
  | 'ri'
  | 'local'
  | 'pv'
  | 'ac'
  | 'cons'
  | 'rule'
  | 'fv'
  | 'tp'
  | 'rf'
  | 'rp'
  | 'pp';

export interface VariableRef {
  kind: 'var';
  domain: VarDomain;
  name: string;
}

/** A `recordType!...` reference. May be UUID-qualified when copied from a real
 * Appian environment; symbolic docs-style refs typically need re-linking. */
export interface RecordRef {
  kind: 'recordRef';
  text: string;
}

export interface DotAccess {
  kind: 'dot';
  target: SailNode;
  field: string;
}

export interface IndexAccess {
  kind: 'index';
  target: SailNode;
  index: SailNode;
}

/** Arithmetic / comparison / concat ONLY. and/or/not are function calls. */
export type BinOp =
  | '+'
  | '-'
  | '*'
  | '/'
  | '^'
  | '<'
  | '>'
  | '<='
  | '>='
  | '='
  | '<>'
  | '&';

export interface BinaryOp {
  kind: 'binop';
  op: BinOp;
  left: SailNode;
  right: SailNode;
}

export interface UnaryOp {
  kind: 'unop';
  op: '-';
  operand: SailNode;
}

/** User-typed raw SAIL sub-expression. Serialized verbatim, but always
 * parenthesized when it appears as an operand of an operator node. */
export interface RawExpr {
  kind: 'raw';
  text: string;
}
