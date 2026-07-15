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
 * like `ri!case.fields.status`); the dropdown is purely assistive.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus } from 'lucide-react';
import type { VarDomain } from '@/core/ast';
import type { DeclaredVariable } from '@/core/types';
import { inputBase } from './primitives';
import { cn } from '@/lib/utils';

const IDENT_RE = /^[A-Za-z_]\w*$/;
/** Only these domains are user-declarable (fv!, pv!, cons! etc. are supplied by
 * the platform, not created here) — mirrors VariablesMode's DECLARABLE_DOMAINS. */
const CREATABLE: VarDomain[] = ['ri', 'local'];

export type ComboItem =
  | { kind: 'existing'; ref: string; type?: string }
  | { kind: 'create'; domain: VarDomain; name: string; ref: string };

/** Ordered options for the current input: matching declared variables first,
 * then one-click "create" rows for a freshly-typed identifier. Pure, so the
 * ranking/creation rules are unit-testable without a DOM. */
export function comboItems(
  input: string,
  variables: DeclaredVariable[],
  domains: VarDomain[] | undefined,
  canCreate: boolean,
): ComboItem[] {
  const inDomain = (d: VarDomain) => !domains || domains.includes(d);
  const q = input.trim().toLowerCase();

  const existing: ComboItem[] = variables
    .filter((v) => inDomain(v.domain))
    .map((v) => ({ kind: 'existing' as const, ref: `${v.domain}!${v.name}`, type: v.type }))
    .filter((it) => !q || it.ref.toLowerCase().includes(q));

  if (!canCreate) return existing;

  // Creation candidates: an explicit `ri!name` / `local!name`, or a bare
  // identifier offered in every allowed declarable domain.
  const createDomains = CREATABLE.filter(inDomain);
  const t = input.trim();
  const explicit = /^(ri|local)!([A-Za-z_]\w*)$/.exec(t);
  let creates: ComboItem[];
  if (explicit) {
    const domain = explicit[1] as VarDomain;
    creates = createDomains.includes(domain)
      ? [{ kind: 'create', domain, name: explicit[2], ref: t }]
      : [];
  } else if (IDENT_RE.test(t)) {
    creates = createDomains.map((domain) => ({
      kind: 'create' as const,
      domain,
      name: t,
      ref: `${domain}!${t}`,
    }));
  } else {
    creates = [];
  }

  // Never offer to create a reference that is already declared.
  const declared = new Set(variables.map((v) => `${v.domain}!${v.name}`));
  return [...existing, ...creates.filter((c) => !declared.has(c.ref))];
}

interface VariableComboboxProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  variables: DeclaredVariable[];
  domains?: VarDomain[];
  /** Declare a new variable inline. When absent, "create" rows are suppressed. */
  onCreateVariable?: (v: DeclaredVariable) => void;
}

export function VariableCombobox({
  value,
  onChange,
  placeholder,
  variables,
  domains,
  onCreateVariable,
}: VariableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;

  const items = comboItems(value ?? '', variables, domains, Boolean(onCreateVariable));

  // Keep the highlighted index inside the (possibly shrunk) list.
  useEffect(() => {
    if (active > items.length - 1) setActive(items.length > 0 ? items.length - 1 : 0);
  }, [items.length, active]);

  // Pin the portaled panel under the input, and keep it pinned as any ancestor
  // scrolls (capture phase catches scroll on the scrolling section, not window)
  // or the window resizes.
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = inputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ left: r.left, top: r.bottom, width: r.width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

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
    if (open) document.getElementById(`${baseId}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, baseId]);

  const choose = (item: ComboItem) => {
    if (item.kind === 'create') onCreateVariable?.({ domain: item.domain, name: item.name, type: 'Text' });
    onChange(item.ref);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) setOpen(true);
        else setActive((i) => Math.min(items.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case 'Enter':
        if (open && items[active]) {
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
        aria-activedescendant={open && items[active] ? `${baseId}-opt-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        value={value ?? ''}
        placeholder={placeholder}
        className={cn(inputBase, 'pr-8 font-mono')}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      {open &&
        rect &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            id={listboxId}
            style={{ position: 'fixed', left: rect.left, top: rect.top + 2, width: rect.width }}
            className="z-50 max-h-56 overflow-auto border border-border-strong bg-surface py-0.5 text-sm shadow-lg"
          >
            {items.length === 0 ? (
              // role=option (disabled) keeps this a valid listbox child and lets
              // screen readers announce the hint; it is not in `items`, so
              // keyboard navigation never lands on it.
              <li
                role="option"
                aria-disabled="true"
                aria-selected={false}
                className="px-2.5 py-1.5 text-xs text-muted-foreground"
              >
                Type a name to create a variable, or enter any reference.
              </li>
            ) : (
              items.map((item, i) => (
                <li
                  key={`${item.kind}:${item.ref}`}
                  id={`${baseId}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // mousedown-preventDefault keeps focus in the input (no blur
                  // before the click lands); click performs the selection.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(item)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 px-2.5 py-1.5 font-mono',
                    i === active && 'bg-muted',
                  )}
                >
                  {item.kind === 'existing' ? (
                    <>
                      <span>{item.ref}</span>
                      {item.type && <span className="text-[11px] text-muted-foreground">{item.type}</span>}
                    </>
                  ) : (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Plus className="h-3.5 w-3.5" />
                      Create <span className="text-foreground">{item.ref}</span>
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
}
