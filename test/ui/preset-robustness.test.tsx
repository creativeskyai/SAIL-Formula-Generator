import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '@/ui/App';
import { useStore } from '@/ui/store';
import { ErrorBoundary } from '@/ui/components/ErrorBoundary';

function resetStore(overrides: Partial<ReturnType<typeof useStore.getState>> = {}) {
  useStore.setState({
    mode: 'guided',
    selectedRecipeId: null,
    valuesByRecipe: {},
    variables: [],
    expanded: true,
    composeText: '',
    theme: 'light',
    ...overrides,
  });
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  resetStore();
});

describe('preset robustness (review findings 1 & 2)', () => {
  it('a shape-mismatched preset does not crash the app; the mismatch shows as a build issue', () => {
    // filters is a list slot, but this preset carries a string — the pre-fix crash vector.
    resetStore({
      selectedRecipeId: 'query-record-type',
      valuesByRecipe: {
        'query-record-type': { recordType: 'recordType!Case', filters: 'oops' },
      },
    });
    // Must render without throwing.
    render(<App />);
    expect(screen.getByText('SAIL Formula Generator')).toBeInTheDocument();
    // The generate-time zod check surfaces the mismatch instead of white-screening.
    expect(screen.getByText(/Fill required fields/i)).toBeInTheDocument();
    expect(screen.getByText(/Expected array/i)).toBeInTheDocument();
  });

  it('a preset referencing an unknown recipe reports it and does not switch selection', () => {
    localStorage.setItem(
      'sailgen.presets',
      JSON.stringify({
        stale: { schemaVersion: 1, recipeId: 'removed-recipe', slotValues: {}, variables: [] },
      }),
    );
    resetStore({
      selectedRecipeId: 'if-else',
      valuesByRecipe: {
        'if-else': { condition: 'true', valueIfTrue: '1', valueIfFalse: '2' },
      },
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText('Load preset'), { target: { value: 'stale' } });
    expect(screen.getByText(/unavailable recipe/i)).toBeInTheDocument();
    expect(useStore.getState().selectedRecipeId).toBe('if-else');
  });
});

describe('ErrorBoundary', () => {
  it('shows a recoverable message instead of unmounting on a render error', () => {
    function Boom(): never {
      throw new Error('boom');
    }
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });
});
