import { create } from 'zustand';
import { COMPACT, EXPANDED, type SerializeConfig } from '@/core/serialize';
import type { Preset } from '@/core/recipe';
import type { DeclaredVariable } from '@/core/types';

export type Mode = 'guided' | 'compose' | 'variables';
export type Theme = 'light' | 'dark';

const THEME_KEY = 'sailgen.theme';
const RECORD_TYPE_KEY = 'sailgen.recordTypeRef';
const SESSION_KEY = 'sailgen.session.v1';

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

/** The slice of state that survives a reload (theme and the record-type
 * reference persist under their own keys). */
interface SessionState {
  mode: Mode;
  selectedRecipeId: string | null;
  valuesByRecipe: Record<string, Record<string, unknown>>;
  variables: DeclaredVariable[];
  expanded: boolean;
  composeText: string;
}

const SESSION_DEFAULTS: SessionState = {
  mode: 'guided',
  selectedRecipeId: null,
  valuesByRecipe: {},
  variables: [],
  expanded: true,
  composeText: '',
};

/** Restore the last session, field-by-field: any missing or wrong-shaped field
 * falls back to its default rather than discarding the whole session. */
function readSession(): SessionState {
  const s = { ...SESSION_DEFAULTS };
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return s;
    const p: unknown = JSON.parse(raw);
    if (!p || typeof p !== 'object') return s;
    const d = p as Record<string, unknown>;
    if (d.mode === 'guided' || d.mode === 'compose' || d.mode === 'variables') s.mode = d.mode;
    if (typeof d.selectedRecipeId === 'string') s.selectedRecipeId = d.selectedRecipeId;
    if (d.valuesByRecipe && typeof d.valuesByRecipe === 'object' && !Array.isArray(d.valuesByRecipe)) {
      s.valuesByRecipe = d.valuesByRecipe as SessionState['valuesByRecipe'];
    }
    if (Array.isArray(d.variables)) {
      s.variables = d.variables.filter(
        (v): v is DeclaredVariable =>
          Boolean(v) &&
          typeof v === 'object' &&
          typeof (v as DeclaredVariable).domain === 'string' &&
          typeof (v as DeclaredVariable).name === 'string',
      );
    }
    if (typeof d.expanded === 'boolean') s.expanded = d.expanded;
    if (typeof d.composeText === 'string') s.composeText = d.composeText;
  } catch {
    /* localStorage unavailable or malformed JSON — start fresh */
  }
  return s;
}

function persistSession(s: SessionState): void {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        mode: s.mode,
        selectedRecipeId: s.selectedRecipeId,
        valuesByRecipe: s.valuesByRecipe,
        variables: s.variables,
        expanded: s.expanded,
        composeText: s.composeText,
      }),
    );
  } catch {
    /* storage unavailable or full — the session simply won't survive reload */
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
  ...readSession(),
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

// Persist the working session so a reload (or accidental tab close) restores
// exactly where the user left off. Only session-field changes write — a
// non-session change (e.g. a theme toggle in a second, stale tab) must not
// clobber what another tab has persisted since this one loaded.
useStore.subscribe((s, prev) => {
  if (
    s.mode !== prev.mode ||
    s.selectedRecipeId !== prev.selectedRecipeId ||
    s.valuesByRecipe !== prev.valuesByRecipe ||
    s.variables !== prev.variables ||
    s.expanded !== prev.expanded ||
    s.composeText !== prev.composeText
  ) {
    persistSession(s);
  }
});

export const configFor = (expanded: boolean): SerializeConfig =>
  expanded ? EXPANDED : COMPACT;
