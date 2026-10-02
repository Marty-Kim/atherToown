import type {
  ActivityEvent,
  AgentMessage,
  Decision,
  Notification,
  SimulationEvent,
} from '@/types/domain';
import { PAY142_ID } from './features';
import {
  APP_PLAN_ARTIFACT,
  BE_PLAN_ARTIFACT,
  CONTRACT_TEST_ARTIFACT,
  makeOpenApiArtifact,
} from './artifacts';

const DAY = '2026-09-16';
const at = (hhmm: string): string => `${DAY}T${hhmm}:00+09:00`;

export const RETRY_DECISION_ID = 'dec_retry_contract';
export const OPTION_HEADER = 'opt_header';
export const OPTION_BODY = 'opt_body';
export const OPTION_DISCUSS = 'opt_discuss';

export const RETRY_DECISION: Decision = {
  id: RETRY_DECISION_ID,
  featureId: PAY142_ID,
  title: 'Payment retry contract 결정 필요',
  question: '결제 재시도 요청의 멱등 식별자를 어디에 둘 것인가?',
  context:
    'APP Agent는 Idempotency-Key header 방식을, BE Agent는 retryToken body 방식을 제안했습니다. 두 방식 모두 중복 승인은 막을 수 있으나 API 일관성과 구현 비용이 다릅니다.',
  options: [
    {
      id: OPTION_HEADER,
      label: 'Header 방식 승인',
      summary: '`Idempotency-Key` HTTP header 로 재시도를 식별한다.',
      proposedByAgentId: 'agent_app',
      tradeoffs: [
        '결제 외 다른 POST API 에도 동일 규칙을 재사용할 수 있다',
        '앱·웹 네트워크 계층에서 공통 인터셉터로 처리 가능',
        '게이트웨이 로그에 body 를 남기지 않아도 추적이 가능하다',
        'BE 는 header 파싱·검증 미들웨어를 새로 추가해야 한다',
      ],
    },
    {
      id: OPTION_BODY,
      label: 'Body 방식 승인',
      summary: 'request body 의 `retryToken` 으로 재시도를 식별한다.',
      proposedByAgentId: 'agent_be',
      tradeoffs: [
        '기존 결제 API 들이 이미 body 기반 토큰을 쓰고 있어 구현이 빠르다',
        '토큰 발급 주체가 서버라 유효성 검증이 단순하다',
        '다른 도메인 API 로 규칙을 확장하기 어렵다',
        'APP 은 실패 응답에서 토큰을 저장하는 분기를 추가해야 한다',
      ],
    },
    {
      id: OPTION_DISCUSS,
      label: '추가 논의 요청',
      summary: '판단 근거가 부족하다. Agent 들에게 비교 자료를 더 요청한다.',
      proposedByAgentId: null,
      tradeoffs: ['결정이 지연되어 APP·BE 구현 착수가 미뤄진다'],
    },
  ],
  status: 'OPEN',
  requestedByAgentId: 'agent_coordinator',
  requestedAt: at('10:09'),
  resolvedAt: null,
  chosenOptionId: null,
  note: null,
  blocksStage: 'API_CONTRACT',
};

/* ------------------------------------------------------------------ *
 * 메시지 / 활동 헬퍼
 * ------------------------------------------------------------------ */

function conv(id: string, time: string, actor: ActivityEvent['actorAgentId'], summary: string, messageId: string): ActivityEvent {
  return { id, featureId: PAY142_ID, at: time, actorAgentId: actor, summary, category: 'CONVERSATION', messageId };
}

function artifactEvent(id: string, time: string, actor: ActivityEvent['actorAgentId'], summary: string, artifactId: string): ActivityEvent {
  return { id, featureId: PAY142_ID, at: time, actorAgentId: actor, summary, category: 'ARTIFACT', artifactId };
}

/* ------------------------------------------------------------------ *
 * 시뮬레이션 스크립트
 * index 5 의 AWAIT_HUMAN 에서 정지하고, 사용자가 결정을 승인해야 이어진다.
 * ------------------------------------------------------------------ */

const M = {
  reqDone: {
    id: 'msg_req_done',
    featureId: PAY142_ID,
    type: 'COMPLETED',
    stage: 'REQUIREMENT_ANALYSIS',
    fromAgentId: 'agent_coordinator',
    toAgentId: 'all',
    body: '요구사항 분석을 마쳤습니다. 핵심 제약은 두 가지입니다. (1) 최초 실패로부터 24시간 이내만 재시도 허용, (2) 몇 번을 재시도해도 승인은 한 번만 발생. 다음은 API contract 합의입니다.',
    createdAt: at('10:01'),
    artifactId: 'art_acceptance',
    blocking: false,
  },
  appQuestion: {
    id: 'msg_app_question',
    featureId: PAY142_ID,
    type: 'QUESTION',
    topic: '재시도 멱등성 식별 방식',
    fromAgentId: 'agent_app',
    toAgentId: 'agent_be',
    body: '재시도 요청의 멱등성을 무엇으로 식별하나요? 앱은 오프라인 재시도와 프로세스 재시작까지 고려해야 해서, 식별자를 어디에 담는지에 따라 저장 시점이 달라집니다.',
    createdAt: at('10:03'),
    artifactId: null,
    blocking: true,
  },
  beProposal: {
    id: 'msg_be_proposal',
    featureId: PAY142_ID,
    type: 'PROPOSAL',
    optionLabel: 'retryToken (request body)',
    fromAgentId: 'agent_be',
    toAgentId: 'all',
    body: '최초 결제 실패 응답에 `retryToken` 을 내려주고, 재시도 시 request body 에 그대로 실어 보내는 방식을 제안합니다. 기존 결제 API 들이 이미 같은 패턴을 쓰고 있어 서버 구현이 가장 빠릅니다. 초안 contract 를 올려두었습니다.',
    createdAt: at('10:05'),
    artifactId: 'art_openapi',
    blocking: false,
  },
  appCounter: {
    id: 'msg_app_counter',
    featureId: PAY142_ID,
    type: 'COUNTER_PROPOSAL',
    optionLabel: 'Idempotency-Key (HTTP header)',
    countersMessageId: 'msg_be_proposal',
    fromAgentId: 'agent_app',
    toAgentId: 'agent_be',
    body: '`Idempotency-Key` HTTP header 방식을 역제안합니다. 앱은 네트워크 인터셉터 한 곳에서 키를 붙이면 되어 화면별 분기가 사라지고, 결제 외 POST API 에도 같은 규칙을 재사용할 수 있습니다. body 토큰은 서버가 내려주기 전까지 앱이 키를 만들 수 없어 오프라인 큐잉이 어렵습니다.',
    createdAt: at('10:07'),
    artifactId: null,
    blocking: true,
  },
  decisionRequest: {
    id: 'msg_decision_request',
    featureId: PAY142_ID,
    type: 'DECISION_REQUEST',
    decisionId: RETRY_DECISION_ID,
    fromAgentId: 'agent_coordinator',
    toAgentId: 'human',
    body: '두 방식 모두 중복 승인은 막을 수 있어 Agent 간 합의로 결정하기 어렵습니다. API 일관성(header) 과 구현 비용(body) 의 트레이드오프라 사람의 판단이 필요합니다.',
    createdAt: at('10:09'),
    artifactId: 'art_openapi',
    blocking: true,
  },
  appAssign: {
    id: 'msg_app_assign',
    featureId: PAY142_ID,
    type: 'TASK_ASSIGNMENT',
    taskId: 'task_app_impl',
    fromAgentId: 'agent_coordinator',
    toAgentId: 'agent_app',
    body: '확정된 contract 기준으로 Android / iOS 재시도 플로우를 구현해 주세요. 응답 코드 200 / 409 / 422 / 500 분기를 모두 포함합니다.',
    createdAt: at('10:13'),
    artifactId: 'art_openapi',
    blocking: false,
  },
  beAssign: {
    id: 'msg_be_assign',
    featureId: PAY142_ID,
    type: 'TASK_ASSIGNMENT',
    taskId: 'task_be_impl',
    fromAgentId: 'agent_coordinator',
    toAgentId: 'agent_be',
    body: '`POST /v1/payments/retry` 를 확정된 contract 대로 구현해 주세요. 멱등 저장소와 24시간 만료 판정이 포함되어야 합니다.',
    createdAt: at('10:13'),
    artifactId: 'art_openapi',
    blocking: false,
  },
  appPlan: {
    id: 'msg_app_plan',
    featureId: PAY142_ID,
    type: 'ARTIFACT_CREATED',
    artifactId: 'art_app_plan',
    fromAgentId: 'agent_app',
    toAgentId: 'all',
    body: 'APP 구현 계획을 정리했습니다. 키는 요청 전에 디스크에 먼저 기록해 강제 종료 시에도 동일 키로 재시도되게 합니다.',
    createdAt: at('10:24'),
    blocking: false,
  },
  bePlan: {
    id: 'msg_be_plan',
    featureId: PAY142_ID,
    type: 'ARTIFACT_CREATED',
    artifactId: 'art_be_plan',
    fromAgentId: 'agent_be',
    toAgentId: 'all',
    body: 'BE 구현 계획입니다. 재시도 키에 unique index 를 걸고, 동일 키 재요청은 저장된 결과를 그대로 반환합니다.',
    createdAt: at('10:24'),
    blocking: false,
  },
  appDone: {
    id: 'msg_app_done',
    featureId: PAY142_ID,
    type: 'COMPLETED',
    stage: 'APP_IMPLEMENTATION',
    fromAgentId: 'agent_app',
    toAgentId: 'agent_qa',
    body: 'APP 구현을 마쳤습니다. `feature/pay-142-retry` 브랜치에 올렸고, QA 쪽 contract test 에 쓸 수 있도록 mock client 도 포함했습니다.',
    createdAt: at('10:38'),
    artifactId: 'art_app_plan',
    blocking: false,
  },
  beDone: {
    id: 'msg_be_done',
    featureId: PAY142_ID,
    type: 'COMPLETED',
    stage: 'BE_IMPLEMENTATION',
    fromAgentId: 'agent_be',
    toAgentId: 'agent_qa',
    body: 'BE 구현을 마쳤습니다. 스테이징에 배포되어 있으며 409 / 422 응답도 실제로 재현됩니다.',
    createdAt: at('10:38'),
    artifactId: 'art_be_plan',
    blocking: false,
  },
  qaScenario: {
    id: 'msg_qa_scenario',
    featureId: PAY142_ID,
    type: 'ARTIFACT_CREATED',
    artifactId: 'art_contract_test',
    fromAgentId: 'agent_qa',
    toAgentId: 'all',
    body: 'Contract test 시나리오 6건을 작성했습니다. 동일 키 2회 재시도 시 승인 레코드가 1건인지도 검증합니다.',
    createdAt: at('10:41'),
    blocking: false,
  },
  qaDone: {
    id: 'msg_qa_done',
    featureId: PAY142_ID,
    type: 'COMPLETED',
    stage: 'CONTRACT_TEST',
    fromAgentId: 'agent_qa',
    toAgentId: 'agent_reviewer',
    body: 'Contract test 6건 모두 통과했습니다. APP mock client 와 BE 스테이징 양쪽에서 동일 결과를 확인했습니다.',
    createdAt: at('10:58'),
    artifactId: 'art_contract_test',
    blocking: false,
  },
  reviewDone: {
    id: 'msg_review_done',
    featureId: PAY142_ID,
    type: 'COMPLETED',
    stage: 'INTEGRATION_REVIEW',
    fromAgentId: 'agent_reviewer',
    toAgentId: 'all',
    body: '통합 리뷰를 마쳤습니다. contract·구현·테스트가 모두 같은 문서를 참조하고 있어 릴리즈 가능 상태입니다. Acceptance criteria 4건 모두 충족.',
    createdAt: at('11:06'),
    artifactId: 'art_openapi',
    blocking: false,
  },
} satisfies Record<string, AgentMessage>;

const APPROVAL_NOTIFICATION: Notification = {
  id: 'noti_decision',
  title: '승인이 필요합니다',
  body: 'PAY-142 · Payment retry contract 결정 필요',
  createdAt: at('10:09'),
  read: false,
  featureId: PAY142_ID,
  kind: 'DECISION',
};

const DONE_NOTIFICATION: Notification = {
  id: 'noti_done',
  title: 'Feature 완료',
  body: 'PAY-142 결제 실패 재시도 기능이 릴리즈 가능 상태가 되었습니다.',
  createdAt: at('11:06'),
  read: false,
  featureId: PAY142_ID,
  kind: 'COMPLETION',
};

export const PAY142_SCRIPT: readonly SimulationEvent[] = [
  {
    id: 'sim_1',
    featureId: PAY142_ID,
    label: 'Coordinator가 요구사항 분석을 시작',
    steps: [
      { kind: 'FEATURE_STATUS', featureId: PAY142_ID, status: 'IN_PROGRESS' },
      { kind: 'STAGE', stage: 'REQUIREMENT_ANALYSIS', status: 'IN_PROGRESS' },
      { kind: 'TASK_STATUS', taskId: 'task_contract', status: 'IN_PROGRESS' },
      {
        kind: 'AGENT_STATE',
        agentId: 'agent_coordinator',
        status: 'THINKING',
        roomId: 'room_planning',
        currentTask: '요구사항을 팀별 작업으로 분해하는 중',
      },
      {
        kind: 'ACTIVITY',
        event: {
          id: 'ev_1',
          featureId: PAY142_ID,
          at: at('10:00'),
          actorAgentId: 'agent_coordinator',
          summary: 'Coordinator가 요구사항 분석을 시작함',
          category: 'TASK',
          taskId: 'task_contract',
          toStatus: 'IN_PROGRESS',
        },
      },
    ],
  },
  {
    id: 'sim_2',
    featureId: PAY142_ID,
    label: 'Requirement Analysis 완료',
    steps: [
      { kind: 'STAGE', stage: 'REQUIREMENT_ANALYSIS', status: 'COMPLETED' },
      { kind: 'STAGE', stage: 'API_CONTRACT', status: 'IN_PROGRESS' },
      { kind: 'ARTIFACT_STATUS', artifactId: 'art_acceptance', status: 'APPROVED' },
      { kind: 'MESSAGE', message: M.reqDone },
      {
        kind: 'AGENT_STATE',
        agentId: 'agent_coordinator',
        status: 'DISCUSSING',
        roomId: 'room_contract',
        currentTask: 'API contract 합의 진행',
      },
      {
        kind: 'AGENT_STATE',
        agentId: 'agent_app',
        status: 'DISCUSSING',
        roomId: 'room_contract',
        currentTask: '재시도 식별 방식 검토',
      },
      {
        kind: 'AGENT_STATE',
        agentId: 'agent_be',
        status: 'DISCUSSING',
        roomId: 'room_contract',
        currentTask: '재시도 contract 초안 작성',
      },
      { kind: 'ACTIVITY', event: conv('ev_2', at('10:01'), 'agent_coordinator', 'Coordinator가 요구사항 분석을 완료함', 'msg_req_done') },
    ],
  },
  {
    id: 'sim_3',
    featureId: PAY142_ID,
    label: 'APP Agent가 API contract 질문 등록',
    steps: [
      { kind: 'MESSAGE', message: M.appQuestion },
      { kind: 'ACTIVITY', event: conv('ev_3', at('10:03'), 'agent_app', 'APP Agent가 API contract를 요청함', 'msg_app_question') },
      { kind: 'AGENT_STATE', agentId: 'agent_be', status: 'THINKING', currentTask: '멱등 식별 방식 비교 중' },
    ],
  },
  {
    id: 'sim_4',
    featureId: PAY142_ID,
    label: 'BE Agent가 retryToken 방식 제안',
    steps: [
      { kind: 'ARTIFACT_UPSERT', artifact: makeOpenApiArtifact('body', 1) },
      { kind: 'MESSAGE', message: M.beProposal },
      { kind: 'AGENT_STATE', agentId: 'agent_be', status: 'DISCUSSING', currentTask: 'retryToken 방식 설명 중' },
      { kind: 'ACTIVITY', event: conv('ev_4', at('10:05'), 'agent_be', 'BE Agent가 retryToken 방식을 제안함', 'msg_be_proposal') },
      { kind: 'ACTIVITY', event: artifactEvent('ev_4b', at('10:05'), 'agent_be', 'payment-api.openapi.yaml 초안이 생성됨', 'art_openapi') },
    ],
  },
  {
    id: 'sim_5',
    featureId: PAY142_ID,
    label: 'APP Agent가 Idempotency-Key 역제안',
    steps: [
      { kind: 'MESSAGE', message: M.appCounter },
      { kind: 'AGENT_STATE', agentId: 'agent_app', status: 'DISCUSSING', currentTask: 'Idempotency-Key 방식 역제안' },
      { kind: 'ACTIVITY', event: conv('ev_5', at('10:07'), 'agent_app', 'APP Agent가 Idempotency-Key 방식을 제안함', 'msg_app_counter') },
    ],
  },
  {
    id: 'sim_6',
    featureId: PAY142_ID,
    label: 'Coordinator가 Human approval 요청',
    steps: [
      { kind: 'DECISION_OPEN', decision: RETRY_DECISION },
      { kind: 'MESSAGE', message: M.decisionRequest },
      { kind: 'STAGE', stage: 'HUMAN_APPROVAL', status: 'WAITING' },
      { kind: 'FEATURE_STATUS', featureId: PAY142_ID, status: 'WAITING_APPROVAL' },
      { kind: 'AGENT_STATE', agentId: 'agent_coordinator', status: 'WAITING_FOR_APPROVAL', currentTask: '사람의 결정을 기다리는 중' },
      { kind: 'AGENT_STATE', agentId: 'agent_app', status: 'WAITING_FOR_APPROVAL', currentTask: 'contract 확정 대기' },
      { kind: 'AGENT_STATE', agentId: 'agent_be', status: 'WAITING_FOR_APPROVAL', currentTask: 'contract 확정 대기' },
      {
        kind: 'ACTIVITY',
        event: {
          id: 'ev_6',
          featureId: PAY142_ID,
          at: at('10:09'),
          actorAgentId: 'agent_coordinator',
          summary: 'Coordinator가 Human approval을 요청함',
          category: 'DECISION',
          decisionId: RETRY_DECISION_ID,
        },
      },
      { kind: 'NOTIFY', notification: APPROVAL_NOTIFICATION },
      { kind: 'AWAIT_HUMAN', decisionId: RETRY_DECISION_ID },
    ],
  },
  {
    id: 'sim_7',
    featureId: PAY142_ID,
    label: 'APP · BE 구현 작업 배정',
    steps: [
      { kind: 'MESSAGE', message: M.appAssign },
      { kind: 'MESSAGE', message: M.beAssign },
      { kind: 'TASK_STATUS', taskId: 'task_app_impl', status: 'IN_PROGRESS' },
      { kind: 'TASK_STATUS', taskId: 'task_be_impl', status: 'IN_PROGRESS' },
      {
        kind: 'ACTIVITY',
        event: {
          id: 'ev_8',
          featureId: PAY142_ID,
          at: at('10:13'),
          actorAgentId: 'agent_coordinator',
          summary: 'APP 및 BE 구현 작업이 시작됨',
          category: 'TASK',
          taskId: 'task_app_impl',
          toStatus: 'IN_PROGRESS',
        },
      },
    ],
  },
  {
    id: 'sim_8',
    featureId: PAY142_ID,
    label: '구현 계획 artifact 생성',
    steps: [
      { kind: 'ARTIFACT_UPSERT', artifact: APP_PLAN_ARTIFACT },
      { kind: 'ARTIFACT_UPSERT', artifact: BE_PLAN_ARTIFACT },
      { kind: 'MESSAGE', message: M.appPlan },
      { kind: 'MESSAGE', message: M.bePlan },
      { kind: 'ACTIVITY', event: artifactEvent('ev_9', at('10:24'), 'agent_app', 'APP Implementation Plan이 생성됨', 'art_app_plan') },
      { kind: 'ACTIVITY', event: artifactEvent('ev_10', at('10:24'), 'agent_be', 'BE Implementation Plan이 생성됨', 'art_be_plan') },
    ],
  },
  {
    id: 'sim_9',
    featureId: PAY142_ID,
    label: 'APP · BE 구현 완료, QA로 인계',
    steps: [
      { kind: 'MESSAGE', message: M.appDone },
      { kind: 'MESSAGE', message: M.beDone },
      { kind: 'STAGE', stage: 'APP_IMPLEMENTATION', status: 'COMPLETED' },
      { kind: 'STAGE', stage: 'BE_IMPLEMENTATION', status: 'COMPLETED' },
      { kind: 'STAGE', stage: 'CONTRACT_TEST', status: 'IN_PROGRESS' },
      { kind: 'TASK_STATUS', taskId: 'task_app_impl', status: 'DONE' },
      { kind: 'TASK_STATUS', taskId: 'task_be_impl', status: 'DONE' },
      { kind: 'TASK_STATUS', taskId: 'task_qa_contract', status: 'IN_PROGRESS' },
      { kind: 'ARTIFACT_STATUS', artifactId: 'art_app_plan', status: 'APPROVED' },
      { kind: 'ARTIFACT_STATUS', artifactId: 'art_be_plan', status: 'APPROVED' },
      { kind: 'AGENT_STATE', agentId: 'agent_app', status: 'COMPLETED', currentTask: 'APP 구현 완료' },
      { kind: 'AGENT_STATE', agentId: 'agent_be', status: 'COMPLETED', currentTask: 'BE 구현 완료' },
      { kind: 'AGENT_STATE', agentId: 'agent_qa', status: 'TESTING', roomId: 'room_integration', currentTask: 'Contract test 실행 준비' },
      { kind: 'ACTIVITY', event: conv('ev_11', at('10:38'), 'agent_app', 'APP 구현이 완료됨', 'msg_app_done') },
      { kind: 'ACTIVITY', event: conv('ev_12', at('10:38'), 'agent_be', 'BE 구현이 완료됨', 'msg_be_done') },
    ],
  },
  {
    id: 'sim_10',
    featureId: PAY142_ID,
    label: 'QA contract test 진행',
    steps: [
      { kind: 'ARTIFACT_UPSERT', artifact: CONTRACT_TEST_ARTIFACT },
      { kind: 'MESSAGE', message: M.qaScenario },
      { kind: 'AGENT_STATE', agentId: 'agent_qa', status: 'TESTING', currentTask: 'Contract test 6건 실행 중' },
      { kind: 'ACTIVITY', event: artifactEvent('ev_13', at('10:41'), 'agent_qa', 'Contract Test Scenario가 생성됨', 'art_contract_test') },
    ],
  },
  {
    id: 'sim_11',
    featureId: PAY142_ID,
    label: 'Contract test 통과, 통합 리뷰 시작',
    steps: [
      { kind: 'MESSAGE', message: M.qaDone },
      { kind: 'STAGE', stage: 'CONTRACT_TEST', status: 'COMPLETED' },
      { kind: 'STAGE', stage: 'INTEGRATION_REVIEW', status: 'IN_PROGRESS' },
      { kind: 'TASK_STATUS', taskId: 'task_qa_contract', status: 'DONE' },
      { kind: 'TASK_STATUS', taskId: 'task_review', status: 'IN_PROGRESS' },
      { kind: 'ARTIFACT_STATUS', artifactId: 'art_contract_test', status: 'APPROVED' },
      { kind: 'AGENT_STATE', agentId: 'agent_qa', status: 'COMPLETED', currentTask: 'Contract test 6/6 통과' },
      { kind: 'AGENT_STATE', agentId: 'agent_reviewer', status: 'THINKING', roomId: 'room_review', currentTask: '통합 리뷰 진행 중' },
      { kind: 'ACTIVITY', event: conv('ev_14', at('10:58'), 'agent_qa', 'Contract test 6건이 모두 통과함', 'msg_qa_done') },
    ],
  },
  {
    id: 'sim_12',
    featureId: PAY142_ID,
    label: 'Feature 완료',
    steps: [
      { kind: 'MESSAGE', message: M.reviewDone },
      { kind: 'STAGE', stage: 'INTEGRATION_REVIEW', status: 'COMPLETED' },
      { kind: 'TASK_STATUS', taskId: 'task_review', status: 'DONE' },
      { kind: 'FEATURE_STATUS', featureId: PAY142_ID, status: 'DONE' },
      { kind: 'AGENT_STATE', agentId: 'agent_reviewer', status: 'COMPLETED', roomId: 'room_release', currentTask: '릴리즈 가능 판정' },
      { kind: 'AGENT_STATE', agentId: 'agent_coordinator', status: 'COMPLETED', roomId: 'room_release', currentTask: 'PAY-142 완료 정리' },
      { kind: 'ARTIFACT_STATUS', artifactId: 'art_openapi', status: 'APPROVED' },
      { kind: 'ARTIFACT_STATUS', artifactId: 'art_acceptance', status: 'APPROVED' },
      { kind: 'ACTIVITY', event: conv('ev_15', at('11:06'), 'agent_reviewer', '통합 리뷰가 완료되어 Feature가 종료됨', 'msg_review_done') },
      { kind: 'NOTIFY', notification: DONE_NOTIFICATION },
    ],
  },
];

/** 사용자가 결정을 승인해야 넘어갈 수 있는 이벤트 index (0-based, 적용 완료 기준 cursor). */
export const AWAIT_HUMAN_CURSOR = 6;
