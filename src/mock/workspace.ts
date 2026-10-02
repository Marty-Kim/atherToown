import type { Room, User, Workspace } from '@/types/domain';

export const MOCK_WORKSPACE: Workspace = {
  id: 'ws_acme',
  name: 'Acme Development',
  slug: 'acme-dev',
  repositories: [
    'acme/payments-api',
    'acme/mobile-app',
    'acme/web-console',
    'acme/qa-contract-tests',
  ],
};

export const CURRENT_USER_ID = 'user_marty';

export const MOCK_USERS: readonly User[] = [
  {
    id: 'user_marty',
    name: '마티',
    email: 'marty@acme.dev',
    initials: 'MT',
    team: 'APP',
    title: 'Native 파트장',
  },
  {
    id: 'user_jiwon',
    name: '지원',
    email: 'jiwon@acme.dev',
    initials: 'JW',
    team: 'BE',
    title: 'Payments Backend',
  },
  {
    id: 'user_haneul',
    name: '하늘',
    email: 'haneul@acme.dev',
    initials: 'HN',
    team: 'FE',
    title: 'Web Console',
  },
  {
    id: 'user_seojun',
    name: '서준',
    email: 'seojun@acme.dev',
    initials: 'SJ',
    team: 'QA',
    title: 'Quality Engineering',
  },
  {
    id: 'user_dana',
    name: '다나',
    email: 'dana@acme.dev',
    initials: 'DN',
    team: 'PLATFORM',
    title: 'Dev Productivity',
  },
];

/**
 * 가상 오피스는 12 x 8 CSS grid 위에 배치한다.
 * Agent 좌표는 저장하지 않고 Room 좌표에서 파생시킨다.
 */
export const MOCK_ROOMS: readonly Room[] = [
  {
    id: 'room_planning',
    kind: 'PLANNING',
    name: 'Planning Room',
    description: '요구사항 분석과 작업 분해가 이루어지는 공간',
    grid: { col: 1, row: 1, colSpan: 3, rowSpan: 3 },
  },
  {
    id: 'room_contract',
    kind: 'CONTRACT',
    name: 'Contract Room',
    description: 'API 스펙과 데이터 계약을 합의하는 공간',
    grid: { col: 4, row: 1, colSpan: 3, rowSpan: 3 },
  },
  {
    id: 'room_review',
    kind: 'REVIEW',
    name: 'Review Room',
    description: '코드 리뷰와 변경 영향도 점검',
    grid: { col: 7, row: 1, colSpan: 3, rowSpan: 3 },
  },
  {
    id: 'room_release',
    kind: 'RELEASE',
    name: 'Release Room',
    description: '릴리즈 준비와 배포 체크리스트',
    grid: { col: 10, row: 1, colSpan: 3, rowSpan: 3 },
  },
  {
    id: 'room_app',
    kind: 'APP',
    name: 'APP Room',
    description: 'Android / iOS 네이티브 구현',
    grid: { col: 1, row: 4, colSpan: 3, rowSpan: 3 },
  },
  {
    id: 'room_fe',
    kind: 'FE',
    name: 'FE Room',
    description: '웹 프런트엔드 구현',
    grid: { col: 4, row: 4, colSpan: 3, rowSpan: 3 },
  },
  {
    id: 'room_be',
    kind: 'BE',
    name: 'BE Room',
    description: '서버 API 구현과 데이터 모델링',
    grid: { col: 7, row: 4, colSpan: 3, rowSpan: 3 },
  },
  {
    id: 'room_integration',
    kind: 'INTEGRATION',
    name: 'Integration Lab',
    description: 'Contract 테스트와 통합 검증',
    grid: { col: 10, row: 4, colSpan: 3, rowSpan: 3 },
  },
  {
    id: 'room_blocked',
    kind: 'BLOCKED_ZONE',
    name: 'Blocked Zone',
    description: '차단된 작업이 모이는 공간. 비어 있는 것이 정상이다.',
    grid: { col: 1, row: 7, colSpan: 12, rowSpan: 2 },
  },
];
