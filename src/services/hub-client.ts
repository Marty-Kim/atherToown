'use client';

import type { ControlCommand, ControlResult, HubEvent } from '@/protocol/protocol';

/**
 * 브라우저 → 허브 클라이언트.
 * 허브는 같은 Next 서버 안에 있으므로 상대 경로면 충분하다.
 */

export async function sendControl(command: ControlCommand): Promise<ControlResult> {
  try {
    const response = await fetch('/api/control', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(command),
    });
    return (await response.json()) as ControlResult;
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : '허브에 연결할 수 없습니다.' };
  }
}

export async function createPairingCode(): Promise<{ code: string; expiresAt: string }> {
  const response = await fetch('/api/pair', { method: 'POST' });
  if (!response.ok) throw new Error('페어링 코드를 발급하지 못했습니다.');
  return (await response.json()) as { code: string; expiresAt: string };
}

export interface HubStreamHandlers {
  onEvent: (event: HubEvent) => void;
  onStatus: (status: 'connecting' | 'online' | 'offline') => void;
}

/** 허브 이벤트 구독. EventSource 가 재연결을 알아서 처리한다. */
export function openHubStream({ onEvent, onStatus }: HubStreamHandlers): () => void {
  onStatus('connecting');
  const source = new EventSource('/api/events');

  source.onopen = () => onStatus('online');
  source.onerror = () => onStatus('offline');
  source.onmessage = (message) => {
    try {
      onEvent(JSON.parse(message.data as string) as HubEvent);
    } catch {
      /* keep-alive 주석 등은 무시한다. */
    }
  };

  return () => {
    source.close();
    onStatus('offline');
  };
}
