import * as React from 'react';
import { cn } from '@/lib/utils';

const base =
  'w-full rounded-md bg-[var(--at-surface-2)] px-3 text-[13px] text-[var(--at-text)] ring-1 ring-[var(--at-border)] placeholder:text-[var(--at-text-dim)] focus:ring-2 focus:ring-[var(--at-accent)] focus:outline-none disabled:opacity-50';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(base, 'h-9', className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(base, 'py-2 leading-relaxed', className)} {...props} />;
});
