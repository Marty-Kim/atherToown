'use client';

import * as React from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import type { Feature, MessageType } from '@/types/domain';
import { MESSAGE_TYPES } from '@/types/domain';
import { useTownStore } from '@/store/town-store';
import { messagesOf } from '@/store/selectors';
import { MessageCard } from './MessageCard';
import { DecisionCard } from '@/components/decisions/DecisionCard';
import { EmptyState } from '@/components/ui/states';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MESSAGE_TYPE_LABEL } from '@/lib/labels';
import { cn } from '@/lib/utils';

export function ConversationPanel({ feature, className }: { feature: Feature; className?: string }) {
  const data = useTownStore((s) => s.data);
  const send = useTownStore((s) => s.sendHumanMessage);

  const [active, setActive] = React.useState<MessageType[]>([]);
  const [recipient, setRecipient] = React.useState('all');
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  const all = messagesOf(data, feature.id);
  const visible = active.length === 0 ? all : all.filter((m) => active.includes(m.type));
  const participants = data.agents.filter((a) => feature.agentIds.includes(a.id));

  React.useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [all.length]);

  function toggle(type: MessageType) {
    setActive((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (draft.trim() === '') return;
    setSending(true);
    try {
      await send(feature.id, recipient, draft.trim());
      setDraft('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto at-scroll-thin border-b border-[var(--at-border-soft)] px-3 py-2">
        <FilterChip label="All" active={active.length === 0} onClick={() => setActive([])} />
        {MESSAGE_TYPES.map((type) => (
          <FilterChip
            key={type}
            label={MESSAGE_TYPE_LABEL[type]}
            active={active.includes(type)}
            onClick={() => toggle(type)}
          />
        ))}
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto at-scroll-thin p-3">
        {visible.length === 0 ? (
          <EmptyState
            icon={<MessageSquare />}
            title={all.length === 0 ? '아직 대화가 없습니다' : '이 필터에 해당하는 메시지가 없습니다'}
            description={
              all.length === 0
                ? '상단의 Start를 눌러 Agent 협업을 재생하거나, 아래 입력창으로 직접 질문해 보세요.'
                : 'All을 눌러 전체 메시지를 다시 확인할 수 있습니다.'
            }
            action={
              all.length > 0 ? (
                <Button variant="outline" size="sm" onClick={() => setActive([])}>
                  필터 초기화
                </Button>
              ) : undefined
            }
          />
        ) : (
          visible.map((message) => {
            if (message.type === 'DECISION_REQUEST') {
              const decision = data.decisions.find((d) => d.id === message.decisionId);
              if (decision) {
                return (
                  <div key={message.id} className="at-fade-up space-y-2">
                    <MessageCard message={message} />
                    <DecisionCard decision={decision} />
                  </div>
                );
              }
            }
            return <MessageCard key={message.id} message={message} />;
          })
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="flex shrink-0 flex-wrap items-end gap-2 border-t border-[var(--at-border-soft)] bg-[var(--at-surface-1)] p-3"
      >
        <div className="shrink-0">
          <label htmlFor="conversation-to" className="sr-only">
            받는 Agent
          </label>
          <Select value={recipient} onValueChange={setRecipient}>
            <SelectTrigger id="conversation-to" className="h-9 w-40 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체에게</SelectItem>
              {participants.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          aria-label="Agent에게 보낼 메시지"
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              void handleSend(e);
            }
          }}
          placeholder="Agent에게 맥락을 추가하거나 질문을 남겨 보세요. (⌘/Ctrl + Enter 전송)"
          className="min-w-[160px] flex-1 resize-none"
        />
        <Button type="submit" variant="primary" disabled={sending || draft.trim() === ''}>
          {sending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          보내기
        </Button>
      </form>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 transition-colors',
        active
          ? 'bg-[#3d5bd9]/22 text-[#c6d2fb] ring-[#3d5bd9]/60'
          : 'bg-[var(--at-surface-2)] text-[var(--at-text-muted)] ring-[var(--at-border)] hover:text-[var(--at-text)]',
      )}
    >
      {label}
    </button>
  );
}
