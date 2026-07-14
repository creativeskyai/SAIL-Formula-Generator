import { create } from 'zustand';
import { COMPACT, EXPANDED, type SerializeConfig } from '@/core/serialize';
import type { DeclaredVariable } from '@/core/types';

export type Mode = 'guided' | 'compose' | 'variables';

interface AppState {
  mode: Mode;
  selectedRecipeId: string | null;
  /** Slot values keyed per recipe, so switching recipes preserves input. */
  valuesByRecipe: Record<string, Record<string, unknown>>;
  variables: DeclaredVariable[];
  expanded: boolean;
  composeText: string;

  setMode: (m: Mode) => void;
  selectRecipe: (id: string) => void;
  setValues: (id: string, values: Record<string, unknown>) => void;
  addVariable: (v: DeclaredVariable) => void;
  removeVariable: (index: number) => void;
  setExpanded: (b: boolean) => void;
  setComposeText: (t: string) => void;
}

export const useStore = create<AppState>((set) => ({
  mode: 'guided',
  selectedRecipeId: null,
  valuesByRecipe: {},
  variables: [],
  expanded: true,
  composeText: '',

  setMode: (mode) => set({ mode }),
  selectRecipe: (selectedRecipeId) => set({ selectedRecipeId }),
  setValues: (id, values) =>
    set((s) => ({ valuesByRecipe: { ...s.valuesByRecipe, [id]: values } })),
  addVariable: (v) => set((s) => ({ variables: [...s.variables, v] })),
  removeVariable: (index) =>
    set((s) => ({ variables: s.variables.filter((_, i) => i !== index) })),
  setExpanded: (expanded) => set({ expanded }),
  setComposeText: (composeText) => set({ composeText }),
}));

export const configFor = (expanded: boolean): SerializeConfig =>
  expanded ? EXPANDED : COMPACT;
