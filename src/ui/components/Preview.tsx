import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { sail } from '../sail-language';
import { useStore } from '../store';
import type { CopyStatus } from '../lib/clipboard';
import { Button } from './primitives';

// Stable identities so CodeMirror doesn't reconfigure on every keystroke.
// contentAttributes names the editor's textbox for assistive tech — CodeMirror
// supplies role="textbox" but no accessible name of its own.
const EXTENSIONS = [
  sail(),
  EditorView.lineWrapping,
  EditorView.contentAttributes.of({ 'aria-label': 'Generated SAIL output' }),
];
const BASIC_SETUP = {
  lineNumbers: true,
  foldGutter: false,
  highlightActiveLine: false,
  highlightActiveLineGutter: false,
} as const;

const COPY_LABEL: Record<CopyStatus, string> = {
  idle: 'Copy',
  copied: 'Copied',
  failed: 'Copy failed',
};

const COPY_ANNOUNCEMENT: Record<CopyStatus, string> = {
  idle: '',
  copied: 'Copied to clipboard',
  failed: 'Copy failed — select the output and copy manually',
};

export function Preview({
  code,
  expanded,
  onToggleExpanded,
  canCopy,
  copyStatus,
  onCopy,
}: {
  code: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  canCopy: boolean;
  /** Copy state + handler are owned by the parent so the Ctrl+Enter shortcut
   * and the button share one confirmation path. */
  copyStatus: CopyStatus;
  onCopy: () => void;
}) {
  const theme = useStore((s) => s.theme);

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
            onClick={onCopy}
            disabled={!canCopy || !code}
            className={copyStatus === 'failed' ? 'bg-destructive' : undefined}
            title={canCopy ? 'Copy SAIL to clipboard (Ctrl+Enter)' : 'Resolve errors before copying'}
          >
            {COPY_LABEL[copyStatus]}
          </Button>
        </div>
        {/* Separate live region (not the button's accessible name) so the
         * revert to idle announces nothing — only the copy outcome does. */}
        <span className="sr-only" role="status" aria-live="polite">
          {COPY_ANNOUNCEMENT[copyStatus]}
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
      {copyStatus === 'failed' && (
        <p className="text-[11px] text-destructive" role="alert">
          Copying to the clipboard failed — select the output above and copy it manually.
        </p>
      )}
      {hasRecordRef && (
        <p className="text-[11px] text-muted-foreground">
          Record references are UUID-qualified when copied from a real Appian environment —
          you may need to re-link them in Appian&apos;s editor after pasting.
        </p>
      )}
    </div>
  );
}
