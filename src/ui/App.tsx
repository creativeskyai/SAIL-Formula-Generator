import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { CircleHelp, Moon, Sun } from 'lucide-react';
import { catalog } from '@/core/catalog';
import { Button } from './components/primitives';
import { useStore, type Mode } from './store';
import { GuidedMode } from './modes/GuidedMode';
import { ComposeMode } from './modes/ComposeMode';
import { VariablesMode } from './modes/VariablesMode';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WelcomeTour, isTourSeen, markTourSeen } from './components/WelcomeTour';

const TABS: { id: Mode; label: string; title: string }[] = [
  { id: 'guided', label: 'Guided', title: 'Pick a scenario and fill a form — SAIL generates live' },
  { id: 'compose', label: 'Compose', title: 'Free-form editor with a searchable function catalog' },
  { id: 'variables', label: 'Variables', title: 'Declare ri! and local! variables for suggestions and validation' },
];

export default function App() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const tablistRef = useRef<HTMLElement>(null);
  // First visit: open the tour automatically; afterwards it lives behind the
  // Help button. Closing it (any path) records the dismissal.
  const [tourOpen, setTourOpen] = useState(() => !isTourSeen());
  const closeTour = () => {
    markTourSeen();
    setTourOpen(false);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // ARIA tabs keyboard contract: roving tabindex, Left/Right/Home/End move
  // both focus and the active panel (selection follows focus).
  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const idx = TABS.findIndex((t) => t.id === mode);
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = (idx + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    const nextTab = TABS[next];
    setMode(nextTab.id);
    tablistRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  };

  return (
    <>
    {/* The app chrome goes inert while the tour dialog is up, so focus,
      * clicks, and assistive tech all stay inside the dialog. */}
    <div
      className="flex h-screen flex-col bg-background text-foreground"
      inert={tourOpen || undefined}
    >
      <header className="flex flex-wrap items-center justify-between gap-y-2 border-b border-border px-6 py-3">
        <div>
          <h1 className="text-base font-semibold">
            <span aria-hidden="true">⛵ </span>SAIL Formula Generator
          </h1>
          <p className="text-xs text-muted-foreground">
            Deterministic, offline Appian SAIL — no AI at runtime.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <nav
            ref={tablistRef}
            role="tablist"
            aria-label="Mode"
            className="flex gap-1 border border-border p-0.5"
          >
            {TABS.map((t) => (
              <Button
                key={t.id}
                type="button"
                variant={mode === t.id ? 'solid' : 'ghost'}
                id={`tab-${t.id}`}
                role="tab"
                aria-selected={mode === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={mode === t.id ? 0 : -1}
                title={t.title}
                onClick={() => setMode(t.id)}
                onKeyDown={onTabKeyDown}
                className="px-3 py-1 text-sm"
              >
                {t.label}
              </Button>
            ))}
          </nav>
          <Button
            type="button"
            variant="outline"
            onClick={() => setTourOpen(true)}
            className="h-8 w-8 border-border px-0"
            aria-label="Open the quick tour"
            title="Quick tour — what each mode does"
          >
            <CircleHelp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-8 w-8 border-border px-0"
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <main
        id={`panel-${mode}`}
        role="tabpanel"
        aria-labelledby={`tab-${mode}`}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto p-4"
      >
        <ErrorBoundary key={mode}>
          {mode === 'guided' && <GuidedMode />}
          {mode === 'compose' && <ComposeMode />}
          {mode === 'variables' && <VariablesMode />}
        </ErrorBoundary>
      </main>

      <footer className="border-t border-border px-6 py-2 text-[11px] text-muted-foreground">
        Catalog: {catalog.all().length} functions · Appian {catalog.appianVersion} · Syntactic
        validation only — verify record types &amp; fields in your app.
      </footer>
    </div>
    {tourOpen && <WelcomeTour onClose={closeTour} />}
    </>
  );
}
