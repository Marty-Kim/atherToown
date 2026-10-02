'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  FileCode2,
  Gavel,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  SquareStack,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTownStore } from '@/store/town-store';
import { CURRENT_USER_ID } from '@/mock';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/features', label: 'Features', icon: SquareStack },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/decisions', label: 'Decisions', icon: Gavel },
  { href: '/artifacts', label: 'Artifacts', icon: FileCode2 },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function TownMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden className={cn('size-7', className)}>
      <rect x="1.5" y="1.5" width="25" height="25" rx="7" fill="#151d35" stroke="#2c3a60" />
      <path d="M14 6.5 21 10.5v7L14 21.5 7 17.5v-7z" stroke="#7b8cff" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="2.8" fill="#7b8cff" />
      <circle cx="14" cy="7.4" r="1.5" fill="#4fd1e0" />
      <circle cx="20.2" cy="17.6" r="1.5" fill="#a78bfa" />
      <circle cx="7.8" cy="17.6" r="1.5" fill="#4fd1e0" />
    </svg>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const collapsed = useTownStore((s) => s.sidebarCollapsed);
  const toggle = useTownStore((s) => s.toggleSidebar);
  const workspace = useTownStore((s) => s.data.workspace);
  const user = useTownStore((s) => s.data.users.find((u) => u.id === CURRENT_USER_ID));

  return (
    <div
      className={cn(
        'flex h-full flex-col border-r border-[var(--at-border)] bg-[var(--at-surface-1)] transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className={cn('flex items-center gap-2.5 px-3 py-4', collapsed && 'justify-center px-0')}>
        <TownMark />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold tracking-tight">Agent Town</p>
            <p className="truncate text-[11px] text-[var(--at-text-dim)]">{workspace.name}</p>
          </div>
        )}
      </div>

      <nav aria-label="주요 메뉴" className="flex-1 px-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            const link = (
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors',
                  collapsed && 'justify-center px-0',
                  active
                    ? 'bg-[var(--at-surface-3)] text-[var(--at-text)] ring-1 ring-[var(--at-border)]'
                    : 'text-[var(--at-text-muted)] hover:bg-[var(--at-surface-2)] hover:text-[var(--at-text)]',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {collapsed && <span className="sr-only">{item.label}</span>}
              </Link>
            );
            return (
              <li key={item.href}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[var(--at-border-soft)] p-2">
        <div className={cn('flex items-center gap-2.5 rounded-md px-1.5 py-1.5', collapsed && 'justify-center px-0')}>
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-full bg-[#2b3a63] text-[11px] font-semibold text-[#c8d4ff]"
          >
            {user?.initials ?? '??'}
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium">{user?.name ?? '알 수 없음'}</p>
              <p className="truncate text-[11px] text-[var(--at-text-dim)]">{user?.title ?? ''}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          className={cn(
            'mt-1 hidden w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[12px] text-[var(--at-text-dim)] transition-colors hover:bg-[var(--at-surface-2)] hover:text-[var(--at-text)] lg:flex',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && <span>사이드바 접기</span>}
        </button>
      </div>
    </div>
  );
}
