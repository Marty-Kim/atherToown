import type {
  AgentRole,
  AgentStatus,
  ArtifactKind,
  ArtifactStatus,
  ActivityCategory,
  AgentProvider,
  AutonomyLevel,
  ConnectionState,
  DecisionStatus,
  FeatureStatus,
  MessageType,
  PermissionLevel,
  Priority,
  RoomState,
  StageGroup,
  StageStatus,
  TaskStatus,
  TeamKind,
  AgentCapability,
} from '@/types/domain';

/** tone 은 status pill/badge 가 사용하는 의미 색상 집합이다. */
export type Tone = 'neutral' | 'info' | 'progress' | 'warning' | 'danger' | 'success';

export const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-slate-500/12 text-slate-300 ring-slate-400/25',
  info: 'bg-cyan-500/12 text-cyan-200 ring-cyan-400/30',
  progress: 'bg-violet-500/14 text-violet-200 ring-violet-400/30',
  warning: 'bg-amber-500/14 text-amber-200 ring-amber-400/35',
  danger: 'bg-rose-500/14 text-rose-200 ring-rose-400/35',
  success: 'bg-emerald-500/14 text-emerald-200 ring-emerald-400/30',
};

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  IDLE: '대기',
  THINKING: '분석 중',
  DISCUSSING: '논의 중',
  CODING: '구현 중',
  TESTING: '테스트 중',
  WAITING_FOR_APPROVAL: '승인 대기',
  BLOCKED: '중단됨',
  COMPLETED: '완료',
};

export const AGENT_STATUS_TONE: Record<AgentStatus, Tone> = {
  IDLE: 'neutral',
  THINKING: 'info',
  DISCUSSING: 'info',
  CODING: 'progress',
  TESTING: 'progress',
  WAITING_FOR_APPROVAL: 'warning',
  BLOCKED: 'danger',
  COMPLETED: 'success',
};

export const AGENT_ROLE_LABEL: Record<AgentRole, string> = {
  COORDINATOR: 'Coordinator',
  APP: 'APP',
  FE: 'FE',
  BE: 'BE',
  QA: 'QA',
  REVIEWER: 'Reviewer',
};

export const ROOM_STATE_LABEL: Record<RoomState, string> = {
  IDLE: '유휴',
  ACTIVE: '진행 중',
  WAITING: '대기',
  BLOCKED: '차단',
  COMPLETED: '완료',
};

export const ROOM_STATE_TONE: Record<RoomState, Tone> = {
  IDLE: 'neutral',
  ACTIVE: 'progress',
  WAITING: 'warning',
  BLOCKED: 'danger',
  COMPLETED: 'success',
};

export const STAGE_STATUS_LABEL: Record<StageStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  WAITING: 'Waiting',
  BLOCKED: 'Blocked',
  COMPLETED: 'Completed',
};

export const STAGE_STATUS_TONE: Record<StageStatus, Tone> = {
  PENDING: 'neutral',
  IN_PROGRESS: 'progress',
  WAITING: 'warning',
  BLOCKED: 'danger',
  COMPLETED: 'success',
};

export const STAGE_GROUP_LABEL: Record<StageGroup, string> = {
  REQUIREMENT: 'Requirement',
  CONTRACT: 'Contract',
  APPROVAL: 'Approval',
  IMPLEMENTATION: 'Implementation',
  INTEGRATION: 'Integration',
  REVIEW: 'Review',
  DONE: 'Done',
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  BLOCKED: 'Blocked',
  DONE: 'Done',
};

export const TASK_STATUS_TONE: Record<TaskStatus, Tone> = {
  TODO: 'neutral',
  IN_PROGRESS: 'progress',
  IN_REVIEW: 'info',
  BLOCKED: 'danger',
  DONE: 'success',
};

export const FEATURE_STATUS_LABEL: Record<FeatureStatus, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In Progress',
  WAITING_APPROVAL: 'Waiting Approval',
  BLOCKED: 'Blocked',
  DONE: 'Done',
};

export const FEATURE_STATUS_TONE: Record<FeatureStatus, Tone> = {
  DRAFT: 'neutral',
  IN_PROGRESS: 'progress',
  WAITING_APPROVAL: 'warning',
  BLOCKED: 'danger',
  DONE: 'success',
};

export const MESSAGE_TYPE_LABEL: Record<MessageType, string> = {
  QUESTION: 'Question',
  ANSWER: 'Answer',
  PROPOSAL: 'Proposal',
  COUNTER_PROPOSAL: 'Counter Proposal',
  DECISION_REQUEST: 'Decision Request',
  DECISION: 'Decision',
  TASK_ASSIGNMENT: 'Task Assignment',
  ARTIFACT_CREATED: 'Artifact Created',
  BLOCKED: 'Blocked',
  COMPLETED: 'Completed',
};

export const MESSAGE_TYPE_TONE: Record<MessageType, Tone> = {
  QUESTION: 'info',
  ANSWER: 'neutral',
  PROPOSAL: 'progress',
  COUNTER_PROPOSAL: 'progress',
  DECISION_REQUEST: 'warning',
  DECISION: 'success',
  TASK_ASSIGNMENT: 'info',
  ARTIFACT_CREATED: 'info',
  BLOCKED: 'danger',
  COMPLETED: 'success',
};

export const ACTIVITY_CATEGORY_LABEL: Record<ActivityCategory, string> = {
  CONVERSATION: 'Conversation',
  DECISION: 'Decisions',
  TASK: 'Tasks',
  ARTIFACT: 'Artifacts',
  BLOCKER: 'Blockers',
};

export const ARTIFACT_STATUS_LABEL: Record<ArtifactStatus, string> = {
  DRAFT: 'Draft',
  PROPOSED: 'Proposed',
  APPROVED: 'Approved',
  SUPERSEDED: 'Superseded',
};

export const ARTIFACT_STATUS_TONE: Record<ArtifactStatus, Tone> = {
  DRAFT: 'neutral',
  PROPOSED: 'info',
  APPROVED: 'success',
  SUPERSEDED: 'warning',
};

export const ARTIFACT_KIND_LABEL: Record<ArtifactKind, string> = {
  OPENAPI: 'API Contract',
  PLAN: 'Implementation Plan',
  TEST_SCENARIO: 'Test Scenario',
  DECISION_LOG: 'Decision Log',
  ACCEPTANCE_CRITERIA: 'Acceptance Criteria',
  PULL_REQUEST: 'Pull Request',
};

export const DECISION_STATUS_LABEL: Record<DecisionStatus, string> = {
  OPEN: 'Open',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  NEEDS_DISCUSSION: 'Needs Discussion',
};

export const DECISION_STATUS_TONE: Record<DecisionStatus, Tone> = {
  OPEN: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  NEEDS_DISCUSSION: 'info',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const PRIORITY_TONE: Record<Priority, Tone> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'danger',
};

export const CONNECTION_LABEL: Record<ConnectionState, string> = {
  CONNECTED: '연결됨',
  DEGRADED: '불안정',
  OFFLINE: '오프라인',
};

export const CONNECTION_TONE: Record<ConnectionState, Tone> = {
  CONNECTED: 'success',
  DEGRADED: 'warning',
  OFFLINE: 'danger',
};

export const PROVIDER_LABEL: Record<AgentProvider, string> = {
  OPENAI: 'OpenAI',
  CLAUDE: 'Claude',
  GEMINI: 'Gemini',
  CUSTOM: 'Custom Agent',
  LOCAL: 'Local Agent',
};

export const PERMISSION_LABEL: Record<PermissionLevel, string> = {
  READ_ONLY: '읽기 전용',
  DRAFT: '문서·코드 초안',
  BRANCH_AND_PR: 'Branch / PR 생성',
  MERGE_AFTER_APPROVAL: '승인 후 Merge',
};

export const AUTONOMY_LABEL: Record<AutonomyLevel, string> = {
  1: 'Level 1 · 분석 및 질문',
  2: 'Level 2 · 문서와 코드 초안',
  3: 'Level 3 · branch와 PR 생성',
  4: 'Level 4 · 승인 후 merge',
};

export const TEAM_LABEL: Record<TeamKind, string> = {
  APP: 'APP',
  FE: 'FE',
  BE: 'BE',
  QA: 'QA',
  PLATFORM: 'Platform',
};

export const CAPABILITY_LABEL: Record<AgentCapability, string> = {
  REQUIREMENT_ANALYSIS: '요구사항 분석',
  API_DESIGN: 'API 설계',
  CODE_GENERATION: '코드 생성',
  CODE_REVIEW: '코드 리뷰',
  TEST_AUTHORING: '테스트 작성',
  CONTRACT_TEST: 'Contract 테스트',
  DOCUMENTATION: '문서화',
  DEPENDENCY_TRACKING: '의존성 추적',
  RELEASE_NOTES: '릴리즈 노트',
};
