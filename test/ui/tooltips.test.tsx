/**
 * CSS tooltip primitive: native `title` (hover-only, invisible to keyboard and
 * touch users) is replaced by a .tip span inside each control, shown by CSS on
 * hover/focus-visible. These tests pin the wiring jsdom can see: description
 * plumbing, name integrity, Escape dismissal, and the no-native-titles sweep.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '@/ui/App';
import { markTourSeen } from '@/ui/components/WelcomeTour';
import { useStore } from '@/ui/store';

beforeEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove('tips-dismissed');
  markTourSeen(); // returning user — tour stays closed
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

describe('tooltip primitive replaces native title', () => {
  it('no native title attributes remain anywhere in the app', () => {
    const { container } = render(<App />);
    for (const mode of ['guided', 'compose', 'variables'] as const) {
      useStore.setState({ mode });
      expect(container.querySelectorAll('[title]')).toHaveLength(0);
    }
  });

  it('wires the tip as the accessible DESCRIPTION, not the name', () => {
    render(<App />);
    // Exact-name match proves the aria-hidden tip text did not leak into the
    // button's accessible name (button children are presentational in ARIA —
    // a visible child span WOULD join the name).
    const help = screen.getByRole('button', { name: 'Open the quick tour' });
    expect(help).toHaveAccessibleDescription('Quick tour — what each mode does');

    const tab = screen.getByRole('tab', { name: 'Guided' });
    expect(tab).toHaveAccessibleDescription(
      'Pick a scenario and fill a form — SAIL generates live',
    );
  });

  it('tip spans are aria-hidden with the CSS hook classes on their host', () => {
    render(<App />);
    const help = screen.getByRole('button', { name: 'Open the quick tour' });
    expect(help.className).toContain('has-tip');
    const tip = help.querySelector('.tip')!;
    expect(tip).toHaveAttribute('aria-hidden', 'true');
    expect(tip).toHaveTextContent('Quick tour — what each mode does');
  });

  it('TipWrap hosts (selects, badges) get the same describedby wiring', () => {
    useStore.setState({ mode: 'variables' });
    render(<App />);
    const domainSelect = screen.getByRole('combobox', { name: 'Domain' });
    expect(domainSelect).toHaveAccessibleDescription(/ri! = rule input passed into the interface/);
    // The wrapper (not the select) hosts the positioning context.
    expect(domainSelect.parentElement!.className).toContain('has-tip');
  });

  it('a disabled button keeps its explanatory tip (description still computes)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Text Field' }));
    // Required Label empty -> Copy disabled with the "resolve errors" tip.
    const copy = screen.getByRole('button', { name: 'Copy' });
    expect(copy).toBeDisabled();
    expect(copy).toHaveAccessibleDescription('Resolve errors before copying');
  });
});

describe('WCAG 1.4.13 dismissal', () => {
  it('Escape suppresses tooltips globally; moving focus or hover restores', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.documentElement.classList.contains('tips-dismissed')).toBe(true);

    // Focus moving on re-enables tooltips.
    fireEvent.focusIn(screen.getByRole('button', { name: 'Open the quick tour' }));
    expect(document.documentElement.classList.contains('tips-dismissed')).toBe(false);

    // Same for pointer movement.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.documentElement.classList.contains('tips-dismissed')).toBe(true);
    fireEvent.mouseOver(document.body);
    expect(document.documentElement.classList.contains('tips-dismissed')).toBe(false);
  });
});
