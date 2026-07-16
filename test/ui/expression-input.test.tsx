import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import App from '@/ui/App';
import { markTourSeen } from '@/ui/components/WelcomeTour';
import { useStore } from '@/ui/store';

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

/** Open the If / Else recipe, whose Condition / Value slots are `expression`. */
function openIfElse() {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'If / Else' }));
}

describe('ExpressionInput variable assist', () => {
  it('creates a variable inline from an expression field and inserts it at the caret', () => {
    openIfElse();
    const cond = screen.getByRole('combobox', { name: /Condition/ });

    // A `!`-qualified token opens the assist and offers a one-click create row.
    fireEvent.change(cond, { target: { value: 'ri!amt' } });
    fireEvent.click(screen.getByRole('option', { name: /Create ri!amt/i }));

    // It declares the variable AND fills the field — no trip to the Variables tab.
    expect(useStore.getState().variables).toContainEqual({
      domain: 'ri',
      name: 'amt',
      type: 'Text',
    });
    expect(useStore.getState().valuesByRecipe['if-else'].condition).toBe('ri!amt');
  });

  it('inserts a chosen variable at the caret without clobbering the rest of the expression', () => {
    useStore.getState().addVariable({ domain: 'ri', name: 'status', type: 'Text' });
    openIfElse();
    const cond = screen.getByRole('combobox', { name: /Condition/ });

    // Existing expression with the caret at the end (after the space).
    fireEvent.change(cond, { target: { value: '1 = ' } });

    // The braces button opens the menu for the (empty) token at the caret and
    // lists declared variables to insert.
    fireEvent.click(within(cond.closest('div')!).getByRole('button', { name: 'Insert variable' }));
    fireEvent.click(screen.getByRole('option', { name: /ri!status/i }));

    expect(useStore.getState().valuesByRecipe['if-else'].condition).toBe('1 = ri!status');
  });

  it('replaces the analyzed token, not a drifted caret span', () => {
    // Regression: choose() must cut the replacement from the token it analyzed,
    // not the live caret. If the caret drifts (arrow keys / a reposition click)
    // after the token is captured, using the caret would duplicate the token
    // (e.g. "x ri!" -> "x ri!totalri!").
    useStore.getState().addVariable({ domain: 'ri', name: 'total', type: 'Number' });
    openIfElse();
    const cond = screen.getByRole('combobox', { name: /Condition/ }) as HTMLInputElement;

    fireEvent.change(cond, { target: { value: 'x ri!' } }); // token = {start: 2, text: 'ri!'}
    cond.setSelectionRange(2, 2); // caret drifts back to the token start
    fireEvent.click(screen.getByRole('option', { name: /ri!total/i }));

    expect(useStore.getState().valuesByRecipe['if-else'].condition).toBe('x ri!total');
  });

  it('does not auto-open the menu for a bare identifier (likely a function name)', () => {
    openIfElse();
    const cond = screen.getByRole('combobox', { name: /Condition/ });
    fireEvent.change(cond, { target: { value: 'sum' } });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not auto-open an empty menu for a non-declarable ! token (a!/fn!/fv!)', () => {
    // Expression slots are dominated by a! functions; opening an empty "Create
    // ri!/local!" panel on every such token would be pure noise. Only ri!/local!
    // (which can match or be created) auto-open.
    openIfElse();
    const cond = screen.getByRole('combobox', { name: /Condition/ });
    for (const fn of ['a!forEach', 'fn!sum', 'fv!item']) {
      fireEvent.change(cond, { target: { value: fn } });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    }
  });

  it('opens on ArrowDown and dismisses on Escape', () => {
    useStore.getState().addVariable({ domain: 'ri', name: 'status', type: 'Text' });
    openIfElse();
    const cond = screen.getByRole('combobox', { name: /Condition/ });

    fireEvent.keyDown(cond, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(cond, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
