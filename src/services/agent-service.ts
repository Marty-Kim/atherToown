import type {
  Agent,
  AgentCapability,
  AgentMessage,
  AgentProvider,
  AutonomyLevel,
  Feature,
  FeatureId,
  PermissionLevel,
  Priority,
  SimulationEvent,
  Task,
  TeamKind,
} from '@/types/domain';
import { permissionOf } from '@/mock/agents';
import { PAY142_SCRIPT } from '@/mock/script';
import { PAY142_ID, PAY142_STAGES } from '@/mock/features';
import { nextId } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * 외부 연동 경계
 *
 * UI 와 store 는 이 인터페이스에만 의존한다.
 * 실제 LLM / GitHub 연동 시 MockAgentService 를 다른 구현으로 교체하면 된다.
 * ------------------------------------------------------------------ */

export interface ConnectAgentInput {
  name: string;
  provider: AgentProvider;
  team: TeamKind;
  role: Agent['role'];
  capabilities: AgentCapability[];
  repositories: string[];
  permission: PermissionLevel;
  connectedBy: string;
}

export interface CreateFeatureInput {
  name: string;
  description: string;
  teams: TeamKind[];
  priority: Priority;
  repository: string;
  dueDate: string | null;
  autonomy: AutonomyLevel;
}

export interface CreateFeatureResult {
  feature: Feature;
  tasks: Task[];
}

export interface SendMessageInput {
  featureId: FeatureId;
  toAgentId: string;
  body: string;
}

export interface AgentRuntimeService {
  /** Feature 시나리오 스크립트. 실제 연동 시에는 서버 스트림이 이 자리를 대신한다. */
  getScript(featureId: FeatureId): Promise<readonly SimulationEvent[]>;
  connectAgent(input: ConnectAgentInput): Promise<Agent>;
  createFeature(input: CreateFeatureInput): Promise<CreateFeatureResult>;
  sendHumanMessage(input: SendMessageInput): Promise<AgentMessage>;
  /** Agent 가 사람 메시지에 반응하는 응답. 실제 연동에서는 모델 호출이다. */
  replyToHuman(input: SendMessageInput, fromAgentId: string): Promise<AgentMessage>;
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const TEAM_TO_ROLE: Record<TeamKind, Agent['role']> = {
  APP: 'APP',
  FE: 'FE',
  BE: 'BE',
  QA: 'QA',
  PLATFORM: 'REVIEWER',
};

const TEAM_TO_ROOM: Record<TeamKind, string> = {
  APP: 'room_app',
  FE: 'room_fe',
  BE: 'room_be',
  QA: 'room_integration',
  PLATFORM: 'room_review',
};

const ACCENTS: readonly Agent['accent'][] = ['violet', 'cyan', 'blue', 'emerald', 'amber', 'rose'];

export class MockAgentService implements AgentRuntimeService {
  constructor(private readonly latencyMs = 420) {}

  async getScript(featureId: FeatureId): Promise<readonly SimulationEvent[]> {
    await delay(0);
    return featureId === PAY142_ID ? PAY142_SCRIPT : [];
  }

  async connectAgent(input: ConnectAgentInput): Promise<Agent> {
    await delay(this.latencyMs);
    if (input.name.trim().length === 0) {
      throw new Error('Agent 이름이 필요합니다.');
    }
    const accentIndex = input.name.length % ACCENTS.length;
    return {
      id: nextId('agent'),
      name: input.name.trim(),
      role: input.role,
      provider: input.provider,
      team: input.team,
      connectedBy: input.connectedBy,
      capabilities: input.capabilities,
      repositories: input.repositories,
      permission: permissionOf(input.permission),
      connection: 'CONNECTED',
      status: 'IDLE',
      currentTask: null,
      roomId: TEAM_TO_ROOM[input.team] ?? 'room_planning',
      featureId: null,
      lastActiveAt: new Date().toISOString(),
      accent: ACCENTS[accentIndex] ?? 'violet',
    };
  }

  async createFeature(input: CreateFeatureInput): Promise<CreateFeatureResult> {
    await delay(this.latencyMs);
    if (input.name.trim().length === 0) {
      throw new Error('Feature 이름이 필요합니다.');
    }
    if (input.teams.length === 0) {
      throw new Error('참여 팀을 한 개 이상 선택해 주세요.');
    }

    const id = nextId('feat');
    const now = new Date().toISOString();
    const key = `NEW-${Math.floor(100 + Math.random() * 899)}`;

    const feature: Feature = {
      id,
      key,
      name: input.name.trim(),
      description: input.description.trim(),
      status: 'IN_PROGRESS',
      priority: input.priority,
      teams: input.teams,
      agentIds: ['agent_coordinator'],
      repository: input.repository,
      autonomy: input.autonomy,
      stages: PAY142_STAGES.map((stage) =>
        stage.kind === 'REQUIREMENT_ANALYSIS' ? { ...stage, status: 'IN_PROGRESS' } : stage,
      ),
      acceptanceCriteria: [],
      startedAt: now,
      dueDate: input.dueDate,
    };

    const tasks: Task[] = input.teams.map((team) => ({
      id: nextId('task'),
      featureId: id,
      title: `${team} 작업 범위 정의`,
      team,
      assigneeAgentId: null,
      status: 'TODO',
      stage: 'REQUIREMENT_ANALYSIS',
      updatedAt: now,
    }));

    return { feature, tasks };
  }

  async sendHumanMessage(input: SendMessageInput): Promise<AgentMessage> {
    await delay(120);
    return {
      id: nextId('msg'),
      featureId: input.featureId,
      type: 'QUESTION',
      topic: '사람의 질문',
      fromAgentId: 'human',
      toAgentId: input.toAgentId === 'all' ? 'all' : input.toAgentId,
      body: input.body,
      createdAt: new Date().toISOString(),
      artifactId: null,
      blocking: false,
    };
  }

  async replyToHuman(input: SendMessageInput, fromAgentId: string): Promise<AgentMessage> {
    await delay(900);
    return {
      id: nextId('msg'),
      featureId: input.featureId,
      type: 'ANSWER',
      answersMessageId: null,
      fromAgentId,
      toAgentId: 'human',
      body: '확인했습니다. 해당 내용을 현재 작업 맥락에 반영하고, 영향받는 단계가 있으면 Timeline에 기록하겠습니다.',
      createdAt: new Date().toISOString(),
      artifactId: null,
      blocking: false,
    };
  }
}

export const agentService: AgentRuntimeService = new MockAgentService();

export { TEAM_TO_ROLE, TEAM_TO_ROOM };
