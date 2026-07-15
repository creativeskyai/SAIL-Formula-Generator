import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '@/ui/App';
import { useStore } from '@/ui/store';
import { computePreview } from '@/ui/lib/preview';
import { EXPANDED } from '@/core/serialize';

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

describe('Compose mode', () => {
  it('inserting a catalog function appends its skeleton to the pane', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Compose' }));
    fireEvent.change(screen.getByPlaceholderText('Search functions…'), {
      target: { value: 'pagingInfo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'a!pagingInfo' }));
    expect(useStore.getState().composeText).toContain('a!pagingInfo(');
    expect(useStore.getState().composeText).toContain('startIndex:');
  });

  it('Copy and Clear are disabled when empty, enabled with text, and Clear empties the pane', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Compose' }));

    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Search functions…'), {
      target: { value: 'pagingInfo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'a!pagingInfo' }));

    expect(screen.getByRole('button', { name: 'Copy' })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(useStore.getState().composeText).toBe('');
  });
});

describe('Variables manager', () => {
  it('adds and removes a declared variable', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Variables' }));
    fireEvent.change(screen.getByPlaceholderText('caseId'), { target: { value: 'caseId' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(useStore.getState().variables).toEqual([
      { domain: 'ri', name: 'caseId', type: 'Text' },
    ]);
    expect(screen.getByText('ri!caseId', { exact: false })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(useStore.getState().variables).toHaveLength(0);
  });

  it('rejects a non-identifier variable name and does not add it', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Variables' }));
    fireEvent.change(screen.getByPlaceholderText('caseId'), { target: { value: '1id' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText(/valid identifier/i)).toBeInTheDocument();
    expect(useStore.getState().variables).toHaveLength(0);
  });

  it('a declared variable resolves in the validator (no unresolved error)', () => {
    useStore.getState().addVariable({ domain: 'ri', name: 'name', type: 'Text' });
    const variables = useStore.getState().variables;
    // text-field value 'ri!name' -> VariableRef; with ri!name declared it resolves.
    const result = computePreview('text-field', { label: 'X', value: 'ri!name' }, variables, EXPANDED);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(result.sail).toContain('value: ri!name');
  });
});
