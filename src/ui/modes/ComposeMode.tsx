import { useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { catalog, type FunctionSpec } from '@/core/catalog';
import { useStore } from '../store';
import { analyzeCompose, buildSkeleton } from '../lib/compose';
import { sail } from '../sail-language';
import { Button, TextInput } from '../components/primitives';
import { cn } from '@/lib/utils';

// Stable identities so CodeMirror doesn't reconfigure on every keystroke.
const EXTENSIONS = [sail(), EditorView.lineWrapping];
const BASIC_SETUP = { lineNumbers: true, foldGutter: false } as const;

export function ComposeMode() {
  const composeText = useStore((s) => s.composeText);
  const setComposeText = useStore((s) => s.setComposeText);
  const theme = useStore((s) => s.theme);
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = catalog.all();
    const filtered = q
      ? all.filter(
          (f) => f.name.toLowerCase().includes(q) || f.summary.toLowerCase().includes(q),
        )
      : all;
    const groups: Record<string, FunctionSpec[]> = {};
    for (const f of filtered) (groups[f.category] ??= []).push(f);
    return groups;
  }, [query]);

  const analysis = useMemo(() => analyzeCompose(composeText), [composeText]);

  const insert = (spec: FunctionSpec) => {
    const snippet = buildSkeleton(spec);
    setComposeText(composeText ? `${composeText}\n\n${snippet}` : snippet);
  };

  return (
    <div className="grid min-h-full grid-cols-1 gap-4 lg:h-full lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2 lg:overflow-hidden lg:border-r lg:border-border lg:pr-3">
        <TextInput
          placeholder="Search functions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-col gap-3 lg:overflow-y-auto">
          {Object.entries(matches).map(([category, list]) => (
            <div key={category} className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </span>
              {list.map((f) => (
                <Button
                  key={f.name}
                  type="button"
                  variant="ghost"
                  onClick={() => insert(f)}
                  title={f.summary}
                  className="justify-start px-2 py-1 text-left font-mono text-xs font-normal"
                >
                  {f.name}
                </Button>
              ))}
            </div>
          ))}
          {Object.keys(matches).length === 0 && (
            <span className="text-xs text-muted-foreground">No functions match.</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 lg:min-h-0">
        <p className="text-xs text-muted-foreground">
          Click a function to insert a skeleton, then edit freely. Validation checks bracket
          balance and function names only — the full tree editor is post-MVP.
        </p>
        <div className="min-h-[300px] overflow-auto border border-border text-sm lg:min-h-0 lg:flex-1">
          <CodeMirror
            value={composeText}
            theme={theme}
            extensions={EXTENSIONS}
            onChange={setComposeText}
            basicSetup={BASIC_SETUP}
          />
        </div>
        <div className="flex flex-col gap-1 text-xs">
          <span
            className={cn(
              'font-medium',
              analysis.balanced ? 'text-info' : 'text-destructive',
            )}
          >
            {analysis.balanced ? 'Brackets balanced' : 'Unbalanced brackets or unterminated string'}
          </span>
          {analysis.unknownFunctions.length > 0 && (
            <span className="text-warning">
              Unrecognized functions: {analysis.unknownFunctions.join(', ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
