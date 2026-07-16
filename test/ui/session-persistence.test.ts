/**
 * Session persistence: the working session (mode, selected recipe, slot values,
 * variables, formatting, compose text) survives a reload via localStorage, and
 * malformed stored data falls back to defaults instead of crashing.
 *
 * "Reload" is simulated by resetting the module registry and re-importing the
 * store, which re-runs its localStorage read.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const SESSION_KEY = 'sailgen.session.v1';

async function importStore() {
  vi.resetModules();
  return (await import('@/ui/store')).useStore;
}

beforeEach(() => {
  localStorage.clear();
});

describe('session persistence', () => {
  it('restores the session after a simulated reload', async () => {
    let useStore = await importStore();
    useStore.getState().setMode('compose');
    useStore.getState().selectRecipe('text-field');
    useStore.getState().setValues('text-field', { label: 'Name' });
    useStore.getState().addVariable({ domain: 'ri', name: 'caseId', type: 'Integer' });
    useStore.getState().setExpanded(false);
    useStore.getState().setComposeText('if(true, 1, 2)');

    useStore = await importStore();
    const s = useStore.getState();
    expect(s.mode).toBe('compose');
    expect(s.selectedRecipeId).toBe('text-field');
    expect(s.valuesByRecipe['text-field']).toEqual({ label: 'Name' });
    expect(s.variables).toEqual([{ domain: 'ri', name: 'caseId', type: 'Integer' }]);
    expect(s.expanded).toBe(false);
    expect(s.composeText).toBe('if(true, 1, 2)');
  });

  it('falls back to defaults on malformed stored JSON', async () => {
    localStorage.setItem(SESSION_KEY, '{not json');
    const useStore = await importStore();
    const s = useStore.getState();
    expect(s.mode).toBe('guided');
    expect(s.selectedRecipeId).toBeNull();
    expect(s.valuesByRecipe).toEqual({});
  });

  it('keeps valid fields and drops wrong-shaped ones field-by-field', async () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        mode: 'variables',
        selectedRecipeId: 42, // wrong type -> default
        valuesByRecipe: ['not', 'an', 'object'], // wrong shape -> default
        variables: [{ domain: 'ri', name: 'ok' }, { bogus: true }, null],
        expanded: 'yes', // wrong type -> default
        composeText: 'a!forEach()',
      }),
    );
    const useStore = await importStore();
    const s = useStore.getState();
    expect(s.mode).toBe('variables');
    expect(s.selectedRecipeId).toBeNull();
    expect(s.valuesByRecipe).toEqual({});
    expect(s.variables).toEqual([{ domain: 'ri', name: 'ok' }]);
    expect(s.expanded).toBe(true);
    expect(s.composeText).toBe('a!forEach()');
  });
});
