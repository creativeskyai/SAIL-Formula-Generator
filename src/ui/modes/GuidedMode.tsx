import { useEffect, useMemo } from 'react';
import { getRecipe, recipesByCategory } from '@/templates';
import { computePreview } from '../lib/preview';
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

  const hasError = preview
    ? Boolean(preview.buildIssues?.length) || preview.diagnostics.some((d) => d.severity === 'error')
    : true;

  // Cmd/Ctrl+Enter copies the current output when it is valid.
  const sail = preview?.sail ?? '';
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !hasError && sail && navigator.clipboard) {
        navigator.clipboard.writeText(sail).catch(() => {});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sail, hasError]);

  return (
    <div className="flex min-h-full flex-col gap-3 lg:h-full">
      <div className="flex flex-wrap items-center gap-2 border border-border bg-muted px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">Record type reference</span>
        <TextInput
          className="min-w-[240px] flex-1 font-mono"
          placeholder="recordType!{uuid}Case — paste your environment's copied reference"
          value={recordTypeRef}
          onChange={(e) => setRecordTypeRef(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setRecordTypeRef(SAMPLE_RECORD_TYPE_REF)}
        >
          Use sample
        </Button>
        {recordTypeRef && (
          <Button type="button" variant="ghost" onClick={() => setRecordTypeRef('')}>
            Clear
          </Button>
        )}
        <p className="w-full text-[11px] text-muted-foreground/80">
          Prefills the record-type slot when you pick a scenario. Field references carry their own
          UUIDs, so edit those per field. &ldquo;Use sample&rdquo; inserts a dummy UUID so you can
          test generation without a real environment.
        </p>
      </div>
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
                onClick={() => selectRecipe(r.id)}
                className={cn(
                  'justify-start px-2 py-1 text-left text-sm',
                  r.id === selectedRecipeId ? 'bg-muted font-medium' : 'font-normal',
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
              onChange={(v) => setValues(recipe.id, v)}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pick a scenario on the left to start building.
          </p>
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
            />
            <Diagnostics diagnostics={preview.diagnostics} buildIssues={preview.buildIssues} />
          </>
        ) : null}
      </section>
      </div>
    </div>
  );
}
