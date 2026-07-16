/**
 * UI regression tests for the v1.0.0 pre-release QA findings: the record-type
 * bar must keep prefilling after unrelated form edits, and the preset picker
 * must only claim a preset while the form actually shows it.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '@/ui/App';
import { markTourSeen } from '@/ui/components/WelcomeTour';
import { useStore } from '@/ui/store';

beforeEach(() => {
  cleanup();
  localStorage.clear();
  markTourSeen(); // these tests model a returning user - the tour stays closed
  useStore.setState({
    mode: 'guided',
    selectedRecipeId: null,
    valuesByRecipe: {},
    variables: [],
    expanded: true,
    composeText: '',
    recordTypeRef: '',
  });
});

describe('Record-type bar keeps prefilling after other fields are edited', () => {
  it('an untouched record-type slot follows the bar even after editing Batch Size', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Query a Record Type' }));

    const bar = screen.getByRole('textbox', { name: 'Record type reference' });
    fireEvent.change(bar, { target: { value: 'recordType!{00000000-0000-0000-0000-000000000000}Old' } });

    const slot = screen.getByRole('textbox', { name: /Record Type\s*\*/i });
    expect(slot).toHaveValue('recordType!{00000000-0000-0000-0000-000000000000}Old');

    // Edit an unrelated field — this used to freeze the prefill forever.
    fireEvent.change(screen.getByRole('spinbutton', { name: /Batch Size/i }), {
      target: { value: '50' },
    });

    fireEvent.change(bar, { target: { value: 'recordType!{11111111-1111-1111-1111-111111111111}New' } });
    expect(slot).toHaveValue('recordType!{11111111-1111-1111-1111-111111111111}New');
    // And the edited field kept its edit.
    expect(screen.getByRole('spinbutton', { name: /Batch Size/i })).toHaveValue(50);
  });
});

describe('Preset picker only claims a preset while the form shows it', () => {
  it('resets on scenario switch, labels cross-scenario presets, and survives a cross-scenario load', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Text Field' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Label\s*\*/i }), {
      target: { value: 'Name' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Preset name' }), {
      target: { value: 'p1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const select = () => screen.getByRole('combobox', { name: 'Load preset' }) as HTMLSelectElement;
    fireEvent.change(select(), { target: { value: 'p1' } });
    expect(select().value).toBe('p1');
    expect(screen.getByRole('button', { name: 'Delete preset p1' })).toBeInTheDocument();

    // Navigating to another scenario: the form no longer shows p1, so the
    // picker must stop claiming it (and stop offering to delete it).
    fireEvent.click(screen.getByRole('button', { name: 'Query a Record Type' }));
    expect(select().value).toBe('');
    expect(screen.queryByRole('button', { name: 'Delete preset p1' })).not.toBeInTheDocument();

    // Cross-scenario presets say which scenario they belong to.
    expect(screen.getByRole('option', { name: 'p1 — Text Field' })).toBeInTheDocument();

    // Loading it from here switches the scenario — and the picker keeps the
    // selection, because the form now really does show p1.
    fireEvent.change(select(), { target: { value: 'p1' } });
    expect(screen.getByRole('textbox', { name: /Label\s*\*/i })).toHaveValue('Name');
    expect(select().value).toBe('p1');
  });
});
