'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { AlertTriangle, Bell, CheckCircle2, FileCode2, Gavel } from 'lucide-react';
import type { Notification } from '@/types/domain';
import { useTownStore } from '@/store/town-store';
import { formatClock } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ICON: Record<Notification['kind'], React.ComponentType<{ className?: string }>> = {
  DECISION: Gavel,
  BLOCKER: AlertTriangle,
  ARTIFACT: FileCode2,
  COMPLETION: CheckCircle2,
};

const ICON_COLOR: Record<Notification['kind'], string> = {
  DECISION: 'text-amber-300',
  BLOCKER: 'text-rose-300',
  ARTIFACT: 'text-cyan-300',
  COMPLETION: 'text-emerald-300',
};

export function NotificationBell() {
  const notifications = useTownStore((s) => s.data.notifications);
  const markRead = useTownStore((s) => s.markNotificationsRead);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `알림 ${unread}건 (읽지 않음)` : '알림'}
          className="relative grid size-9 place-items-center rounded-md text-[var(--at-text-muted)] transition-colors hover:bg-[var(--at-surface-2)] hover:text-[var(--at-text)]"
        >
          <Bell className="size-4" aria-hidden />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-4 text-white">
              {unread}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg at-glass shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[var(--at-border-soft)] px-3 py-2.5">
            <p className="text-[13px] font-semibold">알림</p>
            <Button variant="ghost" size="sm" onClick={markRead} disabled={unread === 0}>
              모두 읽음
            </Button>
          </div>
          <ul className="max-h-80 overflow-y-auto at-scroll-thin">
            {notifications.length === 0 && (
              <li className="px-3 py-6 text-center text-meta">새로운 알림이 없습니다.</li>
            )}
            {notifications.map((n) => {
              const Icon = ICON[n.kind];
              return (
                <li
                  key={n.id}
                  className="flex items-start gap-2.5 border-b border-[var(--at-border-soft)] px-3 py-2.5 last:border-b-0"
                >
                  <Icon className={`mt-0.5 size-4 shrink-0 ${ICON_COLOR[n.kind]}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium">{n.title}</p>
                    <p className="text-meta truncate">{n.body}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[11px] text-[var(--at-text-dim)]">{formatClock(n.createdAt)}</span>
                    {!n.read && <span className="size-1.5 rounded-full bg-[#6d8bff]" aria-label="읽지 않음" />}
                  </div>
                </li>
              );
            })}
          </ul>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
