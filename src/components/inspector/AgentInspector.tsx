'use client';

import { MessageSquare, Pause, Play, ShieldCheck } from 'lucide-react';
import type { Agent } from '@/types/domain';
import { useTownStore } from '@/store/town-store';
import { displayName } from '@/store/selectors';
import { AgentGlyph, ACCENT_BG } from '@/components/workspace/AgentGlyph';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/toast';
import { MessageCard } from '@/components/conversation/MessageCard';
import { formatClock } from '@/lib/utils';
import {
  AGENT_ROLE_LABEL,
  AGENT_STATUS_LABEL,
  AGENT_STATUS_TONE,
  CAPABILITY_LABEL,
  CONNECTION_LABEL,
  CONNECTION_TONE,
  PERMISSION_LABEL,
  PROVIDER_LABEL,
} from '@/lib/labels';
import { AssignTaskDialog } from '@/components/live/AssignTaskDialog';
import { Section, Row } from './parts';

export function AgentInspector({
  agent,
  onStartChat,
}: {
  agent: Agent;
  onStartChat?: (agentId: string) => void;
}) {
  const data = useTownStore((s) => s.data);
  const mode = useTownStore((s) => s.mode);
  const runner = useTownStore((s) => s.hub.runners.find((r) => r.agentId === agent.id));
  const togglePause = useTownStore((s) => s.toggleAgentPause);
  const user = data.users.find((u) => u.id === agent.connectedBy);
  const recent = data.messages
    .filter((m) => m.fromAgentId === agent.id)
    .slice(-2)
    .reverse();
  const paused = agent.status === 'IDLE';

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-lg ring-1 ${ACCENT_BG[agent.accent]}`}>
          <AgentGlyph role={agent.role} accent={agent.accent} className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold tracking-tight">{agent.name}</p>
          <p className="text-meta">
            {AGENT_ROLE_LABEL[agent.role]} Agent · {PROVIDER_LABEL[agent.provider]}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge tone={AGENT_STATUS_TONE[agent.status]}>{AGENT_STATUS_LABEL[agent.status]}</Badge>
            <Badge tone={CONNECTION_TONE[agent.connection]}>{CONNECTION_LABEL[agent.connection]}</Badge>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {mode === 'live' ? (
          <AssignTaskDialog agent={agent} />
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => onStartChat?.(agent.id)}
            disabled={!onStartChat}
          >
            <MessageSquare aria-hidden />
            대화하기
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => {
            togglePause(agent.id);
            toast({
              tone: 'info',
              title: paused ? `${agent.name} 작업을 재개했습니다` : `${agent.name} 작업을 일시정지했습니다`,
              description: paused ? '다음 이벤트부터 다시 참여합니다.' : '진행 중인 작업이 보류됩니다.',
            });
          }}
        >
          {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
          {paused ? '작업 재개' : '작업 일시정지'}
        </Button>
      </div>

      <Separator />

      <Section title="현재 작업">
        <p className="text-[12.5px] leading-relaxed">
          {agent.currentTask ?? '배정된 작업이 없습니다.'}
        </p>
      </Section>

      <Section title="기본 정보">
        <Row label="연결한 사용자" value={user ? `${user.name} (${user.title})` : '—'} />
        <Row label="팀" value={agent.team} />
        <Row label="현재 위치" value={data.rooms.find((r) => r.id === agent.roomId)?.name ?? '—'} />
        <Row
          label="담당 Feature"
          value={agent.featureId ? (data.features.find((f) => f.id === agent.featureId)?.key ?? '—') : '—'}
        />
      </Section>

      <Section title="Capabilities">
        <div className="flex flex-wrap gap-1.5">
          {agent.capabilities.map((capability) => (
            <Badge key={capability} tone="info">
              {CAPABILITY_LABEL[capability]}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="접근 가능한 repository">
        <ul className="space-y-1">
          {agent.repositories.map((repo) => (
            <li key={repo} className="font-mono text-[11.5px] text-[var(--at-text-muted)]">
              {repo}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="사용 권한">
        <div className="space-y-1.5">
          <Badge tone="progress" icon={<ShieldCheck />}>
            {PERMISSION_LABEL[agent.permission.level]}
          </Badge>
          <Row label="PR 생성" value={agent.permission.canOpenPullRequest ? '허용' : '불가'} />
          <Row label="Merge" value={agent.permission.canMerge ? '승인 후 허용' : '불가'} />
          <Row label="Contract 수정" value={agent.permission.canEditContract ? '허용' : '불가'} />
        </div>
      </Section>

      <Section title="최근 메시지">
        {recent.length === 0 ? (
          <p className="text-meta">아직 보낸 메시지가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((message) => (
              <MessageCard key={message.id} message={message} />
            ))}
          </div>
        )}
      </Section>

      {runner ? (
        <Section title="러너">
          <Row label="호스트" value={runner.hostname} />
          <Row label="플랫폼" value={runner.platform} />
          <Row label="연결 시각" value={formatClock(runner.connectedAt)} />
          <Row label="누적 비용" value={`$${runner.costUsd.toFixed(4)}`} />
          {runner.mock && <Row label="모드" value="mock (모델 미호출)" />}
        </Section>
      ) : (
        <p className="text-meta">
          {mode === 'live'
            ? '이 Agent에 연결된 러너가 없습니다.'
            : `연결 정보는 mock입니다. 실제 API key나 인증 정보는 저장하지 않습니다. (${displayName(data, agent.id)})`}
        </p>
      )}
    </div>
  );
}
