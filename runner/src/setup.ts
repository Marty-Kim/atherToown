import { existsSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';
import { hostname } from 'node:os';
import { basename } from 'node:path';
import type {
  AgentAccent,
  AgentCapability,
  AgentRole,
  PermissionLevel,
  TeamKind,
} from '../../src/types/domain';
import { expandHome, type RunnerConfig } from './config';

/**
 * 대화형 설정 마법사.
 * JSON 을 손으로 고치지 않고도 러너를 등록할 수 있게 한다.
 * 역할만 고르면 나머지는 프리셋으로 채워지고, 실제로 물어보는 건 4가지뿐이다.
 */

interface RolePreset {
  role: AgentRole;
  team: TeamKind;
  name: string;
  accent: AgentAccent;
  capabilities: AgentCapability[];
  permission: PermissionLevel;
  hint: string;
}

const ROLE_PRESETS: RolePreset[] = [
  {
    role: 'APP',
    team: 'APP',
    name: 'Kestrel',
    accent: 'cyan',
    capabilities: ['CODE_GENERATION', 'API_DESIGN', 'TEST_AUTHORING'],
    permission: 'BRANCH_AND_PR',
    hint: 'Android / iOS 네이티브',
  },
  {
    role: 'BE',
    team: 'BE',
    name: 'Bastion',
    accent: 'emerald',
    capabilities: ['API_DESIGN', 'CODE_GENERATION', 'DOCUMENTATION'],
    permission: 'BRANCH_AND_PR',
    hint: '서버 API',
  },
  {
    role: 'FE',
    team: 'FE',
    name: 'Lumen',
    accent: 'blue',
    capabilities: ['CODE_GENERATION', 'API_DESIGN', 'DOCUMENTATION'],
    permission: 'BRANCH_AND_PR',
    hint: '웹 프런트엔드',
  },
  {
    role: 'QA',
    team: 'QA',
    name: 'Sentry',
    accent: 'amber',
    capabilities: ['CONTRACT_TEST', 'TEST_AUTHORING', 'DOCUMENTATION'],
    permission: 'DRAFT',
    hint: '테스트 · 품질',
  },
  {
    role: 'COORDINATOR',
    team: 'PLATFORM',
    name: 'Atlas',
    accent: 'violet',
    capabilities: ['REQUIREMENT_ANALYSIS', 'DEPENDENCY_TRACKING', 'DOCUMENTATION'],
    permission: 'DRAFT',
    hint: '요구사항 분해 · 조율',
  },
  {
    role: 'REVIEWER',
    team: 'PLATFORM',
    name: 'Verdict',
    accent: 'rose',
    capabilities: ['CODE_REVIEW', 'RELEASE_NOTES', 'DEPENDENCY_TRACKING'],
    permission: 'MERGE_AFTER_APPROVAL',
    hint: '코드 리뷰 · 릴리즈',
  },
];

const MEMBERS = [
  { id: 'user_marty', label: '마티 (APP 파트장)' },
  { id: 'user_jiwon', label: '지원 (BE)' },
  { id: 'user_haneul', label: '하늘 (FE)' },
  { id: 'user_seojun', label: '서준 (QA)' },
  { id: 'user_dana', label: '다나 (Platform)' },
];

const DEFAULT_DISALLOWED = ['WebFetch', 'WebSearch'];

function line(text = ''): void {
  stdout.write(`${text}\n`);
}

export interface SetupOptions {
  configPath: string;
  /** --pair 로 넘어온 코드가 있으면 물어보지 않는다. */
  pairingToken: string | null;
  hubUrl: string | null;
}

export async function runSetup(options: SetupOptions): Promise<RunnerConfig> {
  /*
   * readline 의 async iterator 로 한 줄씩 읽는다.
   * question() 대신 이 방식을 쓰는 이유는 TTY 와 파이프에서 똑같이 동작하기 때문이다
   * (스크립트로 답을 자동 입력해 테스트할 수 있어야 한다).
   */
  const rl = createInterface({ input: stdin, terminal: false });
  const lines = rl[Symbol.asyncIterator]();

  const readLine = async (): Promise<string> => {
    const next = await lines.next();
    return next.done === true ? '' : String(next.value);
  };

  const ask = async (question: string, fallback = ''): Promise<string> => {
    const suffix = fallback ? ` [${fallback}]` : '';
    stdout.write(`${question}${suffix}\n> `);
    const answer = (await readLine()).trim();
    line();
    return answer === '' ? fallback : answer;
  };

  const pick = async <T>(
    question: string,
    items: T[],
    render: (item: T) => string,
    defaultIndex = 0,
  ): Promise<T> => {
    line(question);
    items.forEach((item, index) => line(`  ${index + 1}) ${render(item)}`));
    for (;;) {
      stdout.write(`> [${defaultIndex + 1}] `);
      const raw = (await readLine()).trim();
      line();
      const index = raw === '' ? defaultIndex : Number(raw) - 1;
      const chosen = items[index];
      if (chosen) return chosen;
      line('  목록에 있는 번호를 입력해 주세요.');
    }
  };

  try {
    line();
    line('━━━ Agent Town 러너 설정 ━━━');
    line('내 Mac에서 내 Claude 계정으로 도는 Agent를 하나 등록합니다.');
    line('API key는 필요 없습니다. 이미 `claude` 에 로그인되어 있으면 됩니다.');
    line();

    if (existsSync(options.configPath)) {
      const overwrite = await ask(
        `이미 설정 파일이 있습니다: ${options.configPath}\n덮어쓸까요? (y/N)`,
        'N',
      );
      if (!/^y/i.test(overwrite)) {
        throw new Error('설정을 유지합니다. 그대로 실행하려면 --setup 없이 시작하세요.');
      }
    }

    /* 1. 역할 */
    const preset = await pick(
      '1/4 · 어떤 역할의 Agent인가요?',
      ROLE_PRESETS,
      (p) => `${p.role.padEnd(12)} ${p.name.padEnd(9)} — ${p.hint}`,
    );

    /* 2. 나 */
    const member = await pick(
      '2/4 · 이 Agent를 연결하는 사람은 누구인가요?',
      MEMBERS,
      (m) => m.label,
    );

    /* 3. 저장소 */
    line('3/4 · 이 Agent가 다룰 저장소의 로컬 경로를 입력해 주세요.');
    line('     Agent는 이 경로 밖의 파일을 읽지도 쓰지도 못합니다. 홈 디렉터리는 넣지 마세요.');
    let repoPath = '';
    for (;;) {
      const raw = await ask('   예) ~/work/payments-api');
      if (raw === '') {
        line('  경로가 필요합니다.');
        continue;
      }
      const resolved = expandHome(raw);
      if (!existsSync(resolved)) {
        line(`  그 경로가 없습니다: ${resolved}`);
        continue;
      }
      repoPath = resolved;
      break;
    }
    const repoName = await ask('   이 저장소를 타운에서 뭐라고 부를까요?', `acme/${basename(repoPath)}`);

    /* 4. 서버 */
    const hubUrl = options.hubUrl
      ? options.hubUrl
      : await ask('4/4 · Agent Town 서버 주소는?', 'http://localhost:3000');

    const pairingToken =
      options.pairingToken ??
      (await ask('   페어링 코드 (Settings → 러너 → 페어링 코드 발급)'));

    const suffix = member.id.replace(/^user_/, '');
    const config: RunnerConfig = {
      hubUrl: hubUrl.replace(/\/+$/, ''),
      pairingToken,
      agent: {
        id: `agent_${preset.role.toLowerCase()}_${suffix}`,
        name: preset.name,
        role: preset.role,
        team: preset.team,
        accent: preset.accent,
        userId: member.id,
        capabilities: preset.capabilities,
        permission: preset.permission,
      },
      repositories: [{ name: repoName, path: repoPath }],
      limits: { maxTurns: 40, maxBudgetUsd: 2 },
      disallowedTools: DEFAULT_DISALLOWED,
    };

    writeFileSync(options.configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

    line('━━━ 설정 완료 ━━━');
    line(`  Agent      ${config.agent.name} (${config.agent.role})`);
    line(`  id         ${config.agent.id}`);
    line(`  연결한 사람  ${member.label}`);
    line(`  저장소      ${repoName}  →  ${repoPath}`);
    line(`  서버        ${config.hubUrl}`);
    line(`  이 머신     ${hostname()}`);
    line(`  저장 위치   ${options.configPath}`);
    line();
    return config;
  } finally {
    rl.close();
  }
}
