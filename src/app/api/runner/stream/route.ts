import { NextResponse } from 'next/server';
import { hub } from '@/server/hub';
import { sseStream } from '@/server/sse';
import type { HubCommand } from '@/protocol/protocol';
import { authenticateRunner } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 허브 → 러너 명령 스트림. */
export function GET(request: Request) {
  const record = authenticateRunner(request);
  if (!record) return NextResponse.json({ error: '인증 실패' }, { status: 401 });

  return sseStream<HubCommand>((send) => hub.attachRunnerStream(record, send), {
    keepAliveMs: 10_000,
  });
}
