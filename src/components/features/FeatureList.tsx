'use client';

import Link from 'next/link';
import { ArrowRight, CalendarDays, GitBranch, SquareStack, Users } from 'lucide-react';
import { useTownStore } from '@/store/town-store';
import { currentStage, featureProgress } from '@/store/selectors';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/states';
import { StageChips } from '@/components/common/StageChips';
import { CreateFeatureDialog } from './CreateFeatureDialog';
import {
  AUTONOMY_LABEL,
  FEATURE_STATUS_LABEL,
  FEATURE_STATUS_TONE,
  PRIORITY_LABEL,
  PRIORITY_TONE,
} from '@/lib/labels';

export function FeatureList() {
  const features = useTownStore((s) => s.data.features);

  if (features.length === 0) {
    return (
      <EmptyState
        icon={<SquareStack />}
        title="등록된 Feature가 없습니다"
        description="첫 기능을 등록하면 Feature Room이 생성되고 Coordinator Agent가 요구사항을 분석합니다."
        action={<CreateFeatureDialog />}
      />
    );
  }

  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {features.map((feature) => {
        const progress = featureProgress(feature);
        const stage = currentStage(feature);
        return (
          <li key={feature.id}>
            <Link
              href={`/features/${feature.id}`}
              className="at-panel flex h-full flex-col gap-2.5 p-4 transition-colors hover:bg-[var(--at-surface-2)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[var(--at-surface-3)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--at-text-muted)]">
                  {feature.key}
                </span>
                <span className="text-[14px] font-semibold tracking-tight">{feature.name}</span>
                <Badge tone={FEATURE_STATUS_TONE[feature.status]}>
                  {FEATURE_STATUS_LABEL[feature.status]}
                </Badge>
                <Badge tone={PRIORITY_TONE[feature.priority]}>{PRIORITY_LABEL[feature.priority]}</Badge>
                <ArrowRight className="ml-auto size-4 text-[var(--at-text-dim)]" aria-hidden />
              </div>

              <p className="text-meta line-clamp-2 leading-relaxed">{feature.description}</p>

              <div className="flex items-center gap-3">
                <Progress value={progress} label={`${feature.key} 진행률`} className="flex-1" />
                <span className="shrink-0 text-[12px] tabular-nums text-[var(--at-text-muted)]">
                  {progress}%
                </span>
              </div>

              <StageChips feature={feature} compact />

              <div className="text-meta mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" aria-hidden /> {feature.agentIds.length} agents
                </span>
                <span className="inline-flex items-center gap-1">
                  <GitBranch className="size-3.5" aria-hidden /> {feature.repository}
                </span>
                {feature.dueDate && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" aria-hidden /> {feature.dueDate}
                  </span>
                )}
                <span>{AUTONOMY_LABEL[feature.autonomy]}</span>
                <span>현재 단계: {stage?.name ?? '완료'}</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
