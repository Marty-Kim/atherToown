'use client';

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCode2,
  Gavel,
  HelpCircle,
  ListTodo,
  MessageSquare,
  Repeat2,
  Sparkles,
} from 'lucide-react';
import type { AgentMessage, MessageType } from '@/types/domain';
import { useTownStore } from '@/store/town-store';
import { displayName } from '@/store/selectors';
import { Badge } from '@/components/ui/badge';
import { ArtifactCard } from '@/components/artifacts/ArtifactCard';
import { MESSAGE_TYPE_LABEL, MESSAGE_TYPE_TONE } from '@/lib/labels';
import { formatClock } from '@/lib/utils';
import { AgentGlyph, ACCENT_BG } from '@/components/workspace/AgentGlyph';

const TYPE_ICON: Record<MessageType, React.ComponentType<{ className?: string }>> = {
  QUESTION: HelpCircle,
  ANSWER: MessageSquare,
  PROPOSAL: Sparkles,
  COUNTER_PROPOSAL: Repeat2,
  DECISION_REQUEST: Gavel,
  DECISION: Gavel,
  TASK_ASSIGNMENT: ListTodo,
  ARTIFACT_CREATED: FileCode2,
  BLOCKED: AlertTriangle,
  COMPLETED: CheckCircle2,
};

function extra(message: AgentMessage): string | null {
  switch (message.type) {
    case 'QUESTION':
      return `주제: ${message.topic}`;
    case 'PROPOSAL':
    case 'COUNTER_PROPOSAL':
      return `제안: ${message.optionLabel}`;
    case 'BLOCKED':
      return `사유: ${message.reason}`;
    case 'COMPLETED':
      return message.stage ? `완료 단계: ${message.stage}` : null;
    default:
      return null;
  }
}

export function MessageCard({ message }: { message: AgentMessage }) {
  const data = useTownStore((s) => s.data);
  const feature = data.features.find((f) => f.id === message.featureId);
  const fromAgent = data.agents.find((a) => a.id === message.fromAgentId);
  const artifact = message.artifactId
    ? data.artifacts.find((a) => a.id === message.artifactId)
    : undefined;
  const Icon = TYPE_ICON[message.type];
  const detail = extra(message);

  return (
    <article className="at-fade-up rounded-lg bg-[var(--at-surface-1)] p-3 ring-1 ring-[var(--at-border)]">
      <header className="flex flex-wrap items-center gap-2">
        {fromAgent ? (
          <span className={`grid size-7 shrink-0 place-items-center rounded-md ring-1 ${ACCENT_BG[fromAgent.accent]}`}>
            <AgentGlyph role={fromAgent.role} accent={fromAgent.accent} className="size-4" />
          </span>
        ) : (
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#2b3a63] text-[10px] font-semibold text-[#c8d4ff]">
            나
          </span>
        )}
        <span className="flex min-w-0 flex-wrap items-center gap-1 text-[12.5px]">
          <span className="font-medium">{displayName(data, message.fromAgentId)}</span>
          <ArrowRight className="size-3 text-[var(--at-text-dim)]" aria-hidden />
          <span className="text-[var(--at-text-muted)]">{displayName(data, message.toAgentId)}</span>
        </span>
        <Badge tone={MESSAGE_TYPE_TONE[message.type]} icon={<Icon />}>
          {MESSAGE_TYPE_LABEL[message.type]}
        </Badge>
        {message.blocking && (
          <Badge tone="danger" icon={<AlertTriangle />}>
            blocking
          </Badge>
        )}
        <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-[var(--at-text-dim)]">
          {formatClock(message.createdAt)}
        </span>
      </header>

      <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-[var(--at-text)]">
        {message.body}
      </p>

      {detail && <p className="text-meta mt-1.5">{detail}</p>}

      <footer className="mt-2 flex flex-wrap items-center gap-2">
        {feature && (
          <span className="rounded bg-[var(--at-surface-2)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--at-text-dim)]">
            {feature.key}
          </span>
        )}
      </footer>

      {artifact && (
        <div className="mt-2">
          <ArtifactCard artifact={artifact} />
        </div>
      )}
    </article>
  );
}
