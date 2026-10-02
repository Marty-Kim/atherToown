import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { SimulationStep } from '@/types/domain';
import {
  HEARTBEAT_MS,
  RUNNER_TIMEOUT_MS,
  type HubCommand,
  type HubEvent,
  type HubSnapshot,
  type PendingApproval,
  type RunnerIdentity,
  type RunnerPublic,
  type RunnerTask,
} from '@/protocol/protocol';

/**
 * 사내망용 in-memory 허브.
 *
 * 일부러 아주 단순하게 만들었다. 프로세스 하나가 전부를 들고 있고,
 * 상태는 append-only 스텝 로그 + 러너 레지스트리 + 승인 대기열 셋뿐이다.
 * 도메인 reducer 는 브라우저에만 있다 — 허브는 reducer 를 돌리지 않고
 * 스텝을 순서대로 중계하기만 한다. 그래서 진실의 원천이 하나로 유지된다.
 *
 * 한계(의도된 것):
 *  - 단일 프로세스 전제. `next start` 인스턴스 한 대에서만 맞다.
 *  - 재시작하면 스텝 로그가 사라진다. 팀 내부 도구 기준으로는 허용 가능.
 *  - dev 모드에서 HMR 이 모듈을 갈아끼우면 상태가 초기화될 수 있다.
 */

type SendToRunner = (command: HubCommand) => void;
type SendToBrowser = (event: HubEvent) => void;

interface RunnerRecord {
  runnerId: string;
  sessionToken: string;
  identity: RunnerIdentity;
  connectedAt: string;
  lastSeenAt: string;
  costUsd: number;
  send: SendToRunner | null;
  /** 스트림이 붙기 전에 도착한 명령을 잠깐 담아둔다. */
  queue: HubCommand[];
  currentTaskId: string | null;
}

interface PendingRecord {
  approval: PendingApproval;
  runnerId: string;
}

const MAX_STEPS = 5_000;
const PAIRING_TTL_MS = 10 * 60 * 1000;

class Hub {
  private steps: SimulationStep[] = [];
  private seq = 0;
  private readonly runners = new Map<string, RunnerRecord>();
  private readonly pending = new Map<string, PendingRecord>();
  private readonly browsers = new Set<SendToBrowser>();
  private readonly pairingCodes = new Map<string, number>();

  /* ---------------- 페어링 ---------------- */

  createPairingCode(): { code: string; expiresAt: string } {
    this.prunePairingCodes();
    const code = randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = Date.now() + PAIRING_TTL_MS;
    this.pairingCodes.set(code, expiresAt);
    return { code, expiresAt: new Date(expiresAt).toISOString() };
  }

  private prunePairingCodes(): void {
    const now = Date.now();
    for (const [code, expiresAt] of this.pairingCodes) {
      if (expiresAt < now) this.pairingCodes.delete(code);
    }
  }

  private consumePairingCode(token: string): boolean {
    const shared = process.env.AGENT_TOWN_PAIRING_TOKEN;
    if (shared && shared.length >= 8 && safeEqual(shared, token)) return true;

    this.prunePairingCodes();
    const upper = token.trim().toUpperCase();
    if (!this.pairingCodes.has(upper)) return false;
    this.pairingCodes.delete(upper);
    return true;
  }

  /* ---------------- 러너 등록 ---------------- */

  register(
    pairingToken: string,
    identity: RunnerIdentity,
  ): { runnerId: string; sessionToken: string } | { error: string } {
    if (!this.consumePairingCode(pairingToken)) {
      return { error: '페어링 코드가 유효하지 않거나 만료되었습니다.' };
    }

    /* 같은 agentId 로 다시 붙으면 이전 등록을 대체한다 (러너 재시작). */
    for (const [runnerId, record] of this.runners) {
      if (record.identity.agentId === identity.agentId) {
        record.send = null;
        this.runners.delete(runnerId);
      }
    }

    const runnerId = randomUUID();
    const sessionToken = randomBytes(24).toString('base64url');
    const now = new Date().toISOString();

    this.runners.set(runnerId, {
      runnerId,
      sessionToken,
      identity,
      connectedAt: now,
      lastSeenAt: now,
      costUsd: 0,
      send: null,
      queue: [{ t: 'welcome', runnerId, heartbeatMs: HEARTBEAT_MS }],
      currentTaskId: null,
    });

    this.applyStep({
      kind: 'AGENT_UPSERT',
      agent: {
        id: identity.agentId,
        name: identity.agentName,
        role: identity.role,
        provider: identity.provider,
        team: identity.team,
        connectedBy: identity.userId,
        capabilities: identity.capabilities,
        repositories: identity.repositories,
        permission: permissionFromLevel(identity.permission),
        connection: 'CONNECTED',
        status: 'IDLE',
        currentTask: null,
        roomId: roomForTeam(identity.team),
        featureId: null,
        lastActiveAt: now,
        accent: identity.accent,
      },
    });
    this.broadcastRunners();
    return { runnerId, sessionToken };
  }

  authenticate(runnerId: string, sessionToken: string): RunnerRecord | null {
    const record = this.runners.get(runnerId);
    if (!record) return null;
    if (!safeEqual(record.sessionToken, sessionToken)) return null;
    record.lastSeenAt = new Date().toISOString();
    return record;
  }

  attachRunnerStream(record: RunnerRecord, send: SendToRunner): () => void {
    record.send = send;
    for (const queued of record.queue.splice(0)) send(queued);
    this.markConnection(record, 'CONNECTED');
    return () => {
      if (record.send === send) {
        record.send = null;
        this.markConnection(record, 'OFFLINE');
      }
    };
  }

  private markConnection(record: RunnerRecord, connection: RunnerPublic['connection']): void {
    this.applyStep({ kind: 'AGENT_CONNECTION', agentId: record.identity.agentId, connection });
    this.broadcastRunners();
  }

  private sendToRunner(record: RunnerRecord, command: HubCommand): void {
    if (record.send) record.send(command);
    else record.queue.push(command);
  }

  /* ---------------- 스텝 로그 ---------------- */

  applyStep(step: SimulationStep): void {
    this.seq += 1;
    this.steps.push(step);
    if (this.steps.length > MAX_STEPS) this.steps.splice(0, this.steps.length - MAX_STEPS);
    this.broadcast({ t: 'step', seq: this.seq, step });
  }

  applySteps(steps: readonly SimulationStep[]): void {
    for (const step of steps) this.applyStep(step);
  }

  snapshot(): HubSnapshot {
    this.sweepStaleRunners();
    return {
      seq: this.seq,
      steps: [...this.steps],
      runners: this.runnerList(),
      pending: [...this.pending.values()].map((p) => p.approval),
    };
  }

  /* ---------------- 브라우저 구독 ---------------- */

  attachBrowser(send: SendToBrowser): () => void {
    this.browsers.add(send);
    send({ t: 'snapshot', ...this.snapshot() });
    return () => {
      this.browsers.delete(send);
    };
  }

  private broadcast(event: HubEvent): void {
    for (const send of this.browsers) {
      try {
        send(event);
      } catch {
        this.browsers.delete(send);
      }
    }
  }

  private broadcastRunners(): void {
    this.broadcast({ t: 'runners', runners: this.runnerList() });
  }

  private broadcastPending(): void {
    this.broadcast({ t: 'pending', pending: [...this.pending.values()].map((p) => p.approval) });
  }

  log(level: 'info' | 'warn' | 'error', message: string): void {
    this.broadcast({ t: 'log', level, message, at: new Date().toISOString() });
  }

  private runnerList(): RunnerPublic[] {
    return [...this.runners.values()].map((r) => ({
      runnerId: r.runnerId,
      agentId: r.identity.agentId,
      agentName: r.identity.agentName,
      userId: r.identity.userId,
      hostname: r.identity.hostname,
      platform: r.identity.platform,
      mock: r.identity.mock,
      connection: connectionOf(r),
      connectedAt: r.connectedAt,
      lastSeenAt: r.lastSeenAt,
      costUsd: r.costUsd,
    }));
  }

  private sweepStaleRunners(): void {
    const now = Date.now();
    for (const record of this.runners.values()) {
      const stale = now - Date.parse(record.lastSeenAt) > RUNNER_TIMEOUT_MS;
      if (stale && record.send) {
        record.send = null;
        this.markConnection(record, 'OFFLINE');
      }
    }
  }

  /* ---------------- 승인 대기열 ---------------- */

  openToolApproval(record: RunnerRecord, approval: PendingApproval): void {
    this.pending.set(approval.requestId, { approval, runnerId: record.runnerId });
    this.broadcastPending();
  }

  resolveToolApproval(requestId: string, allow: boolean, reason: string | null): boolean {
    const entry = this.pending.get(requestId);
    if (!entry || entry.approval.kind !== 'TOOL') return false;
    this.pending.delete(requestId);
    const record = this.runners.get(entry.runnerId);
    if (record) this.sendToRunner(record, { t: 'tool-approval-result', requestId, allow, reason });
    this.broadcastPending();
    return true;
  }

  resolveDecision(
    requestId: string,
    status: 'APPROVED' | 'REJECTED' | 'NEEDS_DISCUSSION',
    chosenOptionId: string | null,
    note: string | null,
  ): boolean {
    const entry = this.pending.get(requestId);
    if (!entry || entry.approval.kind !== 'DECISION') return false;
    this.pending.delete(requestId);

    this.applyStep({
      kind: 'DECISION_RESOLVE',
      decisionId: entry.approval.decision.id,
      status,
      chosenOptionId,
      note,
      resolvedAt: new Date().toISOString(),
    });

    const record = this.runners.get(entry.runnerId);
    if (record) {
      this.sendToRunner(record, { t: 'decision-result', requestId, status, chosenOptionId, note });
    }
    this.broadcastPending();
    return true;
  }

  /* ---------------- 작업 지시 ---------------- */

  assign(agentId: string, task: Omit<RunnerTask, 'taskId' | 'resumeSessionId'>): ControlOutcome {
    const record = [...this.runners.values()].find((r) => r.identity.agentId === agentId);
    if (!record) return { ok: false, error: '해당 Agent 의 러너가 연결되어 있지 않습니다.' };
    if (connectionOf(record) === 'OFFLINE') {
      return { ok: false, error: '러너가 오프라인입니다. 해당 머신이 깨어 있는지 확인해 주세요.' };
    }
    if (record.currentTaskId) {
      return { ok: false, error: '이 Agent 는 이미 작업 중입니다.' };
    }

    const taskId = randomUUID();
    record.currentTaskId = taskId;
    this.sendToRunner(record, {
      t: 'task',
      task: { ...task, taskId, resumeSessionId: null },
    });
    return { ok: true };
  }

  finishTask(record: RunnerRecord, taskId: string, costUsd: number): void {
    if (record.currentTaskId === taskId) record.currentTaskId = null;
    record.costUsd += costUsd;
    this.broadcastRunners();
  }

  interrupt(agentId: string): ControlOutcome {
    const record = [...this.runners.values()].find((r) => r.identity.agentId === agentId);
    if (!record) return { ok: false, error: '러너를 찾을 수 없습니다.' };
    this.sendToRunner(record, { t: 'interrupt', taskId: record.currentTaskId });
    return { ok: true };
  }

  reset(): void {
    this.steps = [];
    this.seq = 0;
    for (const requestId of [...this.pending.keys()]) {
      this.resolveToolApproval(requestId, false, '초기화됨');
    }
    this.pending.clear();
    /* 연결된 러너들은 다시 등록시킨다. */
    for (const record of this.runners.values()) {
      this.applyStep({
        kind: 'AGENT_UPSERT',
        agent: {
          id: record.identity.agentId,
          name: record.identity.agentName,
          role: record.identity.role,
          provider: record.identity.provider,
          team: record.identity.team,
          connectedBy: record.identity.userId,
          capabilities: record.identity.capabilities,
          repositories: record.identity.repositories,
          permission: permissionFromLevel(record.identity.permission),
          connection: connectionOf(record),
          status: 'IDLE',
          currentTask: null,
          roomId: roomForTeam(record.identity.team),
          featureId: null,
          lastActiveAt: new Date().toISOString(),
          accent: record.identity.accent,
        },
      });
    }
    this.broadcastPending();
    this.broadcastRunners();
  }
}

export interface ControlOutcome {
  ok: boolean;
  error?: string;
}

function connectionOf(record: RunnerRecord): RunnerPublic['connection'] {
  if (!record.send) return 'OFFLINE';
  const silentMs = Date.now() - Date.parse(record.lastSeenAt);
  if (silentMs > HEARTBEAT_MS * 2) return 'DEGRADED';
  return 'CONNECTED';
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function permissionFromLevel(level: RunnerIdentity['permission']) {
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

function roomForTeam(team: RunnerIdentity['team']): string {
  switch (team) {
    case 'APP':
      return 'room_app';
    case 'FE':
      return 'room_fe';
    case 'BE':
      return 'room_be';
    case 'QA':
      return 'room_integration';
    case 'PLATFORM':
      return 'room_planning';
  }
}

/* dev 모드의 모듈 재적재에도 같은 인스턴스를 유지한다. */
const globalRef = globalThis as typeof globalThis & { __agentTownHub?: Hub };
export const hub: Hub = globalRef.__agentTownHub ?? (globalRef.__agentTownHub = new Hub());
export type { RunnerRecord };
