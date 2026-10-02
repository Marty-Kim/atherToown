'use client';

import Link from 'next/link';
import { Bot, Gavel, OctagonAlert, SquareStack } from 'lucide-react';
import { useTownStore } from '@/store/town-store';
import { activeFeatures, blockedTasks, connectedAgents, openDecisions } from '@/store/selectors';
import { cn } from '@/lib/utils';

interface SummaryCard {
  label: string;
  value: number;
  hint: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

export function SummaryCards() {
  const data = useTownStore((s) => s.data);

  const cards: SummaryCard[] = [
    {
      label: 'Active Features',
      value: activeFeatures(data).length,
      hint: '진행 중인 기능',
      href: '/features',
      icon: SquareStack,
      accent: 'text-blue-300',
    },
    {
      label: 'Connected Agents',
      value: connectedAgents(data).length,
      hint: `전체 ${data.agents.length}개 중 연결됨`,
      href: '/agents',
      icon: Bot,
      accent: 'text-violet-300',
    },
    {
      label: 'Pending Decisions',
      value: openDecisions(data).length,
      hint: '사람의 결정을 기다리는 중',
      href: '/decisions',
      icon: Gavel,
      accent: 'text-amber-300',
    },
    {
      label: 'Blocked Tasks',
      value: blockedTasks(data).length,
      hint: '차단되어 진행 불가',
      href: '/features',
      icon: OctagonAlert,
      accent: 'text-rose-300',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.label}
            href={card.href}
            className="at-panel group flex flex-col gap-2 p-3.5 transition-colors hover:bg-[var(--at-surface-2)]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] text-[var(--at-text-muted)]">{card.label}</span>
              <Icon className={cn('size-4', card.accent)} aria-hidden />
            </div>
            <span className="text-[26px] font-semibold leading-none tracking-tight tabular-nums">
              {card.value}
            </span>
            <span className="text-[11.5px] text-[var(--at-text-dim)]">{card.hint}</span>
          </Link>
        );
      })}
    </div>
  );
}
