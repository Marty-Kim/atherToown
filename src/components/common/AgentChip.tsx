'use client';

import Link from 'next/link';
import type { Agent } from '@/types/domain';
import { AgentGlyph, ACCENT_BG } from '@/components/workspace/AgentGlyph';
import { AGENT_STATUS_LABEL, AGENT_STATUS_TONE, AGENT_ROLE_LABEL } from '@/lib/labels';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function AgentChip({
  agent,
  href,
  onClick,
  showStatus = true,
  className,
}: {
  agent: Agent;
  href?: string;
  onClick?: () => void;
  showStatus?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-md ring-1', ACCENT_BG[agent.accent])}>
        <AgentGlyph role={agent.role} accent={agent.accent} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-medium">{agent.name}</span>
          <span className="shrink-0 text-[11px] text-[var(--at-text-dim)]">
            {AGENT_ROLE_LABEL[agent.role]}
          </span>
        </span>
        <span className="block truncate text-[11.5px] text-[var(--at-text-muted)]">
          {agent.currentTask ?? '대기 중인 작업 없음'}
        </span>
      </span>
      {showStatus && (
        <Badge tone={AGENT_STATUS_TONE[agent.status]} className="shrink-0">
          {AGENT_STATUS_LABEL[agent.status]}
        </Badge>
      )}
    </>
  );

  const cls = cn(
    'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--at-surface-2)]',
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cls} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
  );
}
