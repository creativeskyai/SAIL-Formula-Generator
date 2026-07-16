import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '@/ui/App';
import { markTourSeen } from '@/ui/components/WelcomeTour';
import { useStore, SAMPLE_RECORD_TYPE_REF } from '@/ui/store';
import { initialValues } from '@/ui/components/SlotForm';
import { getRecipe } from '@/templates';

function resetStore() {
  useStore.setState({
    mode: 'guided',
    selectedRecipeId: null,
    valuesByRecipe: {},
    variables: [],
    expanded: true,
    composeText: '',
    theme: 'light',
    recordTypeRef: '',
  });
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  markTourSeen(); // these tests model a returning user - the tour stays closed
  resetStore();
});

describe('record-type reference', () => {
  it('initialValues seeds recordTypeRef slots only when a reference is set', () => {
    const slots = getRecipe('query-record-type')!.slots;
    expect(initialValues(slots)).not.toHaveProperty('recordType');
    expect(initialValues(slots, 'recordType!{u}Case').recordType).toBe('recordType!{u}Case');
  });

  it('the sample reference is a UUID-shaped placeholder', () => {
    expect(SAMPLE_RECORD_TYPE_REF).toMatch(/^recordType!\{[0-9a-f-]{36}\}\w+$/);
  });

  it('a pasted reference prefills the record-type slot of a newly picked recipe', () => {
    render(<App />);
    fireEvent.change(
      screen.getByPlaceholderText(/paste your environment's copied reference/i),
      { target: { value: 'recordType!{abc}Case' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Query a Record Type' }));
    const recordTypeInput = screen.getByPlaceholderText('recordType!Case') as HTMLInputElement;
    expect(recordTypeInput.value).toBe('recordType!{abc}Case');
  });

  it('"Use sample" fills the dummy reference', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Use sample' }));
    expect(useStore.getState().recordTypeRef).toBe(SAMPLE_RECORD_TYPE_REF);
    fireEvent.click(screen.getByRole('button', { name: 'Query a Record Type' }));
    const recordTypeInput = screen.getByPlaceholderText('recordType!Case') as HTMLInputElement;
    expect(recordTypeInput.value).toBe(SAMPLE_RECORD_TYPE_REF);
  });
});
