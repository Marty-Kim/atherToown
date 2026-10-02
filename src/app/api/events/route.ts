import { hub } from '@/server/hub';
import { sseStream } from '@/server/sse';
import type { HubEvent } from '@/protocol/protocol';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 허브 → 브라우저 이벤트 스트림. 접속 즉시 snapshot 을 먼저 받는다. */
export function GET() {
  return sseStream<HubEvent>((send) => hub.attachBrowser(send));
}
