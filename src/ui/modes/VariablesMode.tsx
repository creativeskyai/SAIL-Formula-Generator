import { useId, useMemo, useState } from 'react';
import { SAIL_TYPES } from '@/core/catalog';
import type { SailType, VarDomain } from '@/core/ast';
import { useStore } from '../store';
import { Button, Field, Select, TextInput } from '../components/primitives';

const DECLARABLE_DOMAINS: VarDomain[] = ['ri', 'local'];

export function VariablesMode() {
  const variables = useStore((s) => s.variables);
  const addVariable = useStore((s) => s.addVariable);
  const updateVariable = useStore((s) => s.updateVariable);
  const removeVariable = useStore((s) => s.removeVariable);
  const valuesByRecipe = useStore((s) => s.valuesByRecipe);
  const composeText = useStore((s) => s.composeText);

  const [domain, setDomain] = useState<VarDomain>('ri');
  const [name, setName] = useState('');
  const [type, setType] = useState<SailType>('Text');
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  const add = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (!/^[A-Za-z_]\w*$/.test(trimmedName)) {
      setError('Name must be a valid identifier — letters, digits, and underscores, not starting with a digit.');
      return;
    }
    if (variables.some((v) => v.domain === domain && v.name === trimmedName)) {
      setError(`${domain}!${trimmedName} is already declared.`);
      return;
    }
    addVariable({ domain, name: trimmedName, type });
    setName('');
    setError(null);
  };

  /** Every `ri!`/`local!` reference that actually appears in a stored form value
   * or the Compose text, extracted with the same token-boundary regex the
   * Compose analyzer uses (compose.ts VAR_REF). Boundary-anchored so `ri!case`
   * is not reported "in use" merely because `ri!caseId` is referenced. */
  const referenced = useMemo(() => {
    const VAR_REF = /(?<![\w!])(ri|local)!([A-Za-z_]\w*)/g;
    const haystack = `${JSON.stringify(valuesByRecipe)}\n${composeText}`;
    const refs = new Set<string>();
    for (const m of haystack.matchAll(VAR_REF)) refs.add(`${m[1]}!${m[2]}`);
    return refs;
  }, [valuesByRecipe, composeText]);

  /** Best-effort "still referenced somewhere" check — flags a removal the user
   * may regret, without blocking it. */
  const inUse = (v: { domain: VarDomain; name: string }): boolean =>
    referenced.has(`${v.domain}!${v.name}`);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">Variables</h2>
        <p className="text-sm text-muted-foreground">
          Declare <code>ri!</code> (rule inputs) and <code>local!</code> variables. They feed the
          Guided-mode field suggestions, Compose autocomplete, and resolve the validator&apos;s
          unresolved-reference check. You can also create them inline from any reference or
          expression field — inline-created variables start as Text; adjust the type here.
        </p>
      </div>

      <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[110px_1fr_150px_auto]">
        <Field label="Domain">
          <Select
            value={domain}
            title="ri! = rule input passed into the interface; local! = variable local to the expression"
            onChange={(e) => setDomain(e.target.value as VarDomain)}
          >
            {DECLARABLE_DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}!
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Name">
          <TextInput
            value={name}
            placeholder="caseId"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => {
              setName(e.target.value);
              // A stale error must not linger while the user fixes the name.
              setError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
        </Field>
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value as SailType)}>
            {SAIL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="button" onClick={add} disabled={!name.trim()}>
          Add
        </Button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      {variables.length === 0 ? (
        <p className="text-sm text-muted-foreground">No variables declared yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Declared ({variables.length})
          </span>
          <ul className="flex flex-col gap-1">
            {variables.map((v, i) => (
              <li
                key={`${v.domain}!${v.name}-${i}`}
                className="flex items-center justify-between gap-2 border border-border px-3 py-1.5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="font-mono text-sm">
                    {v.domain}!{v.name}
                  </span>
                  {inUse(v) && (
                    <span
                      className="shrink-0 border border-border px-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"
                      title="Referenced by a form value or the Compose editor — removing it will leave unresolved references"
                    >
                      in use
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Select
                    className="w-auto py-0.5 text-xs"
                    value={v.type ?? 'Text'}
                    aria-label={`Type of ${v.domain}!${v.name}`}
                    title="Change this variable's type in place — no need to remove and re-add"
                    onChange={(e) => updateVariable(i, { type: e.target.value as SailType })}
                  >
                    {SAIL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                  <Button type="button" variant="ghost" onClick={() => removeVariable(i)}>
                    Remove
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
