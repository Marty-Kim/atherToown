'use client';

import { Activity } from 'lucide-react';
import { useTownStore } from '@/store/town-store';
import { eventsOf } from '@/store/selectors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { formatClock } from '@/lib/utils';

export function RecentActivityCard() {
  const data = useTownStore((s) => s.data);
  const events = eventsOf(data, null).slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 Agent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <EmptyState
            icon={<Activity />}
            title="아직 기록된 활동이 없습니다"
            description="Feature Room에서 시뮬레이션을 시작하면 Agent 활동이 여기에 쌓입니다."
          />
        ) : (
          <ol className="space-y-2">
            {events.map((event) => (
              <li key={event.id} className="flex gap-2.5">
                <span className="shrink-0 pt-px font-mono text-[11px] tabular-nums text-[var(--at-text-dim)]">
                  {formatClock(event.at)}
                </span>
                <span className="min-w-0 text-[12.5px] leading-relaxed">{event.summary}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
