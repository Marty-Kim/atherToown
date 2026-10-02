'use client';

import { Gavel } from 'lucide-react';
import { useTownStore } from '@/store/town-store';
import { EmptyState } from '@/components/ui/states';
import { DecisionCard } from './DecisionCard';

export function DecisionList() {
  const decisions = useTownStore((s) => s.data.decisions);

  const order = { OPEN: 0, NEEDS_DISCUSSION: 1, APPROVED: 2, REJECTED: 3 } as const;
  const sorted = [...decisions].sort(
    (a, b) => order[a.status] - order[b.status] || b.requestedAt.localeCompare(a.requestedAt),
  );

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<Gavel />}
        title="기록된 결정이 없습니다"
        description="Agent들이 스스로 합의하지 못한 사항이 생기면 승인 요청이 여기에 모입니다."
      />
    );
  }

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {sorted.map((decision) => (
        <DecisionCard key={decision.id} decision={decision} showFeatureLink />
      ))}
    </div>
  );
}
