'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-[#3d5bd9] text-white hover:bg-[#4a68e8] shadow-[0_1px_0_rgba(255,255,255,0.08)_inset]',
        secondary:
          'bg-[var(--at-surface-3)] text-[var(--at-text)] hover:bg-[#22304f] ring-1 ring-[var(--at-border)]',
        outline:
          'bg-transparent text-[var(--at-text)] ring-1 ring-[var(--at-border)] hover:bg-[var(--at-surface-2)]',
        ghost: 'bg-transparent text-[var(--at-text-muted)] hover:bg-[var(--at-surface-2)] hover:text-[var(--at-text)]',
        danger: 'bg-rose-600/90 text-white hover:bg-rose-600',
        success: 'bg-emerald-600/90 text-white hover:bg-emerald-600',
      },
      size: {
        sm: 'h-8 px-2.5 [&_svg]:size-3.5',
        md: 'h-9 px-3.5 [&_svg]:size-4',
        lg: 'h-10 px-4 text-sm [&_svg]:size-4',
        icon: 'size-9 [&_svg]:size-4',
        'icon-sm': 'size-8 [&_svg]:size-3.5',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});

export { buttonVariants };
