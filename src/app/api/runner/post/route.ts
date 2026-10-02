import { NextResponse } from 'next/server';
import { hub } from '@/server/hub';
import { authenticateRunner } from '@/server/auth';
import type { RunnerPost } from '@/protocol/protocol';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 러너가 올리는 모든 것 — 스텝, 하트비트, 승인 요청, 작업 완료. */
export async function POST(request: Request) {
  const record = authenticateRunner(request);
  if (!record) return NextResponse.json({ error: '인증 실패' }, { status: 401 });

  let body: RunnerPost;
  try {
    body = (await request.json()) as RunnerPost;
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 });
  }

  switch (body.t) {
    case 'heartbeat':
      return NextResponse.json({ ok: true });

    case 'steps':
      hub.applySteps(body.steps ?? []);
      return NextResponse.json({ ok: true });

    case 'tool-approval':
      hub.openToolApproval(record, {
        kind: 'TOOL',
        ...body.request,
        agentId: record.identity.agentId,
        agentName: record.identity.agentName,
        createdAt: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true });

    case 'decision':
      hub.applyStep({ kind: 'DECISION_OPEN', decision: body.decision });
      hub.openToolApproval(record, {
        kind: 'DECISION',
        requestId: body.requestId,
        decision: body.decision,
      });
      return NextResponse.json({ ok: true });

    case 'task-done':
      hub.finishTask(record, body.taskId, body.costUsd ?? 0);
      if (!body.ok && body.error) hub.log('error', `${record.identity.agentName}: ${body.error}`);
      return NextResponse.json({ ok: true });

    case 'log':
      hub.log(body.level, `${record.identity.agentName}: ${body.message}`);
      return NextResponse.json({ ok: true });

    default:
      return NextResponse.json({ error: '알 수 없는 메시지' }, { status: 400 });
  }
}
