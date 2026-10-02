'use client';

import { Clock, GitBranch, OctagonAlert, Users } from 'lucide-react';
import type { Feature } from '@/types/domain';
import { useTownStore } from '@/store/town-store';
import { currentStage, featureProgress } from '@/store/selectors';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StageChips } from '@/components/common/StageChips';
import { SimulationControls } from './SimulationControls';
import { FEATURE_STATUS_LABEL, FEATURE_STATUS_TONE, PRIORITY_LABEL, PRIORITY_TONE } from '@/lib/labels';
import { formatClock } from '@/lib/utils';

export function FeatureStatusBar({ feature }: { feature: Feature }) {
  const data = useTownStore((s) => s.data);
  const mode = useTownStore((s) => s.mode);
  const progress = featureProgress(feature);
  const stage = currentStage(feature);
  const blockers = data.tasks.filter((t) => t.featureId === feature.id && t.status === 'BLOCKED').length;

  return (
    <section
      aria-label="Feature 상태"
      className="shrink-0 border-b border-[var(--at-border)] bg-[var(--at-surface-1)] px-3 py-3 sm:px-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-[var(--at-surface-3)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--at-text-muted)]">
              {feature.key}
            </span>
            <h2 className="text-[15px] font-semibold tracking-tight">{feature.name}</h2>
            <Badge tone={FEATURE_STATUS_TONE[feature.status]}>
              {FEATURE_STATUS_LABEL[feature.status]}
            </Badge>
            <Badge tone={PRIORITY_TONE[feature.priority]}>{PRIORITY_LABEL[feature.priority]}</Badge>
          </div>
          <div className="text-meta mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden /> Agent {feature.agentIds.length}
            </span>
            <span className="inline-flex items-center gap-1">
              <OctagonAlert className="size-3.5" aria-hidden /> Blocker {blockers}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden /> 시작 {formatClock(feature.startedAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitBranch className="size-3.5" aria-hidden /> {feature.repository}
            </span>
            <span>현재 단계: {stage?.name ?? '완료'}</span>
          </div>
        </div>

        {mode === 'live' ? (
          <p className="text-meta max-w-xs">
            Live 모드입니다. Agent 카드의 &quot;작업 지시&quot;로 러너에게 일을 보냅니다.
          </p>
        ) : (
          <>
            <SimulationControls featureId={feature.id} className="hidden md:flex" />
            <SimulationControls featureId={feature.id} compact className="md:hidden" />
          </>
        )}
      </div>

      <div className="mt-3 hidden flex-col gap-2 md:flex lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-3">
          <Progress value={progress} label={`${feature.key} 전체 진행률`} className="flex-1" />
          <span className="shrink-0 text-[12px] tabular-nums text-[var(--at-text-muted)]">
            {progress}%
          </span>
        </div>
        <div className="overflow-x-auto at-scroll-thin">
          <StageChips feature={feature} />
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-3 md:hidden">
        <Progress value={progress} label={`${feature.key} 전체 진행률`} className="flex-1" />
        <span className="shrink-0 text-[12px] tabular-nums text-[var(--at-text-muted)]">
          {progress}%
        </span>
      </div>
    </section>
  );
}
