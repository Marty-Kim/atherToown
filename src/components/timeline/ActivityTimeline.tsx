'use client';

import * as React from 'react';
import { Activity, AlertTriangle, FileCode2, Gavel, ListTodo, MessageSquare } from 'lucide-react';
import type { ActivityCategory, ActivityEvent } from '@/types/domain';
import { ACTIVITY_CATEGORIES } from '@/types/domain';
import { useTownStore } from '@/store/town-store';
import { displayName, eventsOf } from '@/store/selectors';
import { EmptyState } from '@/components/ui/states';
import { Button } from '@/components/ui/button';
import { ACTIVITY_CATEGORY_LABEL } from '@/lib/labels';
import { cn, formatClock } from '@/lib/utils';

const ICON: Record<ActivityCategory, React.ComponentType<{ className?: string }>> = {
  CONVERSATION: MessageSquare,
  DECISION: Gavel,
  TASK: ListTodo,
  ARTIFACT: FileCode2,
  BLOCKER: AlertTriangle,
};

const COLOR: Record<ActivityCategory, string> = {
  CONVERSATION: 'text-cyan-300 ring-cyan-400/30 bg-cyan-500/10',
  DECISION: 'text-amber-300 ring-amber-400/30 bg-amber-500/10',
  TASK: 'text-violet-300 ring-violet-400/30 bg-violet-500/10',
  ARTIFACT: 'text-blue-300 ring-blue-400/30 bg-blue-500/10',
  BLOCKER: 'text-rose-300 ring-rose-400/30 bg-rose-500/10',
};

export function ActivityTimeline({
  featureId,
  className,
}: {
  featureId: string | null;
  className?: string;
}) {
  const data = useTownStore((s) => s.data);
  const [filter, setFilter] = React.useState<ActivityCategory | 'ALL'>('ALL');

  const all = eventsOf(data, featureId);
  const visible = filter === 'ALL' ? all : all.filter((e) => e.category === filter);

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto at-scroll-thin border-b border-[var(--at-border-soft)] px-3 py-2">
        <Chip label="All" active={filter === 'ALL'} onClick={() => setFilter('ALL')} />
        {ACTIVITY_CATEGORIES.map((category) => (
          <Chip
            key={category}
            label={ACTIVITY_CATEGORY_LABEL[category]}
            active={filter === category}
            onClick={() => setFilter(category)}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto at-scroll-thin p-3">
        {visible.length === 0 ? (
          <EmptyState
            icon={<Activity />}
            title={all.length === 0 ? '아직 활동 기록이 없습니다' : '이 필터에 해당하는 기록이 없습니다'}
            description={
              all.length === 0
                ? 'Start를 눌러 시뮬레이션을 재생하면 Agent 활동이 시간순으로 쌓입니다.'
                : 'All을 눌러 전체 기록을 확인할 수 있습니다.'
            }
            action={
              all.length > 0 ? (
                <Button variant="outline" size="sm" onClick={() => setFilter('ALL')}>
                  필터 초기화
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ol className="relative space-y-3 pl-1">
            {visible.map((event) => (
              <TimelineRow key={event.id} event={event} actor={displayName(data, event.actorAgentId)} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function TimelineRow({ event, actor }: { event: ActivityEvent; actor: string }) {
  const Icon = ICON[event.category];
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={cn('grid size-7 shrink-0 place-items-center rounded-full ring-1', COLOR[event.category])}>
          <Icon className="size-3.5" aria-hidden />
        </span>
        <span aria-hidden className="mt-1 w-px flex-1 bg-[var(--at-border-soft)]" />
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-[11px] tabular-nums text-[var(--at-text-dim)]">
            {formatClock(event.at)}
          </span>
          <span className="text-[12px] font-medium text-[var(--at-text-muted)]">{actor}</span>
          <span className="text-[10.5px] uppercase tracking-wide text-[var(--at-text-dim)]">
            {ACTIVITY_CATEGORY_LABEL[event.category]}
          </span>
        </div>
        <p className="mt-0.5 text-[12.5px] leading-relaxed">{event.summary}</p>
        {event.category === 'BLOCKER' && (
          <p className="text-meta mt-0.5 text-rose-200/80">사유: {event.reason}</p>
        )}
      </div>
    </li>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 transition-colors',
        active
          ? 'bg-[#3d5bd9]/22 text-[#c6d2fb] ring-[#3d5bd9]/60'
          : 'bg-[var(--at-surface-2)] text-[var(--at-text-muted)] ring-[var(--at-border)] hover:text-[var(--at-text)]',
      )}
    >
      {label}
    </button>
  );
}
