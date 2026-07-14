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
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Names of presets saved in localStorage, alphabetical. */
export function listPresetNames(): string[] {
  return Object.keys(readStore()).sort();
}

export function savePreset(name: string, preset: Preset): void {
  const all = readStore();
  all[name] = preset;
  localStorage.setItem(LS_KEY, JSON.stringify(all));
}

export function deletePreset(name: string): void {
  const all = readStore();
  delete all[name];
  localStorage.setItem(LS_KEY, JSON.stringify(all));
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
