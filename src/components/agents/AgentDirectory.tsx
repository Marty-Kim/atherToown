'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Bot } from 'lucide-react';
import { useTownStore } from '@/store/town-store';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AgentInspector } from '@/components/inspector/AgentInspector';
import { AgentGlyph, ACCENT_BG } from '@/components/workspace/AgentGlyph';
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
import { formatClock } from '@/lib/utils';

export function AgentDirectory() {
  const data = useTownStore((s) => s.data);
  const searchParams = useSearchParams();
  /* ?agent=<id> 쿼리로 진입하면 해당 Agent 상세를 연다. 이후에는 사용자의 선택이 우선한다. */
  const [override, setOverride] = React.useState<{ id: string | null } | null>(null);
  const openAgentId = override ? override.id : searchParams.get('agent');
  const setOpenAgentId = React.useCallback((id: string | null) => setOverride({ id }), []);

  const selected = data.agents.find((a) => a.id === openAgentId);

  if (data.agents.length === 0) {
    return (
      <EmptyState
        icon={<Bot />}
        title="연결된 Agent가 없습니다"
        description="Connect Agent로 팀의 Agent를 연결하면 가상 오피스에 배치됩니다."
      />
    );
  }

  return (
    <>
      {/* 데스크톱: 테이블 */}
      <div className="at-panel hidden overflow-hidden lg:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">연결된 Agent 목록</caption>
          <thead>
            <tr className="border-b border-[var(--at-border)] bg-[var(--at-surface-2)] text-[11px] uppercase tracking-wide text-[var(--at-text-dim)]">
              <th scope="col" className="px-3 py-2 font-medium">이름 / 역할</th>
              <th scope="col" className="px-3 py-2 font-medium">연결한 사용자</th>
              <th scope="col" className="px-3 py-2 font-medium">상태</th>
              <th scope="col" className="px-3 py-2 font-medium">Capabilities</th>
              <th scope="col" className="px-3 py-2 font-medium">연결</th>
              <th scope="col" className="px-3 py-2 font-medium">권한</th>
              <th scope="col" className="px-3 py-2 font-medium">마지막 활동</th>
            </tr>
          </thead>
          <tbody>
            {data.agents.map((agent) => {
              const user = data.users.find((u) => u.id === agent.connectedBy);
              return (
                <tr
                  key={agent.id}
                  className="border-b border-[var(--at-border-soft)] transition-colors last:border-b-0 hover:bg-[var(--at-surface-2)]"
                >
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setOpenAgentId(agent.id)}
                      className="flex items-center gap-2.5 text-left"
                    >
                      <span className={`grid size-8 shrink-0 place-items-center rounded-md ring-1 ${ACCENT_BG[agent.accent]}`}>
                        <AgentGlyph role={agent.role} accent={agent.accent} />
                      </span>
                      <span>
                        <span className="block text-[13px] font-medium underline-offset-2 hover:underline">
                          {agent.name}
                        </span>
                        <span className="text-meta block">
                          {AGENT_ROLE_LABEL[agent.role]} · {PROVIDER_LABEL[agent.provider]}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px]">{user?.name ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={AGENT_STATUS_TONE[agent.status]}>
                      {AGENT_STATUS_LABEL[agent.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-meta">
                      {agent.capabilities.map((c) => CAPABILITY_LABEL[c]).join(', ')}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={CONNECTION_TONE[agent.connection]}>
                      {CONNECTION_LABEL[agent.connection]}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-[12px]">{PERMISSION_LABEL[agent.permission.level]}</td>
                  <td className="px-3 py-2.5 font-mono text-[11.5px] tabular-nums text-[var(--at-text-muted)]">
                    {formatClock(agent.lastActiveAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 태블릿 이하: 카드 */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {data.agents.map((agent) => {
          const user = data.users.find((u) => u.id === agent.connectedBy);
          return (
            <li key={agent.id}>
              <button
                type="button"
                onClick={() => setOpenAgentId(agent.id)}
                className="at-panel flex w-full flex-col gap-2 p-3.5 text-left transition-colors hover:bg-[var(--at-surface-2)]"
              >
                <div className="flex items-start gap-2.5">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-md ring-1 ${ACCENT_BG[agent.accent]}`}>
                    <AgentGlyph role={agent.role} accent={agent.accent} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">{agent.name}</span>
                    <span className="text-meta block">
                      {AGENT_ROLE_LABEL[agent.role]} · {PROVIDER_LABEL[agent.provider]} ·{' '}
                      {user?.name ?? '—'}
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={AGENT_STATUS_TONE[agent.status]}>
                    {AGENT_STATUS_LABEL[agent.status]}
                  </Badge>
                  <Badge tone={CONNECTION_TONE[agent.connection]}>
                    {CONNECTION_LABEL[agent.connection]}
                  </Badge>
                  <Badge tone="neutral">{PERMISSION_LABEL[agent.permission.level]}</Badge>
                </div>
                <p className="text-meta">{agent.currentTask ?? '대기 중인 작업 없음'}</p>
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog open={selected !== undefined} onOpenChange={(open) => !open && setOpenAgentId(null)}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="sr-only">Agent 상세</DialogTitle>
          <div className="min-h-0 overflow-y-auto at-scroll-thin p-5">
            {selected && <AgentInspector agent={selected} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
