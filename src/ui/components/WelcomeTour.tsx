/**
 * First-run tutorial overlay: a small stepped dialog that explains the three
 * modes and the workflow essentials, shown once (dismissal is remembered in
 * localStorage) and reopenable from the header's Help button.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from './primitives';

const TOUR_KEY = 'sailgen.tour.v1';

/** Whether the tour was already dismissed. When storage is unavailable OR
 * unwritable (quota, private mode) the dismissal could never persist, so
 * report "seen" rather than nag on every load — the Help button still opens
 * the tour on demand. The write probe is what markTourSeen() will write, so
 * it proves persistence is actually possible. */
export function isTourSeen(): boolean {
  try {
    if (localStorage.getItem(TOUR_KEY) === 'done') return true;
    localStorage.setItem(TOUR_KEY, 'probe');
    localStorage.removeItem(TOUR_KEY);
    return false;
  } catch {
    return true;
  }
}

export function markTourSeen(): void {
  try {
    localStorage.setItem(TOUR_KEY, 'done');
  } catch {
    /* storage unavailable — the tour will simply rely on the Help button */
  }
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="border border-border bg-muted px-1 font-mono text-[11px]">{children}</kbd>
  );
}

const STEPS: { title: string; body: ReactNode }[] = [
  {
    title: 'Welcome',
    body: (
      <>
        <p>
          Build valid Appian SAIL expressions without writing them by hand: pick a scenario, fill
          in a form, and copy the generated code.
        </p>
        <p>
          Everything runs in your browser — deterministic, offline, no AI. Nothing you type leaves
          this page.
        </p>
      </>
    ),
  },
  {
    title: 'Guided mode: pick, fill, copy',
    body: (
      <>
        <p>
          Choose a scenario from the left-hand list and fill in the form. The SAIL output updates
          live with every keystroke, and diagnostics under the output explain any problems — many
          with a one-click fix.
        </p>
        <p>
          Paste your record-type reference once into the bar at the top and every scenario that
          needs one is prefilled. No Appian environment handy? <em>Use sample</em> inserts a dummy
          reference so you can try things out.
        </p>
      </>
    ),
  },
  {
    title: 'Compose and Variables',
    body: (
      <>
        <p>
          <strong>Compose</strong> is a free-form SAIL editor: search the function catalog to
          insert ready-made skeletons at the cursor, with autocomplete as you type.
        </p>
        <p>
          <strong>Variables</strong> is where your <code>ri!</code> and <code>local!</code>{' '}
          declarations live — but you can also create them inline right where you reference them,
          and any unresolved reference offers a one-click <em>Declare</em> button.
        </p>
      </>
    ),
  },
  {
    title: 'Your work stays put',
    body: (
      <>
        <p>
          The selected scenario, form values, variables, and editor text are saved in this browser
          and restored when you come back. Save a form setup as a named preset, or export it as a
          JSON file to share.
        </p>
        <p>
          Copy the output with the button or <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd>. Reopen this tour
          anytime with the <strong>?</strong> button in the header.
        </p>
      </>
    ),
  },
];

export function WelcomeTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const last = step === STEPS.length - 1;

  // Captured at first render (not in the effect) so StrictMode's dev
  // double-mount can't overwrite it with the panel itself.
  const previousFocus = useRef<Element | null>(null);
  previousFocus.current ??= document.activeElement;

  // Move focus into the dialog on open and hand it back on close — the app
  // behind is `inert` while the tour is up, so focus must live here.
  useEffect(() => {
    panelRef.current?.focus();
    return () => {
      const prev = previousFocus.current;
      if (prev instanceof HTMLElement && prev.isConnected) prev.focus();
    };
  }, []);

  // Escape listens on the document, not the panel — if focus ever lands
  // outside the dialog (e.g. on <body>), Escape must still close it.
  useEffect(() => {
    const onEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    // Keep Tab cycling inside the dialog (the inert background can't take
    // focus, but the browser chrome could).
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables?.length) return;
    const first = focusables[0];
    const lastEl = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (!Array.from(focusables).includes(active as HTMLElement)) {
      // Focus is on the panel itself (its initial home) or dropped elsewhere —
      // route Tab into the button ring instead of letting it escape.
      e.preventDefault();
      (e.shiftKey ? lastEl : first).focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && active === lastEl) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      // Dismiss on a LEFT press that STARTS on the backdrop — a click that
      // starts inside the panel (e.g. selecting text) and releases out here
      // fires the click event on this common ancestor and must not close the
      // tour, and a right-click (context menu) must not dismiss either.
      onMouseDown={(e) => {
        if (e.button === 0 && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="flex w-full max-w-md flex-col gap-3 border border-border bg-background p-5 text-foreground outline-none"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold">
            {step === 0 && <span aria-hidden="true">⛵ </span>}
            {STEPS[step].title}
          </h2>
          <span className="shrink-0 text-xs text-muted-foreground">
            {step + 1} / {STEPS.length}
          </span>
        </div>
        {/* Announce step changes — the dialog's label doesn't re-announce when
          * its text changes, but a status region's content does. */}
        <span className="sr-only" role="status">
          Step {step + 1} of {STEPS.length}: {STEPS[step].title}
        </span>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">{STEPS[step].body}</div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div>
            {!last && (
              <Button type="button" variant="ghost" onClick={onClose}>
                Skip tour
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // Going back to step 1 unmounts this button — park focus on
                  // the panel first so it can't drop to <body>.
                  if (step === 1) panelRef.current?.focus();
                  setStep(step - 1);
                }}
              >
                Back
              </Button>
            )}
            {/* One persistent element for Next/Get started — swapping two
              * buttons would drop keyboard focus to <body> on the last step. */}
            <Button type="button" onClick={last ? onClose : () => setStep(step + 1)}>
              {last ? 'Get started' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
