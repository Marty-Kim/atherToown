# Agent Town

여러 회사 구성원이 각자 연결한 AI Agent(APP · FE · BE · QA · Reviewer · Coordinator)가
하나의 기능을 만들기 위해 협업하는 과정을 **가상 오피스**에서 관찰하고 개입하는 워크스페이스입니다.

두 가지 모드로 동작합니다.

- **Mock 데모** — 내장된 PAY-142 시나리오를 재생합니다. 설치 후 바로 전체 흐름을 볼 수 있고, 모델 호출도 러너도 필요 없습니다.
- **Live (사내망 러너)** — 팀원 각자의 Mac에서 러너가 **그 사람의 Claude 계정**으로 Claude Agent SDK를 실행합니다.
  서버는 중계만 하며 자격증명을 하나도 갖지 않고, 코드는 각자 Mac을 떠나지 않습니다.
  서버 운영은 [RUNNER.md](./RUNNER.md), 팀원에게 그대로 넘길 설정 안내는 [TEAMMATE-SETUP.md](./TEAMMATE-SETUP.md) 를 보세요.

---

## 1. 실행 방법

```bash
npm install
npm run dev        # http://localhost:3000
```

| 스크립트 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | production 빌드 |
| `npm run start` | production 서버 |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) |

요구 환경: Node.js 20 이상. 환경 변수나 API key는 필요하지 않습니다.

### 처음 무엇을 보게 되는가

첫 진입 시 화면은 **PAY-142 `결제 실패 재시도 기능`** 이 이미 논의를 거쳐
사람의 승인을 기다리는 상태입니다.

1. **Overview** — 진행 중 기능, 연결된 Agent, 대기 중인 결정, 차단된 작업
2. **Features → PAY-142** — 가상 오피스, Agent 위치, 대화, 타임라인, 산출물
3. `Header 방식 승인` 또는 `Body 방식 승인`을 누르면
   단계가 바뀌고, Agent가 APP / BE Room으로 이동하고, contract 문서 내용이 실제로 갱신되며,
   이어서 시뮬레이션이 자동으로 재생되어 Feature가 완료까지 진행됩니다.
4. `Reset` → `Start` 를 누르면 요구사항 분석부터 완료까지 12개 이벤트를 처음부터 재생할 수 있습니다.

상태는 localStorage에 저장되므로 새로고침해도 유지됩니다.
전부 지우려면 **Settings → 저장된 상태 초기화** 를 사용합니다.

---

## 2. 기술 스택

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | 화면별 라우팅, 서버 컴포넌트 기본값 |
| Language | TypeScript strict + `noUncheckedIndexedAccess` | 도메인 상태를 union type으로 고정 |
| Styling | Tailwind CSS v4 | 토큰은 CSS 변수, 유틸리티는 Tailwind |
| UI primitives | shadcn/ui 방식으로 직접 구성한 Radix 래퍼 | 필요한 컴포넌트만 소유. 외부 테마 의존 없음 |
| Icon | lucide-react | 상태를 색상 외 아이콘으로도 전달하기 위해 |
| State | Zustand 5 + `persist` | Context + reducer보다 단순하고, persist가 기본 제공 |
| Animation | CSS transition / keyframes | Agent 이동·상태 표시에 라이브러리가 불필요 |

추가 의존성은 Radix primitives, `clsx`, `tailwind-merge`, `class-variance-authority` 뿐입니다.
Framer Motion은 넣지 않았습니다. 필요한 모션이 위치 transition과 pulse 두 가지뿐이라
`prefers-reduced-motion` 대응까지 CSS 한 곳에서 끝나는 편이 단순합니다.

---

## 3. 파일 구조

```
src/
├── types/domain.ts              # 모든 도메인 타입과 상태 union (단일 진실 원천)
│
├── mock/                        # UI 로직과 분리된 mock 데이터
│   ├── workspace.ts             #   Workspace / User / Room(그리드 좌표)
│   ├── agents.ts                #   Agent 6종과 권한
│   ├── features.ts              #   PAY-142 / CON-88 / PAY-150, Task, Dependency
│   ├── artifacts.ts             #   OpenAPI·계획·테스트 시나리오 본문
│   ├── script.ts                #   PAY-142 시뮬레이션 이벤트 12개 + Decision 정의
│   └── index.ts                 #   buildGenesisData(): 시뮬레이션 원점 상태
│
├── services/agent-service.ts    # ★ 외부 연동 경계: AgentRuntimeService + MockAgentService
├── services/hub-client.ts       #   브라우저 → 허브 (SSE 구독 + 제어 POST)
│
├── protocol/protocol.ts         # ★ 러너 ↔ 허브 ↔ 브라우저 와이어 프로토콜
├── server/hub.ts                #   in-memory 허브 (스텝 로그 · 러너 레지스트리 · 승인 대기열)
├── server/{sse,auth}.ts
├── app/api/…                    #   허브 엔드포인트 (runner/hello·stream·post, events, state, control, pair)
│
├── store/
│   ├── reducer.ts               # applyStep / applySimulationEvent / resolveDecision / rejectDecision
│   ├── seed.ts                  # 첫 진입 상태 = genesis + 스크립트 앞 6개 이벤트
│   ├── selectors.ts             # roomState, featureProgress, stageGroups 등 파생값
│   └── town-store.ts            # zustand store + localStorage persist
│
├── components/
│   ├── ui/                      # button, card, badge, dialog, tabs, select, toast, states …
│   ├── shell/                   # Sidebar, AppShell, NotificationBell, PageContainer
│   ├── workspace/               # OfficeMap, RoomTile, AgentAvatar, AgentGlyph,
│   │                            # FeatureStatusBar, SimulationControls, SimulationDriver
│   ├── inspector/               # InspectorPanel + Agent / Room / Feature 3종
│   ├── conversation/            # ConversationPanel, MessageCard (타입별 카드·필터)
│   ├── decisions/               # DecisionCard (승인 · 거절 · 추가 논의), DecisionList
│   ├── timeline/                # ActivityTimeline (카테고리 필터)
│   ├── artifacts/               # ArtifactCard / ArtifactViewer / ArtifactGrid / ArtifactBrowser
│   ├── features/                # FeatureRoom, FeatureList, CreateFeatureDialog
│   ├── agents/                  # AgentDirectory, ConnectAgentDialog
│   ├── overview/                # Summary / CurrentFeature / Activity / Decisions / Team / Blocker
│   ├── live/                    # LiveDriver, ApprovalQueue, AssignTaskDialog, RunnerPanel
│   └── common/                  # AgentChip, StageChips
│
├── hooks/use-hydrated.ts        # persist 복원 전 loading 상태
├── lib/{utils,labels}.ts        # cn, 시간 포맷 / 상태 → 라벨·색상 매핑
└── app/                         # /, /features, /features/[id], /agents, /decisions,
                                 # /artifacts, /settings
runner/                          # 팀원 Mac에서 도는 러너 (독립 패키지)
├── src/cli.ts                   #   페어링 · 재연결 · 명령 수신
├── src/claude-backend.ts        #   Agent SDK + town MCP 도구 + canUseTool 게이트
├── src/mock-backend.ts          #   모델 없이 전체 경로를 확인하는 테스트 백엔드
├── src/config.ts                #   저장소 allowlist (러너의 보안 경계)
└── src/hub-client.ts
```

---

## 4. 핵심 설계 결정

### 4.1 시뮬레이션은 "이벤트 스크립트 + 단일 reducer"

Agent 협업은 `SimulationEvent[]` 하나로 정의되고, 각 이벤트는 `SimulationStep`의 묶음입니다.

```ts
type SimulationStep =
  | { kind: 'AGENT_STATE'; agentId; status; roomId?; currentTask? }
  | { kind: 'STAGE'; stage; status }
  | { kind: 'MESSAGE'; message }
  | { kind: 'ACTIVITY'; event }
  | { kind: 'ARTIFACT_UPSERT' | 'ARTIFACT_STATUS' | 'TASK_STATUS' | … }
  | { kind: 'AWAIT_HUMAN'; decisionId }   // 여기서 정지한다
```

모든 상태 변화는 `applyStep()` 한 곳만 지나갑니다. 그래서:

- **Start / Pause / Next event / Reset이 전부 같은 코드 경로**를 탑니다. 재생 방식마다 분기가 생기지 않습니다.
- **Conversation · Timeline · Room · Task · Artifact 상태가 구조적으로 어긋날 수 없습니다.**
  "타임라인에는 있는데 대화에는 없는 사건" 같은 불일치가 생길 자리가 없습니다.
- 첫 진입 화면(seed)도 같은 reducer로 만듭니다(`store/seed.ts`).
  mock을 손으로 두 번 적어두고 어긋나는 문제를 피하기 위해서입니다.

`Reset`은 genesis(모든 단계 Pending, 대화 0건)로 되돌리고, `Start`가 12개 이벤트를 다시 재생합니다.
사용자가 직접 만든 Feature와 Agent는 Reset에서 보존합니다.

### 4.2 Human approval이 실제로 결과물을 바꾼다

승인은 화면 상태만 바꾸는 것이 아니라 `payment-api.openapi.yaml` 본문을 다시 생성합니다.

- `Header 방식 승인` → `Idempotency-Key` 를 header parameter로 갖는 contract (v2, Approved)
- `Body 방식 승인` → `retryToken` 을 request body에 갖는 contract (v2, Approved)

그리고 API Contract · Human Approval 단계가 Completed로, APP · BE Implementation이 In Progress로,
Agent가 각 Room으로 이동하며, 선택 근거와 메모가 `Decision Log` artifact로 남습니다.

`추가 논의 요청`은 결정을 열어둔 채 Agent를 Contract Room으로 되돌리고,
`모두 거절`은 단계를 차단하고 참여 Agent를 **Blocked Zone**으로 보냅니다
(되돌리기 어려운 동작이므로 confirmation을 거칩니다).

### 4.3 Agent 위치는 좌표가 아니라 `roomId`

Agent 상태에는 `roomId` 하나만 저장하고, 화면 좌표는 Room의 그리드 사각형에서 파생합니다.

```
x = roomLeft + roomWidth  * ((index % 3) + 0.5) / columnsInRow
y = roomTop  + roomHeight * (0.62 + row * 0.24)
```

이동 애니메이션은 `transition-[left,top] duration-700` 한 줄이 전부입니다.
게임 엔진도, 3D 라이브러리도, 좌표 상태도 필요하지 않습니다.

Room 상태(Idle / Active / Waiting / Blocked / Completed)도 저장하지 않고
그 방에 있는 Agent들로부터 파생합니다(`selectors.roomState`). 동기화 버그가 생길 자리를 없앴습니다.

### 4.4 상태값은 전부 union type

`AgentStatus`, `RoomState`, `StageStatus`, `MessageType`, `ActivityCategory` …
모두 `as const` 배열에서 파생한 리터럴 union이고,
라벨·색상·아이콘은 `Record<Union, …>` 매핑으로 정의합니다.
새 상태를 추가하면 매핑 누락이 컴파일 에러로 잡힙니다.

`AgentMessage`와 `ActivityEvent`는 discriminated union이라
`type === 'PROPOSAL'`일 때만 `optionLabel`에 접근할 수 있습니다.

### 4.5 디자인

Gather Town에서 가져온 것은 "공간으로 상태를 이해한다"는 발상 하나뿐이고,
에셋·캐릭터·레이아웃은 전부 독립적으로 만들었습니다.
Agent 아바타는 역할별 geometric SVG(`AgentGlyph`)로, 외부 이미지나 이모지에 의존하지 않습니다.

deep navy 배경에 blue / violet / cyan accent, 상태는 green / amber / red.
glass 효과는 오버레이(모달 · 툴팁 · 알림)에만 제한적으로 씁니다.
본문 13px, 보조 텍스트 11.5–12px로 가독성을 우선했습니다.

---

## 5. 접근성

- 전 화면 키보드 탐색 가능, `:focus-visible` 아웃라인 전역 정의
- 본문 건너뛰기 링크(`본문으로 건너뛰기`)
- 모든 icon button에 `aria-label`, 토글 버튼에 `aria-pressed`, 진행률에 `role="progressbar"`
- **상태를 색상만으로 표현하지 않습니다.** 단계·Room·메시지 타입 모두 아이콘 + 텍스트를 함께 제공하고,
  체크리스트 항목에는 `sr-only`로 충족/미충족을 읽어줍니다
- 모달은 Radix Dialog의 focus trap · ESC 닫기 사용
- 토스트는 `aria-live="polite"`이며, **중요한 상태 변화는 항상 화면 내 영구 UI**
  (Timeline · Decision 카드 · Status Bar)에도 반영됩니다
- `prefers-reduced-motion: reduce` 에서 모든 애니메이션·트랜지션을 무력화
- 위험한 동작(결정 거절, Reset, 상태 초기화)은 confirmation 다이얼로그를 거칩니다
- 모든 빈 화면은 "다음에 무엇을 하면 되는지"를 안내합니다

## 6. 반응형

| 폭 | 구성 |
| --- | --- |
| `lg` 이상 | Sidebar + 가상 오피스 + 하단 패널 + Inspector 고정 컬럼 |
| `md`–`lg` | Sidebar 접힘, Inspector는 우측 시트로 전환 |
| `md` 미만 | 공간을 축소하지 않고 **Status / Agents / Conversation / Decisions / Artifacts** 탭으로 재구성 |

---

## 7. Live 모드 — 실제 Claude Agent 연결

이미 구현되어 있습니다. 설치·운영은 [RUNNER.md](./RUNNER.md) 에 있고, 여기서는 설계만 요약합니다.

### 7.0 러너가 보내는 것은 상태가 아니라 스텝이다

러너는 화면 상태를 보내지 않고 **`SimulationStep`** 을 보냅니다. 브라우저는 그 스텝을
mock 시뮬레이션과 **완전히 같은 `applyStep()`** 에 흘려보냅니다. 그래서 실제 Agent 실행과
내장 데모가 구조적으로 같은 쓰기 경로를 탑니다 — 불일치가 생길 자리가 없습니다.

전송은 일부러 평범합니다. 별도 WebSocket 서버 없이 Next route handler 만으로 끝납니다.

```
러너 → 허브    HTTP POST   /api/runner/post
허브 → 러너    SSE         /api/runner/stream
허브 → 브라우저 SSE         /api/events
브라우저 → 허브 HTTP POST   /api/control
```

### 7.1 구조화된 메시지는 도구 호출로 받는다

자유 텍스트를 파싱하지 않습니다. 러너가 in-process MCP 서버로 **타운 전용 도구**를 쥐여주고,
Agent가 그것을 호출하면 핸들러가 `SimulationStep` 을 만들어 허브로 올립니다.

| 도구 | 하는 일 |
| --- | --- |
| `town_post_message` | QUESTION / PROPOSAL / BLOCKED … 구조화된 메시지 |
| `town_create_artifact` | contract·계획·테스트 시나리오 등록 |
| `town_request_decision` | **사람이 고를 때까지 도구 호출 안에서 블로킹** |
| `town_set_status` | 상태와 Room 이동 |
| `town_set_stage` | Feature 단계 갱신 |

### 7.2 사람의 개입은 두 층

- **제품 결정** — `town_request_decision` 핸들러가 promise를 반환하고, 사람이 UI에서 누를 때까지 resolve하지 않습니다. Agent는 실제로 멈춥니다.
- **도구 권한** — Agent SDK의 `canUseTool` 콜백이 허브를 거쳐 Approvals 탭으로 올라옵니다. 비동기이므로 사람을 무기한 기다릴 수 있습니다.

### 7.3 러너의 보안 경계

`repositories` 목록 밖의 경로는 **사람이 승인해도** 하드 거부됩니다. `bypassPermissions` 는 쓰지 않습니다.
`git push` · `gh pr create` · `rm -r` · `sudo` · `curl` 은 autonomy 레벨과 무관하게 항상 사람에게 묻습니다.

### 7.4 그 밖의 교체 지점

MVP의 mock 시나리오 쪽 교체 지점은 아래와 같습니다.

### 7.1 `src/services/agent-service.ts` — 유일한 외부 연동 경계

```ts
export interface AgentRuntimeService {
  getScript(featureId): Promise<readonly SimulationEvent[]>;
  connectAgent(input: ConnectAgentInput): Promise<Agent>;
  createFeature(input: CreateFeatureInput): Promise<CreateFeatureResult>;
  sendHumanMessage(input: SendMessageInput): Promise<AgentMessage>;
  replyToHuman(input: SendMessageInput, fromAgentId: string): Promise<AgentMessage>;
}

export const agentService: AgentRuntimeService = new MockAgentService();
```

UI와 store는 이 인터페이스에만 의존합니다. 실 연동에서는 `agentService`만 교체합니다.

| Mock | 실제 구현 |
| --- | --- |
| `getScript()` — 미리 정의된 이벤트 배열 | SSE / WebSocket 구독. 서버가 내려주는 이벤트를 그대로 `applyStep()`에 흘려보냅니다 |
| `sendHumanMessage` / `replyToHuman` | LLM 호출(OpenAI · Claude · Gemini). 응답을 `AgentMessage` union으로 정규화 |
| `connectAgent` | Agent 등록 API. **API key는 서버에만 보관**하고 클라이언트에는 참조 ID만 내려줍니다 |
| `createFeature` | 이슈 트래커 연동 + Coordinator에게 분석 작업 디스패치 |

### 7.2 실시간 스트림으로 바꿀 때

`SimulationDriver`(`components/workspace/SimulationDriver.tsx`)가 타이머로 `stepSimulation()`을
호출하는 유일한 지점입니다. 이 컴포넌트를 구독 컴포넌트로 바꾸고,
수신한 이벤트마다 `applySimulationEvent(data, event)`를 호출하면 나머지 UI는 그대로 동작합니다.
`cursor` / `speedMs` / Start · Pause만 스트림 개념(구독 · 일시중지)으로 치환하면 됩니다.

### 7.3 GitHub 연동

`Artifact.kind`에 `PULL_REQUEST`가 이미 정의되어 있습니다.
Agent가 PR을 열면 `ARTIFACT_UPSERT` step 하나로 타임라인 · 대화 · Artifact 패널에 동시에 반영됩니다.
`Permission.canOpenPullRequest` / `canMerge`와 Feature의 `autonomy` (Level 1–4)가
서버 측 권한 검사에 그대로 대응하도록 모델링되어 있습니다.

### 7.4 영속성

현재는 `zustand/persist` → localStorage(`agent-town-state-v1`) 한 곳뿐입니다.
서버 저장으로 옮길 때는 `town-store.ts`의 `storage` 옵션만 교체하면 되고,
스키마가 바뀌면 `version` / `migrate`로 처리합니다.

---

## 8. 알려진 범위 제한

- 실제 AI 모델 · GitHub · 인증 연동 없음. **API key를 입력받지도, 저장하지도 않습니다.**
- 시뮬레이션 스크립트는 PAY-142 한 건에만 정의되어 있습니다.
  새로 만든 Feature는 Coordinator의 요구사항 분석 착수까지만 재현합니다.
- Artifact 미리보기는 원문을 그대로 보여줍니다(구문 강조 없음).
  의존성을 늘리지 않으려는 선택이며, 필요하면 viewer 한 곳만 바꾸면 됩니다.
- 여러 사용자가 같은 워크스페이스를 동시에 보는 실시간 동기화는 범위 밖입니다.
