import type {
  ActivityEvent,
  Agent,
  AgentMessage,
  Artifact,
  Decision,
  Feature,
  Room,
  RoomState,
  StageGroup,
  Task,
} from '@/types/domain';
import { STAGE_GROUPS } from '@/types/domain';
import type { TownData } from '@/mock';
import { pct } from '@/lib/utils';

/** Room 상태는 저장하지 않고 그 방에 있는 Agent 들로부터 파생한다. */
export function roomState(roomId: string, agents: readonly Agent[]): RoomState {
  const inRoom = agents.filter((a) => a.roomId === roomId);
  if (inRoom.length === 0) return 'IDLE';
  if (inRoom.some((a) => a.status === 'BLOCKED')) return 'BLOCKED';
  if (inRoom.some((a) => a.status === 'WAITING_FOR_APPROVAL')) return 'WAITING';
  if (inRoom.some((a) => ['THINKING', 'DISCUSSING', 'CODING', 'TESTING'].includes(a.status))) {
    return 'ACTIVE';
  }
  if (inRoom.every((a) => a.status === 'COMPLETED')) return 'COMPLETED';
  return 'IDLE';
}

export function agentsInRoom(roomId: string, agents: readonly Agent[]): Agent[] {
  return agents.filter((a) => a.roomId === roomId);
}

export function featureProgress(feature: Feature): number {
  const completed = feature.stages.filter((s) => s.status === 'COMPLETED').length;
  return pct(completed, feature.stages.length);
}

export function currentStage(feature: Feature): Feature['stages'][number] | undefined {
  return (
    feature.stages.find((s) => s.status === 'IN_PROGRESS' || s.status === 'WAITING' || s.status === 'BLOCKED') ??
    feature.stages.find((s) => s.status === 'PENDING')
  );
}

export interface StageGroupView {
  group: StageGroup;
  label: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'WAITING' | 'BLOCKED' | 'COMPLETED';
}

/** 상단 Status Bar 용 축약 단계. 여러 stage 가 한 group 에 묶인다. */
export function stageGroups(feature: Feature): StageGroupView[] {
  return STAGE_GROUPS.map((group) => {
    if (group === 'DONE') {
      return {
        group,
        label: 'Done',
        status: feature.status === 'DONE' ? ('COMPLETED' as const) : ('PENDING' as const),
      };
    }
    const stages = feature.stages.filter((s) => s.group === group);
    if (stages.length === 0) return { group, label: group, status: 'PENDING' as const };
    if (stages.some((s) => s.status === 'BLOCKED')) return { group, label: group, status: 'BLOCKED' as const };
    if (stages.some((s) => s.status === 'WAITING')) return { group, label: group, status: 'WAITING' as const };
    if (stages.some((s) => s.status === 'IN_PROGRESS')) return { group, label: group, status: 'IN_PROGRESS' as const };
    if (stages.every((s) => s.status === 'COMPLETED')) return { group, label: group, status: 'COMPLETED' as const };
    return { group, label: group, status: 'PENDING' as const };
  });
}

export function messagesOf(data: TownData, featureId: string): AgentMessage[] {
  return data.messages
    .filter((m) => m.featureId === featureId)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function eventsOf(data: TownData, featureId: string | null): ActivityEvent[] {
  return data.events
    .filter((e) => (featureId ? e.featureId === featureId : true))
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function artifactsOf(data: TownData, featureId: string): Artifact[] {
  return data.artifacts.filter((a) => a.featureId === featureId);
}

export function tasksOf(data: TownData, featureId: string): Task[] {
  return data.tasks.filter((t) => t.featureId === featureId);
}

export function decisionsOf(data: TownData, featureId: string): Decision[] {
  return data.decisions.filter((d) => d.featureId === featureId);
}

export function openDecisions(data: TownData): Decision[] {
  return data.decisions.filter((d) => d.status === 'OPEN' || d.status === 'NEEDS_DISCUSSION');
}

export function blockedTasks(data: TownData): Task[] {
  return data.tasks.filter((t) => t.status === 'BLOCKED');
}

export function activeFeatures(data: TownData): Feature[] {
  return data.features.filter((f) => f.status !== 'DONE');
}

export function connectedAgents(data: TownData): Agent[] {
  return data.agents.filter((a) => a.connection !== 'OFFLINE');
}

export function featureBlockers(data: TownData, featureId: string): ActivityEvent[] {
  return data.events.filter((e) => e.featureId === featureId && e.category === 'BLOCKER');
}

export function agentById(data: TownData, id: string): Agent | undefined {
  return data.agents.find((a) => a.id === id);
}

export function roomById(data: TownData, id: string): Room | undefined {
  return data.rooms.find((r) => r.id === id);
}

export function featureById(data: TownData, id: string): Feature | undefined {
  return data.features.find((f) => f.id === id);
}

export function displayName(data: TownData, id: string): string {
  if (id === 'human') return '사용자';
  if (id === 'all') return '전체';
  if (id === 'system') return 'System';
  return data.agents.find((a) => a.id === id)?.name ?? id;
}

export function unreadCount(data: TownData): number {
  return data.notifications.filter((n) => !n.read).length;
}
