import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '@/ui/App';
import { markTourSeen } from '@/ui/components/WelcomeTour';
import { useStore } from '@/ui/store';
import { Field, TextInput } from '@/ui/components/primitives';

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

describe('Record-type reference bar visibility (only where it applies)', () => {
  it('shows in the empty state and on the query scenario, hides on scenarios without the slot', () => {
    render(<App />);
    // Empty state: visible (supports paste-first-then-pick).
    expect(screen.getByText('Record type reference')).toBeInTheDocument();

    // Query a Record Type uses the slot -> still shown.
    fireEvent.click(screen.getByRole('button', { name: 'Query a Record Type' }));
    expect(screen.getByText('Record type reference')).toBeInTheDocument();

    // Text Field has no record-type slot -> hidden (pasting would do nothing).
    fireEvent.click(screen.getByRole('button', { name: 'Text Field' }));
    expect(screen.queryByText('Record type reference')).not.toBeInTheDocument();
  });
});

describe('List-row controls have distinct accessible names', () => {
  it('names each Choice Values expression row (WCAG 4.1.2)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Dropdown Field' }));

    // Each list's add button carries the list's name — a form with several
    // lists must not offer identical "+ Add" buttons.
    const addChoiceValue = screen.getByRole('button', {
      name: 'Add Choice Values (expressions) item',
    });
    expect(screen.getByRole('button', { name: 'Add Choice Labels item' })).toBeInTheDocument();
    fireEvent.click(addChoiceValue);
    fireEvent.click(addChoiceValue);

    expect(
      screen.getByRole('combobox', { name: /Choice Values.*item 1/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: /Choice Values.*item 2/i }),
    ).toBeInTheDocument();
  });
});

describe('Preset save surfaces an overwrite as a deliberate Replace', () => {
  it('relabels Save to Replace and warns when the name already exists', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Text Field' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Label/i }), {
      target: { value: 'Name' },
    });

    const nameInput = screen.getByPlaceholderText('Preset name');
    fireEvent.change(nameInput, { target: { value: 'mypreset' } });
    // Fresh name -> Save, no warning.
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Reuse the same name -> Replace + explicit warning.
    fireEvent.change(nameInput, { target: { value: 'mypreset' } });
    expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument();
    expect(screen.getByText(/already exists/i)).toBeInTheDocument();
  });
});

describe('Ctrl+Enter copy shares the button confirmation path', () => {
  it('copies and flips the Copy button to Copied', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Text Field' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Label/i }), {
      target: { value: 'Name' },
    });

    // The advertised shortcut, dispatched on the window listener via bubbling.
    fireEvent.keyDown(document.body, { key: 'Enter', ctrlKey: true });

    expect(writeText).toHaveBeenCalledWith('a!textField(label: "Name")');
    // Confirmation is the same one the button shows (async: writeText resolves).
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('works in Compose mode too — the tour advertises the shortcut for both', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    useStore.setState({ mode: 'compose', composeText: 'if(true, 1, 2)' });
    render(<App />);

    fireEvent.keyDown(document.body, { key: 'Enter', ctrlKey: true });

    expect(writeText).toHaveBeenCalledWith('if(true, 1, 2)');
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });
});

describe('Instructional text avoids low-contrast opacity (WCAG 1.4.3 regression guard)', () => {
  it('Field help text uses full-opacity muted-foreground', () => {
    render(
      <Field label="L" help="hint text">
        <input />
      </Field>,
    );
    const help = screen.getByText('hint text');
    expect(help.className).toContain('text-muted-foreground');
    expect(help.className).not.toMatch(/text-muted-foreground\/\d/);
  });

  it('input placeholders use full-opacity muted-foreground', () => {
    render(<TextInput placeholder="ri!name" />);
    const input = screen.getByPlaceholderText('ri!name');
    expect(input.className).not.toMatch(/placeholder:text-muted-foreground\/\d/);
  });
});
