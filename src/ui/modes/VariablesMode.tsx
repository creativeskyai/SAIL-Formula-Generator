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

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addVariable({ domain, name: trimmed, type });
    setName('');
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">Variables</h2>
        <p className="text-sm text-muted-foreground">
          Declare <code>ri!</code> (rule inputs) and <code>local!</code> variables. They feed the
          Guided-mode reference suggestions and resolve the validator&apos;s unresolved-reference
          check.
        </p>
      </div>

      <div className="grid grid-cols-[110px_1fr_150px_auto] items-end gap-2">
        <Field label="Domain">
          <Select value={domain} onChange={(e) => setDomain(e.target.value as VarDomain)}>
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

      {variables.length === 0 ? (
        <p className="text-sm text-muted-foreground">No variables declared yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {variables.map((v, i) => (
            <li
              key={`${v.domain}!${v.name}`}
              className="flex items-center justify-between rounded-md border border-border px-3 py-1.5"
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
      )}
    </div>
  );
}
