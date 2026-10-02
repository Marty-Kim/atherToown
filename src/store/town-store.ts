'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Agent,
  AgentId,
  FeatureId,
  Notification,
  Selection,
  SimulationEvent,
  SimulationStep,
  TaskId,
  TaskStatus,
} from '@/types/domain';
import {
  buildGenesisData,
  buildLiveBaseData,
  CURRENT_USER_ID,
  PAY142_ID,
  type TownData,
} from '@/mock';
import type { HubSnapshot, PendingApproval, RunnerPublic } from '@/protocol/protocol';
import {
  advanceSimulation,
  applyStep,
  rejectDecision as rejectDecisionReducer,
  resolveDecision,
  type DecisionOutcome,
} from './reducer';
import { buildSeedData } from './seed';
import {
  agentService,
  TEAM_TO_ROOM,
  type ConnectAgentInput,
  type CreateFeatureInput,
} from '@/services/agent-service';
import { nextId } from '@/lib/utils';

export const STORAGE_KEY = 'agent-town-state-v1';

/** mock = 내장 시나리오 재생, live = 사내망 러너가 실제로 움직임. */
export type TownMode = 'mock' | 'live';

export type HubStatus = 'idle' | 'connecting' | 'online' | 'offline';

export interface HubState {
  status: HubStatus;
  runners: RunnerPublic[];
  pending: PendingApproval[];
  lastSeq: number;
}

const EMPTY_HUB: HubState = { status: 'idle', runners: [], pending: [], lastSeq: 0 };

interface UiState {
  activeFeatureId: FeatureId;
  selection: Selection;
  sidebarCollapsed: boolean;
}

interface TownStore extends UiState {
  data: TownData;
  mode: TownMode;
  hub: HubState;
  /** 시뮬레이션 스크립트는 서비스에서 받아오며 localStorage 에 저장하지 않는다. */
  scripts: Record<string, readonly SimulationEvent[]>;
  busy: boolean;

  setSelection: (selection: Selection) => void;
  setActiveFeature: (featureId: FeatureId) => void;
  toggleSidebar: () => void;

  ensureScript: (featureId: FeatureId) => Promise<void>;
  startSimulation: () => void;
  pauseSimulation: () => void;
  stepSimulation: () => void;
  resetSimulation: () => void;
  setSpeed: (ms: number) => void;

  approveDecision: (decisionId: string, optionId: string, note: string | null) => DecisionOutcome;
  rejectDecision: (decisionId: string, note: string | null) => DecisionOutcome;

  setTaskStatus: (taskId: TaskId, status: TaskStatus) => void;
  toggleAgentPause: (agentId: AgentId) => void;

  sendHumanMessage: (featureId: FeatureId, toAgentId: string, body: string) => Promise<void>;
  createFeature: (input: CreateFeatureInput) => Promise<FeatureId>;
  connectAgent: (input: ConnectAgentInput) => Promise<Agent>;

  markNotificationsRead: () => void;
  resetWorkspace: () => void;

  /* ---- live 모드 ---- */
  setMode: (mode: TownMode) => void;
  setHubStatus: (status: HubStatus) => void;
  applyHubSnapshot: (snapshot: HubSnapshot) => void;
  applyHubStep: (seq: number, step: SimulationStep) => void;
  setHubRunners: (runners: RunnerPublic[]) => void;
  setHubPending: (pending: PendingApproval[]) => void;
  /** 이 결정이 허브의 승인 대기열에 있으면 그 requestId. */
  pendingRequestIdFor: (decisionId: string) => string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

export const useTownStore = create<TownStore>()(
  persist(
    (set, get) => ({
      data: buildSeedData(),
      mode: 'mock',
      hub: EMPTY_HUB,
      scripts: {},
      busy: false,
      activeFeatureId: PAY142_ID,
      selection: { kind: 'feature', id: PAY142_ID },
      sidebarCollapsed: false,

      setSelection: (selection) => set({ selection }),
      setActiveFeature: (featureId) =>
        set({ activeFeatureId: featureId, selection: { kind: 'feature', id: featureId } }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      ensureScript: async (featureId) => {
        if (get().scripts[featureId]) return;
        const script = await agentService.getScript(featureId);
        set((s) => ({ scripts: { ...s.scripts, [featureId]: script } }));
      },

      startSimulation: () =>
        set((s) => {
          const script = s.scripts[s.data.simulation.featureId] ?? [];
          if (s.data.simulation.cursor >= script.length) return s;
          if (s.data.simulation.status === 'AWAITING_HUMAN') return s;
          return { data: { ...s.data, simulation: { ...s.data.simulation, status: 'RUNNING' } } };
        }),

      pauseSimulation: () =>
        set((s) =>
          s.data.simulation.status === 'RUNNING'
            ? { data: { ...s.data, simulation: { ...s.data.simulation, status: 'PAUSED' } } }
            : s,
        ),

      stepSimulation: () =>
        set((s) => {
          const { simulation } = s.data;
          if (simulation.status === 'AWAITING_HUMAN') return s;
          const script = s.scripts[simulation.featureId] ?? [];
          if (simulation.cursor >= script.length) {
            return { data: { ...s.data, simulation: { ...simulation, status: 'FINISHED' } } };
          }
          return { data: advanceSimulation(s.data, script) };
        }),

      resetSimulation: () =>
        set((s) => {
          const genesis = buildGenesisData();
          return {
            data: {
              ...genesis,
              /* 사용자가 직접 만든 Feature / Agent 는 유지한다 */
              features: [
                ...genesis.features,
                ...s.data.features.filter(
                  (f) => !genesis.features.some((g) => g.id === f.id),
                ),
              ],
              agents: [
                ...genesis.agents,
                ...s.data.agents.filter((a) => !genesis.agents.some((g) => g.id === a.id)),
              ],
              tasks: [
                ...genesis.tasks,
                ...s.data.tasks.filter((t) => !genesis.tasks.some((g) => g.id === t.id)),
              ],
              simulation: { ...genesis.simulation, speedMs: s.data.simulation.speedMs },
            },
            selection: { kind: 'feature', id: PAY142_ID },
            activeFeatureId: PAY142_ID,
          };
        }),

      setSpeed: (ms) =>
        set((s) => ({ data: { ...s.data, simulation: { ...s.data.simulation, speedMs: ms } } })),

      approveDecision: (decisionId, optionId, note) => {
        const outcome = resolveDecision(get().data, decisionId, optionId, note, nowIso());
        set({ data: outcome.data });
        return outcome;
      },

      rejectDecision: (decisionId, note) => {
        const outcome = rejectDecisionReducer(get().data, decisionId, note, nowIso());
        set({ data: outcome.data });
        return outcome;
      },

      setTaskStatus: (taskId, status) =>
        set((s) => {
          const task = s.data.tasks.find((t) => t.id === taskId);
          if (!task) return s;
          const withTask = applyStep(s.data, { kind: 'TASK_STATUS', taskId, status }, task.featureId);
          return {
            data: {
              ...withTask,
              tasks: withTask.tasks.map((t) =>
                t.id === taskId ? { ...t, updatedAt: nowIso() } : t,
              ),
              events: [
                ...withTask.events,
                {
                  id: nextId('ev'),
                  featureId: task.featureId,
                  at: nowIso(),
                  actorAgentId: 'human',
                  summary: `사용자가 "${task.title}" 상태를 ${status}로 변경함`,
                  category: 'TASK',
                  taskId,
                  toStatus: status,
                },
              ],
            },
          };
        }),

      toggleAgentPause: (agentId) =>
        set((s) => ({
          data: {
            ...s.data,
            agents: s.data.agents.map((agent) =>
              agent.id === agentId
                ? {
                    ...agent,
                    status: agent.status === 'IDLE' ? 'THINKING' : 'IDLE',
                    currentTask: agent.status === 'IDLE' ? agent.currentTask : null,
                  }
                : agent,
            ),
          },
        })),

      sendHumanMessage: async (featureId, toAgentId, body) => {
        const input = { featureId, toAgentId, body };
        const message = await agentService.sendHumanMessage(input);
        set((s) => ({
          data: {
            ...s.data,
            messages: [...s.data.messages, message],
            events: [
              ...s.data.events,
              {
                id: nextId('ev'),
                featureId,
                at: message.createdAt,
                actorAgentId: 'human',
                summary: '사용자가 메시지를 보냄',
                category: 'CONVERSATION',
                messageId: message.id,
              },
            ],
          },
        }));

        const replyFrom =
          toAgentId === 'all'
            ? (get().data.features.find((f) => f.id === featureId)?.agentIds[0] ?? 'agent_coordinator')
            : toAgentId;
        const reply = await agentService.replyToHuman(input, replyFrom);
        set((s) => ({
          data: {
            ...s.data,
            messages: [...s.data.messages, reply],
            events: [
              ...s.data.events,
              {
                id: nextId('ev'),
                featureId,
                at: reply.createdAt,
                actorAgentId: replyFrom,
                summary: 'Agent가 사용자 메시지에 응답함',
                category: 'CONVERSATION',
                messageId: reply.id,
              },
            ],
          },
        }));
      },

      createFeature: async (input) => {
        set({ busy: true });
        try {
          const { feature, tasks } = await agentService.createFeature(input);
          const coordinatorRoom = 'room_planning';
          set((s) => ({
            data: {
              ...s.data,
              features: [...s.data.features, feature],
              tasks: [...s.data.tasks, ...tasks],
              agents: s.data.agents.map((agent) =>
                agent.role === 'COORDINATOR'
                  ? {
                      ...agent,
                      status: 'THINKING',
                      roomId: coordinatorRoom,
                      currentTask: `${feature.key} 요구사항 분석 중`,
                      featureId: feature.id,
                    }
                  : agent,
              ),
              messages: [
                ...s.data.messages,
                {
                  id: nextId('msg'),
                  featureId: feature.id,
                  type: 'QUESTION',
                  topic: '요구사항 확인',
                  fromAgentId: 'agent_coordinator',
                  toAgentId: 'human',
                  body: `"${feature.name}" 요구사항을 분석하고 있습니다. 참여 팀은 ${input.teams.join(' · ')} 이며, autonomy Level ${input.autonomy} 기준으로 작업을 분해하겠습니다.`,
                  createdAt: feature.startedAt,
                  artifactId: null,
                  blocking: false,
                },
              ],
              events: [
                ...s.data.events,
                {
                  id: nextId('ev'),
                  featureId: feature.id,
                  at: feature.startedAt,
                  actorAgentId: 'agent_coordinator',
                  summary: `${feature.key} Feature Room이 생성되고 요구사항 분석이 시작됨`,
                  category: 'TASK',
                  taskId: tasks[0]?.id ?? 'unknown',
                  toStatus: 'IN_PROGRESS',
                },
              ],
              notifications: [
                {
                  id: nextId('noti'),
                  title: 'Feature Room이 생성되었습니다',
                  body: `${feature.key} · ${feature.name}`,
                  createdAt: feature.startedAt,
                  read: false,
                  featureId: feature.id,
                  kind: 'COMPLETION',
                } satisfies Notification,
                ...s.data.notifications,
              ],
            },
            activeFeatureId: feature.id,
            selection: { kind: 'feature', id: feature.id },
          }));
          return feature.id;
        } finally {
          set({ busy: false });
        }
      },

      connectAgent: async (input) => {
        set({ busy: true });
        try {
          const agent = await agentService.connectAgent(input);
          set((s) => ({
            data: {
              ...s.data,
              agents: [...s.data.agents, { ...agent, roomId: TEAM_TO_ROOM[input.team] ?? 'room_planning' }],
              notifications: [
                {
                  id: nextId('noti'),
                  title: 'Agent가 연결되었습니다',
                  body: `${agent.name} · ${input.team} 팀`,
                  createdAt: agent.lastActiveAt,
                  read: false,
                  featureId: null,
                  kind: 'COMPLETION',
                } satisfies Notification,
                ...s.data.notifications,
              ],
            },
          }));
          return agent;
        } finally {
          set({ busy: false });
        }
      },

      markNotificationsRead: () =>
        set((s) => ({
          data: {
            ...s.data,
            notifications: s.data.notifications.map((n) => ({ ...n, read: true })),
          },
        })),

      resetWorkspace: () =>
        set((s) => ({
          data: s.mode === 'live' ? buildLiveBaseData() : buildSeedData(),
          activeFeatureId: PAY142_ID,
          selection: { kind: 'feature', id: PAY142_ID },
          hub: s.mode === 'live' ? { ...s.hub, pending: [], lastSeq: 0 } : EMPTY_HUB,
        })),

      setMode: (mode) =>
        set({
          mode,
          data: mode === 'live' ? buildLiveBaseData() : buildSeedData(),
          hub: mode === 'live' ? { ...EMPTY_HUB, status: 'connecting' } : EMPTY_HUB,
          selection: { kind: 'none' },
          activeFeatureId: PAY142_ID,
        }),

      setHubStatus: (status) => set((s) => ({ hub: { ...s.hub, status } })),

      /**
       * 허브 스냅샷은 "live 기본 상태 + 스텝 전량 재적용" 으로 만든다.
       * 브라우저가 늦게 접속해도 같은 reducer 를 거치므로 결과가 동일하다.
       */
      applyHubSnapshot: (snapshot) =>
        set(() => {
          const data = snapshot.steps.reduce(
            (acc, step) => applyStep(acc, step, PAY142_ID),
            buildLiveBaseData(),
          );
          return {
            data,
            hub: {
              status: 'online',
              runners: snapshot.runners,
              pending: snapshot.pending,
              lastSeq: snapshot.seq,
            },
          };
        }),

      applyHubStep: (seq, step) =>
        set((s) => {
          if (seq <= s.hub.lastSeq) return s;
          const featureId = s.activeFeatureId || PAY142_ID;
          return {
            data: applyStep(s.data, step, featureId),
            hub: { ...s.hub, lastSeq: seq },
          };
        }),

      setHubRunners: (runners) => set((s) => ({ hub: { ...s.hub, runners } })),
      setHubPending: (pending) => set((s) => ({ hub: { ...s.hub, pending } })),

      pendingRequestIdFor: (decisionId) => {
        const match = get().hub.pending.find(
          (p) => p.kind === 'DECISION' && p.decision.id === decisionId,
        );
        return match ? match.requestId : null;
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        data: state.mode === 'live' ? buildLiveBaseData() : state.data,
        mode: state.mode,
        activeFeatureId: state.activeFeatureId,
        selection: state.selection,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
      onRehydrateStorage: () => (state) => {
        /* 새로고침 시 타이머는 살아 있지 않으므로 RUNNING 은 PAUSED 로 되돌린다. */
        if (state && state.data.simulation.status === 'RUNNING') {
          state.data = { ...state.data, simulation: { ...state.data.simulation, status: 'PAUSED' } };
        }
      },
    },
  ),
);

export { CURRENT_USER_ID };
