import * as React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--at-border)] px-6 py-10 text-center',
        className,
      )}
    >
      <div aria-hidden className="rounded-lg bg-[var(--at-surface-2)] p-2.5 text-[var(--at-text-dim)] [&_svg]:size-5">
        {icon}
      </div>
      <div>
        <p className="text-[13px] font-medium text-[var(--at-text)]">{title}</p>
        <p className="text-meta mt-1 max-w-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ label = '불러오는 중' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 px-6 py-10 text-[var(--at-text-muted)]">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span className="text-[13px]">{label}…</span>
    </div>
  );
}

export function ErrorState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/5 px-6 py-8 text-center"
    >
      <AlertTriangle className="size-5 text-rose-300" aria-hidden />
      <div>
        <p className="text-[13px] font-medium text-rose-100">{title}</p>
        <p className="text-meta mt-1 max-w-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-md bg-[var(--at-surface-2)]', className)}>
      <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent at-sweep" />
    </div>
  );
}
