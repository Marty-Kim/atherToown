import type { Artifact } from '@/types/domain';
import { PAY142_ID } from './features';

const DAY = '2026-09-16';

export type RetryContractStyle = 'header' | 'body';

/**
 * 결정 결과에 따라 contract 문서 본문이 실제로 달라진다.
 * (승인이 화면 상태뿐 아니라 산출물에도 반영되는 것을 보여주기 위함)
 */
export function openApiYaml(style: RetryContractStyle): string {
  const idempotency =
    style === 'header'
      ? `      parameters:
        - in: header
          name: Idempotency-Key
          required: true
          schema:
            type: string
            maxLength: 64
          description: 동일 재시도 요청을 식별하는 클라이언트 생성 키
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [paymentId]
              properties:
                paymentId:
                  type: string`
      : `      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [paymentId, retryToken]
              properties:
                paymentId:
                  type: string
                retryToken:
                  type: string
                  maxLength: 64
                  description: 최초 결제 실패 응답에서 내려준 재시도 토큰`;

  return `openapi: 3.1.0
info:
  title: Acme Payments API
  version: 1.4.0
  description: |
    결제 실패 재시도 (PAY-142).
    재시도 식별 방식: ${style === 'header' ? 'Idempotency-Key HTTP header' : 'requestBody.retryToken'}

paths:
  /v1/payments/retry:
    post:
      operationId: retryPayment
      summary: 실패한 결제를 재시도한다
      tags: [payments]
${idempotency}
      responses:
        '200':
          description: retry success
          content:
            application/json:
              schema:
                type: object
                properties:
                  paymentId: { type: string }
                  status: { type: string, enum: [APPROVED] }
                  approvedAt: { type: string, format: date-time }
        '409':
          description: already processed — 동일 키로 이미 승인된 결제
        '422':
          description: retry period expired — 최초 실패 후 24시간 경과
        '500':
          description: internal error
`;
}

export const ARTIFACT_OPENAPI_ID = 'art_openapi';
export const ARTIFACT_DECISION_LOG_ID = 'art_decision_log';

export function makeOpenApiArtifact(style: RetryContractStyle, version: number): Artifact {
  return {
    id: ARTIFACT_OPENAPI_ID,
    featureId: PAY142_ID,
    name: 'payment-api.openapi.yaml',
    kind: 'OPENAPI',
    status: version === 1 ? 'PROPOSED' : 'APPROVED',
    createdByAgentId: 'agent_be',
    createdAt: `${DAY}T10:05:00+09:00`,
    updatedAt: version === 1 ? `${DAY}T10:05:00+09:00` : `${DAY}T10:12:00+09:00`,
    language: 'yaml',
    content: openApiYaml(style),
    version,
  };
}

export function makeDecisionLogArtifact(body: string, status: Artifact['status'], version: number): Artifact {
  return {
    id: ARTIFACT_DECISION_LOG_ID,
    featureId: PAY142_ID,
    name: 'Decision Log',
    kind: 'DECISION_LOG',
    status,
    createdByAgentId: 'agent_coordinator',
    createdAt: `${DAY}T10:09:00+09:00`,
    updatedAt: `${DAY}T10:12:00+09:00`,
    language: 'markdown',
    content: body,
    version,
  };
}

export const ACCEPTANCE_ARTIFACT: Artifact = {
  id: 'art_acceptance',
  featureId: PAY142_ID,
  name: 'Acceptance Criteria',
  kind: 'ACCEPTANCE_CRITERIA',
  status: 'DRAFT',
  createdByAgentId: 'agent_coordinator',
  createdAt: `${DAY}T10:00:00+09:00`,
  updatedAt: `${DAY}T10:00:00+09:00`,
  language: 'markdown',
  version: 1,
  content: `# PAY-142 Acceptance Criteria

## 기능 요구사항
1. 네트워크 오류로 실패한 결제 건은 **최초 실패 시각으로부터 24시간 이내** 재시도할 수 있다.
2. 동일 결제 건을 여러 번 재시도해도 **승인은 한 번만** 발생한다.
3. 재시도 불가 사유(기간 만료 / 이미 처리됨)는 응답 코드로 구분된다.

## 비기능 요구사항
- 재시도 API 응답 시간 p95 < 800ms
- 재시도 요청/응답은 감사 로그에 남는다

## 확인 방법
- Contract test 로 200 / 409 / 422 / 500 응답을 모두 검증한다.
- APP·BE 가 동일한 contract 문서(\`payment-api.openapi.yaml\`)를 참조한다.
`,
};

export const APP_PLAN_ARTIFACT: Artifact = {
  id: 'art_app_plan',
  featureId: PAY142_ID,
  name: 'APP Implementation Plan',
  kind: 'PLAN',
  status: 'PROPOSED',
  createdByAgentId: 'agent_app',
  createdAt: `${DAY}T10:24:00+09:00`,
  updatedAt: `${DAY}T10:24:00+09:00`,
  language: 'markdown',
  version: 1,
  content: `# APP Implementation Plan — PAY-142

## 범위
- Android (Kotlin) / iOS (Swift) 공통 결제 재시도 플로우

## 작업 순서
1. \`PaymentRetryPolicy\` 추가 — 재시도 가능 시간(24h) 판정 로직을 클라이언트에도 둔다.
2. 재시도 키 저장 — 최초 실패 시 생성한 키를 로컬에 보관하고 재시도 시 그대로 재사용한다.
3. 네트워크 계층에 재시도 인터셉터 추가 (지수 백오프, 최대 3회).
4. 응답 코드 분기
   - \`200\` 성공 화면
   - \`409\` 이미 처리됨 → 결제 완료 화면으로 이동
   - \`422\` 기간 만료 → 신규 결제 유도
   - \`500\` 재시도 안내 배너

## 리스크
- 앱 강제 종료 후 재시도 키가 유실되면 중복 승인 위험 → 키는 디스크에 먼저 쓰고 요청한다.
`,
};

export const BE_PLAN_ARTIFACT: Artifact = {
  id: 'art_be_plan',
  featureId: PAY142_ID,
  name: 'BE Implementation Plan',
  kind: 'PLAN',
  status: 'PROPOSED',
  createdByAgentId: 'agent_be',
  createdAt: `${DAY}T10:24:00+09:00`,
  updatedAt: `${DAY}T10:24:00+09:00`,
  language: 'markdown',
  version: 1,
  content: `# BE Implementation Plan — PAY-142

## 엔드포인트
\`POST /v1/payments/retry\`

## 구현 항목
1. 재시도 키 저장소 — \`payment_retry_key (key, payment_id, created_at, result)\`, unique index on key.
2. 멱등 처리 — 동일 키 재요청 시 저장된 결과를 그대로 반환한다 (신규 승인 호출 없음).
3. 만료 판정 — \`now - payment.failed_at > 24h\` 이면 \`422\`.
4. PG 호출은 기존 \`PaymentGatewayClient\` 재사용, 타임아웃 3s.

## 마이그레이션
- \`V1_42__create_payment_retry_key.sql\`

## 모니터링
- \`payment.retry.duplicate\` 카운터로 멱등 히트율을 관측한다.
`,
};

export const CONTRACT_TEST_ARTIFACT: Artifact = {
  id: 'art_contract_test',
  featureId: PAY142_ID,
  name: 'Contract Test Scenario',
  kind: 'TEST_SCENARIO',
  status: 'PROPOSED',
  createdByAgentId: 'agent_qa',
  createdAt: `${DAY}T10:41:00+09:00`,
  updatedAt: `${DAY}T10:41:00+09:00`,
  language: 'markdown',
  version: 1,
  content: `# Contract Test Scenario — PAY-142

| # | 시나리오 | 기대 응답 |
|---|---|---|
| 1 | 정상 재시도 | \`200\` + status=APPROVED |
| 2 | 동일 키로 2회 재시도 | 2회차도 \`200\`, 승인은 1건만 기록 |
| 3 | 이미 승인된 결제 재시도 | \`409\` |
| 4 | 최초 실패 후 24시간 1분 경과 | \`422\` |
| 5 | PG 타임아웃 | \`500\` + 재시도 가능 표시 |
| 6 | 재시도 식별자 누락 | \`400\` |

## 실행
- \`acme/qa-contract-tests\` 의 \`payments/retry.spec.ts\`
- APP mock client 와 BE stub 양쪽에서 동일 스펙으로 실행한다.
`,
};

/** 다른 Feature 의 기존 산출물 — Artifacts 화면이 비어 보이지 않도록 한다. */
export const OTHER_ARTIFACTS: readonly Artifact[] = [
  {
    id: 'art_console_plan',
    featureId: 'feat_console_filter',
    name: 'Console Filter Plan',
    kind: 'PLAN',
    status: 'APPROVED',
    createdByAgentId: 'agent_fe',
    createdAt: `${DAY}T09:20:00+09:00`,
    updatedAt: `${DAY}T09:44:00+09:00`,
    language: 'markdown',
    version: 2,
    content: `# CON-88 Filter Plan

- 상태 / 기간 / 채널 3축 필터
- 조건은 URL query 로 직렬화하여 공유 가능하게 한다
- 서버는 \`GET /v1/payments?status=&from=&to=&channel=\` 를 그대로 사용한다
`,
  },
  {
    id: 'art_refund_decision',
    featureId: 'feat_refund',
    name: 'Refund Policy Decision Log',
    kind: 'DECISION_LOG',
    status: 'DRAFT',
    createdByAgentId: 'agent_be',
    createdAt: `${DAY}T08:52:00+09:00`,
    updatedAt: `${DAY}T08:52:00+09:00`,
    language: 'markdown',
    version: 1,
    content: `# PAY-150 Decision Log

## 미해결
- 부분 환불 시 PG 수수료를 **비례 환급**할지 **전액 유지**할지 기준이 없다.
- 재무팀 확인 전까지 contract 를 확정할 수 없어 작업이 중단되었다.
`,
  },
];
