import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { sail } from '../sail-language';
import { useStore } from '../store';
import { Button } from './primitives';

// Stable identities so CodeMirror doesn't reconfigure on every keystroke.
const EXTENSIONS = [sail(), EditorView.lineWrapping];
const BASIC_SETUP = {
  lineNumbers: true,
  foldGutter: false,
  highlightActiveLine: false,
  highlightActiveLineGutter: false,
} as const;

export function Preview({
  code,
  expanded,
  onToggleExpanded,
  canCopy,
}: {
  code: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  canCopy: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const theme = useStore((s) => s.theme);

  const copy = async () => {
    if (!code || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard write denied (permissions / non-secure context) — no-op */
    }
  };

  const hasRecordRef = code.includes('recordType!');

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">SAIL Output</span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onToggleExpanded}
            title={
              expanded
                ? 'Switch to compact single-line formatting'
                : 'Switch to expanded multi-line formatting'
            }
          >
            {expanded ? 'Compact' : 'Expanded'}
          </Button>
          <Button
            type="button"
            onClick={copy}
            disabled={!canCopy || !code}
            title={canCopy ? 'Copy SAIL to clipboard (Ctrl+Enter)' : 'Resolve errors before copying'}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        {/* Separate live region (not the button's accessible name) so the 1.5s
         * revert to idle announces nothing — only the copy action itself does. */}
        <span className="sr-only" role="status" aria-live="polite">
          {copied ? 'Copied to clipboard' : ''}
        </span>
      </div>
      <div className="overflow-hidden border border-border text-sm">
        <CodeMirror
          value={code}
          editable={false}
          readOnly
          theme={theme}
          extensions={EXTENSIONS}
          basicSetup={BASIC_SETUP}
        />
      </div>
      {hasRecordRef && (
        <p className="text-[11px] text-muted-foreground/80">
          Record references are UUID-qualified when copied from a real Appian environment —
          you may need to re-link them in Appian&apos;s editor after pasting.
        </p>
      )}
    </div>
  );
}
