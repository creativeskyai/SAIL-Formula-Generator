import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '@/ui/App';
import { useStore } from '@/ui/store';
import { generate } from '@/templates';
import { serialize, EXPANDED } from '@/core/serialize';

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

describe('Guided mode acceptance flow', () => {
  it('pick Query a Record Type, fill slots, add a filter, get valid copyable SAIL', () => {
    render(<App />);

    // Pick the scenario.
    fireEvent.click(screen.getByRole('button', { name: 'Query a Record Type' }));
    expect(screen.getByText('Retrieve records with optional filters, sort, and paging.')).toBeInTheDocument();

    // Required Record Type is empty -> a build issue is shown, copy is blocked.
    expect(screen.getByText(/Fill required fields/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();

    // Fill the record type.
    fireEvent.change(screen.getByPlaceholderText('recordType!Case'), {
      target: { value: 'recordType!Case' },
    });

    // Add a filter (nested recipe) and fill it.
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.change(screen.getByPlaceholderText('recordType!Case.fields.status'), {
      target: { value: 'recordType!Case.fields.status' },
    });
    fireEvent.change(screen.getByPlaceholderText('"Open"'), {
      target: { value: '"Open"' },
    });

    // The store now holds values that generate valid, well-formed SAIL.
    const values = useStore.getState().valuesByRecipe['query-record-type'];
    const sail = serialize(generate('query-record-type', values, []), EXPANDED);
    expect(sail).toContain('a!queryRecordType(');
    expect(sail).toContain('a!queryFilter(');
    expect(sail).toContain('recordType!Case.fields.status');
    expect(sail).toContain('operator: "="'); // enum default applied
    expect(sail).toContain('value: "Open"');

    // No errors remain -> copy is enabled.
    expect(screen.getByRole('button', { name: 'Copy' })).not.toBeDisabled();
    expect(screen.queryByText(/Fill required fields/i)).not.toBeInTheDocument();
  });

  it('empty optional slots vanish from the output', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Text Field' }));
    // Only the label is filled; value / saveInto / placeholder stay empty.
    fireEvent.change(screen.getByRole('textbox', { name: /Label/i }), {
      target: { value: 'Name' },
    });

    const values = useStore.getState().valuesByRecipe['text-field'];
    const sail = serialize(generate('text-field', values, []), EXPANDED);
    expect(sail).toBe('a!textField(label: "Name")');
  });

  it('mode tabs switch panels', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Compose' }));
    expect(screen.getByPlaceholderText('Search functions…')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Variables' }));
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
});
