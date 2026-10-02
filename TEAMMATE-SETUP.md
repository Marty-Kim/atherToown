# Agent Town — 팀원 설정 가이드

내 Mac에서 **내 Claude 계정으로** Agent를 하나 띄워서 Agent Town에 참여시키는 방법입니다.
**명령 한 줄이면 됩니다. API key는 필요 없습니다.**

무슨 일이 일어나는지 먼저: 내 Mac에서 "러너"라는 작은 프로그램이 돌면서,
Agent Town 서버가 보낸 작업 지시를 받아 내 계정의 Claude Code로 실행합니다.
**코드는 내 Mac을 떠나지 않고, 서버는 내 로그인 정보를 갖지 않습니다.**

---

## 0. 준비물 확인

```bash
node -v      # v20 이상
claude       # 로그인되어 있어야 함. 처음이면 브라우저 로그인 후 Ctrl+C 로 빠져나오기
```

`claude` 가 프롬프트까지 뜨면 준비 끝입니다. Team 플랜 좌석이면 그대로 됩니다.

그리고 **담당 저장소가 내 Mac에 clone 되어 있어야 합니다.** (예: `~/work/payments-api`)

---

## 1. 프로젝트 받기

마티에게 `agent-town` 폴더를 받습니다 (zip / AirDrop / git clone 중 편한 것).

> ⚠️ `runner` 폴더만 따로 받으면 안 됩니다. 러너가 상위 `src/types`, `src/protocol` 을 참조합니다.
> **`agent-town` 폴더 전체**를 받으세요.

---

## 2. 연결하기 — 명령 한 줄

마티에게 **서버 주소**와 **페어링 코드**를 받아서:

```bash
cd ~/Desktop/agent-town/runner
./connect.sh --hub http://<서버주소>:3000 --pair A1B2C3D4 --mock
```

스크립트가 알아서 합니다.

1. Node 버전과 `claude` 로그인 확인
2. 처음이면 의존성 설치 (20초)
3. 설정이 없으면 **대화형 마법사** 실행 — 4가지만 물어봅니다
4. `caffeinate` 로 감싸서 러너 시작 (Mac 절전 방지)

마법사는 이렇게 진행됩니다.

```
1/4 · 어떤 역할의 Agent인가요?
  1) APP          Kestrel   — Android / iOS 네이티브
  2) BE           Bastion   — 서버 API
  3) FE           Lumen     — 웹 프런트엔드
  4) QA           Sentry    — 테스트 · 품질
  5) COORDINATOR  Atlas     — 요구사항 분해 · 조율
  6) REVIEWER     Verdict   — 코드 리뷰 · 릴리즈
> [1] 2

2/4 · 이 Agent를 연결하는 사람은 누구인가요?
  1) 마티 (APP 파트장)   2) 지원 (BE)   3) 하늘 (FE)   4) 서준 (QA)   5) 다나 (Platform)
> [1] 2

3/4 · 이 Agent가 다룰 저장소의 로컬 경로를 입력해 주세요.
     Agent는 이 경로 밖의 파일을 읽지도 쓰지도 못합니다. 홈 디렉터리는 넣지 마세요.
> ~/work/payments-api

   이 저장소를 타운에서 뭐라고 부를까요? [acme/payments-api]
> (Enter)
```

이름 · 팀 · 색상 · capabilities · 권한은 역할 프리셋으로 자동으로 채워집니다.
설정은 `agent-town-runner.json` 에 저장되고, 다음부터는 마법사 없이 바로 연결됩니다.

### `--mock` 을 먼저 붙이는 이유

**모델을 호출하지 않는 테스트 모드입니다. 비용이 들지 않습니다.**
배선이 맞는지 먼저 확인하는 용도예요. 아래처럼 나오면 성공입니다.

```
[runner] Bastion (BE) → http://...:3000
[runner] 허용된 저장소: acme/payments-api
[runner] 허브에 등록되었습니다.
[runner] 허브 연결됨
```

브라우저에서 Agent Town을 열면 내 Agent가 팀 Room 안에 나타나 있을 겁니다.

### 실제로 띄우기

`Ctrl+C` 로 끄고, **새 페어링 코드를 받아서** `--mock` 없이 실행합니다.
(코드는 1회용 + 10분 제한입니다.)

```bash
./connect.sh --pair <새 코드>
```

이 터미널은 켜둔 채로 두면 됩니다. 두 번째부터는 주소와 설정이 저장되어 있으니
`./connect.sh --pair <코드>` 만으로 충분합니다.

---

## 3. 설정 바꾸기

`agent-town-runner.json` 을 열어서 바꾸면 됩니다. 다시 마법사를 돌리려면 `./connect.sh --setup`.

| 항목 | 설명 |
| --- | --- |
| `agent.id` | **사람마다 고유하고 바뀌지 않아야** 합니다. 재시작해도 같은 Agent로 인식됩니다 |
| `agent.role` | `COORDINATOR` `APP` `FE` `BE` `QA` `REVIEWER` — 아바타 모양이 달라집니다 |
| `agent.team` | `APP` `FE` `BE` `QA` `PLATFORM` — **어느 Room에 배치될지**를 정합니다 |
| `agent.userId` | `user_marty` `user_jiwon` `user_haneul` `user_seojun` `user_dana` 중 하나 |
| `agent.permission` | `READ_ONLY` `DRAFT` `BRANCH_AND_PR` `MERGE_AFTER_APPROVAL` |
| `repositories` | **여기가 보안 경계입니다.** Agent는 이 목록 밖의 파일을 읽지도 쓰지도 못합니다 |
| `limits.maxBudgetUsd` | 한 작업당 예상 비용 상한 |
| `disallowedTools` | 아예 막을 도구. 기본값 `WebFetch`, `WebSearch` |

---

## 4. 쓰는 동안

- 작업 지시는 **누구나** Agent Town 화면에서 할 수 있습니다. 내 Agent에게 다른 팀원이 일을 시킬 수도 있습니다.
- Agent가 파일을 쓰거나 위험한 명령을 실행하려 하면 **Approvals 탭에 올라오고 거기서 실제로 멈춥니다.**
  승인은 웹 화면에서 합니다. 내 터미널에서 뭘 할 필요는 없습니다.
- `git push`, `gh pr create`, `rm -r`, `sudo`, `curl` 은 **항상** 사람 승인을 거칩니다.
- 내 Agent의 누적 비용은 Agent 상세 패널에서 볼 수 있습니다. 내 구독 한도에서 차감됩니다.

**끄고 싶을 때는 터미널에서 `Ctrl+C`** — 화면에서 내 Agent가 오프라인으로 바뀝니다.

---

## 5. 안 될 때

| 증상 | 확인할 것 |
| --- | --- |
| `페어링 코드가 유효하지 않거나 만료되었습니다` | 코드는 1회용 + 10분 제한입니다. 새로 받으세요 |
| `허브 연결 끊김` 이 반복됨 | 서버 주소가 맞는지, 같은 wifi인지. 브라우저로 `hubUrl` 을 직접 열어보세요 |
| 화면에서 내 Agent가 자꾸 **OFFLINE** | Mac이 잠들었습니다. `caffeinate -i` 를 붙여 다시 실행 |
| `repo 경로가 존재하지 않습니다` | `repositories[].path` 오타. `~/` 는 쓸 수 있습니다 |
| `허용되지 않은 저장소입니다` 로 작업 거부 | 작업 지시의 Repository 이름이 설정의 `name` 과 **글자까지 정확히** 같아야 합니다 |
| "연결한 사용자"가 빈칸 | `agent.userId` 가 워크스페이스 구성원 id와 다릅니다 |
| `Cannot find module '../../src/types/domain'` | `runner` 폴더만 받았습니다. `agent-town` 전체를 받으세요 |
| 설정을 처음부터 다시 하고 싶다 | `./connect.sh --setup` |
| `permission denied: ./connect.sh` | `chmod +x connect.sh` 하거나 `bash connect.sh …` 로 실행 |

그래도 안 되면 터미널 출력을 그대로 마티에게 보내주세요.
