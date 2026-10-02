'use client';

import * as React from 'react';
import { Database, Gauge, Radio, Trash2 } from 'lucide-react';
import { useTownStore, STORAGE_KEY } from '@/store/town-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { Row } from '@/components/inspector/parts';
import { RunnerPanel } from '@/components/live/RunnerPanel';
import { AUTONOMY_LABEL } from '@/lib/labels';

export function SettingsPanel() {
  const data = useTownStore((s) => s.data);
  const mode = useTownStore((s) => s.mode);
  const setMode = useTownStore((s) => s.setMode);
  const setSpeed = useTownStore((s) => s.setSpeed);
  const resetWorkspace = useTownStore((s) => s.resetWorkspace);
  const [confirm, setConfirm] = React.useState(false);
  const [confirmMode, setConfirmMode] = React.useState<'mock' | 'live' | null>(null);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>실행 모드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <ModeOption
              title="Mock 데모"
              description="내장된 PAY-142 시나리오를 재생합니다. 러너도, 모델 호출도 필요 없습니다."
              selected={mode === 'mock'}
              onSelect={() => setConfirmMode('mock')}
            />
            <ModeOption
              title="Live — 사내망 러너"
              description="팀원 Mac의 러너가 각자의 Claude 계정으로 실제 작업을 수행합니다. 이 서버는 자격증명을 갖지 않습니다."
              selected={mode === 'live'}
              onSelect={() => setConfirmMode('live')}
            />
          </div>
          <p className="text-meta flex items-start gap-2">
            <Radio className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            모드를 바꾸면 현재 화면의 데이터가 초기화됩니다. Live 모드의 상태는 허브(서버 프로세스) 메모리에
            있으므로 서버를 재시작하면 사라집니다.
          </p>
        </CardContent>
      </Card>

      <RunnerPanel />
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <Row label="이름" value={data.workspace.name} />
          <Row label="Slug" value={<span className="font-mono">{data.workspace.slug}</span>} />
          <Row label="구성원" value={`${data.users.length}명`} />
          <Row label="연결된 Agent" value={`${data.agents.length}개`} />
          <Row label="Repository" value={`${data.workspace.repositories.length}개`} />
          <ul className="mt-2 space-y-0.5">
            {data.workspace.repositories.map((repo) => (
              <li key={repo} className="font-mono text-[11.5px] text-[var(--at-text-muted)]">
                {repo}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Simulation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12.5px] font-medium">이벤트 간격</p>
              <p className="text-meta">Start 재생 시 다음 이벤트까지 기다리는 시간입니다.</p>
            </div>
            <Select value={String(data.simulation.speedMs)} onValueChange={(v) => setSpeed(Number(v))}>
              <SelectTrigger aria-label="시뮬레이션 속도" className="h-8 w-28 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1000">1초</SelectItem>
                <SelectItem value="2000">2초</SelectItem>
                <SelectItem value="3000">3초</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Row
            label="현재 상태"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Gauge className="size-3.5" aria-hidden />
                {data.simulation.status} · step {data.simulation.cursor}
              </span>
            }
          />
          <Row
            label="기본 Autonomy"
            value={AUTONOMY_LABEL[3]}
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>데이터</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-meta flex items-start gap-2 leading-relaxed">
            <Database className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {mode === 'live' ? (
              <>
                Live 모드의 대화·산출물은 이 서버 프로세스의 메모리에만 있고, 코드는 각 팀원 Mac을 떠나지
                않습니다. 모델 호출은 러너가 그 사람의 Claude 계정으로 수행하며, 이 서버는 어떤 자격증명도
                보관하지 않습니다. UI 설정은 브라우저 localStorage(
                <code className="font-mono">{STORAGE_KEY}</code>)에 저장됩니다.
              </>
            ) : (
              <>
                Mock 모드의 모든 상태는 브라우저 localStorage(
                <code className="font-mono">{STORAGE_KEY}</code>)에만 저장됩니다. 서버로 전송되는 데이터가
                없고, 실제 AI 모델이나 GitHub API에도 연결되지 않습니다.
              </>
            )}
          </p>
          <div>
            <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
              <Trash2 aria-hidden />
              저장된 상태 초기화
            </Button>
            <p className="text-meta mt-1.5">
              직접 만든 Feature와 Agent를 포함해 모든 변경 사항이 사라지고 첫 진입 상태로 돌아갑니다.
            </p>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmMode !== null}
        onOpenChange={(open) => !open && setConfirmMode(null)}
        title={confirmMode === 'live' ? 'Live 모드로 전환할까요?' : 'Mock 모드로 전환할까요?'}
        description="현재 화면의 Agent · Feature · 대화가 초기화됩니다. 전환 후 다시 채워집니다."
        confirmLabel="전환"
        onConfirm={() => {
          if (confirmMode) setMode(confirmMode);
        }}
      />

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="저장된 상태를 모두 지울까요?"
        description="직접 만든 Feature와 Agent를 포함한 모든 변경 사항이 사라집니다. 이 작업은 되돌릴 수 없습니다."
        confirmLabel="모두 초기화"
        destructive
        onConfirm={() => {
          resetWorkspace();
          toast({
            tone: 'info',
            title: '워크스페이스를 초기화했습니다',
            description: '첫 진입 상태로 복원되었습니다.',
          });
        }}
      />
    </div>
  );
}

function ModeOption({
  title,
  description,
  selected,
  onSelect,
}: {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`rounded-lg p-3 text-left ring-1 transition-colors ${
        selected
          ? 'bg-[#3d5bd9]/15 ring-[#3d5bd9]/60'
          : 'bg-[var(--at-surface-2)] ring-[var(--at-border)] hover:bg-[var(--at-surface-3)]'
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={`size-2 rounded-full ${selected ? 'bg-[#7b8cff]' : 'bg-[var(--at-text-dim)]'}`}
        />
        <span className="text-[13px] font-medium">{title}</span>
        {selected && <span className="text-[11px] text-[#9fb0f5]">사용 중</span>}
      </span>
      <span className="text-meta mt-1 block">{description}</span>
    </button>
  );
}
