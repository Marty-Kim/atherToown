'use client';

import Link from 'next/link';
import { OctagonAlert, ShieldCheck } from 'lucide-react';
import { useTownStore } from '@/store/town-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { TASK_STATUS_LABEL } from '@/lib/labels';
import { Badge } from '@/components/ui/badge';

export function BlockerCard() {
  const data = useTownStore((s) => s.data);
  const blockers = data.events.filter((e) => e.category === 'BLOCKER');
  const blocked = data.tasks.filter((t) => t.status === 'BLOCKED');

  const empty = blockers.length === 0 && blocked.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blocker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {empty ? (
          <EmptyState
            icon={<ShieldCheck />}
            title="차단된 작업이 없습니다"
            description="Blocked Zone이 비어 있는 상태가 정상입니다."
          />
        ) : (
          <>
            {blocked.map((task) => {
              const feature = data.features.find((f) => f.id === task.featureId);
              return (
                <Link
                  key={task.id}
                  href={feature ? `/features/${feature.id}` : '/features'}
                  className="flex items-start gap-2.5 rounded-md bg-rose-500/[0.06] p-2.5 ring-1 ring-rose-400/25 transition-colors hover:bg-rose-500/10"
                >
                  <OctagonAlert className="mt-0.5 size-4 shrink-0 text-rose-300" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium">{task.title}</span>
                    <span className="text-meta block">
                      {feature?.key ?? '—'} · {task.team}
                    </span>
                  </span>
                  <Badge tone="danger">{TASK_STATUS_LABEL[task.status]}</Badge>
                </Link>
              );
            })}
            {blockers.map((event) => (
              <p key={event.id} className="text-meta rounded-md bg-[var(--at-surface-2)] px-2.5 py-2">
                {event.summary}
              </p>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
