/**
 * Agent Town — domain model.
 *
 * 이 파일은 UI·mock·simulation 이 공유하는 단일 진실 원천이다.
 * 모든 상태값은 문자열 리터럴 union 으로 고정되어 있으며,
 * 임의 문자열을 UI 에서 사용하지 않는다.
 */

/* ------------------------------------------------------------------ *
 * 공통 원시 타입
 * ------------------------------------------------------------------ */

/** ISO-8601 문자열. simulation 은 결정적 재현을 위해 문자열로만 다룬다. */
export type IsoDateTime = string;

export type WorkspaceId = string;
export type UserId = string;
export type AgentId = string;
export type FeatureId = string;
export type RoomId = string;
export type TaskId = string;
export type MessageId = string;
export type DecisionId = string;
export type ArtifactId = string;
export type EventId = string;

/* ------------------------------------------------------------------ *
 * 팀 / 역할
 * ------------------------------------------------------------------ */

export const TEAM_KINDS = ['APP', 'FE', 'BE', 'QA', 'PLATFORM'] as const;
export type TeamKind = (typeof TEAM_KINDS)[number];

export const AGENT_ROLES = [
  'COORDINATOR',
  'APP',
  'FE',
  'BE',
  'QA',
  'REVIEWER',
] as const;
export type AgentRole = (typeof AGENT_ROLES)[number];

export const AGENT_PROVIDERS = [
  'OPENAI',
  'CLAUDE',
  'GEMINI',
  'CUSTOM',
  'LOCAL',
] as const;
export type AgentProvider = (typeof AGENT_PROVIDERS)[number];

export const PERMISSION_LEVELS = [
  'READ_ONLY',
  'DRAFT',
  'BRANCH_AND_PR',
  'MERGE_AFTER_APPROVAL',
] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

export const AUTONOMY_LEVELS = [1, 2, 3, 4] as const;
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

export const AGENT_CAPABILITIES = [
  'REQUIREMENT_ANALYSIS',
  'API_DESIGN',
  'CODE_GENERATION',
  'CODE_REVIEW',
  'TEST_AUTHORING',
  'CONTRACT_TEST',
  'DOCUMENTATION',
  'DEPENDENCY_TRACKING',
  'RELEASE_NOTES',
] as const;
export type AgentCapability = (typeof AGENT_CAPABILITIES)[number];

/* ------------------------------------------------------------------ *
 * 상태값
 * ------------------------------------------------------------------ */

export const AGENT_STATUSES = [
  'IDLE',
  'THINKING',
  'DISCUSSING',
  'CODING',
  'TESTING',
  'WAITING_FOR_APPROVAL',
  'BLOCKED',
  'COMPLETED',
] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const CONNECTION_STATES = ['CONNECTED', 'DEGRADED', 'OFFLINE'] as const;
export type ConnectionState = (typeof CONNECTION_STATES)[number];

export const ROOM_STATES = [
  'IDLE',
  'ACTIVE',
  'WAITING',
  'BLOCKED',
  'COMPLETED',
] as const;
export type RoomState = (typeof ROOM_STATES)[number];

export const ROOM_KINDS = [
  'PLANNING',
  'CONTRACT',
  'APP',
  'FE',
  'BE',
  'INTEGRATION',
  'REVIEW',
  'RELEASE',
  'BLOCKED_ZONE',
] as const;
export type RoomKind = (typeof ROOM_KINDS)[number];

export const STAGE_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'WAITING',
  'BLOCKED',
  'COMPLETED',
] as const;
export type StageStatus = (typeof STAGE_STATUSES)[number];

export const STAGE_KINDS = [
  'REQUIREMENT_ANALYSIS',
  'API_CONTRACT',
  'HUMAN_APPROVAL',
  'APP_IMPLEMENTATION',
  'BE_IMPLEMENTATION',
  'CONTRACT_TEST',
  'INTEGRATION_REVIEW',
] as const;
export type StageKind = (typeof STAGE_KINDS)[number];

/** 상단 Status Bar 의 축약 단계. */
export const STAGE_GROUPS = [
  'REQUIREMENT',
  'CONTRACT',
  'APPROVAL',
  'IMPLEMENTATION',
  'INTEGRATION',
  'REVIEW',
  'DONE',
] as const;
export type StageGroup = (typeof STAGE_GROUPS)[number];

export const TASK_STATUSES = [
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'BLOCKED',
  'DONE',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const FEATURE_STATUSES = [
  'DRAFT',
  'IN_PROGRESS',
  'WAITING_APPROVAL',
  'BLOCKED',
  'DONE',
] as const;
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const ARTIFACT_STATUSES = [
  'DRAFT',
  'PROPOSED',
  'APPROVED',
  'SUPERSEDED',
] as const;
export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number];

export const ARTIFACT_KINDS = [
  'OPENAPI',
  'PLAN',
  'TEST_SCENARIO',
  'DECISION_LOG',
  'ACCEPTANCE_CRITERIA',
  'PULL_REQUEST',
] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export const DECISION_STATUSES = [
  'OPEN',
  'APPROVED',
  'REJECTED',
  'NEEDS_DISCUSSION',
] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const MESSAGE_TYPES = [
  'QUESTION',
  'ANSWER',
  'PROPOSAL',
  'COUNTER_PROPOSAL',
  'DECISION_REQUEST',
  'DECISION',
  'TASK_ASSIGNMENT',
  'ARTIFACT_CREATED',
  'BLOCKED',
  'COMPLETED',
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const ACTIVITY_CATEGORIES = [
  'CONVERSATION',
  'DECISION',
  'TASK',
  'ARTIFACT',
  'BLOCKER',
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const SIMULATION_STATUSES = [
  'IDLE',
  'RUNNING',
  'PAUSED',
  'AWAITING_HUMAN',
  'FINISHED',
] as const;
export type SimulationStatus = (typeof SIMULATION_STATUSES)[number];

/* ------------------------------------------------------------------ *
 * 엔티티
 * ------------------------------------------------------------------ */

export interface Workspace {
  readonly id: WorkspaceId;
  readonly name: string;
  readonly slug: string;
  readonly repositories: readonly string[];
}

export interface User {
  readonly id: UserId;
  readonly name: string;
  readonly email: string;
  /** avatar 는 외부 이미지가 아닌 이니셜 + 색상으로 생성한다. */
  readonly initials: string;
  readonly team: TeamKind;
  readonly title: string;
}

export interface Permission {
  readonly level: PermissionLevel;
  readonly canOpenPullRequest: boolean;
  readonly canMerge: boolean;
  readonly canEditContract: boolean;
}

export interface Agent {
  readonly id: AgentId;
  readonly name: string;
  readonly role: AgentRole;
  readonly provider: AgentProvider;
  readonly team: TeamKind;
  /** 이 Agent 를 연결한 사람. */
  readonly connectedBy: UserId;
  readonly capabilities: readonly AgentCapability[];
  readonly repositories: readonly string[];
  readonly permission: Permission;
  readonly connection: ConnectionState;
  readonly status: AgentStatus;
  /** 현재 작업 한 줄 요약. 없으면 대기 중. */
  readonly currentTask: string | null;
  readonly roomId: RoomId;
  readonly featureId: FeatureId | null;
  readonly lastActiveAt: IsoDateTime;
  /** 아바타 색상 토큰 (CSS 변수 이름이 아닌 tailwind 클래스 접미사). */
  readonly accent: AgentAccent;
}

export const AGENT_ACCENTS = [
  'violet',
  'cyan',
  'blue',
  'emerald',
  'amber',
  'rose',
] as const;
export type AgentAccent = (typeof AGENT_ACCENTS)[number];

export interface Room {
  readonly id: RoomId;
  readonly kind: RoomKind;
  readonly name: string;
  readonly description: string;
  /** 가상 오피스 grid 좌표 (12 x 8 기준). */
  readonly grid: GridRect;
}

export interface GridRect {
  readonly col: number;
  readonly row: number;
  readonly colSpan: number;
  readonly rowSpan: number;
}

export interface FeatureStage {
  readonly kind: StageKind;
  readonly name: string;
  readonly group: StageGroup;
  readonly status: StageStatus;
  readonly ownerRole: AgentRole | null;
}

export interface Dependency {
  readonly id: string;
  readonly fromTaskId: TaskId;
  readonly toTaskId: TaskId;
  readonly reason: string;
  readonly blocking: boolean;
}

export interface Task {
  readonly id: TaskId;
  readonly featureId: FeatureId;
  readonly title: string;
  readonly team: TeamKind;
  readonly assigneeAgentId: AgentId | null;
  readonly status: TaskStatus;
  readonly stage: StageKind;
  readonly updatedAt: IsoDateTime;
}

export interface AcceptanceCriterion {
  readonly id: string;
  readonly text: string;
  readonly satisfied: boolean;
}

export interface Feature {
  readonly id: FeatureId;
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly status: FeatureStatus;
  readonly priority: Priority;
  readonly teams: readonly TeamKind[];
  readonly agentIds: readonly AgentId[];
  readonly repository: string;
  readonly autonomy: AutonomyLevel;
  readonly stages: readonly FeatureStage[];
  readonly acceptanceCriteria: readonly AcceptanceCriterion[];
  readonly startedAt: IsoDateTime;
  readonly dueDate: string | null;
}

/* ------------------------------------------------------------------ *
 * 대화
 * ------------------------------------------------------------------ */

export interface MessageBase {
  readonly id: MessageId;
  readonly featureId: FeatureId;
  readonly fromAgentId: AgentId | 'human';
  readonly toAgentId: AgentId | 'all' | 'human';
  readonly body: string;
  readonly createdAt: IsoDateTime;
  readonly artifactId: ArtifactId | null;
  readonly blocking: boolean;
}

/** 메시지는 type 으로 구분되는 discriminated union 이다. */
export type AgentMessage =
  | (MessageBase & { readonly type: 'QUESTION'; readonly topic: string })
  | (MessageBase & { readonly type: 'ANSWER'; readonly answersMessageId: MessageId | null })
  | (MessageBase & { readonly type: 'PROPOSAL'; readonly optionLabel: string })
  | (MessageBase & {
      readonly type: 'COUNTER_PROPOSAL';
      readonly optionLabel: string;
      readonly countersMessageId: MessageId | null;
    })
  | (MessageBase & { readonly type: 'DECISION_REQUEST'; readonly decisionId: DecisionId })
  | (MessageBase & {
      readonly type: 'DECISION';
      readonly decisionId: DecisionId;
      readonly chosenOptionId: string;
    })
  | (MessageBase & { readonly type: 'TASK_ASSIGNMENT'; readonly taskId: TaskId })
  | (MessageBase & { readonly type: 'ARTIFACT_CREATED'; readonly artifactId: ArtifactId })
  | (MessageBase & { readonly type: 'BLOCKED'; readonly reason: string })
  | (MessageBase & { readonly type: 'COMPLETED'; readonly stage: StageKind | null });

export interface Conversation {
  readonly id: string;
  readonly featureId: FeatureId;
  readonly title: string;
  readonly participantAgentIds: readonly AgentId[];
  readonly messageIds: readonly MessageId[];
}

/* ------------------------------------------------------------------ *
 * 결정
 * ------------------------------------------------------------------ */

export interface DecisionOption {
  readonly id: string;
  readonly label: string;
  readonly summary: string;
  readonly proposedByAgentId: AgentId | null;
  readonly tradeoffs: readonly string[];
}

export interface Decision {
  readonly id: DecisionId;
  readonly featureId: FeatureId;
  readonly title: string;
  readonly question: string;
  readonly context: string;
  readonly options: readonly DecisionOption[];
  readonly status: DecisionStatus;
  readonly requestedByAgentId: AgentId;
  readonly requestedAt: IsoDateTime;
  readonly resolvedAt: IsoDateTime | null;
  readonly chosenOptionId: string | null;
  readonly note: string | null;
  readonly blocksStage: StageKind | null;
}

/* ------------------------------------------------------------------ *
 * 산출물
 * ------------------------------------------------------------------ */

export interface Artifact {
  readonly id: ArtifactId;
  readonly featureId: FeatureId;
  readonly name: string;
  readonly kind: ArtifactKind;
  readonly status: ArtifactStatus;
  readonly createdByAgentId: AgentId;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
  readonly language: 'yaml' | 'markdown' | 'json' | 'text';
  readonly content: string;
  readonly version: number;
}

/* ------------------------------------------------------------------ *
 * 활동 이벤트
 * ------------------------------------------------------------------ */

export interface ActivityBase {
  readonly id: EventId;
  readonly featureId: FeatureId;
  readonly at: IsoDateTime;
  readonly actorAgentId: AgentId | 'human' | 'system';
  readonly summary: string;
}

export type ActivityEvent =
  | (ActivityBase & { readonly category: 'CONVERSATION'; readonly messageId: MessageId })
  | (ActivityBase & { readonly category: 'DECISION'; readonly decisionId: DecisionId })
  | (ActivityBase & {
      readonly category: 'TASK';
      readonly taskId: TaskId;
      readonly toStatus: TaskStatus;
    })
  | (ActivityBase & { readonly category: 'ARTIFACT'; readonly artifactId: ArtifactId })
  | (ActivityBase & { readonly category: 'BLOCKER'; readonly reason: string });

/* ------------------------------------------------------------------ *
 * 알림
 * ------------------------------------------------------------------ */

export interface Notification {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly createdAt: IsoDateTime;
  readonly read: boolean;
  readonly featureId: FeatureId | null;
  readonly kind: 'DECISION' | 'BLOCKER' | 'ARTIFACT' | 'COMPLETION';
}

/* ------------------------------------------------------------------ *
 * 선택 대상 (Inspector)
 * ------------------------------------------------------------------ */

export type Selection =
  | { readonly kind: 'none' }
  | { readonly kind: 'agent'; readonly id: AgentId }
  | { readonly kind: 'room'; readonly id: RoomId }
  | { readonly kind: 'feature'; readonly id: FeatureId };

/* ------------------------------------------------------------------ *
 * 시뮬레이션
 * ------------------------------------------------------------------ */

/**
 * 시뮬레이션은 "미리 정의된 이벤트 목록을 한 칸씩 적용" 하는 방식이다.
 * 모든 파생 상태(대화/타임라인/룸/작업)는 reducer 한 곳에서만 갱신되므로
 * Start / Pause / Next / Reset 이 동일한 경로를 탄다.
 */
export type SimulationStep =
  | { readonly kind: 'AGENT_STATE'; readonly agentId: AgentId; readonly status: AgentStatus; readonly roomId?: RoomId; readonly currentTask?: string | null }
  /** 러너가 접속하면 자기 Agent 를 타운에 등록한다. */
  | { readonly kind: 'AGENT_UPSERT'; readonly agent: Agent }
  | { readonly kind: 'AGENT_CONNECTION'; readonly agentId: AgentId; readonly connection: ConnectionState }
  | {
      readonly kind: 'DECISION_RESOLVE';
      readonly decisionId: DecisionId;
      readonly status: DecisionStatus;
      readonly chosenOptionId: string | null;
      readonly note: string | null;
      readonly resolvedAt: IsoDateTime;
    }
  | { readonly kind: 'FEATURE_UPSERT'; readonly feature: Feature }
  | { readonly kind: 'STAGE'; readonly stage: StageKind; readonly status: StageStatus }
  | { readonly kind: 'MESSAGE'; readonly message: AgentMessage }
  | { readonly kind: 'ACTIVITY'; readonly event: ActivityEvent }
  | { readonly kind: 'TASK_STATUS'; readonly taskId: TaskId; readonly status: TaskStatus }
  | { readonly kind: 'ARTIFACT_UPSERT'; readonly artifact: Artifact }
  | { readonly kind: 'ARTIFACT_STATUS'; readonly artifactId: ArtifactId; readonly status: ArtifactStatus }
  | { readonly kind: 'DECISION_OPEN'; readonly decision: Decision }
  | { readonly kind: 'FEATURE_STATUS'; readonly featureId: FeatureId; readonly status: FeatureStatus }
  | { readonly kind: 'NOTIFY'; readonly notification: Notification }
  | { readonly kind: 'AWAIT_HUMAN'; readonly decisionId: DecisionId };

export interface SimulationEvent {
  readonly id: string;
  readonly featureId: FeatureId;
  readonly label: string;
  readonly steps: readonly SimulationStep[];
}

export interface SimulationState {
  readonly status: SimulationStatus;
  readonly cursor: number;
  readonly speedMs: number;
  readonly featureId: FeatureId;
}
