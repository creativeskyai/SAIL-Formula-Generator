import { useMemo, useRef, useState } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { catalog, type FunctionSpec } from '@/core/catalog';
import type { VarDomain } from '@/core/ast';
import { useStore } from '../store';
import { analyzeCompose, buildSkeleton } from '../lib/compose';
import { copyText, type CopyStatus } from '../lib/clipboard';
import { sail, sailAutocomplete, type VariableAssist } from '../sail-language';
import { Button, TextInput } from '../components/primitives';
import { CREATED_TYPE } from '../components/variableMenu';
import { cn } from '@/lib/utils';

// Read live variables and declare inline straight from the store singleton, so
// the completion source stays a stable module-level identity (no per-keystroke
// CodeMirror reconfigure) while always reflecting the current declarations.
const ASSIST: VariableAssist = {
  getVariables: () => useStore.getState().variables,
  onCreateVariable: (v) => useStore.getState().addVariable(v),
};

// Stable identities so CodeMirror doesn't reconfigure on every keystroke.
// contentAttributes names the editor's textbox for assistive tech — CodeMirror
// supplies role="textbox" but no accessible name of its own.
const EXTENSIONS = [
  sail(),
  sailAutocomplete(ASSIST),
  EditorView.lineWrapping,
  EditorView.contentAttributes.of({ 'aria-label': 'SAIL expression editor' }),
];
// Autocompletion comes from the SAIL source above, so disable basicSetup's
// built-in (source-less) one — otherwise two completion configs coexist.
const BASIC_SETUP = { lineNumbers: true, foldGutter: false, autocompletion: false } as const;

export function ComposeMode() {
  const composeText = useStore((s) => s.composeText);
  const setComposeText = useStore((s) => s.setComposeText);
  const variables = useStore((s) => s.variables);
  const addVariable = useStore((s) => s.addVariable);
  const theme = useStore((s) => s.theme);
  const [query, setQuery] = useState('');
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const editorRef = useRef<ReactCodeMirrorRef>(null);

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

  const analysis = useMemo(
    () => analyzeCompose(composeText, variables),
    [composeText, variables],
  );

  const insert = (spec: FunctionSpec) => {
    const snippet = buildSkeleton(spec);
    const view = editorRef.current?.view;
    if (view) {
      // Insert at the caret (replacing any selection), as "click to insert"
      // promises — not appended at the end of the document. The dispatch fires
      // onChange, which syncs the store.
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: snippet },
        selection: { anchor: from + snippet.length },
        scrollIntoView: true,
      });
      view.focus();
    } else {
      setComposeText(composeText ? `${composeText}\n\n${snippet}` : snippet);
    }
  };

  const copy = async () => {
    if (!composeText) return;
    const ok = await copyText(composeText);
    // Success and failure both get visible + announced feedback — a copy that
    // silently did nothing is worse than an error message.
    setCopyStatus(ok ? 'copied' : 'failed');
    setTimeout(() => setCopyStatus('idle'), ok ? 1500 : 4000);
  };

  return (
    <div className="grid min-h-full grid-cols-1 gap-4 lg:h-full lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2 lg:overflow-hidden lg:border-r lg:border-border lg:pr-3">
        <TextInput
          placeholder="Search functions…"
          aria-label="Search functions"
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
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Click a function to insert its skeleton at the cursor, or start typing for autocomplete
            — functions, your declared variables, and inline &ldquo;Create ri!name&rdquo; entries
            all appear. Validation here checks bracket balance, known function names, and unresolved
            variables; Guided mode additionally checks each parameter against the catalog.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setComposeText('')}
              disabled={!composeText}
              title="Clear the editor"
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={copy}
              disabled={!composeText}
              className={copyStatus === 'failed' ? 'bg-destructive' : undefined}
              title="Copy the expression to the clipboard"
            >
              {copyStatus === 'idle' ? 'Copy' : copyStatus === 'copied' ? 'Copied' : 'Copy failed'}
            </Button>
          </div>
        </div>
        <span className="sr-only" role="status" aria-live="polite">
          {copyStatus === 'copied'
            ? 'Copied to clipboard'
            : copyStatus === 'failed'
              ? 'Copy failed — select the expression and copy manually'
              : ''}
        </span>
        <div className="min-h-[300px] overflow-auto border border-border text-sm lg:min-h-0 lg:flex-1">
          <CodeMirror
            ref={editorRef}
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
          {analysis.unresolvedVariables.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-warning">
              <span>
                Unresolved variables — declare them in one click (as {CREATED_TYPE}, adjustable on
                the Variables tab):
              </span>
              {analysis.unresolvedVariables.map((ref) => {
                const [domain, name] = ref.split('!');
                return (
                  <Button
                    key={ref}
                    type="button"
                    variant="outline"
                    className="px-1.5 py-0 text-[11px] font-normal"
                    title={`Declare ${ref} (as ${CREATED_TYPE}) so this reference resolves`}
                    onClick={() =>
                      addVariable({ domain: domain as VarDomain, name, type: CREATED_TYPE })
                    }
                  >
                    Declare {ref}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
