import { create } from 'zustand';
import { COMPACT, EXPANDED, type SerializeConfig } from '@/core/serialize';
import type { Preset } from '@/core/recipe';
import type { DeclaredVariable } from '@/core/types';

export type Mode = 'guided' | 'compose' | 'variables';
export type Theme = 'light' | 'dark';

const THEME_KEY = 'sailgen.theme';
const RECORD_TYPE_KEY = 'sailgen.recordTypeRef';

/** A syntactically-shaped dummy record-type reference (all-zero UUID) for
 * testing generation without a real Appian environment. */
export const SAMPLE_RECORD_TYPE_REF =
  'recordType!{00000000-0000-0000-0000-000000000000}Case';

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    /* localStorage/matchMedia unavailable */
  }
  return 'light';
}

function readRecordTypeRef(): string {
  try {
    return localStorage.getItem(RECORD_TYPE_KEY) ?? '';
  } catch {
    return '';
  }
}

interface AppState {
  mode: Mode;
  selectedRecipeId: string | null;
  /** Slot values keyed per recipe, so switching recipes preserves input. */
  valuesByRecipe: Record<string, Record<string, unknown>>;
  variables: DeclaredVariable[];
  expanded: boolean;
  composeText: string;
  theme: Theme;
  /** Global record-type reference the user pastes once; prefills recordTypeRef
   * slots so generated queries use their environment's reference. */
  recordTypeRef: string;

  setMode: (m: Mode) => void;
  selectRecipe: (id: string) => void;
  setValues: (id: string, values: Record<string, unknown>) => void;
  addVariable: (v: DeclaredVariable) => void;
  removeVariable: (index: number) => void;
  setExpanded: (b: boolean) => void;
  setComposeText: (t: string) => void;
  setTheme: (t: Theme) => void;
  setRecordTypeRef: (ref: string) => void;
  /** Load a validated preset into Guided mode. */
  loadPresetState: (preset: Preset) => void;
}

export const useStore = create<AppState>((set) => ({
  mode: 'guided',
  selectedRecipeId: null,
  valuesByRecipe: {},
  variables: [],
  expanded: true,
  composeText: '',
  theme: readTheme(),
  recordTypeRef: readRecordTypeRef(),

  setMode: (mode) => set({ mode }),
  selectRecipe: (selectedRecipeId) => set({ selectedRecipeId }),
  setValues: (id, values) =>
    set((s) => ({ valuesByRecipe: { ...s.valuesByRecipe, [id]: values } })),
  addVariable: (v) => set((s) => ({ variables: [...s.variables, v] })),
  removeVariable: (index) =>
    set((s) => ({ variables: s.variables.filter((_, i) => i !== index) })),
  setExpanded: (expanded) => set({ expanded }),
  setComposeText: (composeText) => set({ composeText }),
  setTheme: (theme) => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
    set({ theme });
  },
  setRecordTypeRef: (recordTypeRef) => {
    try {
      localStorage.setItem(RECORD_TYPE_KEY, recordTypeRef);
    } catch {
      /* ignore */
    }
    set({ recordTypeRef });
  },
  loadPresetState: (preset) =>
    set((s) => ({
      mode: 'guided',
      selectedRecipeId: preset.recipeId,
      valuesByRecipe: { ...s.valuesByRecipe, [preset.recipeId]: preset.slotValues },
      // Merge (union) rather than replace, so loading a preset never silently
      // discards variables the user already declared this session.
      variables: [
        ...s.variables,
        ...preset.variables.filter(
          (pv) => !s.variables.some((ev) => ev.domain === pv.domain && ev.name === pv.name),
        ),
      ],
    })),
}));

export const configFor = (expanded: boolean): SerializeConfig =>
  expanded ? EXPANDED : COMPACT;
