import { useEffect } from 'react';
import { catalog } from '@/core/catalog';
import { cn } from '@/lib/utils';
import { useStore, type Mode } from './store';
import { GuidedMode } from './modes/GuidedMode';
import { ComposeMode } from './modes/ComposeMode';
import { VariablesMode } from './modes/VariablesMode';

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
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h1 className="text-base font-semibold">SAIL Formula Generator</h1>
          <p className="text-xs text-muted-foreground">
            Deterministic, offline Appian SAIL — no AI at runtime.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <nav className="flex gap-1 rounded-md border border-border p-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMode(t.id)}
                className={cn(
                  'rounded px-3 py-1 text-sm transition',
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
            className="rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 p-4">
        {mode === 'guided' && <GuidedMode />}
        {mode === 'compose' && <ComposeMode />}
        {mode === 'variables' && <VariablesMode />}
      </main>

      <footer className="border-t border-border px-6 py-2 text-[11px] text-muted-foreground">
        Catalog: {catalog.all().length} functions · Appian {catalog.appianVersion} · Syntactic
        validation only — verify record types &amp; fields in your app.
      </footer>
    </div>
  );
}
