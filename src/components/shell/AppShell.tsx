'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { NotificationBell } from './NotificationBell';
import { SimulationDriver } from '@/components/workspace/SimulationDriver';
import { LiveDriver } from '@/components/live/LiveDriver';
import { HubStatusBadge } from '@/components/live/HubStatusBadge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toast';
import { LoadingState } from '@/components/ui/states';
import { useHydrated } from '@/hooks/use-hydrated';
import { useTownStore } from '@/store/town-store';

const TITLES: Record<string, string> = {
  '/': 'Overview',
  '/features': 'Features',
  '/agents': 'Agents',
  '/decisions': 'Decisions',
  '/artifacts': 'Artifacts',
  '/settings': 'Settings',
};

function useTitle(): string {
  const pathname = usePathname();
  const features = useTownStore((s) => s.data.features);
  if (pathname.startsWith('/features/')) {
    const id = pathname.split('/')[2];
    const feature = features.find((f) => f.id === id);
    return feature ? `${feature.key} · ${feature.name}` : 'Feature Room';
  }
  return TITLES[pathname] ?? 'Agent Town';
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-dvh overflow-hidden bg-[var(--at-canvas)]">
        <aside className="hidden shrink-0 lg:block">
          <Sidebar />
        </aside>

        <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <DialogContent className="left-0 top-0 h-dvh max-h-dvh w-60 max-w-[80vw] translate-x-0 translate-y-0 rounded-none border-r p-0">
            <DialogTitle className="sr-only">주요 메뉴</DialogTitle>
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </DialogContent>
        </Dialog>

        <div className="flex min-w-0 flex-1 flex-col">
          <Header onOpenNav={() => setMobileNavOpen(true)} hydrated={hydrated} />
          <main className="min-h-0 flex-1 overflow-hidden">
            {hydrated ? children : <LoadingState label="워크스페이스를 복원하는 중" />}
          </main>
        </div>
      </div>
      {hydrated ? (
        <>
          <SimulationDriver />
          <LiveDriver />
        </>
      ) : null}
      <Toaster />
    </TooltipProvider>
  );
}

function Header({ onOpenNav, hydrated }: { onOpenNav: () => void; hydrated: boolean }) {
  const title = useTitle();
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--at-border)] bg-[var(--at-surface-1)] px-3 sm:px-4">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="메뉴 열기"
        className="grid size-9 place-items-center rounded-md text-[var(--at-text-muted)] hover:bg-[var(--at-surface-2)] hover:text-[var(--at-text)] lg:hidden"
      >
        <Menu className="size-4" aria-hidden />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-tight">
        {hydrated ? title : 'Agent Town'}
      </h1>
      {hydrated ? <HubStatusBadge /> : null}
      {hydrated ? <NotificationBell /> : null}
    </header>
  );
}
