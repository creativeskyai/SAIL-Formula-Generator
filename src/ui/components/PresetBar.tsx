import { useRef, useState, type ChangeEvent } from 'react';
import { Trash2 } from 'lucide-react';
import {
  buildPreset,
  deletePreset,
  exportPresetFile,
  importPresetFile,
  listPresetNames,
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
  const [names, setNames] = useState<string[]>(() => listPresetNames());
  const [selected, setSelected] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (!savePreset(trimmedName, buildPreset(recipeId, values, variables))) {
      setError('Could not save preset — browser storage is unavailable or full.');
      return;
    }
    setName('');
    setError(null);
    setNames(listPresetNames());
  };

  const apply = (preset: Preset): boolean => {
    if (!getRecipe(preset.recipeId)) {
      setError(`Preset references an unavailable recipe (${preset.recipeId}).`);
      return false;
    }
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
        apply(preset);
      } else {
        // Gone from storage (e.g. deleted in another tab) — don't leave the
        // select claiming a load that never happened.
        setError(`Preset "${presetName}" no longer exists.`);
        setSelected('');
        setNames(listPresetNames());
      }
    } catch {
      setError(`Preset "${presetName}" is invalid or from an older version.`);
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
    setNames(listPresetNames());
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <Button
          variant="outline"
          type="button"
          onClick={save}
          disabled={!name.trim()}
          title="Save the current form values and variables under this name (browser storage)"
        >
          Save
        </Button>
        {names.length > 0 && (
          <>
            <Select
              className="w-auto"
              value={selected}
              onChange={(e) => load(e.target.value)}
              aria-label="Load preset"
            >
              <option value="">Load preset…</option>
              {names.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
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
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
