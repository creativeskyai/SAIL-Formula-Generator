/** Minimal form primitives on the ink-on-paper language: squared corners,
 * hairline borders, flat surface fills, one global ink focus ring (index.css).
 */

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

export function Button({
  className,
  variant = 'solid',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'outline' | 'ghost' }) {
  const styles = {
    solid: 'bg-primary text-primary-foreground hover:bg-primary-hover',
    outline: 'border border-border-strong hover:bg-muted',
    ghost: 'hover:bg-muted',
  }[variant];
  return (
    <button
      className={cn(
        // No disabled:pointer-events-none — a disabled button must still show
        // its explanatory tooltip (e.g. Preview's "Resolve errors" title).
        // Transition transform only, never a token-valued color property —
        // otherwise a light/dark toggle mid-hover animates through a stale
        // color instead of switching instantly.
        'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-transform duration-[120ms] ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        styles,
        className,
      )}
      {...props}
    />
  );
}

/** Shared field-surface classes, so the TextInput primitive and the custom
 * VariableCombobox input stay pixel-identical. */
export const inputBase =
  'w-full border border-border-strong bg-surface px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground';

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full border border-border-strong bg-surface px-2.5 py-1.5 font-mono text-sm outline-none placeholder:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        // Solid surface fill + color-scheme (index.css) keep the option popup
        // legible in dark mode — never white-on-white again.
        'w-full cursor-pointer border border-border-strong bg-surface px-2.5 py-1.5 text-sm outline-none',
        className,
      )}
      {...props}
    />
  );
}

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn('h-4 w-4 cursor-pointer accent-[var(--primary)]', className)}
      {...props}
    />
  );
}

export function Field({
  label,
  help,
  required,
  asGroup,
  children,
}: {
  label: string;
  help?: string;
  required?: boolean;
  /** Render as a <div> group instead of a <label> — for slots whose control is
   * itself a set of labelled fields (list / nested recipe), avoiding invalid
   * nested <label> elements. */
  asGroup?: boolean;
  children: ReactNode;
}) {
  const Wrapper = asGroup ? 'div' : 'label';
  return (
    <Wrapper className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
      {help && <span className="text-[11px] text-muted-foreground">{help}</span>}
    </Wrapper>
  );
}
