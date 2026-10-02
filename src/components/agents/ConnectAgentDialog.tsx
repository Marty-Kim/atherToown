'use client';

import * as React from 'react';
import { Loader2, Plug, ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErrorState } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { useTownStore } from '@/store/town-store';
import { CURRENT_USER_ID } from '@/mock';
import {
  AGENT_CAPABILITIES,
  AGENT_PROVIDERS,
  PERMISSION_LEVELS,
  type AgentCapability,
  type AgentProvider,
  type AgentRole,
  type PermissionLevel,
  type TeamKind,
} from '@/types/domain';
import { CAPABILITY_LABEL, PERMISSION_LABEL, PROVIDER_LABEL, TEAM_LABEL } from '@/lib/labels';
import { TEAM_TO_ROLE } from '@/services/agent-service';
import { cn } from '@/lib/utils';

const TEAMS: readonly TeamKind[] = ['APP', 'FE', 'BE', 'QA', 'PLATFORM'];

export function ConnectAgentDialog() {
  const connectAgent = useTownStore((s) => s.connectAgent);
  const repositories = useTownStore((s) => s.data.workspace.repositories);
  const busy = useTownStore((s) => s.busy);

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [provider, setProvider] = React.useState<AgentProvider>('CLAUDE');
  const [team, setTeam] = React.useState<TeamKind>('APP');
  const [capabilities, setCapabilities] = React.useState<AgentCapability[]>(['CODE_GENERATION']);
  const [repos, setRepos] = React.useState<string[]>(repositories.slice(0, 1));
  const [permission, setPermission] = React.useState<PermissionLevel>('DRAFT');
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setName('');
    setProvider('CLAUDE');
    setTeam('APP');
    setCapabilities(['CODE_GENERATION']);
    setRepos(repositories.slice(0, 1));
    setPermission('DRAFT');
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const role: AgentRole = TEAM_TO_ROLE[team];
      const agent = await connectAgent({
        name,
        provider,
        team,
        role,
        capabilities,
        repositories: repos,
        permission,
        connectedBy: CURRENT_USER_ID,
      });
      setOpen(false);
      reset();
      toast({
        tone: 'success',
        title: `${agent.name}을(를) 연결했습니다`,
        description: '가상 오피스의 팀 Room에 배치되었습니다.',
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '알 수 없는 오류가 발생했습니다.');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="primary">
          <Plug aria-hidden />
          Connect Agent
        </Button>
      </DialogTrigger>
      <DialogContent wide>
        <DialogHeader>
          <DialogTitle>Agent 연결</DialogTitle>
          <DialogDescription>
            연결된 Agent는 Feature Room에 참여해 다른 팀 Agent와 구조화된 메시지를 주고받습니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto at-scroll-thin">
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="agent-name">Agent name</Label>
              <Input
                id="agent-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: Falcon"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="agent-provider">Agent provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as AgentProvider)}>
                <SelectTrigger id="agent-provider" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PROVIDER_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="agent-team">Team</Label>
              <Select value={team} onValueChange={(v) => setTeam(v as TeamKind)}>
                <SelectTrigger id="agent-team" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEAMS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TEAM_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="agent-permission">Permission level</Label>
              <Select value={permission} onValueChange={(v) => setPermission(v as PermissionLevel)}>
                <SelectTrigger id="agent-permission" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERMISSION_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {PERMISSION_LABEL[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <fieldset className="sm:col-span-2">
              <legend className="text-[12px] font-medium text-[var(--at-text-muted)]">Capabilities</legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {AGENT_CAPABILITIES.map((capability) => {
                  const selected = capabilities.includes(capability);
                  return (
                    <Toggle
                      key={capability}
                      selected={selected}
                      label={CAPABILITY_LABEL[capability]}
                      onClick={() =>
                        setCapabilities((prev) =>
                          prev.includes(capability)
                            ? prev.filter((c) => c !== capability)
                            : [...prev, capability],
                        )
                      }
                    />
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="sm:col-span-2">
              <legend className="text-[12px] font-medium text-[var(--at-text-muted)]">
                Repository access
              </legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {repositories.map((repo) => (
                  <Toggle
                    key={repo}
                    selected={repos.includes(repo)}
                    label={repo}
                    mono
                    onClick={() =>
                      setRepos((prev) =>
                        prev.includes(repo) ? prev.filter((r) => r !== repo) : [...prev, repo],
                      )
                    }
                  />
                ))}
              </div>
            </fieldset>

            <p className="text-meta sm:col-span-2 flex items-start gap-2 rounded-md bg-[var(--at-surface-2)] p-2.5 ring-1 ring-[var(--at-border)]">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-300" aria-hidden />
              이 화면은 mock 연결입니다. API key나 인증 토큰을 입력받지 않고 저장하지도 않습니다. 실제
              연동은 <code className="font-mono">AgentRuntimeService</code> 구현체를 교체해 처리합니다.
            </p>

            {error && (
              <div className="sm:col-span-2">
                <ErrorState title="Agent를 연결하지 못했습니다" description={error} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Plug aria-hidden />}
              연결하기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({
  selected,
  label,
  onClick,
  mono = false,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
  mono?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'rounded-md px-2.5 py-1.5 text-[12px] font-medium ring-1 transition-colors',
        mono && 'font-mono text-[11.5px]',
        selected
          ? 'bg-[#3d5bd9]/20 text-[#c3cffb] ring-[#3d5bd9]/60'
          : 'bg-[var(--at-surface-2)] text-[var(--at-text-muted)] ring-[var(--at-border)] hover:text-[var(--at-text)]',
      )}
    >
      {selected ? '✓ ' : ''}
      {label}
    </button>
  );
}
