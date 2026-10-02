import { NextResponse } from 'next/server';
import { hub } from '@/server/hub';
import type { ControlCommand, ControlResult } from '@/protocol/protocol';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 브라우저 → 허브. 작업 지시와 사람의 결정이 전부 여기로 들어온다. */
export async function POST(request: Request) {
  let body: ControlCommand;
  try {
    body = (await request.json()) as ControlCommand;
  } catch {
    return NextResponse.json<ControlResult>({ ok: false, error: '잘못된 요청 본문입니다.' }, { status: 400 });
  }

  switch (body.t) {
    case 'assign':
      return NextResponse.json<ControlResult>(hub.assign(body.agentId, body.task));

    case 'tool-approval': {
      const ok = hub.resolveToolApproval(body.requestId, body.allow, body.reason);
      return NextResponse.json<ControlResult>(
        ok ? { ok } : { ok, error: '이미 처리되었거나 없는 승인 요청입니다.' },
      );
    }

    case 'decision': {
      if (body.status === 'OPEN') {
        return NextResponse.json<ControlResult>({ ok: false, error: 'OPEN 으로는 해소할 수 없습니다.' });
      }
      const ok = hub.resolveDecision(body.requestId, body.status, body.chosenOptionId, body.note);
      return NextResponse.json<ControlResult>(
        ok ? { ok } : { ok, error: '이미 처리되었거나 없는 결정 요청입니다.' },
      );
    }

    case 'interrupt':
      return NextResponse.json<ControlResult>(hub.interrupt(body.agentId));

    case 'feature':
      hub.applyStep({ kind: 'FEATURE_UPSERT', feature: body.feature });
      return NextResponse.json<ControlResult>({ ok: true });

    case 'reset':
      hub.reset();
      return NextResponse.json<ControlResult>({ ok: true });

    default:
      return NextResponse.json<ControlResult>({ ok: false, error: '알 수 없는 명령' }, { status: 400 });
  }
}
