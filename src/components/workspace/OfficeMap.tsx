'use client';

import * as React from 'react';
import type { Agent, Room } from '@/types/domain';
import { useTownStore } from '@/store/town-store';
import { agentsInRoom, roomState } from '@/store/selectors';
import { RoomTile } from './RoomTile';
import { AgentAvatar } from './AgentAvatar';
import { cn } from '@/lib/utils';

const COLS = 12;
const ROWS = 8;
const PER_ROW = 3;

interface Placed {
  agent: Agent;
  x: number;
  y: number;
}

/** Room grid 좌표로부터 Agent 의 화면 위치(%)를 계산한다. */
function placeAgents(rooms: readonly Room[], agents: readonly Agent[]): Placed[] {
  return rooms.flatMap((room) => {
    const occupants = agentsInRoom(room.id, agents);
    const left = ((room.grid.col - 1) / COLS) * 100;
    const width = (room.grid.colSpan / COLS) * 100;
    const top = ((room.grid.row - 1) / ROWS) * 100;
    const height = (room.grid.rowSpan / ROWS) * 100;

    return occupants.map((agent, index) => {
      const column = index % PER_ROW;
      const row = Math.floor(index / PER_ROW);
      const columnsInRow = Math.min(PER_ROW, occupants.length - row * PER_ROW);
      const offsetX = (column + 0.5) / columnsInRow;
      return {
        agent,
        x: left + width * offsetX,
        y: top + height * (0.62 + row * 0.24),
      };
    });
  });
}

export function OfficeMap({ className }: { className?: string }) {
  const rooms = useTownStore((s) => s.data.rooms);
  const agents = useTownStore((s) => s.data.agents);
  const selection = useTownStore((s) => s.selection);
  const setSelection = useTownStore((s) => s.setSelection);

  const placed = React.useMemo(() => placeAgents(rooms, agents), [rooms, agents]);

  return (
    <section
      aria-label="가상 오피스"
      className={cn(
        'relative min-h-[200px] overflow-hidden rounded-lg border border-[var(--at-border)] bg-[#0a0f1e] at-grid p-2',
        className,
      )}
    >
      <div
        className="grid h-full w-full gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
        }}
      >
        {rooms.map((room) => (
          <RoomTile
            key={room.id}
            room={room}
            state={roomState(room.id, agents)}
            occupants={agentsInRoom(room.id, agents).length}
            selected={selection.kind === 'room' && selection.id === room.id}
            onSelect={() => setSelection({ kind: 'room', id: room.id })}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-2">
        <div className="relative size-full">
          {placed.map(({ agent, x, y }) => (
            <AgentAvatar
              key={agent.id}
              agent={agent}
              x={x}
              y={y}
              selected={selection.kind === 'agent' && selection.id === agent.id}
              onSelect={() => setSelection({ kind: 'agent', id: agent.id })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
