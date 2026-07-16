import type { DeclaredVariable, Diagnostic, Severity } from '@/core/types';
import type { BuildIssue } from '../lib/preview';
import { Button } from './primitives';
import { CREATED_TYPE } from './variableMenu';

const SEVERITY_STYLE: Record<Severity, string> = {
  error: 'text-destructive',
  warning: 'text-warning',
  info: 'text-info',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
};

export function Diagnostics({
  diagnostics,
  buildIssues,
  onDeclareVariable,
}: {
  diagnostics: Diagnostic[];
  buildIssues: BuildIssue[] | null;
  /** Apply a diagnostic's one-click remedy (e.g. declare an unresolved
   * variable). When absent, the "Declare …" affordance is suppressed. */
  onDeclareVariable?: (v: DeclaredVariable) => void;
}) {
  if (buildIssues && buildIssues.length > 0) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Fill required fields</span>
        <ul className="flex flex-col gap-1 text-xs">
          {buildIssues.map((issue, i) => (
            <li key={i} className="text-warning">
              {issue.message}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (diagnostics.length === 0) {
    return <div className="text-xs text-muted-foreground">No issues.</div>;
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">
        Diagnostics ({diagnostics.length})
      </span>
      <ul className="flex flex-col gap-1 text-xs">
        {diagnostics.map((d, i) => (
          <li key={i} className={SEVERITY_STYLE[d.severity]}>
            <span className="font-semibold">{SEVERITY_LABEL[d.severity]}:</span> {d.message}
            {d.path.length > 0 && (
              <span className="text-muted-foreground"> · at {d.path.join(' › ')}</span>
            )}
            {d.fix && onDeclareVariable && (
              <Button
                type="button"
                variant="outline"
                className="ml-2 px-1.5 py-0 text-[11px] font-normal"
                title={`Declare ${d.fix.domain}!${d.fix.name} (as ${CREATED_TYPE}) so this reference resolves`}
                onClick={() =>
                  onDeclareVariable({ domain: d.fix!.domain, name: d.fix!.name, type: CREATED_TYPE })
                }
              >
                Declare {d.fix.domain}!{d.fix.name}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
