import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Last-resort guard: a render error shows a recoverable message instead of
 * unmounting the app to a blank screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('SAIL Formula Generator crashed while rendering:', error, info);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm font-semibold text-destructive">Something went wrong.</p>
          <p className="max-w-md text-xs text-muted-foreground">
            The current input caused a rendering error. This usually means a loaded or imported
            preset doesn&apos;t match its recipe. Try a different scenario or clear the input.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Dismiss
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
