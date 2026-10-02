import * as React from 'react';
import { cn } from '@/lib/utils';
import { TONE_CLASS, type Tone } from '@/lib/labels';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** 색상만으로 의미를 전달하지 않도록 아이콘을 함께 받는다. */
  icon?: React.ReactNode;
}

export function Badge({ className, tone = 'neutral', icon, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium leading-4 ring-1 ring-inset',
        TONE_CLASS[tone],
        className,
      )}
      {...props}
    >
      {icon ? <span aria-hidden className="[&_svg]:size-3 flex">{icon}</span> : null}
      {children}
    </span>
  );
}
