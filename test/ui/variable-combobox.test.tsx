import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '@/ui/App';
import { useStore } from '@/ui/store';
import { comboItems } from '@/ui/components/VariableCombobox';
import type { DeclaredVariable } from '@/core/types';

beforeEach(() => {
  cleanup();
  useStore.setState({
    mode: 'guided',
    selectedRecipeId: null,
    valuesByRecipe: {},
    variables: [],
    expanded: true,
    composeText: '',
  });
});

const VARS: DeclaredVariable[] = [
  { domain: 'ri', name: 'caseId', type: 'Text' },
  { domain: 'local', name: 'total', type: 'Number' },
];

describe('comboItems (option ranking + creation rules)', () => {
  it('lists declared variables, filtered by substring', () => {
    const items = comboItems('total', VARS, undefined, true);
    expect(items.some((i) => i.kind === 'existing' && i.ref === 'local!total')).toBe(true);
    expect(items.some((i) => i.ref === 'ri!caseId')).toBe(false);
  });

  it('offers create rows for a fresh bare identifier in each declarable domain', () => {
    const items = comboItems('newVar', [], undefined, true);
    expect(items.filter((i) => i.kind === 'create').map((i) => i.ref)).toEqual([
      'ri!newVar',
      'local!newVar',
    ]);
  });

  it('honors an explicit domain prefix', () => {
    const items = comboItems('local!foo', [], undefined, true);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'create', domain: 'local', ref: 'local!foo' });
  });

  it('never offers to create the exact ref that already exists (but a different domain is fine)', () => {
    const items = comboItems('caseId', VARS, undefined, true);
    // ri!caseId exists -> it's a suggestion, not a create row.
    expect(items.some((i) => i.kind === 'create' && i.ref === 'ri!caseId')).toBe(false);
    expect(items.some((i) => i.kind === 'existing' && i.ref === 'ri!caseId')).toBe(true);
    // local!caseId is a distinct, undeclared variable -> still offered.
    expect(items.some((i) => i.kind === 'create' && i.ref === 'local!caseId')).toBe(true);
  });

  it('respects a domains filter for suggestions', () => {
    const items = comboItems('', VARS, ['local'], true);
    expect(items.map((i) => i.ref)).toEqual(['local!total']);
  });

  it('respects a domains filter for creation', () => {
    const creates = comboItems('foo', [], ['local'], true).filter((i) => i.kind === 'create');
    expect(creates.map((i) => i.kind === 'create' && i.domain)).toEqual(['local']);
  });

  it('suppresses create rows when creation is disabled', () => {
    const items = comboItems('newVar', [], undefined, false);
    expect(items.every((i) => i.kind === 'existing')).toBe(true);
  });

  it('offers no create row for a dotted accessor (still freely typeable)', () => {
    expect(comboItems('ri!case.status', [], undefined, true)).toHaveLength(0);
  });
});

describe('VariableCombobox in Guided mode', () => {
  it('creates a variable inline from a field and selects it', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Integer Field' }));

    const value = screen.getByRole('combobox', { name: 'Value' });
    fireEvent.change(value, { target: { value: 'amount' } });

    // The typed-but-undeclared name surfaces one-click create rows.
    fireEvent.click(screen.getByRole('option', { name: /Create ri!amount/i }));

    // It declares the variable AND fills the field — no trip to the Variables tab.
    expect(useStore.getState().variables).toContainEqual({
      domain: 'ri',
      name: 'amount',
      type: 'Text',
    });
    expect(useStore.getState().valuesByRecipe['integer-field'].value).toBe('ri!amount');
    // A newly created ri! variable resolves — no unresolved-reference error.
    expect(screen.queryByText(/unresolved/i)).not.toBeInTheDocument();
  });

  it('picks an existing declared variable from the dropdown', () => {
    useStore.getState().addVariable({ domain: 'ri', name: 'count', type: 'Integer' });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Integer Field' }));

    const value = screen.getByRole('combobox', { name: 'Value' });
    fireEvent.click(value); // open with an empty query -> shows all suggestions
    fireEvent.click(screen.getByRole('option', { name: /ri!count/i }));

    expect(useStore.getState().valuesByRecipe['integer-field'].value).toBe('ri!count');
  });

  it('leaves untouched variable fields empty (optional slots still prune)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Text Field' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Label/i }), {
      target: { value: 'Name' },
    });
    // value / saveInto comboboxes were never touched -> not stored.
    const stored = useStore.getState().valuesByRecipe['text-field'] ?? {};
    expect(stored.value).toBeUndefined();
    expect(stored.saveInto).toBeUndefined();
  });

  it('does not crash when a slot holds a non-string value (stale preset)', () => {
    // A type-mismatched value (e.g. imported preset) must render gracefully, not
    // throw during render and take out the whole mode.
    useStore.setState({
      selectedRecipeId: 'integer-field',
      valuesByRecipe: { 'integer-field': { label: 'Count', value: 42 } },
    });
    render(<App />);
    expect(screen.getByRole('combobox', { name: 'Value' })).toHaveValue('');
  });

  it('dismisses the dropdown on Tab so it never orphans as a floating panel', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Integer Field' }));
    const value = screen.getByRole('combobox', { name: 'Value' });
    fireEvent.click(value);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(value, { key: 'Tab' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
