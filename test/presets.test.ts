import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildPreset,
  deletePreset,
  listPresetNames,
  loadPreset,
  savePreset,
} from '@/ui/lib/presets';
import { PRESET_SCHEMA_VERSION } from '@/core/recipe';

beforeEach(() => localStorage.clear());

describe('presets', () => {
  it('buildPreset stamps the current schema version', () => {
    const p = buildPreset('query-filter', { field: 'x' }, []);
    expect(p.schemaVersion).toBe(PRESET_SCHEMA_VERSION);
    expect(p.recipeId).toBe('query-filter');
    expect(p.slotValues).toEqual({ field: 'x' });
  });

  it('save / list / load round-trips through localStorage', () => {
    const preset = buildPreset(
      'text-field',
      { label: 'Name' },
      [{ domain: 'ri', name: 'name', type: 'Text' }],
    );
    savePreset('my form', preset);
    expect(listPresetNames()).toEqual(['my form']);
    expect(loadPreset('my form')).toEqual(preset);
  });

  it('loadPreset returns null for an unknown name', () => {
    expect(loadPreset('nope')).toBeNull();
  });

  it('loadPreset rejects a stale/invalid stored preset (schema validation)', () => {
    localStorage.setItem(
      'sailgen.presets',
      JSON.stringify({ bad: { schemaVersion: 999, recipeId: 'x', slotValues: {}, variables: [] } }),
    );
    expect(() => loadPreset('bad')).toThrow();
  });

  it('deletePreset removes an entry', () => {
    savePreset('a', buildPreset('if-else', {}, []));
    savePreset('b', buildPreset('for-each', {}, []));
    deletePreset('a');
    expect(listPresetNames()).toEqual(['b']);
  });
});
