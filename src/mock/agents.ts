import type { Agent, Permission, PermissionLevel } from '@/types/domain';

export function permissionOf(level: PermissionLevel): Permission {
  switch (level) {
    case 'READ_ONLY':
      return { level, canOpenPullRequest: false, canMerge: false, canEditContract: false };
    case 'DRAFT':
      return { level, canOpenPullRequest: false, canMerge: false, canEditContract: true };
    case 'BRANCH_AND_PR':
      return { level, canOpenPullRequest: true, canMerge: false, canEditContract: true };
    case 'MERGE_AFTER_APPROVAL':
      return { level, canOpenPullRequest: true, canMerge: true, canEditContract: true };
  }
}

const DAY = '2026-09-16';

export const MOCK_AGENTS: readonly Agent[] = [
  {
    id: 'agent_coordinator',
    name: 'Atlas',
    role: 'COORDINATOR',
    provider: 'CLAUDE',
    team: 'PLATFORM',
    connectedBy: 'user_dana',
    capabilities: ['REQUIREMENT_ANALYSIS', 'DEPENDENCY_TRACKING', 'DOCUMENTATION'],
    repositories: ['acme/payments-api', 'acme/mobile-app', 'acme/web-console'],
    permission: permissionOf('DRAFT'),
    connection: 'CONNECTED',
    status: 'IDLE',
    currentTask: null,
    roomId: 'room_planning',
    featureId: 'feat_pay142',
    lastActiveAt: `${DAY}T09:58:00+09:00`,
    accent: 'violet',
  },
  {
    id: 'agent_app',
    name: 'Kestrel',
    role: 'APP',
    provider: 'CLAUDE',
    team: 'APP',
    connectedBy: 'user_marty',
    capabilities: ['CODE_GENERATION', 'API_DESIGN', 'TEST_AUTHORING'],
    repositories: ['acme/mobile-app'],
    permission: permissionOf('BRANCH_AND_PR'),
    connection: 'CONNECTED',
    status: 'IDLE',
    currentTask: null,
    roomId: 'room_app',
    featureId: 'feat_pay142',
    lastActiveAt: `${DAY}T09:55:00+09:00`,
    accent: 'cyan',
  },
  {
    id: 'agent_be',
    name: 'Bastion',
    role: 'BE',
    provider: 'OPENAI',
    team: 'BE',
    connectedBy: 'user_jiwon',
    capabilities: ['API_DESIGN', 'CODE_GENERATION', 'DOCUMENTATION'],
    repositories: ['acme/payments-api'],
    permission: permissionOf('BRANCH_AND_PR'),
    connection: 'CONNECTED',
    status: 'IDLE',
    currentTask: null,
    roomId: 'room_be',
    featureId: 'feat_pay142',
    lastActiveAt: `${DAY}T09:56:00+09:00`,
    accent: 'emerald',
  },
  {
    id: 'agent_qa',
    name: 'Sentry',
    role: 'QA',
    provider: 'GEMINI',
    team: 'QA',
    connectedBy: 'user_seojun',
    capabilities: ['CONTRACT_TEST', 'TEST_AUTHORING', 'DOCUMENTATION'],
    repositories: ['acme/qa-contract-tests'],
    permission: permissionOf('DRAFT'),
    connection: 'CONNECTED',
    status: 'IDLE',
    currentTask: null,
    roomId: 'room_integration',
    featureId: 'feat_pay142',
    lastActiveAt: `${DAY}T09:40:00+09:00`,
    accent: 'amber',
  },
  {
    id: 'agent_fe',
    name: 'Lumen',
    role: 'FE',
    provider: 'CLAUDE',
    team: 'FE',
    connectedBy: 'user_haneul',
    capabilities: ['CODE_GENERATION', 'API_DESIGN', 'DOCUMENTATION'],
    repositories: ['acme/web-console'],
    permission: permissionOf('BRANCH_AND_PR'),
    connection: 'CONNECTED',
    status: 'CODING',
    currentTask: '결제 내역 화면 필터 UI 구현',
    roomId: 'room_fe',
    featureId: 'feat_console_filter',
    lastActiveAt: `${DAY}T09:59:00+09:00`,
    accent: 'blue',
  },
  {
    id: 'agent_reviewer',
    name: 'Verdict',
    role: 'REVIEWER',
    provider: 'CUSTOM',
    team: 'PLATFORM',
    connectedBy: 'user_dana',
    capabilities: ['CODE_REVIEW', 'RELEASE_NOTES', 'DEPENDENCY_TRACKING'],
    repositories: ['acme/payments-api', 'acme/mobile-app', 'acme/web-console'],
    permission: permissionOf('MERGE_AFTER_APPROVAL'),
    connection: 'DEGRADED',
    status: 'IDLE',
    currentTask: null,
    roomId: 'room_review',
    featureId: null,
    lastActiveAt: `${DAY}T09:12:00+09:00`,
    accent: 'rose',
  },
];
