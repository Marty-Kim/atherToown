'use client';

import * as React from 'react';
import { create } from 'zustand';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { nextId } from '@/lib/utils';

export type ToastTone = 'success' | 'info' | 'error';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (toast) =>
    set((state) => ({ toasts: [...state.toasts, { ...toast, id: nextId('toast') }].slice(-4) })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function toast(item: Omit<ToastItem, 'id'>): void {
  useToastStore.getState().push(item);
}

const ICONS: Record<ToastTone, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  info: Info,
  error: AlertTriangle,
};

const TONE_RING: Record<ToastTone, string> = {
  success: 'ring-emerald-500/35',
  info: 'ring-cyan-500/35',
  error: 'ring-rose-500/40',
};

const TONE_TEXT: Record<ToastTone, string> = {
  success: 'text-emerald-300',
  info: 'text-cyan-300',
  error: 'text-rose-300',
};

/**
 * Toast 는 보조 피드백 수단이다.
 * 중요한 상태 변화는 항상 화면 내 영구 UI(Timeline / Decision 카드)에도 반영한다.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  React.useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => window.setTimeout(() => dismiss(t.id), 5000));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [toasts, dismiss]);

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2.5 rounded-lg at-glass p-3 shadow-xl ring-1 at-fade-up',
              TONE_RING[t.tone],
            )}
          >
            <Icon className={cn('mt-0.5 size-4 shrink-0', TONE_TEXT[t.tone])} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">{t.title}</p>
              {t.description ? <p className="text-meta mt-0.5">{t.description}</p> : null}
            </div>
            <button
              type="button"
              aria-label="알림 닫기"
              onClick={() => dismiss(t.id)}
              className="rounded p-0.5 text-[var(--at-text-dim)] hover:text-[var(--at-text)]"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
