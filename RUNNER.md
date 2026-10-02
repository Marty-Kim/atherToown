# Agent Town — 사내망 러너 운영 가이드

Team 플랜을 쓰는 팀이 **중앙 API key 없이** Agent Town을 돌리기 위한 구조입니다.
각 팀원의 Mac에서 러너가 그 사람의 Claude 로그인으로 Agent SDK를 실행하고,
Agent Town 서버는 중계만 합니다. **서버는 자격증명을 하나도 갖지 않고, 코드는 각자 Mac을 떠나지 않습니다.**

```
사내 LAN
├─ agent-town.local:3000   Agent Town 서버 = UI + 허브  (자격증명 0개)
├─ 마티 Mac    → Kestrel 러너  (마티 계정, ~/work/mobile-app)
├─ 지원 Mac    → Bastion 러너  (지원 계정, ~/work/payments-api)
└─ 서준 Mac    → Sentry  러너  (서준 계정, ~/work/qa-contract-tests)
```

---

## 1. 서버 띄우기 (한 대만)

남는 Mac 한 대나 사무실 서버에서:

```bash
cd agent-town
npm install
npm run build
npm start -- -H 0.0.0.0        # LAN에 노출
```

- 처음 실행하면 macOS 방화벽이 수신 허용을 물어봅니다. 허용하세요.
- 접속 주소는 `http://<그 머신 이름>.local:3000` 입니다. `hostname` 으로 확인할 수 있습니다.
- 브라우저에서 열고 **Settings → 실행 모드 → Live** 로 전환합니다.

> 허브 상태는 **이 서버 프로세스의 메모리**에만 있습니다. 재시작하면 대화·산출물이 사라집니다.
> 팀 내부 도구 기준의 의도된 단순화입니다. `next dev` 는 HMR이 모듈을 갈아끼우며 상태를 날릴 수
> 있으니, 실제로 쓸 때는 `npm run build && npm start` 를 쓰세요.

---

## 2. 러너 붙이기 (팀원 각자)

### 사전 조건

- 그 Mac에서 `claude` 에 이미 로그인되어 있을 것 (`claude` 실행 → 브라우저 로그인).
  Team 플랜 좌석이면 그대로 됩니다. **API key는 필요 없습니다.**
- Node.js 20 이상.

### 연결 — 명령 한 줄

Agent Town의 **Settings → 러너 → 페어링 코드 발급** 으로 코드를 받은 뒤:

```bash
cd agent-town/runner
./connect.sh --hub http://agent-town.local:3000 --pair A1B2C3D4
```

스크립트가 Node 확인 → 의존성 설치 → (설정이 없으면) 대화형 마법사 → `caffeinate` 로 감싼 실행까지
한 번에 처리합니다. 마법사는 역할 · 담당자 · 저장소 경로 · 저장소 이름 4가지만 묻고,
나머지는 역할 프리셋으로 채웁니다.

설정은 `agent-town-runner.json` 에 저장되어 다음부터는 `./connect.sh --pair <코드>` 만으로 연결됩니다.
직접 편집하려면 그 파일을 열면 되고, 마법사를 다시 돌리려면 `./connect.sh --setup` 입니다.

<details>
<summary>설정 파일 예시</summary>

```jsonc
{
  "hubUrl": "http://agent-town.local:3000",
  "pairingToken": "",
  "agent": {
    "id": "agent_be_jiwon",                 // 사람마다 고유하게. 재시작해도 같은 값 유지
    "name": "Bastion",
    "role": "BE",                           // COORDINATOR | APP | FE | BE | QA | REVIEWER
    "team": "BE",                           // 어느 Room 에 배치될지
    "accent": "emerald",
    "userId": "user_jiwon",
    "capabilities": ["API_DESIGN", "CODE_GENERATION", "DOCUMENTATION"],
    "permission": "BRANCH_AND_PR"
  },
  "repositories": [
    { "name": "acme/payments-api", "path": "~/work/payments-api" }
  ],
  "limits": { "maxTurns": 40, "maxBudgetUsd": 2 },
  "disallowedTools": ["WebFetch", "WebSearch"]
}
```

`repositories` 가 **이 러너의 경계**입니다. 여기 없는 경로는 사람이 승인해도 열리지 않습니다.
</details>

### 먼저 mock으로 확인하기

자격증명이나 실제 저장소 없이 배선만 확인하려면:

```bash
./connect.sh --pair A1B2C3D4 --mock
```

모델을 호출하지 않고 스크립트된 흐름(메시지 → 산출물 → 도구 승인 → 결정 승인)을 한 번 태웁니다.
전체 경로가 도는지 확인하는 용도로 쓰세요. **비용이 들지 않습니다.**

---

## 3. 써 보기

1. Agent Town에서 **Create Feature** 로 기능을 하나 등록합니다.
2. 가상 오피스에서 Agent를 클릭 → Inspector의 **작업 지시**.
3. 지시문 · Feature · Repository · Autonomy를 고르고 보냅니다.
4. Agent가 움직이기 시작합니다. Timeline과 Conversation에 실시간으로 쌓입니다.
5. 승인이 필요하면 Feature Room의 **Approvals** 탭에 올라오고, **Agent는 거기서 실제로 멈춰 있습니다.**

---

## 4. Autonomy와 승인

| Level | `permissionMode` | 자동 통과 | 사람 승인 |
| --- | --- | --- | --- |
| 1 · 분석/질문 | `plan` | 읽기 도구 | 모든 쓰기 |
| 2 · 초안 | `default` | 읽기 도구 | 모든 쓰기·셸 |
| 3 · branch/PR | `acceptEdits` | 허용된 repo 안의 파일 수정, 안전한 셸 | push·merge·PR·rm·sudo·curl |
| 4 · merge | `acceptEdits` | 위와 동일 | 위와 동일 (merge 포함) |

"안전한 셸"은 `ls/cat/grep/git status·diff·log`, `npm test`, `gradlew test` 같은 읽기성 명령만입니다.
`git push`, `gh pr create`, `npm publish`, `rm -r`, `sudo`, `curl`, `wget` 은 **레벨과 무관하게 항상** 사람에게 묻습니다.

---

## 5. 보안 — 반드시 지킬 것

러너는 사실상 **그 Mac에 대한 원격 실행 채널**입니다. 사내망이라고 넘기면 사고가 납니다.

- **저장소 경계**: `repositories` 밖의 경로는 하드 거부입니다. 사람이 승인해도 열리지 않습니다. 홈 디렉터리 전체를 넣지 마세요.
- **`bypassPermissions` 금지**: 러너는 이 모드를 쓰지 않습니다. 코드를 고쳐서 켜지 마세요.
- **페어링 토큰**: 1회용 코드(10분)로만 등록됩니다. 등록 후에는 세션 토큰으로 인증하며, 토큰 없이는 연결이 거부됩니다. CI 등에서 고정 토큰이 필요하면 서버에 `AGENT_TOWN_PAIRING_TOKEN` 환경변수를 두세요 (8자 이상).
- **네트워크**: 서버는 사내망에만 노출하세요. 인터넷에 열지 마세요. 외부 접속이 필요하면 Tailscale 같은 오버레이를 쓰세요.
- **승인 화면을 믿지 말고 읽으세요**: Approvals 카드에는 도구 이름과 입력 요약이 그대로 보입니다. 습관적으로 허용을 누르면 승인 게이트의 의미가 사라집니다.

---

## 6. 자주 겪는 문제

**러너가 자꾸 OFFLINE 이 됩니다**
Mac이 잠들면 러너도 멈춥니다. 이게 가장 흔한 원인입니다.

`./connect.sh` 은 `caffeinate -i` 를 자동으로 붙입니다. 직접 실행할 때는:

```bash
caffeinate -i npm start -- --pair A1B2C3D4
```

또는 시스템 설정에서 해당 Mac의 절전을 끄세요.

**`http://agent-town.local:3000` 에 접속이 안 됩니다**
`-H 0.0.0.0` 으로 띄웠는지, macOS 방화벽에서 Node의 수신을 허용했는지 확인하세요.
mDNS가 안 잡히면 `ipconfig getifaddr en0` 으로 IP를 확인해 직접 쓰면 됩니다.

**HTTPS가 필요해지면**
지금은 localStorage만 쓰므로 HTTP로 충분합니다. 나중에 알림·클립보드·서비스워커를 붙이면 secure context가 필요해집니다. 그때 mkcert로 사내 CA를 깔거나 Tailscale을 쓰세요.

**"허용되지 않은 저장소입니다" 로 작업이 거부됩니다**
작업 지시의 Repository 이름이 러너 설정의 `repositories[].name` 과 정확히 같아야 합니다.

**비용이 걱정됩니다**
Agent SDK 사용량은 각자 구독 한도에서 차감되고, 초과분은 조직 usage credits로 넘어갑니다.
Owner가 claude.ai 관리자 설정에서 **조직 전체 / 개인별 spend limit** 을 먼저 걸어두세요.
러너별 누적 예상 비용은 Settings → 러너 목록과 Agent Inspector에 표시됩니다.

---

## 7. 한계

- **무인 실행 불가**: Mac이 꺼져 있으면 그 Agent는 동작하지 않습니다. 야간 배치나 CI가 필요하면 사무실 서버에 Bedrock이나 API key를 쓰는 중앙 러너를 하나 더 붙이는 하이브리드로 가세요. 러너 프로토콜이 같으므로 서버 코드는 그대로입니다.
- **단일 프로세스 전제**: 허브가 메모리 상태이므로 서버 인스턴스는 한 대여야 합니다. 서버리스에 올리면 동작하지 않습니다.
- **Agent 간 직접 대화는 아직 사람이 중계**합니다. Coordinator가 자동으로 다음 Agent에게 작업을 넘기는 오케스트레이션은 다음 단계입니다.
- **Claude 전용**: Agent SDK 기반이라 OpenAI·Gemini 러너는 별도 백엔드 구현이 필요합니다 (`runner/src/backend.ts` 의 `AgentBackend` 인터페이스만 맞추면 됩니다).
