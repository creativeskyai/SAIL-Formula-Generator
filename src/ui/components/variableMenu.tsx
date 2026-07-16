/**
 * Shared machinery for the two variable-assist inputs (VariableCombobox for
 * single `variableRef` slots, ExpressionInput for free-SAIL `expression` slots).
 * One home for: the option-ranking rules (`comboItems`), anchoring a portaled
 * panel under a field (`useAnchoredRect`), and rendering the option list
 * (`VariableOptions`). Keeping this here means both inputs stay pixel- and
 * behaviour-identical and the ranking rules are unit-testable without a DOM.
 */

import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import type { VarDomain } from '@/core/ast';
import type { DeclaredVariable } from '@/core/types';
import { cn } from '@/lib/utils';

export const IDENT_RE = /^[A-Za-z_]\w*$/;
/** Only these domains are user-declarable (fv!, pv!, cons! etc. are supplied by
 * the platform, not created here) — mirrors VariablesMode's DECLARABLE_DOMAINS. */
export const CREATABLE: VarDomain[] = ['ri', 'local'];

/** The type every inline-create flow assigns; adjustable afterwards on the
 * Variables page (or via updateVariable). Disclosed on the create rows. */
export const CREATED_TYPE = 'Text';

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

export interface AnchorRect {
  left: number;
  top: number;
  width: number;
}

/** Pin a portaled panel under `ref` and keep it pinned as any ancestor scrolls
 * (capture phase catches scroll on a scrolling section, not just window) or the
 * window resizes. Returns null until the anchor's rect is known. */
export function useAnchoredRect(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
): AnchorRect | null {
  const [rect, setRect] = useState<AnchorRect | null>(null);
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = ref.current;
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
  }, [open, ref]);
  return rect;
}

interface VariableOptionsProps {
  items: ComboItem[];
  active: number;
  baseId: string;
  listboxId: string;
  rect: AnchorRect;
  listRef: RefObject<HTMLUListElement | null>;
  emptyHint: string;
  onChoose: (item: ComboItem) => void;
  onHover: (index: number) => void;
}

/** The portaled option list, shared by both inputs. `active` may be -1 (nothing
 * highlighted) — a valid passive state for ExpressionInput's type-ahead. */
export function VariableOptions({
  items,
  active,
  baseId,
  listboxId,
  rect,
  listRef,
  emptyHint,
  onChoose,
  onHover,
}: VariableOptionsProps) {
  return createPortal(
    <ul
      ref={listRef}
      role="listbox"
      aria-label="Variable suggestions"
      id={listboxId}
      style={{ position: 'fixed', left: rect.left, top: rect.top + 2, width: rect.width }}
      className="z-50 max-h-56 overflow-auto border border-border-strong bg-surface py-0.5 text-sm shadow-lg"
    >
      {items.length === 0 ? (
        // role=option (disabled) keeps this a valid listbox child and lets
        // screen readers announce the hint; it is not in `items`, so keyboard
        // navigation never lands on it.
        <li
          role="option"
          aria-disabled="true"
          aria-selected={false}
          className="px-2.5 py-1.5 text-xs text-muted-foreground"
        >
          {emptyHint}
        </li>
      ) : (
        items.map((item, i) => (
          <li
            key={`${item.kind}:${item.ref}`}
            id={`${baseId}-opt-${i}`}
            role="option"
            aria-selected={i === active}
            // mousedown-preventDefault keeps focus in the input (no blur before
            // the click lands); click performs the selection.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChoose(item)}
            onMouseEnter={() => onHover(i)}
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
              <>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Plus className="h-3.5 w-3.5" />
                  Create <span className="text-foreground">{item.ref}</span>
                </span>
                {/* Disclose the type the new variable gets (editable later on
                 * the Variables page), so the default is never a surprise. */}
                <span className="text-[11px] text-muted-foreground">{CREATED_TYPE}</span>
              </>
            )}
          </li>
        ))
      )}
    </ul>,
    document.body,
  );
}
