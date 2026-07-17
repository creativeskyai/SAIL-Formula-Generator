import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '@/ui/App';
import { markTourSeen } from '@/ui/components/WelcomeTour';
import { useStore } from '@/ui/store';
import { computePreview } from '@/ui/lib/preview';
import { EXPANDED } from '@/core/serialize';

beforeEach(() => {
  cleanup();
  markTourSeen(); // these tests model a returning user - the tour stays closed
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

  it('declares an unresolved variable in one click and clears the warning', () => {
    // Parity with Guided's diagnostic fix: Compose surfaces a Declare button for
    // each unresolved ri!/local! reference, no trip to the Variables tab.
    useStore.setState({ mode: 'compose', composeText: 'ri!missing + 1' });
    render(<App />);

    const declare = screen.getByRole('button', { name: /Declare ri!missing/i });
    fireEvent.click(declare);

    expect(useStore.getState().variables).toContainEqual({
      domain: 'ri',
      name: 'missing',
      type: 'Text',
    });
    expect(screen.queryByRole('button', { name: /Declare ri!missing/i })).not.toBeInTheDocument();
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
    // ignore the Remove button's tooltip span, which repeats the variable name
    expect(
      screen.getByText('ri!caseId', { exact: false, ignore: '.tip, script, style' }),
    ).toBeInTheDocument();

    // Each row's remove button is named after its variable (WCAG 4.1.2).
    fireEvent.click(screen.getByRole('button', { name: 'Remove ri!caseId' }));
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

  it('edits a declared variable type in place without re-adding it', () => {
    useStore.getState().addVariable({ domain: 'ri', name: 'caseId', type: 'Text' });
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Variables' }));

    const typeSelect = screen.getByRole('combobox', { name: /Type of ri!caseId/i });
    fireEvent.change(typeSelect, { target: { value: 'Integer' } });

    expect(useStore.getState().variables).toEqual([
      { domain: 'ri', name: 'caseId', type: 'Integer' },
    ]);
  });

  it('marks a variable "in use" when a stored form value references it', () => {
    useStore.setState({
      variables: [{ domain: 'ri', name: 'caseId', type: 'Text' }],
      valuesByRecipe: { 'text-field': { label: 'X', value: 'ri!caseId' } },
    });
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Variables' }));
    expect(screen.getByText('in use')).toBeInTheDocument();
  });

  it('does not flag a variable "in use" when only a longer-named one is referenced', () => {
    // ri!case must not match inside ri!caseId — token-boundary check, not substring.
    useStore.setState({
      variables: [
        { domain: 'ri', name: 'case', type: 'Text' },
        { domain: 'ri', name: 'caseId', type: 'Text' },
      ],
      valuesByRecipe: { 'text-field': { label: 'X', value: 'ri!caseId' } },
    });
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Variables' }));
    // Only ri!caseId is referenced -> exactly one badge, not two.
    expect(screen.getAllByText('in use')).toHaveLength(1);
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
