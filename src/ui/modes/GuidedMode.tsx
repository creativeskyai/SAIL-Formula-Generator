import { useEffect, useMemo } from 'react';
import { getRecipe, recipesByCategory } from '@/templates';
import { computePreview } from '../lib/preview';
import { configFor, useStore } from '../store';
import { SlotForm, initialValues } from '../components/SlotForm';
import { Preview } from '../components/Preview';
import { PresetBar } from '../components/PresetBar';
import { Diagnostics } from '../components/Diagnostics';
import { cn } from '@/lib/utils';

export function GuidedMode() {
  const selectedRecipeId = useStore((s) => s.selectedRecipeId);
  const selectRecipe = useStore((s) => s.selectRecipe);
  const valuesByRecipe = useStore((s) => s.valuesByRecipe);
  const setValues = useStore((s) => s.setValues);
  const variables = useStore((s) => s.variables);
  const expanded = useStore((s) => s.expanded);
  const setExpanded = useStore((s) => s.setExpanded);

  const groups = recipesByCategory();
  const recipe = selectedRecipeId ? getRecipe(selectedRecipeId) : undefined;
  const values = useMemo(
    () =>
      recipe
        ? (valuesByRecipe[recipe.id] ?? initialValues(recipe.slots))
        : ({} as Record<string, unknown>),
    [recipe, valuesByRecipe],
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
        navigator.clipboard.writeText(sail);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sail, hasError]);

  return (
    <div className="grid h-full grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)] gap-4">
      <nav className="flex flex-col gap-3 overflow-y-auto border-r border-border pr-3">
        {Object.entries(groups).map(([category, list]) => (
          <div key={category} className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {category}
            </span>
            {list.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectRecipe(r.id)}
                className={cn(
                  'rounded px-2 py-1 text-left text-sm transition hover:bg-muted',
                  r.id === selectedRecipeId && 'bg-muted font-medium',
                )}
              >
                {r.name}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <section className="overflow-y-auto">
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

      <section className="flex flex-col gap-3 overflow-y-auto">
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
  );
}
