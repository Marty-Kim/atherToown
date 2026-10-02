'use client';

import type { Agent } from '@/types/domain';
import { AgentGlyph, ACCENT_BG } from './AgentGlyph';
import { AGENT_STATUS_LABEL } from '@/lib/labels';
import { cn } from '@/lib/utils';

const STATUS_RING: Record<Agent['status'], string> = {
  IDLE: 'ring-slate-400/25',
  THINKING: 'ring-cyan-400/60',
  DISCUSSING: 'ring-cyan-400/60',
  CODING: 'ring-violet-400/60',
  TESTING: 'ring-violet-400/60',
  WAITING_FOR_APPROVAL: 'ring-amber-400/70',
  BLOCKED: 'ring-rose-400/70',
  COMPLETED: 'ring-emerald-400/60',
};

const STATUS_DOT: Record<Agent['status'], string> = {
  IDLE: 'bg-slate-400',
  THINKING: 'bg-cyan-400',
  DISCUSSING: 'bg-cyan-400',
  CODING: 'bg-violet-400',
  TESTING: 'bg-violet-400',
  WAITING_FOR_APPROVAL: 'bg-amber-400',
  BLOCKED: 'bg-rose-400',
  COMPLETED: 'bg-emerald-400',
};

const BUSY: readonly Agent['status'][] = ['THINKING', 'DISCUSSING', 'CODING', 'TESTING'];

/**
 * 가상 오피스 위의 Agent.
 * 위치는 room 좌표에서 파생되고, 이동은 CSS transition 으로만 처리한다.
 */
export function AgentAvatar({
  agent,
  x,
  y,
  selected,
  onSelect,
}: {
  agent: Agent;
  x: number;
  y: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const busy = BUSY.includes(agent.status);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${agent.name} (${agent.role}) — ${AGENT_STATUS_LABEL[agent.status]}${
        agent.currentTask ? `, ${agent.currentTask}` : ''
      }`}
      style={{ left: `${x}%`, top: `${y}%` }}
      className="group pointer-events-auto absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-700 ease-in-out focus-visible:z-20"
    >
      <span className="relative flex flex-col items-center gap-1">
        <span className="relative">
          {busy && (
            <span
              aria-hidden
              className={cn(
                'absolute inset-0 rounded-lg at-ping',
                agent.status === 'CODING' || agent.status === 'TESTING'
                  ? 'bg-violet-400/30'
                  : 'bg-cyan-400/30',
              )}
            />
          )}
          <span
            className={cn(
              'relative grid size-9 place-items-center rounded-lg ring-2 transition-transform duration-200 group-hover:scale-110',
              ACCENT_BG[agent.accent],
              STATUS_RING[agent.status],
              selected && 'scale-110 ring-[var(--at-accent)]',
            )}
          >
            <AgentGlyph role={agent.role} accent={agent.accent} className="size-[18px]" />
          </span>
          <span
            aria-hidden
            className={cn(
              'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-[var(--at-canvas)]',
              STATUS_DOT[agent.status],
            )}
          />
        </span>
        <span className="max-w-[92px] truncate rounded bg-[var(--at-canvas)]/85 px-1 text-[10px] font-medium text-[var(--at-text)]">
          {agent.name}
        </span>
        {agent.currentTask && (
          <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 hidden w-44 -translate-x-1/2 rounded-md at-glass px-2 py-1.5 text-[11px] leading-snug text-[var(--at-text)] shadow-xl group-hover:block group-focus-visible:block">
            <span className="block font-medium">{AGENT_STATUS_LABEL[agent.status]}</span>
            <span className="block text-[var(--at-text-muted)]">{agent.currentTask}</span>
          </span>
        )}
      </span>
    </button>
  );
}
