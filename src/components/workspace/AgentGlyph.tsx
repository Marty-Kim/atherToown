import type { AgentAccent, AgentRole } from '@/types/domain';
import { cn } from '@/lib/utils';

export const ACCENT_FG: Record<AgentAccent, string> = {
  violet: 'text-violet-300',
  cyan: 'text-cyan-300',
  blue: 'text-blue-300',
  emerald: 'text-emerald-300',
  amber: 'text-amber-300',
  rose: 'text-rose-300',
};

export const ACCENT_BG: Record<AgentAccent, string> = {
  violet: 'bg-violet-500/14 ring-violet-400/35',
  cyan: 'bg-cyan-500/14 ring-cyan-400/35',
  blue: 'bg-blue-500/14 ring-blue-400/35',
  emerald: 'bg-emerald-500/14 ring-emerald-400/35',
  amber: 'bg-amber-500/14 ring-amber-400/35',
  rose: 'bg-rose-500/14 ring-rose-400/35',
};

/**
 * 역할별 geometric 캐릭터.
 * 외부 이미지나 이모지를 쓰지 않고 SVG 도형만으로 구성한다.
 */
function Shape({ role }: { role: AgentRole }) {
  switch (role) {
    case 'COORDINATOR':
      return (
        <>
          <path d="M12 3.4 19 7.4v9.2L12 20.6 5 16.6V7.4z" fill="currentColor" fillOpacity="0.16" />
          <path d="M12 3.4 19 7.4v9.2L12 20.6 5 16.6V7.4z" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="12" cy="12" r="2.6" fill="currentColor" />
        </>
      );
    case 'APP':
      return (
        <>
          <rect x="7" y="3.4" width="10" height="17.2" rx="2.6" fill="currentColor" fillOpacity="0.16" />
          <rect x="7" y="3.4" width="10" height="17.2" rx="2.6" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="10" cy="11" r="1.15" fill="currentColor" />
          <circle cx="14" cy="11" r="1.15" fill="currentColor" />
          <path d="M10.4 16.2h3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </>
      );
    case 'FE':
      return (
        <>
          <rect x="3.2" y="5" width="17.6" height="14" rx="2.4" fill="currentColor" fillOpacity="0.16" />
          <rect x="3.2" y="5" width="17.6" height="14" rx="2.4" stroke="currentColor" strokeWidth="1.3" />
          <path d="M3.2 9.4h17.6" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="9.2" cy="13.8" r="1.15" fill="currentColor" />
          <circle cx="14.8" cy="13.8" r="1.15" fill="currentColor" />
        </>
      );
    case 'BE':
      return (
        <>
          <ellipse cx="12" cy="6.4" rx="7" ry="2.8" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 6.4v11.2c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8V6.4" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 12c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8" stroke="currentColor" strokeWidth="1.3" />
        </>
      );
    case 'QA':
      return (
        <>
          <path d="M12 3.2 19.2 6v6.2c0 4.1-3 7-7.2 8.6-4.2-1.6-7.2-4.5-7.2-8.6V6z" fill="currentColor" fillOpacity="0.16" />
          <path d="M12 3.2 19.2 6v6.2c0 4.1-3 7-7.2 8.6-4.2-1.6-7.2-4.5-7.2-8.6V6z" stroke="currentColor" strokeWidth="1.3" />
          <path d="m8.8 12.2 2.3 2.4 4.1-4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case 'REVIEWER':
      return (
        <>
          <circle cx="10.6" cy="10.6" r="6.4" fill="currentColor" fillOpacity="0.16" />
          <circle cx="10.6" cy="10.6" r="6.4" stroke="currentColor" strokeWidth="1.3" />
          <path d="m15.4 15.4 4.4 4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8 10.6h5.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </>
      );
  }
}

export function AgentGlyph({
  role,
  accent,
  className,
}: {
  role: AgentRole;
  accent: AgentAccent;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn('size-5', ACCENT_FG[accent], className)}
    >
      <Shape role={role} />
    </svg>
  );
}
