/**
 * Minimal SAIL syntax highlighting for CodeMirror 6 via StreamLanguage — no
 * Lezer grammar (PLAN.md §5). Best-effort token domains: strings (with `""`
 * escaping), numbers, booleans/null, function names, variable/record refs,
 * operators.
 */

import { StreamLanguage, LanguageSupport } from '@codemirror/language';
import { keymap } from '@codemirror/view';
import {
  autocompletion,
  completionKeymap,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { catalog } from '@/core/catalog';
import type { DeclaredVariable } from '@/core/types';
import { CREATABLE, CREATED_TYPE, IDENT_RE } from './components/variableMenu';

const VAR_DOMAINS = 'ri|local|pv|ac|cons|rule|fv|tp|rf|rp|pp';

const sailLanguage = StreamLanguage.define<Record<string, never>>({
  token(stream) {
    if (stream.eatSpace()) return null;

    // Block comment /* ... */
    if (stream.match('/*')) {
      while (!stream.eol()) {
        if (stream.match('*/')) break;
        stream.next();
      }
      return 'comment';
    }

    // String literal with "" escaping.
    if (stream.peek() === '"') {
      stream.next();
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === '"') {
          if (stream.peek() === '"') {
            stream.next();
            continue;
          }
          break;
        }
      }
      return 'string';
    }

    if (stream.match(/^\d+(\.\d+)?/)) return 'number';
    if (stream.match(/^(true|false|null)\b/)) return 'atom';

    // Record type reference.
    if (stream.match(/^recordType!/)) {
      stream.match(/^[A-Za-z0-9_.]+/);
      return 'typeName';
    }
    // Variable reference domain!name.
    if (stream.match(new RegExp(`^(${VAR_DOMAINS})!`))) {
      stream.match(/^[A-Za-z0-9_]+/);
      return 'variableName';
    }
    // Function calls a!name / fn!name.
    if (stream.match(/^(a|fn)!\w+/)) return 'keyword';

    // Identifier — highlight as a function when directly followed by '('.
    if (stream.match(/^[A-Za-z_]\w*/)) {
      return stream.peek() === '(' ? 'keyword' : 'variableName';
    }

    if (stream.match(/^(<=|>=|<>|[+\-*/^&<>=])/)) return 'operator';

    stream.next();
    return null;
  },
});

export function sail(): LanguageSupport {
  return new LanguageSupport(sailLanguage);
}

// --- Autocomplete (Compose mode) ---------------------------------------------

/** One completion per catalog function: the name completes, the parameter list
 * shows inline, and the summary appears in the docs tooltip. Built once — the
 * catalog is static. */
const FUNCTION_COMPLETIONS: Completion[] = catalog.all().map((f) => ({
  label: f.name,
  type: 'function',
  detail: f.params.length ? `(${f.params.map((p) => p.name).join(', ')})` : '()',
  info: f.summary,
}));

// SAIL identifiers can carry a domain prefix (`a!`, `fn!`), so `!` is part of
// the completed token.
const TOKEN = /[\w!]*/;

export interface VariableAssist {
  /** Read the currently declared variables (called per keystroke — pass a
   * store getter, not a snapshot). */
  getVariables: () => DeclaredVariable[];
  /** Declare a new variable inline (the "Create ri!name" completions). */
  onCreateVariable?: (v: DeclaredVariable) => void;
}

/** Variable completions for the token being typed: every declared variable,
 * plus "Create ri!name / local!name" entries for a typed-but-undeclared
 * `ri!`/`local!` reference — the same inline-declaration flow the Guided-mode
 * fields have. Pure and exported so the rules are unit-testable without an
 * editor. The `create` marker is consumed by the apply callback built in
 * `sailAutocomplete`. */
export function variableCompletions(
  token: string,
  variables: DeclaredVariable[],
  canCreate: boolean,
): (Completion & { create?: DeclaredVariable })[] {
  const existing = variables.map((v) => ({
    label: `${v.domain}!${v.name}`,
    type: 'variable',
    detail: v.type,
    boost: 1, // declared variables above the (long) function list
  }));
  const explicit = /^(ri|local)!([A-Za-z_]\w*)$/.exec(token);
  if (!canCreate || !explicit) return existing;
  const domain = explicit[1] as DeclaredVariable['domain'];
  const name = explicit[2];
  if (
    !CREATABLE.includes(domain) ||
    !IDENT_RE.test(name) ||
    variables.some((v) => v.domain === domain && v.name === name)
  ) {
    return existing;
  }
  return [
    ...existing,
    {
      label: token,
      displayLabel: `Create ${token}`,
      type: 'variable',
      detail: CREATED_TYPE,
      boost: 2,
      create: { domain, name, type: CREATED_TYPE },
    },
  ];
}

/** CodeMirror extension: catalog-function autocomplete for the Compose editor,
 * plus (when `assist` is provided) declared-variable suggestions and inline
 * "Create ri!name" entries. autocompletion() already includes the completion
 * keymap by default; we also register completionKeymap explicitly so
 * ArrowUp/Down/Enter/Escape navigation is guaranteed regardless of the host
 * editor's basicSetup keymap options. */
export function sailAutocomplete(assist?: VariableAssist) {
  function completeSail(context: CompletionContext): CompletionResult | null {
    const word = context.matchBefore(TOKEN);
    if (!word || (word.from === word.to && !context.explicit)) return null;
    const token = context.state.sliceDoc(word.from, word.to);
    const vars = assist
      ? variableCompletions(token, assist.getVariables(), Boolean(assist.onCreateVariable)).map(
          (c): Completion => {
            const { create, ...completion } = c;
            if (!create) return completion;
            return {
              ...completion,
              apply: (view, _completion, from, to) => {
                assist.onCreateVariable?.(create);
                view.dispatch({
                  changes: { from, to, insert: `${create.domain}!${create.name}` },
                });
              },
            };
          },
        )
      : [];
    // No validFor: the "Create …" entry depends on the exact token text, so
    // the source must re-run per keystroke rather than re-filter cached options.
    return { from: word.from, options: [...FUNCTION_COMPLETIONS, ...vars] };
  }
  return [autocompletion({ override: [completeSail] }), keymap.of(completionKeymap)];
}
