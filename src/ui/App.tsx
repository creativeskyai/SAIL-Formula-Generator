import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { catalog } from '@/core/catalog';
import { cn } from '@/lib/utils';
import { useStore, type Mode } from './store';
import { GuidedMode } from './modes/GuidedMode';
import { ComposeMode } from './modes/ComposeMode';
import { VariablesMode } from './modes/VariablesMode';
import { ErrorBoundary } from './components/ErrorBoundary';

const TABS: { id: Mode; label: string }[] = [
  { id: 'guided', label: 'Guided' },
  { id: 'compose', label: 'Compose' },
  { id: 'variables', label: 'Variables' },
];

export default function App() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-y-2 border-b border-border px-6 py-3">
        <div>
          <h1 className="text-base font-semibold">SAIL Formula Generator</h1>
          <p className="text-xs text-muted-foreground">
            Deterministic, offline Appian SAIL — no AI at runtime.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <nav role="tablist" aria-label="Mode" className="flex gap-1 border border-border p-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={mode === t.id}
                onClick={() => setMode(t.id)}
                className={cn(
                  'px-3 py-1 text-sm',
                  mode === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-8 w-8 shrink-0 items-center justify-center border border-border hover:bg-muted"
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-4">
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
  );
}
