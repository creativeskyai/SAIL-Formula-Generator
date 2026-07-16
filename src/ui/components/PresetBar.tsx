import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Trash2 } from 'lucide-react';
import {
  buildPreset,
  deletePreset,
  exportPresetFile,
  importPresetFile,
  listPresets,
  loadPreset,
  savePreset,
} from '../lib/presets';
import { getRecipe } from '@/templates';
import type { Preset } from '@/core/recipe';
import { useStore } from '../store';
import { Button, Select, TextInput } from './primitives';

export function PresetBar({
  recipeId,
  values,
}: {
  recipeId: string;
  values: Record<string, unknown>;
}) {
  const variables = useStore((s) => s.variables);
  const loadPresetState = useStore((s) => s.loadPresetState);
  const [name, setName] = useState('');
  const [presets, setPresets] = useState(() => listPresets());
  const [selected, setSelected] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // `selected` means "this preset is what the current form shows". When the
  // user navigates to a different scenario the claim stops being true, so the
  // picker resets — EXCEPT when the scenario change was caused by loading a
  // cross-scenario preset, which is exactly the loaded state.
  const appliedRecipeId = useRef<string | null>(null);
  useEffect(() => {
    if (recipeId !== appliedRecipeId.current) {
      setSelected('');
      setError(null);
      appliedRecipeId.current = null;
    }
  }, [recipeId]);

  // Saving under an existing name overwrites it (savePreset does all[name] = …).
  // Surface that as a deliberate "Replace", never a silent clobber.
  const trimmedName = name.trim();
  const isReplace = trimmedName !== '' && presets.some((p) => p.name === trimmedName);

  const save = () => {
    if (!trimmedName) return;
    if (!savePreset(trimmedName, buildPreset(recipeId, values, variables))) {
      setError('Could not save preset — browser storage is unavailable or full.');
      return;
    }
    setName('');
    setError(null);
    setPresets(listPresets());
  };

  const apply = (preset: Preset): boolean => {
    if (!getRecipe(preset.recipeId)) {
      setError(`Preset references an unavailable recipe (${preset.recipeId}).`);
      return false;
    }
    appliedRecipeId.current = preset.recipeId;
    loadPresetState(preset);
    setError(null);
    return true;
  };

  const load = (presetName: string) => {
    setSelected(presetName);
    if (!presetName) return;
    try {
      const preset = loadPreset(presetName);
      if (preset) {
        // A failed apply (unavailable recipe) must not leave the select
        // claiming a load that never happened.
        if (!apply(preset)) setSelected('');
      } else {
        // Gone from storage (e.g. deleted in another tab).
        setError(`Preset "${presetName}" no longer exists.`);
        setSelected('');
        setPresets(listPresets());
      }
    } catch {
      setError(`Preset "${presetName}" is invalid or from an older version.`);
      setSelected('');
    }
  };

  const remove = () => {
    if (!selected) return;
    if (!deletePreset(selected)) {
      setError('Could not delete preset — browser storage is unavailable.');
      return;
    }
    setSelected('');
    setError(null);
    setPresets(listPresets());
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      apply(await importPresetFile(file));
    } catch {
      setError('That file is not a valid preset.');
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <TextInput
          className="w-32"
          placeholder="Preset name"
          aria-label="Preset name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <Button
          variant="outline"
          type="button"
          onClick={save}
          disabled={!trimmedName}
          title={
            isReplace
              ? `Replace the existing preset "${trimmedName}" with the current form values and variables`
              : 'Save the current form values and variables under this name (browser storage)'
          }
        >
          {isReplace ? 'Replace' : 'Save'}
        </Button>
        {presets.length > 0 && (
          <>
            <Select
              className="w-auto"
              value={selected}
              onChange={(e) => load(e.target.value)}
              aria-label="Load preset"
            >
              <option value="">Load preset…</option>
              {presets.map((p) => {
                // Show which scenario each preset belongs to — loading one from
                // another scenario switches the whole form, so say so up front.
                const scenario = p.recipeId ? getRecipe(p.recipeId)?.name : undefined;
                return (
                  <option key={p.name} value={p.name}>
                    {scenario && p.recipeId !== recipeId ? `${p.name} — ${scenario}` : p.name}
                  </option>
                );
              })}
            </Select>
            {selected && (
              <Button
                variant="ghost"
                type="button"
                onClick={remove}
                aria-label={`Delete preset ${selected}`}
                title={`Delete preset "${selected}"`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
        <Button
          variant="outline"
          type="button"
          onClick={() => exportPresetFile(buildPreset(recipeId, values, variables), `${recipeId}.json`)}
          title="Download the current form values and variables as a JSON file"
        >
          Export
        </Button>
        <Button
          variant="outline"
          type="button"
          onClick={() => fileRef.current?.click()}
          title="Load form values and variables from an exported JSON file"
        >
          Import
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onFile}
        />
      </div>
      {isReplace && !error && (
        <span className="text-xs text-warning" role="status">
          A preset named &ldquo;{trimmedName}&rdquo; already exists — saving will replace it.
        </span>
      )}
      {error && (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
