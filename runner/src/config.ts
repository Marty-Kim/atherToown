import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { homedir, hostname, platform } from 'node:os';
import { isAbsolute, resolve, sep } from 'node:path';
import type {
  AgentAccent,
  AgentCapability,
  AgentRole,
  PermissionLevel,
  TeamKind,
} from '../../src/types/domain';
import type { RunnerIdentity } from '../../src/protocol/protocol';

export interface RepoEntry {
  /** Agent Town 에 보여줄 이름. */
  name: string;
  /** 이 머신에서의 실제 경로. 허브로는 절대 보내지 않는다. */
  path: string;
}

export interface RunnerConfig {
  hubUrl: string;
  pairingToken: string;
  agent: {
    id: string;
    name: string;
    role: AgentRole;
    team: TeamKind;
    accent: AgentAccent;
    userId: string;
    capabilities: AgentCapability[];
    permission: PermissionLevel;
  };
  repositories: RepoEntry[];
  limits: { maxTurns: number; maxBudgetUsd: number };
  /** 이 러너에서 아예 막을 도구. */
  disallowedTools: string[];
  model?: string;
}

const TEMPLATE: RunnerConfig = {
  hubUrl: 'http://localhost:3000',
  pairingToken: '',
  agent: {
    id: 'agent_be_local',
    name: 'Bastion',
    role: 'BE',
    team: 'BE',
    accent: 'emerald',
    userId: 'user_jiwon',
    capabilities: ['API_DESIGN', 'CODE_GENERATION', 'DOCUMENTATION'],
    permission: 'BRANCH_AND_PR',
  },
  repositories: [{ name: 'acme/payments-api', path: '~/work/payments-api' }],
  limits: { maxTurns: 40, maxBudgetUsd: 2 },
  disallowedTools: ['WebFetch', 'WebSearch'],
};

export const CONFIG_FILENAME = 'agent-town-runner.json';

export function writeTemplate(path: string): void {
  if (existsSync(path)) throw new Error(`${path} 가 이미 있습니다.`);
  writeFileSync(path, `${JSON.stringify(TEMPLATE, null, 2)}\n`, 'utf8');
}

export function expandHome(p: string): string {
  return p.startsWith('~/') ? resolve(homedir(), p.slice(2)) : resolve(p);
}

export function loadConfig(path: string): RunnerConfig {
  if (!existsSync(path)) {
    throw new Error(`설정 파일이 없습니다: ${path}\n  agent-town-runner --init 로 템플릿을 만드세요.`);
  }
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<RunnerConfig>;
  const merged: RunnerConfig = {
    ...TEMPLATE,
    ...parsed,
    agent: { ...TEMPLATE.agent, ...parsed.agent },
    limits: { ...TEMPLATE.limits, ...parsed.limits },
    repositories: parsed.repositories ?? [],
    disallowedTools: parsed.disallowedTools ?? TEMPLATE.disallowedTools,
  };

  if (!merged.hubUrl) throw new Error('hubUrl 이 필요합니다.');
  if (merged.repositories.length === 0) {
    throw new Error('repositories 를 최소 한 개 지정해야 합니다. Agent 는 이 목록 밖으로 나갈 수 없습니다.');
  }

  for (const repo of merged.repositories) {
    const abs = expandHome(repo.path);
    if (!isAbsolute(abs)) throw new Error(`repo 경로가 절대 경로가 아닙니다: ${repo.path}`);
    if (!existsSync(abs)) throw new Error(`repo 경로가 존재하지 않습니다: ${abs}`);
    repo.path = abs;
  }

  merged.pairingToken = process.env.AGENT_TOWN_PAIRING_TOKEN ?? merged.pairingToken;
  return merged;
}

export function identityOf(config: RunnerConfig, mock: boolean): RunnerIdentity {
  return {
    agentId: config.agent.id,
    agentName: config.agent.name,
    role: config.agent.role,
    team: config.agent.team,
    provider: mock ? 'LOCAL' : 'CLAUDE',
    accent: config.agent.accent,
    userId: config.agent.userId,
    capabilities: config.agent.capabilities,
    permission: config.agent.permission,
    repositories: config.repositories.map((r) => r.name),
    hostname: hostname(),
    platform: platform(),
    mock,
  };
}

/**
 * 허브가 보낸 repo 이름을 이 머신의 경로로 바꾼다.
 * 목록에 없으면 null — 러너는 그 작업을 거부한다.
 */
export function resolveRepo(config: RunnerConfig, name: string | null): RepoEntry | null {
  if (!name) return config.repositories[0] ?? null;
  return config.repositories.find((r) => r.name === name) ?? null;
}

/** 경로가 허용된 repo 안에 있는지. canUseTool 에서 한 번 더 확인한다. */
export function isInsideAllowedRepo(config: RunnerConfig, candidate: string): boolean {
  const abs = resolve(candidate);
  return config.repositories.some((repo) => abs === repo.path || abs.startsWith(repo.path + sep));
}
