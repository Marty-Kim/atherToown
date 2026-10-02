import { randomUUID } from 'node:crypto';
import type {
  AgentMessage,
  AgentStatus,
  Artifact,
  ArtifactKind,
  Decision,
  DecisionStatus,
  MessageType,
  SimulationStep,
  StageKind,
  StageStatus,
} from '../../src/types/domain';
import type { RunnerIdentity, RunnerTask } from '../../src/protocol/protocol';
import type { RepoEntry } from './config';

export interface DecisionOutcome {
  status: DecisionStatus;
  chosenOptionId: string | null;
  note: string | null;
}

export interface RunContext {
  identity: RunnerIdentity;
  task: RunnerTask;
  repo: RepoEntry;
  emit: (steps: SimulationStep[]) => Promise<void>;
  requestToolApproval: (input: {
    toolName: string;
    title: string;
    inputPreview: string;
  }) => Promise<boolean>;
  requestDecision: (decision: Decision) => Promise<DecisionOutcome>;
  log: (level: 'info' | 'warn' | 'error', message: string) => void;
}

export interface BackendResult {
  sessionId: string | null;
  costUsd: number;
}

export interface AgentBackend {
  run: (ctx: RunContext) => Promise<BackendResult>;
  interrupt: () => Promise<void>;
}

/* ------------------------------------------------------------------ *
 * 스텝 빌더 — 러너가 만드는 모든 상태 변화가 여기를 지난다.
 * ------------------------------------------------------------------ */

export function nowIso(): string {
  return new Date().toISOString();
}

export function statusStep(
  agentId: string,
  status: AgentStatus,
  currentTask: string | null,
  roomId?: string,
): SimulationStep {
  return { kind: 'AGENT_STATE', agentId, status, currentTask, ...(roomId ? { roomId } : {}) };
}

export function messageSteps(input: {
  agentId: string;
  featureId: string;
  type: MessageType;
  to: string;
  body: string;
  blocking: boolean;
  artifactId: string | null;
  optionLabel?: string;
  topic?: string;
  stage?: StageKind | null;
  reason?: string;
  taskRef?: string;
}): SimulationStep[] {
  const id = `msg_${randomUUID()}`;
  const base = {
    id,
    featureId: input.featureId,
    fromAgentId: input.agentId,
    toAgentId: input.to,
    body: input.body,
    createdAt: nowIso(),
    artifactId: input.artifactId,
    blocking: input.blocking,
  };

  let message: AgentMessage;
  switch (input.type) {
    case 'QUESTION':
      message = { ...base, type: 'QUESTION', topic: input.topic ?? '질문' };
      break;
    case 'ANSWER':
      message = { ...base, type: 'ANSWER', answersMessageId: null };
      break;
    case 'PROPOSAL':
      message = { ...base, type: 'PROPOSAL', optionLabel: input.optionLabel ?? '제안' };
      break;
    case 'COUNTER_PROPOSAL':
      message = {
        ...base,
        type: 'COUNTER_PROPOSAL',
        optionLabel: input.optionLabel ?? '역제안',
        countersMessageId: null,
      };
      break;
    case 'TASK_ASSIGNMENT':
      message = { ...base, type: 'TASK_ASSIGNMENT', taskId: input.taskRef ?? 'unknown' };
      break;
    case 'ARTIFACT_CREATED':
      message = { ...base, type: 'ARTIFACT_CREATED', artifactId: input.artifactId ?? 'unknown' };
      break;
    case 'BLOCKED':
      message = { ...base, type: 'BLOCKED', reason: input.reason ?? '차단됨' };
      break;
    case 'COMPLETED':
      message = { ...base, type: 'COMPLETED', stage: input.stage ?? null };
      break;
    case 'DECISION_REQUEST':
    case 'DECISION':
      /* 결정 계열은 town_request_decision 경로로만 생성된다. */
      message = { ...base, type: 'ANSWER', answersMessageId: null };
      break;
  }

  return [
    { kind: 'MESSAGE', message },
    {
      kind: 'ACTIVITY',
      event: {
        id: `ev_${randomUUID()}`,
        featureId: input.featureId,
        at: base.createdAt,
        actorAgentId: input.agentId,
        summary: summarize(input.type, input.body),
        category: 'CONVERSATION',
        messageId: id,
      },
    },
  ];
}

export function artifactSteps(input: {
  agentId: string;
  featureId: string;
  name: string;
  kind: ArtifactKind;
  language: Artifact['language'];
  content: string;
}): { steps: SimulationStep[]; artifactId: string } {
  const artifactId = `art_${randomUUID()}`;
  const at = nowIso();
  const artifact: Artifact = {
    id: artifactId,
    featureId: input.featureId,
    name: input.name,
    kind: input.kind,
    status: 'PROPOSED',
    createdByAgentId: input.agentId,
    createdAt: at,
    updatedAt: at,
    language: input.language,
    content: input.content,
    version: 1,
  };

  return {
    artifactId,
    steps: [
      { kind: 'ARTIFACT_UPSERT', artifact },
      {
        kind: 'ACTIVITY',
        event: {
          id: `ev_${randomUUID()}`,
          featureId: input.featureId,
          at,
          actorAgentId: input.agentId,
          summary: `${input.name} 이(가) 생성됨`,
          category: 'ARTIFACT',
          artifactId,
        },
      },
    ],
  };
}

export function stageStep(stage: StageKind, status: StageStatus): SimulationStep {
  return { kind: 'STAGE', stage, status };
}

export function blockerStep(
  agentId: string,
  featureId: string,
  reason: string,
): SimulationStep {
  return {
    kind: 'ACTIVITY',
    event: {
      id: `ev_${randomUUID()}`,
      featureId,
      at: nowIso(),
      actorAgentId: agentId,
      summary: '작업이 차단됨',
      category: 'BLOCKER',
      reason,
    },
  };
}

function summarize(type: MessageType, body: string): string {
  const head = body.replace(/\s+/g, ' ').slice(0, 70);
  switch (type) {
    case 'QUESTION':
      return `질문: ${head}`;
    case 'PROPOSAL':
      return `제안: ${head}`;
    case 'COUNTER_PROPOSAL':
      return `역제안: ${head}`;
    case 'BLOCKED':
      return `차단: ${head}`;
    case 'COMPLETED':
      return `완료: ${head}`;
    default:
      return head;
  }
}
