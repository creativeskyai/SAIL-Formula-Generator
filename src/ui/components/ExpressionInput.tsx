/**
 * Free-SAIL expression input with inline variable assistance — used for
 * `expression` slots (the Condition, True/False values, local-variable values,
 * loop bodies, etc.), which is where users actually write `ri!`/`local!`
 * references. Editing is unchanged (any expression is typeable); the assist is
 * purely additive:
 *
 *  - Type a domain-qualified token (`ri!`, `local!tot`) and a dropdown offers
 *    matching declared variables plus one-click "Create ri!/local!" rows — the
 *    same inline-declaration flow as VariableCombobox, so you never leave the
 *    form for the Variables tab.
 *  - The choice is *inserted at the caret* (replacing the partial token), not
 *    substituted for the whole field, because an expression is a full formula.
 *  - A braces button opens the same menu on demand to browse/insert any declared
 *    variable, even from a bare or empty caret.
 *
 * A bare identifier (e.g. `sum`) does NOT auto-open the menu — it is just as
 * likely a function name, and popping "Create ri!sum" mid-formula would be
 * noise. The `!` is the unambiguous "I'm writing a variable reference" signal.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Braces } from 'lucide-react';
import type { VarDomain } from '@/core/ast';
import type { DeclaredVariable } from '@/core/types';
import { inputBase } from './primitives';
import { cn } from '@/lib/utils';
import {
  comboItems,
  CREATED_TYPE,
  useAnchoredRect,
  VariableOptions,
  type ComboItem,
} from './variableMenu';

/** Characters that make up a reference token (`ri!total`). `!` is included so a
 * domain prefix reads as one token; `.`/`[]` accessors deliberately are not, so
 * the token stays a plain ref the ranking rules can match and offer to create. */
const TOKEN_CHAR = /[A-Za-z0-9_!]/;

/** The reference-shaped token ending at the caret, and where it starts, so a
 * chosen ref can replace exactly that token. */
function tokenAt(value: string, caret: number): { start: number; text: string } {
  let start = caret;
  while (start > 0 && TOKEN_CHAR.test(value[start - 1])) start--;
  return { start, text: value.slice(start, caret) };
}

interface ExpressionInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Accessible name for the input when it isn't wrapped in a <label> (list rows). */
  ariaLabel?: string;
  variables: DeclaredVariable[];
  domains?: VarDomain[];
  /** Declare a new variable inline. When absent, "create" rows are suppressed. */
  onCreateVariable?: (v: DeclaredVariable) => void;
}

export function ExpressionInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  variables,
  domains,
  onCreateVariable,
}: ExpressionInputProps) {
  const [open, setOpen] = useState(false);
  // -1 = passive (menu open from type-ahead, nothing highlighted) so Enter never
  // hijacks a keystroke the user meant as "keep my expression".
  const [active, setActive] = useState(-1);
  const [token, setToken] = useState<{ start: number; text: string }>({ start: 0, text: '' });
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const rect = useAnchoredRect(open, inputRef);

  const items = comboItems(token.text, variables, domains, Boolean(onCreateVariable));

  // Keep the highlighted index inside the (possibly shrunk) list.
  useEffect(() => {
    if (active > items.length - 1) setActive(items.length > 0 ? items.length - 1 : -1);
  }, [items.length, active]);

  // Dismiss on a pointer-down anywhere outside the input and the portaled panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (inputRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Scroll the highlighted option into view during keyboard navigation.
  useEffect(() => {
    if (open && active >= 0)
      document.getElementById(`${baseId}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, baseId]);

  const caret = () => inputRef.current?.selectionStart ?? value.length;

  /** Open the menu on the token under the caret (button / ArrowDown), so an
   * empty or bare caret can still browse declared variables. */
  const openMenu = () => {
    inputRef.current?.focus();
    setToken(tokenAt(value, caret()));
    setOpen(true);
    setActive(-1);
  };

  const choose = (item: ComboItem) => {
    if (item.kind === 'create')
      onCreateVariable?.({ domain: item.domain, name: item.name, type: CREATED_TYPE });
    // Replace exactly the token the suggestions were computed against —
    // [token.start, token.start + token.text.length) — never the live caret,
    // which can have drifted (arrow keys / a reposition click) since the token
    // was captured and would otherwise duplicate or straddle the token.
    const before = value.slice(0, token.start);
    const after = value.slice(token.start + token.text.length);
    const next = before + item.ref + after;
    onChange(next);
    setOpen(false);
    setActive(-1);
    // Restore the caret just past the inserted reference (after React re-renders
    // the controlled value), so the user keeps typing where they left off.
    const pos = before.length + item.ref.length;
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          openMenu();
          setActive(0);
        } else {
          setActive((i) => Math.min(items.length - 1, i + 1));
        }
        break;
      case 'ArrowUp':
        if (open) {
          e.preventDefault();
          setActive((i) => Math.max(0, i - 1));
        }
        break;
      case 'Enter':
        // Only act when the user has explicitly navigated into the list — a
        // passive (type-ahead) menu leaves Enter to the field.
        if (open && active >= 0 && items[active]) {
          e.preventDefault();
          choose(items[active]);
        }
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 && items[active] ? `${baseId}-opt-${active}` : undefined}
        aria-label={ariaLabel}
        autoComplete="off"
        spellCheck={false}
        value={value ?? ''}
        placeholder={placeholder}
        className={cn(inputBase, 'pr-8 font-mono')}
        onChange={(e) => {
          onChange(e.target.value);
          const t = tokenAt(e.target.value, e.target.selectionStart ?? e.target.value.length);
          setToken(t);
          // Auto-open only for an unambiguous reference token (contains `!`).
          setOpen(t.text.includes('!'));
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        aria-label="Insert variable"
        title="Insert or create a variable"
        // Keep focus in the input (no blur before the menu opens).
        onMouseDown={(e) => e.preventDefault()}
        onClick={openMenu}
        className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <Braces className="h-4 w-4" />
      </button>
      {open && rect && (
        <VariableOptions
          items={items}
          active={active}
          baseId={baseId}
          listboxId={listboxId}
          rect={rect}
          listRef={listRef}
          emptyHint="Type ri! or local! and a name to create a variable."
          onChoose={choose}
          onHover={setActive}
        />
      )}
    </div>
  );
}
