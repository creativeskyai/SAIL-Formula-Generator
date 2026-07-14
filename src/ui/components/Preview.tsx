import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { sail } from '../sail-language';
import { Button } from './primitives';

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

  const copy = async () => {
    if (!code || !navigator.clipboard) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const hasRecordRef = code.includes('recordType!');

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">SAIL Output</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onToggleExpanded}>
            {expanded ? 'Compact' : 'Expanded'}
          </Button>
          <Button
            type="button"
            onClick={copy}
            disabled={!canCopy || !code}
            title={canCopy ? undefined : 'Resolve errors before copying'}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-md border border-border text-sm">
        <CodeMirror
          value={code}
          editable={false}
          readOnly
          extensions={[sail(), EditorView.lineWrapping]}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
          }}
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
