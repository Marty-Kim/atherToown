'use client';

import * as React from 'react';
import { Copy, KeyRound, Loader2, MonitorSmartphone } from 'lucide-react';
import { useTownStore } from '@/store/town-store';
import { createPairingCode } from '@/services/hub-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { CONNECTION_LABEL, CONNECTION_TONE } from '@/lib/labels';
import { formatClock } from '@/lib/utils';

/** 러너 목록 + 페어링 코드 발급. Settings 에서 쓴다. */
export function RunnerPanel() {
  const mode = useTownStore((s) => s.mode);
  const runners = useTownStore((s) => s.hub.runners);
  const [code, setCode] = React.useState<{ code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function issue() {
    setBusy(true);
    try {
      setCode(await createPairingCode());
    } catch (cause) {
      toast({
        tone: 'error',
        title: '코드를 발급하지 못했습니다',
        description: cause instanceof Error ? cause.message : '',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>러너</CardTitle>
        <Button variant="secondary" size="sm" onClick={() => void issue()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <KeyRound aria-hidden />}
          페어링 코드 발급
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {code && (
          <div className="rounded-lg bg-[var(--at-surface-2)] p-3 ring-1 ring-[var(--at-border)]">
            <p className="text-meta">팀원 Mac에서 아래 명령을 실행하세요. 10분간 유효합니다.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto at-scroll-thin rounded bg-[var(--at-canvas)] px-2.5 py-2 font-mono text-[12px]">
                npm start -- --pair {code.code}
              </code>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="명령 복사"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(`npm start -- --pair ${code.code}`)
                    .then(() => toast({ tone: 'success', title: '복사했습니다' }))
                    .catch(() => toast({ tone: 'error', title: '복사하지 못했습니다' }));
                }}
              >
                <Copy aria-hidden />
              </Button>
            </div>
            <p className="text-meta mt-1.5">만료 {formatClock(code.expiresAt)}</p>
          </div>
        )}

        {mode !== 'live' ? (
          <EmptyState
            icon={<MonitorSmartphone />}
            title="Mock 모드입니다"
            description="위에서 Live 모드로 바꾸면 연결된 러너가 여기에 표시됩니다."
          />
        ) : runners.length === 0 ? (
          <EmptyState
            icon={<MonitorSmartphone />}
            title="연결된 러너가 없습니다"
            description="페어링 코드를 발급해 팀원 Mac의 러너를 붙이세요. 러너는 각자의 Claude 로그인을 사용하며, 이 서버는 자격증명을 갖지 않습니다."
          />
        ) : (
          <ul className="space-y-2">
            {runners.map((runner) => (
              <li
                key={runner.runnerId}
                className="flex flex-wrap items-center gap-2 rounded-md bg-[var(--at-surface-2)] p-2.5 ring-1 ring-[var(--at-border)]"
              >
                <span className="text-[13px] font-medium">{runner.agentName}</span>
                <Badge tone={CONNECTION_TONE[runner.connection]}>
                  {CONNECTION_LABEL[runner.connection]}
                </Badge>
                {runner.mock && <Badge tone="info">mock</Badge>}
                <span className="text-meta">
                  {runner.hostname} · {runner.platform}
                </span>
                <span className="text-meta ml-auto tabular-nums">
                  ${runner.costUsd.toFixed(4)} · {formatClock(runner.lastSeenAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
