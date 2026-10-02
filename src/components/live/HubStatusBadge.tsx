'use client';

import { Radio, WifiOff, Loader2 } from 'lucide-react';
import { useTownStore } from '@/store/town-store';
import { Badge } from '@/components/ui/badge';
import type { Tone } from '@/lib/labels';

const LABEL = {
  idle: '대기',
  connecting: '연결 중',
  online: '허브 연결됨',
  offline: '허브 끊김',
} as const;

const TONE: Record<keyof typeof LABEL, Tone> = {
  idle: 'neutral',
  connecting: 'info',
  online: 'success',
  offline: 'danger',
};

export function HubStatusBadge() {
  const mode = useTownStore((s) => s.mode);
  const hub = useTownStore((s) => s.hub);
  if (mode !== 'live') return null;

  const online = hub.runners.filter((r) => r.connection === 'CONNECTED').length;
  const Icon = hub.status === 'online' ? Radio : hub.status === 'connecting' ? Loader2 : WifiOff;

  return (
    <div className="flex items-center gap-1.5">
      <Badge tone={TONE[hub.status]} icon={<Icon className={hub.status === 'connecting' ? 'animate-spin' : ''} />}>
        {LABEL[hub.status]}
      </Badge>
      <span className="text-[11px] text-[var(--at-text-dim)]">
        러너 {online}/{hub.runners.length}
      </span>
    </div>
  );
}
