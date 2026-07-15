import { useState } from 'react';
import { SAIL_TYPES } from '@/core/catalog';
import type { SailType, VarDomain } from '@/core/ast';
import { useStore } from '../store';
import { Button, Field, Select, TextInput } from '../components/primitives';

const DECLARABLE_DOMAINS: VarDomain[] = ['ri', 'local'];

export function VariablesMode() {
  const variables = useStore((s) => s.variables);
  const addVariable = useStore((s) => s.addVariable);
  const removeVariable = useStore((s) => s.removeVariable);

  const [domain, setDomain] = useState<VarDomain>('ri');
  const [name, setName] = useState('');
  const [type, setType] = useState<SailType>('Text');
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">Variables</h2>
        <p className="text-sm text-muted-foreground">
          Declare <code>ri!</code> (rule inputs) and <code>local!</code> variables. They feed the
          Guided-mode field suggestions and resolve the validator&apos;s unresolved-reference check.
          You can also create them inline from any variable field in Guided mode.
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
            onChange={(e) => setName(e.target.value)}
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
      {error && <p className="text-xs text-destructive">{error}</p>}

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
                className="flex items-center justify-between border border-border px-3 py-1.5"
              >
                <span className="font-mono text-sm">
                  {v.domain}!{v.name}
                  {v.type && <span className="text-muted-foreground"> : {v.type}</span>}
                </span>
                <Button type="button" variant="ghost" onClick={() => removeVariable(i)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
