'use client';

import Link from 'next/link';
import { ArrowRight, CalendarDays, GitBranch, Users } from 'lucide-react';
import { useTownStore } from '@/store/town-store';
import { currentStage, featureProgress } from '@/store/selectors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/states';
import { StageChips } from '@/components/common/StageChips';
import { FEATURE_STATUS_LABEL, FEATURE_STATUS_TONE, PRIORITY_LABEL, PRIORITY_TONE } from '@/lib/labels';

export function CurrentFeatureCard() {
  const features = useTownStore((s) => s.data.features);
  const inFlight = features.filter((f) => f.status !== 'DONE');

  if (inFlight.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>진행 중인 Feature</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<GitBranch />}
            title="진행 중인 Feature가 없습니다"
            description="상단의 Create Feature로 새 기능을 등록하면 Coordinator가 요구사항 분석을 시작합니다."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>진행 중인 Feature</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/features">
            전체 보기 <ArrowRight aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {inFlight.map((feature) => {
          const progress = featureProgress(feature);
          const stage = currentStage(feature);
          return (
            <Link
              key={feature.id}
              href={`/features/${feature.id}`}
              className="block rounded-lg bg-[var(--at-surface-2)] p-3 ring-1 ring-[var(--at-border)] transition-colors hover:bg-[var(--at-surface-3)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[var(--at-surface-3)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--at-text-muted)]">
                  {feature.key}
                </span>
                <span className="text-[13px] font-medium">{feature.name}</span>
                <Badge tone={FEATURE_STATUS_TONE[feature.status]}>
                  {FEATURE_STATUS_LABEL[feature.status]}
                </Badge>
                <Badge tone={PRIORITY_TONE[feature.priority]}>{PRIORITY_LABEL[feature.priority]}</Badge>
              </div>

              <div className="mt-2.5 flex items-center gap-3">
                <Progress value={progress} label={`${feature.key} 진행률`} className="flex-1" />
                <span className="shrink-0 text-[12px] tabular-nums text-[var(--at-text-muted)]">
                  {progress}%
                </span>
              </div>

              <div className="mt-2.5">
                <StageChips feature={feature} />
              </div>

              <div className="text-meta mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" aria-hidden /> Agent {feature.agentIds.length}
                </span>
                <span className="inline-flex items-center gap-1">
                  <GitBranch className="size-3.5" aria-hidden /> {feature.repository}
                </span>
                {feature.dueDate && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" aria-hidden /> {feature.dueDate}
                  </span>
                )}
                <span>현재 단계: {stage?.name ?? '—'}</span>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
