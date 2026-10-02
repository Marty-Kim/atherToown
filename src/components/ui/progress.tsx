import { cn } from '@/lib/utils';

export function Progress({
  value,
  className,
  label,
}: {
  value: number;
  className?: string;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-[var(--at-surface-3)]', className)}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#3d5bd9] to-[#7c6cf5] transition-[width] duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
