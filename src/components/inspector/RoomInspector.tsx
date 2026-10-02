'use client';

import type { Room } from '@/types/domain';
import { useTownStore } from '@/store/town-store';
import { agentsInRoom, roomState } from '@/store/selectors';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AgentChip } from '@/components/common/AgentChip';
import { ArtifactCard } from '@/components/artifacts/ArtifactCard';
import { ROOM_STATE_LABEL, ROOM_STATE_TONE } from '@/lib/labels';
import { formatClock } from '@/lib/utils';
import { Section, Row } from './parts';

export function RoomInspector({ room }: { room: Room }) {
  const data = useTownStore((s) => s.data);
  const setSelection = useTownStore((s) => s.setSelection);
  const occupants = agentsInRoom(room.id, data.agents);
  const state = roomState(room.id, data.agents);

  const featureIds = Array.from(
    new Set(occupants.map((a) => a.featureId).filter((id): id is string => Boolean(id))),
  );
  const features = data.features.filter((f) => featureIds.includes(f.id));
  const activity = data.events
    .filter((e) => featureIds.includes(e.featureId))
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);
  const artifacts = data.artifacts.filter((a) => featureIds.includes(a.featureId)).slice(0, 3);
  const blockers = data.events.filter((e) => e.category === 'BLOCKER' && featureIds.includes(e.featureId));

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-semibold tracking-tight">{room.name}</p>
          <Badge tone={ROOM_STATE_TONE[state]}>{ROOM_STATE_LABEL[state]}</Badge>
        </div>
        <p className="text-meta mt-1">{room.description}</p>
      </div>

      <Separator />

      <Section title={`현재 참여 Agent (${occupants.length})`}>
        {occupants.length === 0 ? (
          <p className="text-meta">
            {room.kind === 'BLOCKED_ZONE'
              ? '차단된 Agent가 없습니다. 비어 있는 것이 정상입니다.'
              : '이 공간에 있는 Agent가 없습니다.'}
          </p>
        ) : (
          <div className="space-y-0.5">
            {occupants.map((agent) => (
              <AgentChip
                key={agent.id}
                agent={agent}
                onClick={() => setSelection({ kind: 'agent', id: agent.id })}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="진행 중인 Feature">
        {features.length === 0 ? (
          <p className="text-meta">연결된 Feature가 없습니다.</p>
        ) : (
          features.map((feature) => (
            <Row key={feature.id} label={feature.key} value={feature.name} />
          ))
        )}
      </Section>

      <Section title="최근 activity">
        {activity.length === 0 ? (
          <p className="text-meta">기록된 활동이 없습니다.</p>
        ) : (
          <ol className="space-y-1.5">
            {activity.map((event) => (
              <li key={event.id} className="flex gap-2 text-[12px]">
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--at-text-dim)]">
                  {formatClock(event.at)}
                </span>
                <span className="min-w-0">{event.summary}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="관련 artifact">
        {artifacts.length === 0 ? (
          <p className="text-meta">생성된 산출물이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {artifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Blocker">
        {blockers.length === 0 ? (
          <p className="text-meta">차단 사항이 없습니다.</p>
        ) : (
          <ul className="space-y-1">
            {blockers.map((event) => (
              <li key={event.id} className="text-[12px] text-rose-200/90">
                {event.summary}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
