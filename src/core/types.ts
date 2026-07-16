/** Shared engine types with no dependency on the AST node shapes. */

import type { SailType, VarDomain } from './ast';

export type Severity = 'error' | 'warning' | 'info';

/** A machine-actionable remedy the UI can offer alongside a diagnostic —
 * e.g. a one-click "Declare ri!x" button for an unresolved reference. */
export interface DiagnosticFix {
  kind: 'declareVariable';
  domain: VarDomain;
  name: string;
}

export interface Diagnostic {
  severity: Severity;
  message: string;
  /** Route from the root node to the offending node, for UI highlighting. */
  path: (string | number)[];
  fix?: DiagnosticFix;
}

/** A variable declared by the user in the Variables manager. Feeds the
 * `variableRef` slot dropdowns and the validator's unresolved-ref check. */
export interface DeclaredVariable {
  domain: VarDomain;
  name: string;
  type?: SailType;
}
