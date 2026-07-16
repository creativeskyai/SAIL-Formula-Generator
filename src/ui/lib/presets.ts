/**
 * Preset persistence: localStorage + JSON file export/import. Imports and
 * localStorage reads are validated through `parsePreset` (zod, schemaVersion),
 * so malformed or stale data is rejected rather than silently loaded
 * (PLAN.md amendment 7).
 */

import { parsePreset, PRESET_SCHEMA_VERSION, type Preset } from '@/core/recipe';
import type { DeclaredVariable } from '@/core/types';

const LS_KEY = 'sailgen.presets';

export function buildPreset(
  recipeId: string,
  slotValues: Record<string, unknown>,
  variables: DeclaredVariable[],
): Preset {
  return { schemaVersion: PRESET_SCHEMA_VERSION, recipeId, slotValues, variables };
}

function readStore(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    // Rebase onto a null-prototype object so preset names that collide with
    // Object.prototype keys ("__proto__", "constructor") behave as plain data
    // — a normal object would silently drop `all["__proto__"] = …`.
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? Object.assign(Object.create(null) as Record<string, unknown>, parsed)
      : (Object.create(null) as Record<string, unknown>);
  } catch {
    return Object.create(null) as Record<string, unknown>;
  }
}

/** Names of presets saved in localStorage, alphabetical. */
export function listPresetNames(): string[] {
  return Object.keys(readStore()).sort();
}

/** Saved presets with the recipe each belongs to, alphabetical by name — so
 * pickers can show which scenario a preset will switch the form to. */
export function listPresets(): { name: string; recipeId: string | null }[] {
  const all = readStore();
  return Object.keys(all)
    .sort()
    .map((name) => {
      const raw = all[name] as { recipeId?: unknown } | null;
      return {
        name,
        recipeId: raw && typeof raw.recipeId === 'string' ? raw.recipeId : null,
      };
    });
}

/** Returns false if the write fails (storage unavailable, quota exceeded,
 * Safari private mode) so the caller can surface an error instead of throwing
 * out of an event handler. */
export function savePreset(name: string, preset: Preset): boolean {
  const all = readStore();
  all[name] = preset;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

export function deletePreset(name: string): boolean {
  const all = readStore();
  delete all[name];
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

/** Load and validate a named preset. Returns null if absent; throws (ZodError)
 * if the stored data is malformed or a stale schema version. */
export function loadPreset(name: string): Preset | null {
  const raw = readStore()[name];
  return raw === undefined ? null : parsePreset(raw);
}

export function exportPresetFile(preset: Preset, filename = 'sail-preset.json'): void {
  const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Read a preset from an uploaded file, validated. Throws on invalid JSON or
 * schema. */
export async function importPresetFile(file: File): Promise<Preset> {
  const text = await file.text();
  return parsePreset(JSON.parse(text));
}
