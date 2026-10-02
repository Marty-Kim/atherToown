import { Check, CircleDashed, Loader2, OctagonAlert, Timer } from 'lucide-react';
import type { Feature } from '@/types/domain';
import { stageGroups, type StageGroupView } from '@/store/selectors';
import { STAGE_GROUP_LABEL } from '@/lib/labels';
import { cn } from '@/lib/utils';

const STYLE: Record<StageGroupView['status'], string> = {
  PENDING: 'bg-[var(--at-surface-2)] text-[var(--at-text-dim)] ring-[var(--at-border)]',
  IN_PROGRESS: 'bg-violet-500/14 text-violet-200 ring-violet-400/35',
  WAITING: 'bg-amber-500/14 text-amber-200 ring-amber-400/40',
  BLOCKED: 'bg-rose-500/14 text-rose-200 ring-rose-400/40',
  COMPLETED: 'bg-emerald-500/14 text-emerald-200 ring-emerald-400/35',
};

const ICON: Record<StageGroupView['status'], React.ComponentType<{ className?: string }>> = {
  PENDING: CircleDashed,
  IN_PROGRESS: Loader2,
  WAITING: Timer,
  BLOCKED: OctagonAlert,
  COMPLETED: Check,
};

/** 단계 표시는 색상 외에 아이콘과 텍스트로도 상태를 전달한다. */
export function StageChips({ feature, compact = false }: { feature: Feature; compact?: boolean }) {
  const groups = stageGroups(feature);
  return (
    <ol className="flex flex-wrap items-center gap-1">
      {groups.map((g, index) => {
        const Icon = ICON[g.status];
        return (
          <li key={g.group} className="flex items-center gap-1">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                STYLE[g.status],
              )}
            >
              <Icon className={cn('size-3', g.status === 'IN_PROGRESS' && 'animate-spin')} aria-hidden />
              {compact ? STAGE_GROUP_LABEL[g.group].slice(0, 4) : STAGE_GROUP_LABEL[g.group]}
              <span className="sr-only">— {g.status}</span>
            </span>
            {index < groups.length - 1 && (
              <span aria-hidden className="text-[var(--at-text-dim)]">
                ›
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
