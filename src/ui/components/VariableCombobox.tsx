/**
 * Editable combobox for `variableRef` slots. Replaces the native `<datalist>`,
 * which could not be positioned or styled (it rendered misaligned) and could
 * not offer an inline "create variable" action.
 *
 * Two things it fixes:
 *  1. Alignment — the option panel is portaled to <body> and pinned with fixed
 *     coordinates read from the input's rect, so it sits flush under the field
 *     at the field's width and never clips inside a scrolling ancestor.
 *  2. Inline variable creation — a typed-but-undeclared name surfaces one-click
 *     "Create ri!name / local!name" rows, so you never leave the form to
 *     declare a variable.
 *
 * The input stays freely editable (any reference, including dotted accessors
 * like `ri!case.fields.status`); the dropdown is purely assistive. The dropdown
 * machinery (option ranking, anchoring, list rendering) is shared with
 * ExpressionInput via `variableMenu`.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
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

// Re-exported so the pure ranking rules keep one public import path.
export { comboItems, type ComboItem };

interface VariableComboboxProps {
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

export function VariableCombobox({
  value,
  onChange,
  placeholder,
  ariaLabel,
  variables,
  domains,
  onCreateVariable,
}: VariableComboboxProps) {
  const [open, setOpen] = useState(false);
  // -1 = passive (menu open, nothing highlighted) so Enter never hijacks a
  // keystroke the user meant as "keep my typed reference" — matching
  // ExpressionInput's contract exactly.
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const rect = useAnchoredRect(open, inputRef);

  const items = comboItems(value ?? '', variables, domains, Boolean(onCreateVariable));

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

  const choose = (item: ComboItem) => {
    if (item.kind === 'create')
      onCreateVariable?.({ domain: item.domain, name: item.name, type: CREATED_TYPE });
    onChange(item.ref);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setActive(0);
        } else {
          setActive((i) => Math.min(items.length - 1, i + 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case 'Enter':
        // Only act when the user has explicitly navigated into the list — a
        // passive (just-typed) menu leaves Enter to the field.
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
        // Let focus move on, but dismiss the panel so it never orphans as a
        // floating listbox under an unfocused field.
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
        aria-activedescendant={
          open && active >= 0 && items[active] ? `${baseId}-opt-${active}` : undefined
        }
        aria-label={ariaLabel}
        autoComplete="off"
        spellCheck={false}
        value={value ?? ''}
        placeholder={placeholder}
        className={cn(inputBase, 'pr-8 font-mono')}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      {open && rect && (
        <VariableOptions
          items={items}
          active={active}
          baseId={baseId}
          listboxId={listboxId}
          rect={rect}
          listRef={listRef}
          emptyHint="Type a name to create a variable, or enter any reference."
          onChoose={choose}
          onHover={setActive}
        />
      )}
    </div>
  );
}
