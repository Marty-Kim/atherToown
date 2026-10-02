'use client';

import { MousePointerClick } from 'lucide-react';
import { useTownStore } from '@/store/town-store';
import { EmptyState } from '@/components/ui/states';
import { AgentInspector } from './AgentInspector';
import { RoomInspector } from './RoomInspector';
import { FeatureInspector } from './FeatureInspector';
import { cn } from '@/lib/utils';

export function InspectorPanel({
  className,
  onStartChat,
}: {
  className?: string;
  onStartChat?: (agentId: string) => void;
}) {
  const data = useTownStore((s) => s.data);
  const selection = useTownStore((s) => s.selection);

  const agent = selection.kind === 'agent' ? data.agents.find((a) => a.id === selection.id) : undefined;
  const room = selection.kind === 'room' ? data.rooms.find((r) => r.id === selection.id) : undefined;
  const feature =
    selection.kind === 'feature' ? data.features.find((f) => f.id === selection.id) : undefined;

  return (
    <aside
      aria-label="상세 정보"
      className={cn(
        'flex min-h-0 flex-col border-l border-[var(--at-border)] bg-[var(--at-surface-1)]',
        className,
      )}
    >
      <div className="shrink-0 border-b border-[var(--at-border-soft)] px-4 py-2.5">
        <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--at-text-dim)]">
          Inspector
        </h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto at-scroll-thin p-4">
        {agent ? (
          <AgentInspector agent={agent} onStartChat={onStartChat} />
        ) : room ? (
          <RoomInspector room={room} />
        ) : feature ? (
          <FeatureInspector feature={feature} />
        ) : (
          <EmptyState
            icon={<MousePointerClick />}
            title="대상을 선택해 주세요"
            description="가상 오피스에서 Room이나 Agent를 클릭하면 상세 정보가 여기에 표시됩니다."
          />
        )}
      </div>
    </aside>
  );
}
