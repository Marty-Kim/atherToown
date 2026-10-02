import type {
  ActivityEvent,
  Agent,
  AgentMessage,
  Artifact,
  Decision,
  Feature,
  Notification,
  SimulationEvent,
  SimulationStep,
  Task,
} from '@/types/domain';
import type { TownData } from '@/mock';
import { PAY142_ID } from '@/mock/features';
import {
  OPTION_BODY,
  OPTION_DISCUSS,
  RETRY_DECISION_ID,
} from '@/mock/script';
import {
  ARTIFACT_DECISION_LOG_ID,
  makeDecisionLogArtifact,
  makeOpenApiArtifact,
  type RetryContractStyle,
} from '@/mock/artifacts';

/* ------------------------------------------------------------------ *
 * 작은 불변 헬퍼
 * ------------------------------------------------------------------ */

function mapById<T extends { id: string }>(list: T[], id: string, patch: (item: T) => T): T[] {
  return list.map((item) => (item.id === id ? patch(item) : item));
}

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((existing) => existing.id === item.id)
    ? list.map((existing) => (existing.id === item.id ? item : existing))
    : [...list, item];
}

function patchFeature(data: TownData, featureId: string, patch: (f: Feature) => Feature): Feature[] {
  return mapById(data.features, featureId, patch);
}

/* ------------------------------------------------------------------ *
 * SimulationStep 적용
 * 모든 파생 상태 변경은 이 함수 한 곳을 지난다.
 * ------------------------------------------------------------------ */

export function applyStep(data: TownData, step: SimulationStep, featureId: string): TownData {
  switch (step.kind) {
    case 'AGENT_STATE':
      return {
        ...data,
        agents: mapById(
          data.agents,
          step.agentId,
          (agent): Agent => ({
            ...agent,
            status: step.status,
            roomId: step.roomId ?? agent.roomId,
            currentTask: step.currentTask === undefined ? agent.currentTask : step.currentTask,
            featureId: agent.featureId ?? featureId,
          }),
        ),
      };

    case 'STAGE':
      return {
        ...data,
        features: patchFeature(data, featureId, (feature) => ({
          ...feature,
          stages: feature.stages.map((stage) =>
            stage.kind === step.stage ? { ...stage, status: step.status } : stage,
          ),
        })),
      };

    case 'MESSAGE':
      return data.messages.some((m) => m.id === step.message.id)
        ? data
        : { ...data, messages: [...data.messages, step.message] };

    case 'ACTIVITY':
      return data.events.some((e) => e.id === step.event.id)
        ? data
        : { ...data, events: [...data.events, step.event] };

    case 'TASK_STATUS':
      return {
        ...data,
        tasks: mapById(
          data.tasks,
          step.taskId,
          (task): Task => ({ ...task, status: step.status }),
        ),
      };

    case 'ARTIFACT_UPSERT':
      return { ...data, artifacts: upsertById(data.artifacts, step.artifact) };

    case 'ARTIFACT_STATUS':
      return {
        ...data,
        artifacts: mapById(
          data.artifacts,
          step.artifactId,
          (artifact): Artifact => ({ ...artifact, status: step.status }),
        ),
      };

    case 'DECISION_OPEN':
      return { ...data, decisions: upsertById(data.decisions, step.decision) };

    case 'DECISION_RESOLVE':
      return {
        ...data,
        decisions: mapById(
          data.decisions,
          step.decisionId,
          (decision): Decision => ({
            ...decision,
            status: step.status,
            chosenOptionId: step.chosenOptionId,
            note: step.note,
            resolvedAt: step.resolvedAt,
          }),
        ),
      };

    case 'AGENT_UPSERT':
      return { ...data, agents: upsertById(data.agents, step.agent) };

    case 'AGENT_CONNECTION':
      return {
        ...data,
        agents: mapById(
          data.agents,
          step.agentId,
          (agent): Agent => ({
            ...agent,
            connection: step.connection,
            status: step.connection === 'OFFLINE' ? 'IDLE' : agent.status,
            currentTask: step.connection === 'OFFLINE' ? null : agent.currentTask,
          }),
        ),
      };

    case 'FEATURE_UPSERT':
      return { ...data, features: upsertById(data.features, step.feature) };

    case 'FEATURE_STATUS': {
      const done = step.status === 'DONE';
      return {
        ...data,
        features: patchFeature(data, step.featureId, (feature) => ({
          ...feature,
          status: step.status,
          acceptanceCriteria: done
            ? feature.acceptanceCriteria.map((c) => ({ ...c, satisfied: true }))
            : feature.acceptanceCriteria,
        })),
      };
    }

    case 'NOTIFY':
      return data.notifications.some((n) => n.id === step.notification.id)
        ? data
        : { ...data, notifications: [step.notification, ...data.notifications] };

    case 'AWAIT_HUMAN':
      return { ...data, simulation: { ...data.simulation, status: 'AWAITING_HUMAN' } };
  }
}

export function applySimulationEvent(data: TownData, event: SimulationEvent): TownData {
  return event.steps.reduce(
    (acc, step) => applyStep(acc, step, event.featureId),
    data,
  );
}

/** cursor 위치의 이벤트를 적용하고 cursor 를 1 증가시킨다. */
export function advanceSimulation(data: TownData, script: readonly SimulationEvent[]): TownData {
  const { cursor } = data.simulation;
  const event = script[cursor];
  if (!event) {
    return { ...data, simulation: { ...data.simulation, status: 'FINISHED' } };
  }
  const next = applySimulationEvent(data, event);
  const nextCursor = cursor + 1;
  const finished = nextCursor >= script.length;
  return {
    ...next,
    simulation: {
      ...next.simulation,
      cursor: nextCursor,
      status: finished
        ? 'FINISHED'
        : next.simulation.status === 'AWAITING_HUMAN'
          ? 'AWAITING_HUMAN'
          : next.simulation.status,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Human approval
 * ------------------------------------------------------------------ */

export interface DecisionOutcome {
  readonly data: TownData;
  readonly headline: string;
  readonly detail: string;
}

function styleOf(optionId: string): RetryContractStyle {
  return optionId === OPTION_BODY ? 'body' : 'header';
}

function decisionLogBody(decision: Decision, optionId: string, note: string | null): string {
  const chosen = decision.options.find((o) => o.id === optionId);
  return `# ${decision.title}

## 결정
**${chosen?.label ?? optionId}** — ${chosen?.summary ?? ''}

## 배경
${decision.context}

## 검토한 대안
${decision.options
  .map((o) => `- ${o.label}${o.id === optionId ? ' ← 채택' : ''}\n${o.tradeoffs.map((t) => `  - ${t}`).join('\n')}`)
  .join('\n')}

## 사람의 메모
${note && note.trim().length > 0 ? note : '(없음)'}

## 영향
- \`payment-api.openapi.yaml\` 이 확정된 방식으로 갱신됨
- APP / BE 구현 작업이 착수됨
`;
}

/**
 * 결정 승인은 화면 상태뿐 아니라 contract 문서 내용까지 바꾼다.
 * (Header / Body 선택이 실제 artifact 에 반영된다)
 */
export function resolveDecision(
  data: TownData,
  decisionId: string,
  optionId: string,
  note: string | null,
  now: string,
): DecisionOutcome {
  const decision = data.decisions.find((d) => d.id === decisionId);
  if (!decision) {
    return { data, headline: '결정을 찾을 수 없습니다', detail: '이미 처리되었을 수 있습니다.' };
  }

  const needsMoreDiscussion = optionId === OPTION_DISCUSS;
  const chosen = decision.options.find((o) => o.id === optionId);

  let next: TownData = {
    ...data,
    decisions: mapById(
      data.decisions,
      decisionId,
      (d): Decision => ({
        ...d,
        status: needsMoreDiscussion ? 'NEEDS_DISCUSSION' : 'APPROVED',
        chosenOptionId: needsMoreDiscussion ? null : optionId,
        resolvedAt: needsMoreDiscussion ? null : now,
        note,
      }),
    ),
  };

  const decisionMessage: AgentMessage = {
    id: `msg_decision_${decisionId}_${needsMoreDiscussion ? 'discuss' : optionId}`,
    featureId: decision.featureId,
    type: 'DECISION',
    decisionId,
    chosenOptionId: optionId,
    fromAgentId: 'human',
    toAgentId: 'all',
    body: needsMoreDiscussion
      ? `추가 논의를 요청합니다. 두 방식의 비교 근거를 더 정리해 주세요.${note ? `\n메모: ${note}` : ''}`
      : `${chosen?.label ?? optionId} 으로 결정했습니다.${note ? `\n메모: ${note}` : ''}`,
    createdAt: now,
    artifactId: null,
    blocking: false,
  };

  const decisionEvent: ActivityEvent = {
    id: `ev_decision_${decisionId}_${optionId}`,
    featureId: decision.featureId,
    at: now,
    actorAgentId: 'human',
    summary: needsMoreDiscussion
      ? '사용자가 추가 논의를 요청함'
      : `사용자가 ${chosen?.label ?? optionId}을 승인함`,
    category: 'DECISION',
    decisionId,
  };

  next = {
    ...next,
    messages: [...next.messages, decisionMessage],
    events: [...next.events, decisionEvent],
  };

  /* PAY-142 contract 결정에만 적용되는 후속 효과 */
  if (decision.id === RETRY_DECISION_ID) {
    if (needsMoreDiscussion) {
      next = ['agent_app', 'agent_be', 'agent_coordinator'].reduce(
        (acc, agentId) =>
          applyStep(
            acc,
            {
              kind: 'AGENT_STATE',
              agentId,
              status: 'DISCUSSING',
              roomId: 'room_contract',
              currentTask: '비교 근거 보강 중',
            },
            PAY142_ID,
          ),
        next,
      );
      return {
        data: next,
        headline: '추가 논의를 요청했습니다',
        detail: 'Agent들이 비교 자료를 다시 정리합니다. 결정은 아직 열려 있습니다.',
      };
    }

    const style = styleOf(optionId);
    const followUp: SimulationStep[] = [
      { kind: 'STAGE', stage: 'API_CONTRACT', status: 'COMPLETED' },
      { kind: 'STAGE', stage: 'HUMAN_APPROVAL', status: 'COMPLETED' },
      { kind: 'STAGE', stage: 'APP_IMPLEMENTATION', status: 'IN_PROGRESS' },
      { kind: 'STAGE', stage: 'BE_IMPLEMENTATION', status: 'IN_PROGRESS' },
      { kind: 'TASK_STATUS', taskId: 'task_contract', status: 'DONE' },
      { kind: 'FEATURE_STATUS', featureId: PAY142_ID, status: 'IN_PROGRESS' },
      { kind: 'ARTIFACT_UPSERT', artifact: makeOpenApiArtifact(style, 2) },
      {
        kind: 'ARTIFACT_UPSERT',
        artifact: makeDecisionLogArtifact(decisionLogBody(decision, optionId, note), 'APPROVED', 1),
      },
      {
        kind: 'AGENT_STATE',
        agentId: 'agent_app',
        status: 'CODING',
        roomId: 'room_app',
        currentTask: 'Android / iOS 재시도 플로우 구현',
      },
      {
        kind: 'AGENT_STATE',
        agentId: 'agent_be',
        status: 'CODING',
        roomId: 'room_be',
        currentTask: 'POST /v1/payments/retry 구현',
      },
      {
        kind: 'AGENT_STATE',
        agentId: 'agent_coordinator',
        status: 'THINKING',
        roomId: 'room_planning',
        currentTask: '구현 진행 상황 추적',
      },
      {
        kind: 'ACTIVITY',
        event: {
          id: `ev_artifact_${ARTIFACT_DECISION_LOG_ID}`,
          featureId: PAY142_ID,
          at: now,
          actorAgentId: 'agent_coordinator',
          summary: 'Decision Log가 기록됨',
          category: 'ARTIFACT',
          artifactId: ARTIFACT_DECISION_LOG_ID,
        },
      },
    ];

    next = followUp.reduce((acc, step) => applyStep(acc, step, PAY142_ID), next);
    next = {
      ...next,
      notifications: next.notifications.map((n) =>
        n.kind === 'DECISION' && n.featureId === PAY142_ID ? { ...n, read: true } : n,
      ),
      simulation:
        next.simulation.status === 'AWAITING_HUMAN'
          ? { ...next.simulation, status: 'RUNNING' }
          : next.simulation,
    };

    return {
      data: next,
      headline: `${chosen?.label ?? '결정'} 완료`,
      detail: 'API Contract와 Human Approval이 완료되고 APP · BE 구현이 시작되었습니다.',
    };
  }

  return {
    data: next,
    headline: '결정이 기록되었습니다',
    detail: `${chosen?.label ?? optionId} 으로 처리했습니다.`,
  };
}

/** 거절: 해당 단계가 차단되고 관련 Agent 가 Blocked Zone 으로 이동한다. */
export function rejectDecision(
  data: TownData,
  decisionId: string,
  note: string | null,
  now: string,
): DecisionOutcome {
  const decision = data.decisions.find((d) => d.id === decisionId);
  if (!decision) {
    return { data, headline: '결정을 찾을 수 없습니다', detail: '이미 처리되었을 수 있습니다.' };
  }

  const feature = data.features.find((f) => f.id === decision.featureId);
  const blockedNotification: Notification = {
    id: `noti_reject_${decisionId}`,
    title: '결정이 거절되어 작업이 중단되었습니다',
    body: `${feature?.key ?? ''} · ${decision.title}`,
    createdAt: now,
    read: false,
    featureId: decision.featureId,
    kind: 'BLOCKER',
  };

  let next: TownData = {
    ...data,
    decisions: mapById(
      data.decisions,
      decisionId,
      (d): Decision => ({ ...d, status: 'REJECTED', resolvedAt: now, chosenOptionId: null, note }),
    ),
    messages: [
      ...data.messages,
      {
        id: `msg_reject_${decisionId}`,
        featureId: decision.featureId,
        type: 'BLOCKED',
        reason: note ?? '사람이 제안을 거절함',
        fromAgentId: 'human',
        toAgentId: 'all',
        body: `제안된 방식을 모두 거절했습니다.${note ? `\n사유: ${note}` : ''} 새로운 방안이 필요합니다.`,
        createdAt: now,
        artifactId: null,
        blocking: true,
      },
    ],
    events: [
      ...data.events,
      {
        id: `ev_reject_${decisionId}`,
        featureId: decision.featureId,
        at: now,
        actorAgentId: 'human',
        summary: '사용자가 결정을 거절하여 작업이 중단됨',
        category: 'BLOCKER',
        reason: note ?? '제안 거절',
      },
    ],
    notifications: [blockedNotification, ...data.notifications],
  };

  const blockedSteps: SimulationStep[] = [
    { kind: 'FEATURE_STATUS', featureId: decision.featureId, status: 'BLOCKED' },
    ...(decision.blocksStage
      ? ([{ kind: 'STAGE', stage: decision.blocksStage, status: 'BLOCKED' }] as SimulationStep[])
      : []),
    ...(feature?.agentIds ?? []).map(
      (agentId): SimulationStep => ({
        kind: 'AGENT_STATE',
        agentId,
        status: 'BLOCKED',
        roomId: 'room_blocked',
        currentTask: '결정 거절로 대기 중',
      }),
    ),
  ];

  next = blockedSteps.reduce((acc, step) => applyStep(acc, step, decision.featureId), next);
  next = { ...next, simulation: { ...next.simulation, status: 'PAUSED' } };

  return {
    data: next,
    headline: '결정을 거절했습니다',
    detail: '관련 Agent가 Blocked Zone으로 이동했습니다. Reset으로 처음부터 다시 진행할 수 있습니다.',
  };
}
