/**
 * First-run tutorial overlay: auto-opens exactly once, steps forward and back,
 * every dismissal path persists, and the header Help button reopens it.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import App from '@/ui/App';
import { useStore } from '@/ui/store';

beforeEach(() => {
  cleanup();
  localStorage.clear(); // a genuinely first visit — no dismissal on record
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

const dialog = () => screen.getByRole('dialog', { name: /Welcome/ });

describe('first-run tour', () => {
  it('auto-opens on first visit, and the app behind it is inert', () => {
    render(<App />);
    expect(dialog()).toBeInTheDocument();
    // The app chrome must be unreachable while the dialog is up.
    expect(document.querySelector('[inert]')).not.toBeNull();
  });

  it('steps forward through all pages and back again', () => {
    render(<App />);
    const d = dialog();
    fireEvent.click(within(d).getByRole('button', { name: 'Next' }));
    expect(within(d).getByText('Guided mode: pick, fill, copy')).toBeInTheDocument();
    fireEvent.click(within(d).getByRole('button', { name: 'Next' }));
    fireEvent.click(within(d).getByRole('button', { name: 'Next' }));
    // Final step: no Next / Skip, only Back + Get started.
    expect(within(d).getByText('Your work stays put')).toBeInTheDocument();
    expect(within(d).queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    expect(within(d).queryByRole('button', { name: 'Skip tour' })).not.toBeInTheDocument();
    fireEvent.click(within(d).getByRole('button', { name: 'Back' }));
    expect(within(d).getByText('Compose and Variables')).toBeInTheDocument();
  });

  it('"Get started" closes, un-inerts the app, and the dismissal survives a remount', () => {
    render(<App />);
    const d = dialog();
    for (let i = 0; i < 3; i++) fireEvent.click(within(d).getByRole('button', { name: 'Next' }));
    fireEvent.click(within(d).getByRole('button', { name: 'Get started' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelector('[inert]')).toBeNull();

    // A later visit (fresh mount, same storage) must not show the tour again.
    cleanup();
    render(<App />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('"Skip tour" and Escape both dismiss and persist', () => {
    render(<App />);
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Skip tour' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    cleanup();
    localStorage.clear();
    render(<App />);
    fireEvent.keyDown(dialog(), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    cleanup();
    render(<App />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('the header Help button reopens the tour after dismissal', () => {
    render(<App />);
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Skip tour' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open the quick tour' }));
    expect(dialog()).toBeInTheDocument();
  });

  it('Escape closes the tour even when focus has dropped to <body>', () => {
    // Regression: Back from step 2 unmounts the focused Back button, dropping
    // focus to <body>; a panel-scoped Escape handler would then go dead.
    render(<App />);
    const d = dialog();
    fireEvent.click(within(d).getByRole('button', { name: 'Next' }));
    fireEvent.click(within(d).getByRole('button', { name: 'Back' }));
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a right-click on the backdrop does not dismiss (or permanently mark seen)', () => {
    render(<App />);
    const backdrop = dialog().parentElement!;
    fireEvent.mouseDown(backdrop, { button: 2 });
    expect(dialog()).toBeInTheDocument();
    fireEvent.mouseDown(backdrop, { button: 0 });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a dismissing backdrop press is default-prevented so focus restore survives', () => {
    // Regression (real-browser finding): without preventDefault, the native
    // mousedown focus change lands on <body> AFTER the unmount effect restores
    // focus to the opener, wiping the restoration.
    render(<App />);
    const backdrop = dialog().parentElement!;
    // fireEvent returns false when a handler called preventDefault.
    expect(fireEvent.mouseDown(backdrop, { button: 0 })).toBe(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Tab routes focus into the button ring when focus starts on the panel itself', () => {
    render(<App />);
    const d = dialog();
    expect(document.activeElement).toBe(d);
    fireEvent.keyDown(d, { key: 'Tab', shiftKey: true });
    // Shift+Tab from the panel must be captured and land on the LAST button,
    // never escape backwards out of the (inert-backed) dialog.
    expect(document.activeElement).toBe(within(d).getByRole('button', { name: 'Next' }));
  });
});
