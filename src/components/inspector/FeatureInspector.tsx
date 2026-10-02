'use client';

import { Check, Circle } from 'lucide-react';
import type { Feature, TaskStatus } from '@/types/domain';
import { TASK_STATUSES } from '@/types/domain';
import { useTownStore } from '@/store/town-store';
import { artifactsOf, decisionsOf, tasksOf } from '@/store/selectors';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArtifactCard } from '@/components/artifacts/ArtifactCard';
import { toast } from '@/components/ui/toast';
import {
  AUTONOMY_LABEL,
  DECISION_STATUS_LABEL,
  DECISION_STATUS_TONE,
  FEATURE_STATUS_LABEL,
  FEATURE_STATUS_TONE,
  PRIORITY_LABEL,
  STAGE_STATUS_LABEL,
  STAGE_STATUS_TONE,
  TASK_STATUS_LABEL,
  TASK_STATUS_TONE,
} from '@/lib/labels';
import { Section, Row } from './parts';

export function FeatureInspector({ feature }: { feature: Feature }) {
  const data = useTownStore((s) => s.data);
  const setTaskStatus = useTownStore((s) => s.setTaskStatus);

  const tasks = tasksOf(data, feature.id);
  const artifacts = artifactsOf(data, feature.id);
  const decisions = decisionsOf(data, feature.id);
  const taskIds = new Set(tasks.map((t) => t.id));
  const dependencies = data.dependencies.filter(
    (d) => taskIds.has(d.fromTaskId) && taskIds.has(d.toTaskId),
  );
  const taskTitle = (id: string): string => tasks.find((t) => t.id === id)?.title ?? id;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-[var(--at-surface-3)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--at-text-muted)]">
            {feature.key}
          </span>
          <Badge tone={FEATURE_STATUS_TONE[feature.status]}>
            {FEATURE_STATUS_LABEL[feature.status]}
          </Badge>
        </div>
        <p className="mt-1.5 text-[14px] font-semibold tracking-tight">{feature.name}</p>
        <p className="text-meta mt-1 leading-relaxed">{feature.description}</p>
      </div>

      <Separator />

      <Section title="기본 정보">
        <Row label="우선순위" value={PRIORITY_LABEL[feature.priority]} />
        <Row label="Repository" value={<span className="font-mono">{feature.repository}</span>} />
        <Row label="참여 팀" value={feature.teams.join(' · ')} />
        <Row label="Autonomy" value={AUTONOMY_LABEL[feature.autonomy]} />
        <Row label="Due date" value={feature.dueDate ?? '미지정'} />
      </Section>

      <Section title="진행 단계">
        <ol className="space-y-1">
          {feature.stages.map((stage) => (
            <li key={stage.kind} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[12px]">{stage.name}</span>
              <Badge tone={STAGE_STATUS_TONE[stage.status]} className="shrink-0">
                {STAGE_STATUS_LABEL[stage.status]}
              </Badge>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="팀별 작업">
        {tasks.length === 0 ? (
          <p className="text-meta">등록된 작업이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="rounded-md bg-[var(--at-surface-2)] p-2 ring-1 ring-[var(--at-border)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium leading-snug">{task.title}</p>
                    <p className="text-meta">
                      {task.team} · {data.agents.find((a) => a.id === task.assigneeAgentId)?.name ?? '미배정'}
                    </p>
                  </div>
                  <Badge tone={TASK_STATUS_TONE[task.status]} className="shrink-0">
                    {TASK_STATUS_LABEL[task.status]}
                  </Badge>
                </div>
                <Select
                  value={task.status}
                  onValueChange={(value) => {
                    setTaskStatus(task.id, value as TaskStatus);
                    toast({
                      tone: 'info',
                      title: '작업 상태를 변경했습니다',
                      description: `${task.title} → ${TASK_STATUS_LABEL[value as TaskStatus]}`,
                    });
                  }}
                >
                  <SelectTrigger
                    aria-label={`${task.title} 상태 변경`}
                    className="mt-2 h-8 text-[12px]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {TASK_STATUS_LABEL[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Dependency">
        {dependencies.length === 0 ? (
          <p className="text-meta">등록된 의존성이 없습니다.</p>
        ) : (
          <ul className="space-y-1.5">
            {dependencies.map((dependency) => (
              <li key={dependency.id} className="text-[12px] leading-relaxed">
                <span className="text-[var(--at-text-muted)]">{taskTitle(dependency.fromTaskId)}</span>
                <span aria-hidden className="mx-1 text-[var(--at-text-dim)]">
                  →
                </span>
                <span>{taskTitle(dependency.toTaskId)}</span>
                {dependency.blocking && (
                  <Badge tone="danger" className="ml-1.5">
                    blocking
                  </Badge>
                )}
                <span className="text-meta block">{dependency.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="결정사항">
        {decisions.length === 0 ? (
          <p className="text-meta">기록된 결정이 없습니다.</p>
        ) : (
          <ul className="space-y-1.5">
            {decisions.map((decision) => (
              <li key={decision.id} className="flex items-start justify-between gap-2">
                <span className="min-w-0 text-[12px]">{decision.title}</span>
                <Badge tone={DECISION_STATUS_TONE[decision.status]} className="shrink-0">
                  {DECISION_STATUS_LABEL[decision.status]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Artifact">
        {artifacts.length === 0 ? (
          <p className="text-meta">생성된 산출물이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {artifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Acceptance criteria">
        {feature.acceptanceCriteria.length === 0 ? (
          <p className="text-meta">아직 정의되지 않았습니다. Coordinator가 분석 후 채웁니다.</p>
        ) : (
          <ul className="space-y-1.5">
            {feature.acceptanceCriteria.map((criterion) => (
              <li key={criterion.id} className="flex items-start gap-2 text-[12px] leading-relaxed">
                {criterion.satisfied ? (
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-300" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 size-3.5 shrink-0 text-[var(--at-text-dim)]" aria-hidden />
                )}
                <span className={criterion.satisfied ? 'text-[var(--at-text-muted)] line-through' : ''}>
                  {criterion.text}
                </span>
                <span className="sr-only">{criterion.satisfied ? '충족됨' : '미충족'}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
