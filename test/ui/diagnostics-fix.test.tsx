import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '@/ui/App';
import { useStore } from '@/ui/store';

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

describe('Diagnostic one-click fix (declare unresolved variable)', () => {
  it('offers a Declare button for an unresolved reference and applies it', () => {
    // Required label filled (so this is a diagnostic, not a build issue) and an
    // undeclared ri! reference in the value slot.
    useStore.setState({
      selectedRecipeId: 'text-field',
      valuesByRecipe: { 'text-field': { label: 'Name', value: 'ri!missing' } },
    });
    render(<App />);

    const declare = screen.getByRole('button', { name: /Declare ri!missing/i });
    fireEvent.click(declare);

    expect(useStore.getState().variables).toContainEqual({
      domain: 'ri',
      name: 'missing',
      type: 'Text',
    });
    // Declaring it resolves the reference: the fix (and the error) disappear.
    expect(screen.queryByRole('button', { name: /Declare ri!missing/i })).not.toBeInTheDocument();
  });
});
