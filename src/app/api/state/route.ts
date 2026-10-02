import { NextResponse } from 'next/server';
import { hub } from '@/server/hub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(hub.snapshot());
}
