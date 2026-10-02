#!/usr/bin/env -S npx tsx
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Decision, SimulationStep } from '../../src/types/domain';
import type { HubCommand, RunnerTask } from '../../src/protocol/protocol';
import {
  CONFIG_FILENAME,
  identityOf,
  loadConfig,
  resolveRepo,
  writeTemplate,
  type RunnerConfig,
} from './config';
import { runSetup } from './setup';
import { HubClient } from './hub-client';
import { statusStep, type AgentBackend, type DecisionOutcome, type RunContext } from './backend';
import { ClaudeBackend } from './claude-backend';
import { MockBackend } from './mock-backend';

interface Args {
  config: string;
  mock: boolean;
  pair: string | null;
  hub: string | null;
  init: boolean;
  setup: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    config: resolve(CONFIG_FILENAME),
    mock: false,
    pair: null,
    hub: null,
    init: false,
    setup: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = argv[i + 1];
    if (flag === '--config' && next) {
      args.config = resolve(next);
      i += 1;
    } else if (flag === '--pair' && next) {
      args.pair = next;
      i += 1;
    } else if (flag === '--hub' && next) {
      args.hub = next;
      i += 1;
    } else if (flag === '--mock') args.mock = true;
    else if (flag === '--init') args.init = true;
    else if (flag === '--setup') args.setup = true;
    else if (flag === '--help' || flag === '-h') args.help = true;
  }
  return args;
}

const HELP = `
Agent Town Runner

  agent-town-runner [options]

  --setup             대화형으로 설정을 만든다 (설정 파일이 없으면 자동 실행)
  --pair <code>       Agent Town 의 Settings 화면에서 발급한 페어링 코드
  --hub <url>         Agent Town 서버 주소 (예: http://agent-town.local:3000)
  --mock              모델을 호출하지 않는 테스트 러너로 실행
  --config <path>     설정 파일 경로 (기본: ./${CONFIG_FILENAME})
  --init              설정 파일 템플릿만 만들고 끝낸다 (직접 편집용)
  -h, --help          이 도움말

이 러너는 설정의 repositories 목록 밖으로는 절대 나가지 않습니다.
`;

function log(message: string): void {
  process.stdout.write(`[runner] ${message}\n`);
}

/* ------------------------------------------------------------------ *
 * 대기 중인 사람의 응답 관리
 * ------------------------------------------------------------------ */

class PendingMap<T> {
  private readonly map = new Map<string, (value: T) => void>();

  create(requestId: string): Promise<T> {
    return new Promise<T>((resolvePromise) => this.map.set(requestId, resolvePromise));
  }

  settle(requestId: string, value: T): void {
    const resolver = this.map.get(requestId);
    if (!resolver) return;
    this.map.delete(requestId);
    resolver(value);
  }

  settleAll(value: T): void {
    for (const requestId of [...this.map.keys()]) this.settle(requestId, value);
  }
}

/* ------------------------------------------------------------------ *
 * main
 * ------------------------------------------------------------------ */

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(HELP);
    return;
  }
  if (args.init) {
    writeTemplate(args.config);
    log(`${args.config} 를 만들었습니다. 내용을 채운 뒤 다시 실행하세요.`);
    return;
  }

  /* 설정이 없거나 --setup 이면 마법사를 먼저 돌린다. */
  if (args.setup || !existsSync(args.config)) {
    await runSetup({ configPath: args.config, pairingToken: args.pair, hubUrl: args.hub });
  }

  const config: RunnerConfig = loadConfig(args.config);
  if (args.hub) config.hubUrl = args.hub.replace(/\/+$/, '');
  const pairingToken = args.pair ?? config.pairingToken;
  if (!pairingToken) {
    throw new Error('페어링 코드가 필요합니다. --pair <code> 또는 설정의 pairingToken 을 채우세요.');
  }

  const identity = identityOf(config, args.mock);
  const client = new HubClient(config.hubUrl.replace(/\/+$/, ''), identity);
  const backend: AgentBackend = args.mock ? new MockBackend() : new ClaudeBackend(config);

  const toolApprovals = new PendingMap<boolean>();
  const decisions = new PendingMap<DecisionOutcome>();

  log(`${identity.agentName} (${identity.role}) → ${config.hubUrl}`);
  log(`허용된 저장소: ${config.repositories.map((r) => r.name).join(', ')}`);
  if (args.mock) log('mock 모드 — 모델을 호출하지 않습니다.');

  await client.hello(pairingToken);
  log('허브에 등록되었습니다.');

  const emit = async (steps: SimulationStep[]): Promise<void> => {
    await client.emit(steps);
  };

  const runTask = async (task: RunnerTask): Promise<void> => {
    const repo = resolveRepo(config, task.repository);
    if (!repo) {
      await client.post({
        t: 'task-done',
        taskId: task.taskId,
        ok: false,
        sessionId: null,
        costUsd: 0,
        error: `허용되지 않은 저장소입니다: ${task.repository ?? '(미지정)'}`,
      });
      return;
    }

    const ctx: RunContext = {
      identity,
      task,
      repo,
      emit,
      log: (level, message) => {
        void client.post({ t: 'log', level, message });
      },
      requestToolApproval: async (input) => {
        const requestId = randomUUID();
        const waiting = toolApprovals.create(requestId);
        await client.post({
          t: 'tool-approval',
          request: {
            requestId,
            agentId: identity.agentId,
            agentName: identity.agentName,
            featureId: task.featureId,
            toolName: input.toolName,
            title: input.title,
            inputPreview: input.inputPreview,
          },
        });
        return waiting;
      },
      requestDecision: async (decision: Decision) => {
        const requestId = randomUUID();
        const waiting = decisions.create(requestId);
        await client.post({ t: 'decision', requestId, decision });
        return waiting;
      },
    };

    log(`작업 시작 — ${task.prompt.slice(0, 60)}`);
    try {
      const result = await backend.run(ctx);
      await client.post({
        t: 'task-done',
        taskId: task.taskId,
        ok: true,
        sessionId: result.sessionId,
        costUsd: result.costUsd,
        error: null,
      });
      log(`작업 완료 (비용 $${result.costUsd.toFixed(4)})`);
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : String(cause);
      await emit([statusStep(identity.agentId, 'BLOCKED', '오류로 중단됨')]);
      await client.post({
        t: 'task-done',
        taskId: task.taskId,
        ok: false,
        sessionId: null,
        costUsd: 0,
        error,
      });
      log(`작업 실패: ${error}`);
    }
  };

  const onCommand = (command: HubCommand): void => {
    switch (command.t) {
      case 'welcome':
        log(`welcome (runnerId=${command.runnerId.slice(0, 8)}…)`);
        break;
      case 'task':
        void runTask(command.task);
        break;
      case 'tool-approval-result':
        toolApprovals.settle(command.requestId, command.allow);
        log(`도구 승인 ${command.allow ? '허용' : '거절'}`);
        break;
      case 'decision-result':
        decisions.settle(command.requestId, {
          status: command.status,
          chosenOptionId: command.chosenOptionId,
          note: command.note,
        });
        log(`결정 수신: ${command.status}`);
        break;
      case 'interrupt':
        log('중단 요청 수신');
        void backend.interrupt();
        toolApprovals.settleAll(false);
        decisions.settleAll({ status: 'REJECTED', chosenOptionId: null, note: '중단됨' });
        break;
      case 'ping':
        break;
    }
  };

  const shutdown = () => {
    log('종료합니다.');
    client.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await client.listen(onCommand, (up) => log(up ? '허브 연결됨' : '허브 연결 끊김'));
}

main().catch((cause: unknown) => {
  process.stderr.write(`\n${cause instanceof Error ? cause.message : String(cause)}\n\n`);
  process.exit(1);
});
