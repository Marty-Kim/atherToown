import type {
  ActivityEvent,
  Agent,
  AgentMessage,
  Artifact,
  Decision,
  Dependency,
  Feature,
  Notification,
  Room,
  SimulationState,
  Task,
  User,
  Workspace,
} from '@/types/domain';
import { ACCEPTANCE_ARTIFACT, OTHER_ARTIFACTS } from './artifacts';
import { MOCK_AGENTS } from './agents';
import { MOCK_DEPENDENCIES, MOCK_FEATURES, MOCK_TASKS, PAY142_ID } from './features';
import { CURRENT_USER_ID, MOCK_ROOMS, MOCK_USERS, MOCK_WORKSPACE } from './workspace';

export { CURRENT_USER_ID, PAY142_ID };
export { PAY142_SCRIPT, RETRY_DECISION_ID, OPTION_HEADER, OPTION_BODY, OPTION_DISCUSS } from './script';

const DAY = '2026-09-16';

/** 전체 도메인 데이터. store 가 이 모양을 그대로 보관한다. */
export interface TownData {
  workspace: Workspace;
  users: User[];
  rooms: Room[];
  agents: Agent[];
  features: Feature[];
  tasks: Task[];
  dependencies: Dependency[];
  messages: AgentMessage[];
  decisions: Decision[];
  artifacts: Artifact[];
  events: ActivityEvent[];
  notifications: Notification[];
  simulation: SimulationState;
}

const REFUND_DECISION: Decision = {
  id: 'dec_refund_fee',
  featureId: 'feat_refund',
  title: '부분 환불 수수료 정산 기준 확정 필요',
  question: '부분 환불 시 PG 수수료를 비례 환급할 것인가?',
  context:
    'BE Agent가 정산 기준을 확인할 수 없어 contract 작업이 중단되었습니다. 재무팀 정책 확인이 필요합니다.',
  options: [
    {
      id: 'opt_prorate',
      label: '비례 환급',
      summary: '환불 금액 비율만큼 수수료도 환급한다.',
      proposedByAgentId: 'agent_be',
      tradeoffs: ['정산 로직이 복잡해진다', '고객 불만이 줄어든다'],
    },
    {
      id: 'opt_keep',
      label: '전액 유지',
      summary: '수수료는 환급하지 않는다.',
      proposedByAgentId: 'agent_be',
      tradeoffs: ['구현이 단순하다', '약관 고지 문구 수정이 필요하다'],
    },
  ],
  status: 'OPEN',
  requestedByAgentId: 'agent_be',
  requestedAt: `${DAY}T08:52:00+09:00`,
  resolvedAt: null,
  chosenOptionId: null,
  note: null,
  blocksStage: 'API_CONTRACT',
};

const OTHER_MESSAGES: AgentMessage[] = [
  {
    id: 'msg_console_1',
    featureId: 'feat_console_filter',
    type: 'TASK_ASSIGNMENT',
    taskId: 'task_console_fe',
    fromAgentId: 'agent_be',
    toAgentId: 'agent_fe',
    body: '필터 API 는 기존 `GET /v1/payments` 쿼리 파라미터를 그대로 씁니다. 추가 배포 없이 붙일 수 있습니다.',
    createdAt: `${DAY}T09:20:00+09:00`,
    artifactId: 'art_console_plan',
    blocking: false,
  },
  {
    id: 'msg_console_2',
    featureId: 'feat_console_filter',
    type: 'ANSWER',
    answersMessageId: null,
    fromAgentId: 'agent_fe',
    toAgentId: 'agent_be',
    body: '확인했습니다. 필터 조건을 URL query 로 직렬화해서 공유 가능하게 만들겠습니다.',
    createdAt: `${DAY}T09:26:00+09:00`,
    artifactId: null,
    blocking: false,
  },
  {
    id: 'msg_refund_1',
    featureId: 'feat_refund',
    type: 'BLOCKED',
    reason: '부분 환불 수수료 정산 기준 미정',
    fromAgentId: 'agent_be',
    toAgentId: 'human',
    body: '부분 환불 시 PG 수수료 처리 기준이 없어 contract 를 확정할 수 없습니다. 재무팀 확인이 필요합니다.',
    createdAt: `${DAY}T08:52:00+09:00`,
    artifactId: 'art_refund_decision',
    blocking: true,
  },
];

const OTHER_EVENTS: ActivityEvent[] = [
  {
    id: 'ev_console_1',
    featureId: 'feat_console_filter',
    at: `${DAY}T09:20:00+09:00`,
    actorAgentId: 'agent_be',
    summary: 'BE Agent가 필터 API 재사용 방침을 공유함',
    category: 'CONVERSATION',
    messageId: 'msg_console_1',
  },
  {
    id: 'ev_console_2',
    featureId: 'feat_console_filter',
    at: `${DAY}T09:44:00+09:00`,
    actorAgentId: 'agent_fe',
    summary: 'Console Filter Plan이 승인됨',
    category: 'ARTIFACT',
    artifactId: 'art_console_plan',
  },
  {
    id: 'ev_refund_1',
    featureId: 'feat_refund',
    at: `${DAY}T08:52:00+09:00`,
    actorAgentId: 'agent_be',
    summary: '부분 환불 수수료 기준 미정으로 작업이 중단됨',
    category: 'BLOCKER',
    reason: '부분 환불 수수료 정산 기준 미정',
  },
];

const OTHER_NOTIFICATIONS: Notification[] = [
  {
    id: 'noti_refund',
    title: '작업이 중단되었습니다',
    body: 'PAY-150 · 부분 환불 수수료 정산 기준 미정',
    createdAt: `${DAY}T08:52:00+09:00`,
    read: false,
    featureId: 'feat_refund',
    kind: 'BLOCKER',
  },
];

const INITIAL_SIMULATION: SimulationState = {
  status: 'IDLE',
  cursor: 0,
  speedMs: 2000,
  featureId: PAY142_ID,
};

/**
 * Live 모드의 시작 상태.
 * 워크스페이스·구성원·Room 같은 고정 설정만 남기고, Agent 와 Feature 는
 * 러너가 붙고 사람이 등록하면서 채워진다.
 */
export function buildLiveBaseData(): TownData {
  return {
    workspace: MOCK_WORKSPACE,
    users: [...MOCK_USERS],
    rooms: [...MOCK_ROOMS],
    agents: [],
    features: [],
    tasks: [],
    dependencies: [],
    messages: [],
    decisions: [],
    artifacts: [],
    events: [],
    notifications: [],
    simulation: { ...INITIAL_SIMULATION, status: 'IDLE', cursor: 0 },
  };
}

/** 시뮬레이션이 한 번도 실행되지 않은 원점 상태. Reset 이 돌아가는 지점. */
export function buildGenesisData(): TownData {
  return {
    workspace: MOCK_WORKSPACE,
    users: [...MOCK_USERS],
    rooms: [...MOCK_ROOMS],
    agents: MOCK_AGENTS.map((a): Agent => ({ ...a })),
    features: MOCK_FEATURES.map((f): Feature => ({ ...f })),
    tasks: MOCK_TASKS.map((t): Task => ({ ...t })),
    dependencies: [...MOCK_DEPENDENCIES],
    messages: [...OTHER_MESSAGES],
    decisions: [REFUND_DECISION],
    artifacts: [ACCEPTANCE_ARTIFACT, ...OTHER_ARTIFACTS],
    events: [...OTHER_EVENTS],
    notifications: [...OTHER_NOTIFICATIONS],
    simulation: INITIAL_SIMULATION,
  };
}
