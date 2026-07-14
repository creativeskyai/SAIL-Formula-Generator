import type { Diagnostic, Severity } from '@/core/types';

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
}: {
  diagnostics: Diagnostic[];
  buildIssues: string[] | null;
}) {
  if (buildIssues && buildIssues.length > 0) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Fill required fields</span>
        <ul className="flex flex-col gap-1 text-xs">
          {buildIssues.map((issue, i) => (
            <li key={i} className="text-warning">
              {issue}
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
          </li>
        ))}
      </ul>
    </div>
  );
}
