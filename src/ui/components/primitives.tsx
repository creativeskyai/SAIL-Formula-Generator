/** Minimal Tailwind-styled form primitives (shadcn-like API, hand-rolled to
 * avoid a CLI dependency). Polished further in Phase 6. */

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
    solid: 'bg-primary text-primary-foreground hover:opacity-90',
    outline: 'border border-border hover:bg-muted',
    ghost: 'hover:bg-muted',
  }[variant];
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50',
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-info/40',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 font-mono text-sm outline-none focus:ring-2 focus:ring-info/40',
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
        'w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-info/40',
        className,
      )}
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
      {help && <span className="text-[11px] text-muted-foreground/80">{help}</span>}
    </Wrapper>
  );
}
