import { NextResponse } from 'next/server';
import { hub } from '@/server/hub';
import { HEARTBEAT_MS, PROTOCOL_VERSION, type HelloRequest } from '@/protocol/protocol';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: HelloRequest;
  try {
    body = (await request.json()) as HelloRequest;
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 });
  }

  if (body.version !== PROTOCOL_VERSION) {
    return NextResponse.json(
      { error: `프로토콜 버전이 다릅니다. 허브 ${PROTOCOL_VERSION}, 러너 ${body.version}` },
      { status: 409 },
    );
  }
  if (!body.identity?.agentId || !body.identity?.agentName) {
    return NextResponse.json({ error: 'agentId 와 agentName 이 필요합니다.' }, { status: 400 });
  }

  const result = hub.register(body.pairingToken ?? '', body.identity);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  return NextResponse.json({ ...result, heartbeatMs: HEARTBEAT_MS });
}
