'use client';

import * as React from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { useTownStore } from '@/store/town-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SimulationStatus } from '@/types/domain';
import type { Tone } from '@/lib/labels';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<SimulationStatus, string> = {
  IDLE: '대기',
  RUNNING: '재생 중',
  PAUSED: '일시정지',
  AWAITING_HUMAN: '사용자 결정 대기',
  FINISHED: '완료',
};

const STATUS_TONE: Record<SimulationStatus, Tone> = {
  IDLE: 'neutral',
  RUNNING: 'progress',
  PAUSED: 'info',
  AWAITING_HUMAN: 'warning',
  FINISHED: 'success',
};

const SPEEDS = [
  { value: '1000', label: '1초' },
  { value: '2000', label: '2초' },
  { value: '3000', label: '3초' },
] as const;

export function SimulationControls({
  featureId,
  compact = false,
  className,
}: {
  /** 이 Feature 가 시뮬레이션 대상일 때만 컨트롤을 노출한다. */
  featureId: string;
  compact?: boolean;
  className?: string;
}) {
  const simulation = useTownStore((s) => s.data.simulation);
  const scripts = useTownStore((s) => s.scripts);
  const start = useTownStore((s) => s.startSimulation);
  const pause = useTownStore((s) => s.pauseSimulation);
  const step = useTownStore((s) => s.stepSimulation);
  const reset = useTownStore((s) => s.resetSimulation);
  const setSpeed = useTownStore((s) => s.setSpeed);

  const [confirmReset, setConfirmReset] = React.useState(false);

  if (simulation.featureId !== featureId) {
    return (
      <p className={cn('text-meta max-w-xs', className)}>
        이 Feature에는 아직 시뮬레이션 스크립트가 없습니다. Coordinator가 요구사항을 분석하는 중입니다.
      </p>
    );
  }

  const total = scripts[simulation.featureId]?.length ?? 0;
  const running = simulation.status === 'RUNNING';
  const awaiting = simulation.status === 'AWAITING_HUMAN';
  const finished = simulation.status === 'FINISHED' || (total > 0 && simulation.cursor >= total);

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <Badge tone={STATUS_TONE[simulation.status]}>{STATUS_LABEL[simulation.status]}</Badge>
      {total > 0 && (
        <span className="text-[11px] tabular-nums text-[var(--at-text-dim)]">
          {Math.min(simulation.cursor, total)} / {total}
        </span>
      )}

      <Button
        variant={running ? 'secondary' : 'primary'}
        size="sm"
        onClick={running ? pause : start}
        disabled={awaiting || finished}
        title={awaiting ? '사용자 결정을 승인해야 이어집니다' : undefined}
      >
        {running ? <Pause aria-hidden /> : <Play aria-hidden />}
        {running ? 'Pause' : 'Start'}
      </Button>

      <Button variant="outline" size="sm" onClick={step} disabled={running || awaiting || finished}>
        <SkipForward aria-hidden />
        {compact ? '' : 'Next event'}
      </Button>

      <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
        <RotateCcw aria-hidden />
        {compact ? '' : 'Reset'}
      </Button>

      {!compact && (
        <Select value={String(simulation.speedMs)} onValueChange={(v) => setSpeed(Number(v))}>
          <SelectTrigger aria-label="시뮬레이션 속도" className="h-8 w-[88px] text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPEEDS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="시뮬레이션을 초기화할까요?"
        description="PAY-142의 대화 · 결정 · 산출물 · 타임라인이 모두 처음 상태로 돌아갑니다. 직접 만든 Feature와 Agent는 유지됩니다."
        confirmLabel="초기화"
        destructive
        onConfirm={() => {
          reset();
          toast({
            tone: 'info',
            title: '시뮬레이션을 초기화했습니다',
            description: 'Start를 누르면 요구사항 분석부터 다시 재생됩니다.',
          });
        }}
      />
    </div>
  );
}
