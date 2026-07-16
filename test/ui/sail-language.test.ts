import { describe, it, expect } from 'vitest';
import { variableCompletions } from '@/ui/sail-language';
import type { DeclaredVariable } from '@/core/types';

const VARS: DeclaredVariable[] = [
  { domain: 'ri', name: 'caseId', type: 'Text' },
  { domain: 'local', name: 'total', type: 'Number' },
];

describe('variableCompletions (Compose editor autocomplete)', () => {
  it('lists every declared variable with its type as detail', () => {
    const opts = variableCompletions('', VARS, true);
    expect(opts.map((o) => o.label)).toEqual(['ri!caseId', 'local!total']);
    expect(opts.map((o) => o.detail)).toEqual(['Text', 'Number']);
  });

  it('offers a "Create" entry for a typed-but-undeclared ri!/local! reference', () => {
    const opts = variableCompletions('ri!newVar', [], true);
    const create = opts.find((o) => o.create);
    expect(create).toBeDefined();
    expect(create!.displayLabel).toBe('Create ri!newVar');
    expect(create!.create).toEqual({ domain: 'ri', name: 'newVar', type: 'Text' });
  });

  it('never offers to create a reference that is already declared', () => {
    const opts = variableCompletions('ri!caseId', VARS, true);
    expect(opts.some((o) => o.create)).toBe(false);
  });

  it('suppresses the create entry when the token is a prefix of an existing variable', () => {
    // Typing `ri!ca` toward a declared `ri!caseId` must complete to it, not
    // offer to create a junk `ri!ca` that CodeMirror would rank first.
    const opts = variableCompletions('ri!ca', [{ domain: 'ri', name: 'caseId', type: 'Text' }], true);
    expect(opts.some((o) => o.create)).toBe(false);
    expect(opts.map((o) => o.label)).toContain('ri!caseId');
  });

  it('offers no create entry for a non-declarable domain (pv!)', () => {
    expect(variableCompletions('pv!foo', [], true).some((o) => o.create)).toBe(false);
  });

  it('suppresses create entries when creation is disabled', () => {
    expect(variableCompletions('ri!newVar', [], false).some((o) => o.create)).toBe(false);
  });

  it('offers no create entry for a bare token (only explicit ri!/local!)', () => {
    // A bare identifier is likelier a function name; creation needs the domain.
    expect(variableCompletions('newVar', [], true).some((o) => o.create)).toBe(false);
  });
});
