import type { SimulationStep } from '../../src/types/domain';
import {
  PROTOCOL_VERSION,
  type HelloResponse,
  type HubCommand,
  type RunnerIdentity,
  type RunnerPost,
} from '../../src/protocol/protocol';

/**
 * 허브와의 연결. WebSocket 을 쓰지 않는다 —
 * 명령은 SSE 로 받고, 올리는 건 전부 평범한 POST 다.
 * 덕분에 허브가 Next.js route handler 만으로 끝난다.
 */
export class HubClient {
  private runnerId = '';
  private sessionToken = '';
  private heartbeatMs = 10_000;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  /** 연결이 끊긴 동안 쌓아두는 스텝. 재연결하면 한 번에 올린다. */
  private outbox: SimulationStep[] = [];

  constructor(
    private readonly hubUrl: string,
    private readonly identity: RunnerIdentity,
  ) {}

  get connected(): boolean {
    return this.runnerId !== '';
  }

  async hello(pairingToken: string): Promise<void> {
    const response = await fetch(`${this.hubUrl}/api/runner/hello`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ version: PROTOCOL_VERSION, pairingToken, identity: this.identity }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`허브 등록 실패 (${response.status}): ${detail}`);
    }

    const body = (await response.json()) as HelloResponse;
    this.runnerId = body.runnerId;
    this.sessionToken = body.sessionToken;
    this.heartbeatMs = body.heartbeatMs;
  }

  private headers(): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-runner-id': this.runnerId,
      authorization: `Bearer ${this.sessionToken}`,
    };
  }

  async post(body: RunnerPost): Promise<boolean> {
    if (!this.connected) return false;
    try {
      const response = await fetch(`${this.hubUrl}/api/runner/post`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async emit(steps: SimulationStep[]): Promise<void> {
    if (steps.length === 0) return;
    this.outbox.push(...steps);
    await this.flush();
  }

  async flush(): Promise<void> {
    if (this.outbox.length === 0) return;
    const batch = this.outbox.splice(0);
    const ok = await this.post({ t: 'steps', steps: batch });
    if (!ok) this.outbox.unshift(...batch);
  }

  /** 명령 스트림을 열고 끊기면 계속 재시도한다. */
  async listen(onCommand: (command: HubCommand) => void, onStatus: (up: boolean) => void): Promise<void> {
    let backoffMs = 1000;

    while (!this.stopped) {
      try {
        const response = await fetch(`${this.hubUrl}/api/runner/stream`, {
          headers: { ...this.headers(), accept: 'text/event-stream' },
        });

        if (response.status === 401) {
          onStatus(false);
          throw new Error('세션이 만료되었습니다. 다시 페어링해야 합니다.');
        }
        if (!response.ok || !response.body) {
          throw new Error(`스트림 연결 실패 (${response.status})`);
        }

        onStatus(true);
        backoffMs = 1000;
        this.startHeartbeat();
        await this.flush();
        await this.readSse(response.body, onCommand);
      } catch (cause) {
        if (this.stopped) return;
        const message = cause instanceof Error ? cause.message : String(cause);
        if (message.includes('다시 페어링')) throw cause;
        process.stderr.write(`[runner] 허브 연결 끊김: ${message} — ${backoffMs}ms 후 재시도\n`);
      } finally {
        this.stopHeartbeat();
        onStatus(false);
      }

      await sleep(backoffMs);
      backoffMs = Math.min(backoffMs * 2, 15_000);
    }
  }

  private async readSse(
    body: ReadableStream<Uint8Array>,
    onCommand: (command: HubCommand) => void,
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');

        for (const line of frame.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '') continue;
          try {
            onCommand(JSON.parse(payload) as HubCommand);
          } catch {
            process.stderr.write(`[runner] 명령 파싱 실패: ${payload.slice(0, 120)}\n`);
          }
        }
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      void this.post({ t: 'heartbeat' });
    }, this.heartbeatMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  stop(): void {
    this.stopped = true;
    this.stopHeartbeat();
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
