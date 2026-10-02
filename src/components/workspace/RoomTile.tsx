'use client';

import { CircleDashed, Check, Loader2, OctagonAlert, Timer } from 'lucide-react';
import type { Room, RoomState } from '@/types/domain';
import { ROOM_STATE_LABEL } from '@/lib/labels';
import { cn } from '@/lib/utils';

const STATE_CLASS: Record<RoomState, string> = {
  IDLE: 'bg-[#0f1527]/70 border-[#1d2742]',
  ACTIVE: 'bg-[#141d38]/80 border-violet-400/30 at-room-glow-active',
  WAITING: 'bg-[#1b1a2c]/80 border-amber-400/35 at-room-glow-waiting',
  BLOCKED: 'bg-[#1e1526]/80 border-rose-400/40 at-room-glow-blocked',
  COMPLETED: 'bg-[#0f1f26]/80 border-emerald-400/30 at-room-glow-completed',
};

const STATE_TEXT: Record<RoomState, string> = {
  IDLE: 'text-[var(--at-text-dim)]',
  ACTIVE: 'text-violet-200',
  WAITING: 'text-amber-200',
  BLOCKED: 'text-rose-200',
  COMPLETED: 'text-emerald-200',
};

const STATE_ICON: Record<RoomState, React.ComponentType<{ className?: string }>> = {
  IDLE: CircleDashed,
  ACTIVE: Loader2,
  WAITING: Timer,
  BLOCKED: OctagonAlert,
  COMPLETED: Check,
};

export function RoomTile({
  room,
  state,
  occupants,
  selected,
  onSelect,
}: {
  room: Room;
  state: RoomState;
  occupants: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = STATE_ICON[state];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${room.name}, 상태 ${ROOM_STATE_LABEL[state]}, Agent ${occupants}명`}
      style={{
        gridColumn: `${room.grid.col} / span ${room.grid.colSpan}`,
        gridRow: `${room.grid.row} / span ${room.grid.rowSpan}`,
      }}
      className={cn(
        'relative flex flex-col items-start rounded-lg border p-2 text-left transition-all duration-300',
        STATE_CLASS[state],
        selected && 'ring-2 ring-[var(--at-accent)] ring-offset-2 ring-offset-[var(--at-canvas)]',
      )}
    >
      <span className="flex w-full items-start justify-between gap-1">
        <span className="min-w-0 truncate text-[11.5px] font-medium text-[var(--at-text)]">
          {room.name}
          {occupants > 0 && (
            <span className="ml-1 text-[10.5px] font-normal text-[var(--at-text-dim)]">
              · {occupants}
            </span>
          )}
        </span>
        <span className={cn('inline-flex shrink-0 items-center gap-0.5 text-[10.5px]', STATE_TEXT[state])}>
          <Icon className={cn('size-3', state === 'ACTIVE' && 'animate-spin')} aria-hidden />
          <span className="hidden lg:inline">{ROOM_STATE_LABEL[state]}</span>
        </span>
      </span>
    </button>
  );
}
