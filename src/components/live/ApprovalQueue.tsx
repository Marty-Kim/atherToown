'use client';

import * as React from 'react';
import { Check, ShieldCheck, ShieldQuestion, X } from 'lucide-react';
import { useTownStore } from '@/store/town-store';
import { sendControl } from '@/services/hub-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { formatClock } from '@/lib/utils';

/**
 * 도구 레벨 승인 대기열 (Agent SDK canUseTool).
 * Agent 는 여기서 사람이 누를 때까지 실제로 멈춰 있다.
 */
export function ApprovalQueue({ className }: { className?: string }) {
  const mode = useTownStore((s) => s.mode);
  const pending = useTownStore((s) => s.hub.pending);
  const [busy, setBusy] = React.useState<string | null>(null);

  const toolApprovals = pending.filter((p) => p.kind === 'TOOL');

  async function resolve(requestId: string, allow: boolean) {
    setBusy(requestId);
    const result = await sendControl({ t: 'tool-approval', requestId, allow, reason: null });
    setBusy(null);
    if (!result.ok) {
      toast({ tone: 'error', title: '처리하지 못했습니다', description: result.error ?? '' });
      return;
    }
    toast({
      tone: allow ? 'success' : 'info',
      title: allow ? '실행을 허용했습니다' : '실행을 거절했습니다',
      description: allow ? 'Agent 가 작업을 이어갑니다.' : 'Agent 에게 거절 사유가 전달됩니다.',
    });
  }

  if (mode !== 'live') {
    return (
      <div className={className}>
        <EmptyState
          icon={<ShieldCheck />}
          title="Mock 모드에서는 도구 승인이 없습니다"
          description="Settings에서 Live 모드로 바꾸고 러너를 연결하면, Agent의 파일 쓰기·셸 실행 요청이 여기로 올라옵니다."
        />
      </div>
    );
  }

  if (toolApprovals.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          icon={<ShieldCheck />}
          title="승인 대기 중인 작업이 없습니다"
          description="Agent가 허용된 저장소 밖을 건드리거나 push·merge 같은 위험한 명령을 시도하면 여기서 멈춥니다."
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <ul className="space-y-2">
        {toolApprovals.map((approval) => {
          if (approval.kind !== 'TOOL') return null;
          return (
            <li
              key={approval.requestId}
              className="at-fade-up rounded-lg border border-amber-400/30 bg-amber-500/[0.05] p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <ShieldQuestion className="size-4 shrink-0 text-amber-300" aria-hidden />
                <span className="text-[13px] font-medium">{approval.title}</span>
                <Badge tone="warning">{approval.toolName}</Badge>
                <span className="ml-auto font-mono text-[11px] tabular-nums text-[var(--at-text-dim)]">
                  {formatClock(approval.createdAt)}
                </span>
              </div>

              <p className="text-meta mt-1">
                {approval.agentName} 이(가) 요청 · Agent는 응답할 때까지 멈춰 있습니다.
              </p>

              <pre className="mt-2 max-h-28 overflow-auto at-scroll-thin rounded bg-[var(--at-canvas)] p-2 font-mono text-[11px] leading-relaxed text-[var(--at-text-muted)]">
                {approval.inputPreview}
              </pre>

              <div className="mt-2.5 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy === approval.requestId}
                  onClick={() => void resolve(approval.requestId, false)}
                >
                  <X aria-hidden />
                  거절
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={busy === approval.requestId}
                  onClick={() => void resolve(approval.requestId, true)}
                >
                  <Check aria-hidden />
                  이번만 허용
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 헤더 뱃지용 카운트. */
export function usePendingApprovalCount(): number {
  const mode = useTownStore((s) => s.mode);
  const pending = useTownStore((s) => s.hub.pending);
  return mode === 'live' ? pending.length : 0;
}
