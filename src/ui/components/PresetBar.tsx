import { useRef, useState, type ChangeEvent } from 'react';
import {
  buildPreset,
  exportPresetFile,
  importPresetFile,
  listPresetNames,
  loadPreset,
  savePreset,
} from '../lib/presets';
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
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    savePreset(trimmed, buildPreset(recipeId, values, variables));
    setName('');
    setNames(listPresetNames());
  };

  const load = (presetName: string) => {
    if (!presetName) return;
    try {
      const preset = loadPreset(presetName);
      if (preset) loadPresetState(preset);
      setError(null);
    } catch {
      setError(`Preset "${presetName}" is invalid or from an older version.`);
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      loadPresetState(await importPresetFile(file));
      setError(null);
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
        <Button variant="outline" type="button" onClick={save} disabled={!name.trim()}>
          Save
        </Button>
        {names.length > 0 && (
          <Select
            className="w-auto"
            value=""
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
        )}
        <Button
          variant="outline"
          type="button"
          onClick={() => exportPresetFile(buildPreset(recipeId, values, variables), `${recipeId}.json`)}
        >
          Export
        </Button>
        <Button variant="outline" type="button" onClick={() => fileRef.current?.click()}>
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
