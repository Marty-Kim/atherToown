'use client';

import { useTownStore } from '@/store/town-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AgentChip } from '@/components/common/AgentChip';
import { TEAM_LABEL } from '@/lib/labels';
import { TEAM_KINDS, type TeamKind } from '@/types/domain';

export function TeamStatusCard() {
  const agents = useTownStore((s) => s.data.agents);
  const teams = TEAM_KINDS.filter((team) => agents.some((a) => a.team === team));

  return (
    <Card>
      <CardHeader>
        <CardTitle>팀별 Agent 상태</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {teams.map((team: TeamKind) => (
          <div key={team}>
            <p className="text-meta mb-1 font-medium uppercase tracking-wide">{TEAM_LABEL[team]}</p>
            <div className="space-y-0.5">
              {agents
                .filter((a) => a.team === team)
                .map((agent) => (
                  <AgentChip key={agent.id} agent={agent} href={`/agents?agent=${agent.id}`} />
                ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
