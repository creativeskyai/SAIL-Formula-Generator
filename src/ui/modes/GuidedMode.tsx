import { useCallback, useEffect, useMemo, useState } from 'react';
import { getRecipe, recipesByCategory } from '@/templates';
import { computePreview } from '../lib/preview';
import { copyText, type CopyStatus } from '../lib/clipboard';
import { configFor, SAMPLE_RECORD_TYPE_REF, useStore } from '../store';
import { SlotForm, initialValues } from '../components/SlotForm';
import { Preview } from '../components/Preview';
import { PresetBar } from '../components/PresetBar';
import { Diagnostics } from '../components/Diagnostics';
import { Button, TextInput } from '../components/primitives';
import { cn } from '@/lib/utils';

export function GuidedMode() {
  const selectedRecipeId = useStore((s) => s.selectedRecipeId);
  const selectRecipe = useStore((s) => s.selectRecipe);
  const valuesByRecipe = useStore((s) => s.valuesByRecipe);
  const setValues = useStore((s) => s.setValues);
  const variables = useStore((s) => s.variables);
  const addVariable = useStore((s) => s.addVariable);
  const expanded = useStore((s) => s.expanded);
  const setExpanded = useStore((s) => s.setExpanded);
  const recordTypeRef = useStore((s) => s.recordTypeRef);
  const setRecordTypeRef = useStore((s) => s.setRecordTypeRef);

  const groups = recipesByCategory();
  const recipe = selectedRecipeId ? getRecipe(selectedRecipeId) : undefined;
  const values = useMemo(
    () =>
      recipe
        ? {
            // Defaults (incl. the record-type reference prefill) as the base,
            // stored edits overlaid — so setting the reference after editing a
            // field still fills an untouched record-type slot.
            ...initialValues(recipe.slots, recordTypeRef),
            ...(valuesByRecipe[recipe.id] ?? {}),
          }
        : ({} as Record<string, unknown>),
    [recipe, valuesByRecipe, recordTypeRef],
  );

  const preview = useMemo(
    () => (recipe ? computePreview(recipe.id, values, variables, configFor(expanded)) : null),
    [recipe, values, variables, expanded],
  );

  // Persist only the slots that differ from their defaults. Storing the whole
  // merged object would snapshot the record-type prefill on the first edit of
  // ANY field, silently freezing the bar's live prefill for that scenario
  // (stale/dummy UUIDs baked into the output). An untouched slot keeps
  // following its default — including the record-type bar.
  const storeValues = useCallback(
    (v: Record<string, unknown>) => {
      if (!recipe) return;
      const defaults = initialValues(recipe.slots, recordTypeRef);
      const overlay: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) {
        if (JSON.stringify(val) !== JSON.stringify(defaults[k])) overlay[k] = val;
      }
      setValues(recipe.id, overlay);
    },
    [recipe, recordTypeRef, setValues],
  );

  const hasError = preview
    ? Boolean(preview.buildIssues?.length) || preview.diagnostics.some((d) => d.severity === 'error')
    : true;

  // Show the record-type reference bar in the empty state and on scenarios that
  // actually have a record-type slot to prefill; hide it on the other recipes,
  // where pasting a reference would do nothing and only confuse. Keeping it in
  // the empty state preserves the "paste once, then pick a scenario" flow.
  const showRecordTypeBar =
    !recipe || recipe.slots.some((s) => s.slot.type === 'recordTypeRef');

  const sail = preview?.sail ?? '';
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const copy = useCallback(() => {
    if (hasError || !sail) return;
    void copyText(sail).then((ok) => {
      // Success and failure both get visible + announced feedback — a copy
      // that silently did nothing is worse than an error message.
      setCopyStatus(ok ? 'copied' : 'failed');
      setTimeout(() => setCopyStatus('idle'), ok ? 1500 : 4000);
    });
  }, [sail, hasError]);

  // Cmd/Ctrl+Enter copies through the exact same path as the Copy button, so the
  // shortcut the UI advertises gets the same "Copied" confirmation and live
  // announcement instead of silently succeeding.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') copy();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [copy]);

  return (
    <div className="flex min-h-full flex-col gap-3 lg:h-full">
      {showRecordTypeBar && (
        <div className="flex flex-wrap items-center gap-2 border border-border bg-muted px-3 py-2">
          <label
            htmlFor="record-type-ref"
            className="text-xs font-medium text-muted-foreground"
          >
            Record type reference
          </label>
          <TextInput
            id="record-type-ref"
            className="min-w-[240px] flex-1 font-mono"
            placeholder="recordType!{uuid}Case — paste your environment's copied reference"
            value={recordTypeRef}
            onChange={(e) => setRecordTypeRef(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            title="Insert a dummy all-zero-UUID reference to test generation without an Appian environment"
            onClick={() => setRecordTypeRef(SAMPLE_RECORD_TYPE_REF)}
          >
            Use sample
          </Button>
          {recordTypeRef && (
            <Button
              type="button"
              variant="ghost"
              title="Clear the record type reference"
              onClick={() => setRecordTypeRef('')}
            >
              Clear
            </Button>
          )}
          <p className="w-full text-[11px] text-muted-foreground">
            Prefills the record-type slot when you pick a scenario. Field references carry their own
            UUIDs, so edit those per field. &ldquo;Use sample&rdquo; inserts a dummy UUID so you can
            test generation without a real environment.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]">
        <nav className="flex flex-col gap-3 lg:overflow-y-auto lg:border-r lg:border-border lg:pr-3">
        {Object.entries(groups).map(([category, list]) => (
          <div key={category} className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {category}
            </span>
            {list.map((r) => (
              <Button
                key={r.id}
                type="button"
                variant="ghost"
                aria-current={r.id === selectedRecipeId ? 'true' : undefined}
                title={r.description}
                onClick={() => selectRecipe(r.id)}
                className={cn(
                  // border-l always reserved (transparent) so the active rail
                  // never shifts the row.
                  'justify-start border-l-2 px-2 py-1 text-left text-sm',
                  r.id === selectedRecipeId
                    ? 'border-foreground bg-muted font-medium'
                    : 'border-transparent font-normal',
                )}
              >
                {r.name}
              </Button>
            ))}
          </div>
        ))}
      </nav>

      <section className="lg:overflow-y-auto">
        {recipe ? (
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold">{recipe.name}</h2>
              <p className="text-sm text-muted-foreground">{recipe.description}</p>
            </div>
            <SlotForm
              slots={recipe.slots}
              values={values}
              variables={variables}
              onCreateVariable={addVariable}
              onChange={storeValues}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Build SAIL in three steps:</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Pick a scenario from the list on the left.</li>
              <li>Fill in the form — the SAIL output updates live as you type.</li>
              <li>Copy the result (Ctrl+Enter), or save it as a preset for later.</li>
            </ol>
            <p className="text-xs">
              Your work is saved in this browser automatically — reloading the page picks up where
              you left off.
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 lg:overflow-y-auto">
        {recipe && preview ? (
          <>
            <PresetBar recipeId={recipe.id} values={values} />
            <Preview
              code={preview.sail}
              expanded={expanded}
              onToggleExpanded={() => setExpanded(!expanded)}
              canCopy={!hasError}
              copyStatus={copyStatus}
              onCopy={copy}
            />
            <Diagnostics
              diagnostics={preview.diagnostics}
              buildIssues={preview.buildIssues}
              onDeclareVariable={addVariable}
            />
          </>
        ) : null}
      </section>
      </div>
    </div>
  );
}
