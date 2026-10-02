'use client';

import Link from 'next/link';
import { ArrowRight, Gavel } from 'lucide-react';
import { useTownStore } from '@/store/town-store';
import { openDecisions } from '@/store/selectors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { DecisionCard } from '@/components/decisions/DecisionCard';

export function PendingDecisionsCard() {
  const data = useTownStore((s) => s.data);
  const pending = openDecisions(data);

  return (
    <Card>
      <CardHeader>
        <CardTitle>승인이 필요한 결정</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/decisions">
            전체 보기 <ArrowRight aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {pending.length === 0 ? (
          <EmptyState
            icon={<Gavel />}
            title="대기 중인 결정이 없습니다"
            description="Agent들이 스스로 합의하지 못한 사항이 생기면 여기에서 승인 요청이 올라옵니다."
          />
        ) : (
          pending.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} showFeatureLink />
          ))
        )}
      </CardContent>
    </Card>
  );
}
