/**
 * Agent Town — 러너 ↔ 허브 ↔ 브라우저 와이어 프로토콜.
 *
 * 설계 원칙 하나: 러너는 "상태"가 아니라 **SimulationStep** 을 보낸다.
 * 브라우저는 그 스텝을 이미 있는 reducer(applyStep)에 그대로 흘려보낸다.
 * 덕분에 mock 시뮬레이션과 실제 Agent 실행이 완전히 같은 쓰기 경로를 탄다.
 *
 * 전송 수단은 일부러 평범하게 골랐다. 별도 WebSocket 서버 없이
 * Next.js route handler 만으로 동작한다.
 *   러너 → 허브 : HTTP POST
 *   허브 → 러너 : SSE (GET /api/runner/stream)
 *   허브 → 브라우저: SSE (GET /api/events)
 *   브라우저 → 허브: HTTP POST
 */

import type {
  AgentAccent,
  AgentCapability,
  AgentProvider,
  AgentRole,
  ConnectionState,
  Decision,
  DecisionStatus,
  Feature,
  PermissionLevel,
  SimulationStep,
  TeamKind,
} from '../types/domain';

export const PROTOCOL_VERSION = 1;

/** SSE 하트비트 간격. 이보다 오래 소식이 없으면 허브가 러너를 OFFLINE 처리한다. */
export const HEARTBEAT_MS = 10_000;
export const RUNNER_TIMEOUT_MS = 30_000;

/* ------------------------------------------------------------------ *
 * 러너 신원
 * ------------------------------------------------------------------ */

export interface RunnerIdentity {
  /** 러너가 대리하는 Agent 의 안정적인 id. 러너 설정 파일에 고정해 둔다. */
  agentId: string;
  agentName: string;
  role: AgentRole;
  team: TeamKind;
  provider: AgentProvider;
  accent: AgentAccent;
  /** 이 러너를 띄운 사람 (Agent Town 의 User id). */
  userId: string;
  capabilities: AgentCapability[];
  permission: PermissionLevel;
  /** 노출용 repo 이름. 절대 경로는 보내지 않는다. */
  repositories: string[];
  hostname: string;
  platform: string;
  /** 실제 모델을 호출하지 않는 테스트 러너. */
  mock: boolean;
}

/** 브라우저에 보여줄 러너 요약. 경로·토큰 같은 민감 정보는 담지 않는다. */
export interface RunnerPublic {
  runnerId: string;
  agentId: string;
  agentName: string;
  userId: string;
  hostname: string;
  platform: string;
  mock: boolean;
  connection: ConnectionState;
  connectedAt: string;
  lastSeenAt: string;
  /** 이 러너가 이번 세션에서 누적한 예상 비용(USD). */
  costUsd: number;
}

/* ------------------------------------------------------------------ *
 * 작업 지시
 * ------------------------------------------------------------------ */

export type RunnerTaskKind = 'BRIEF' | 'HUMAN_MESSAGE';

export interface RunnerTask {
  taskId: string;
  kind: RunnerTaskKind;
  featureId: string;
  /** Agent 에게 전달할 지시문. */
  prompt: string;
  /** 러너가 고른 repo. 허용 목록에 없으면 러너가 거부한다. */
  repository: string | null;
  /** 1~4. 러너가 permissionMode 와 도구 허용치로 변환한다. */
  autonomy: 1 | 2 | 3 | 4;
  /** 이전 세션을 이어갈 때. */
  resumeSessionId: string | null;
  maxBudgetUsd: number | null;
}

/* ------------------------------------------------------------------ *
 * 사람의 개입 — 두 층
 * ------------------------------------------------------------------ */

/** 도구 레벨 승인 (Agent SDK canUseTool). */
export interface ToolApprovalRequest {
  requestId: string;
  agentId: string;
  agentName: string;
  featureId: string;
  toolName: string;
  /** SDK 가 만들어 준 사람이 읽을 문장. 없으면 러너가 만든다. */
  title: string;
  /** 도구 입력 요약. 원문 전체가 아니라 잘라서 보낸다. */
  inputPreview: string;
  createdAt: string;
}

/** 제품 레벨 결정 (town_request_decision). */
export interface DecisionApprovalRequest {
  requestId: string;
  decision: Decision;
}

export type PendingApproval =
  | ({ kind: 'TOOL' } & ToolApprovalRequest)
  | ({ kind: 'DECISION' } & DecisionApprovalRequest);

/* ------------------------------------------------------------------ *
 * 러너 → 허브 (HTTP POST /api/runner/*)
 * ------------------------------------------------------------------ */

export interface HelloRequest {
  version: number;
  pairingToken: string;
  identity: RunnerIdentity;
}

export interface HelloResponse {
  runnerId: string;
  /** 이후 모든 요청의 Authorization: Bearer <sessionToken> */
  sessionToken: string;
  heartbeatMs: number;
}

export type RunnerPost =
  | { t: 'steps'; steps: SimulationStep[] }
  | { t: 'heartbeat' }
  | { t: 'tool-approval'; request: Omit<ToolApprovalRequest, 'createdAt'> }
  | { t: 'decision'; requestId: string; decision: Decision }
  | {
      t: 'task-done';
      taskId: string;
      ok: boolean;
      sessionId: string | null;
      costUsd: number;
      error: string | null;
    }
  | { t: 'log'; level: 'info' | 'warn' | 'error'; message: string };

/* ------------------------------------------------------------------ *
 * 허브 → 러너 (SSE)
 * ------------------------------------------------------------------ */

export type HubCommand =
  | { t: 'welcome'; runnerId: string; heartbeatMs: number }
  | { t: 'task'; task: RunnerTask }
  | { t: 'tool-approval-result'; requestId: string; allow: boolean; reason: string | null }
  | {
      t: 'decision-result';
      requestId: string;
      status: DecisionStatus;
      chosenOptionId: string | null;
      note: string | null;
    }
  | { t: 'interrupt'; taskId: string | null }
  | { t: 'ping' };

/* ------------------------------------------------------------------ *
 * 허브 → 브라우저 (SSE /api/events)
 * ------------------------------------------------------------------ */

export interface HubSnapshot {
  seq: number;
  steps: SimulationStep[];
  runners: RunnerPublic[];
  pending: PendingApproval[];
}

export type HubEvent =
  | ({ t: 'snapshot' } & HubSnapshot)
  | { t: 'step'; seq: number; step: SimulationStep }
  | { t: 'runners'; runners: RunnerPublic[] }
  | { t: 'pending'; pending: PendingApproval[] }
  | { t: 'log'; level: 'info' | 'warn' | 'error'; message: string; at: string };

/* ------------------------------------------------------------------ *
 * 브라우저 → 허브 (HTTP POST /api/control)
 * ------------------------------------------------------------------ */

export type ControlCommand =
  | { t: 'assign'; agentId: string; task: Omit<RunnerTask, 'taskId' | 'resumeSessionId'> }
  | { t: 'tool-approval'; requestId: string; allow: boolean; reason: string | null }
  | {
      t: 'decision';
      requestId: string;
      status: DecisionStatus;
      chosenOptionId: string | null;
      note: string | null;
    }
  | { t: 'interrupt'; agentId: string }
  | { t: 'feature'; feature: Feature }
  | { t: 'reset' };

export interface ControlResult {
  ok: boolean;
  error?: string;
}
