/** Copy text to the clipboard, reporting success honestly. Tries the async
 * Clipboard API first, then falls back to a hidden-textarea execCommand copy
 * (non-secure contexts, older browsers). Never throws — callers surface a
 * visible "copy failed" state instead of failing silently. */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied / non-secure context — try the legacy path below.
    }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    // Off-screen but focusable; position:fixed avoids scrolling to it.
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    const active = document.activeElement as HTMLElement | null;
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    active?.focus?.();
    return ok;
  } catch {
    return false;
  }
}

export type CopyStatus = 'idle' | 'copied' | 'failed';
