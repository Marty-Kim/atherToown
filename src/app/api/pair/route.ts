import { NextResponse } from 'next/server';
import { hub } from '@/server/hub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 러너를 붙일 때 쓰는 1회용 페어링 코드를 발급한다 (10분 유효). */
export function POST() {
  return NextResponse.json(hub.createPairingCode());
}
