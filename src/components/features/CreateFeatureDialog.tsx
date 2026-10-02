'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
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
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErrorState } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { useTownStore } from '@/store/town-store';
import { sendControl } from '@/services/hub-client';
import { AUTONOMY_LABEL, PRIORITY_LABEL, TEAM_LABEL } from '@/lib/labels';
import {
  AUTONOMY_LEVELS,
  PRIORITIES,
  type AutonomyLevel,
  type Priority,
  type TeamKind,
} from '@/types/domain';
import { cn } from '@/lib/utils';

const SELECTABLE_TEAMS: readonly TeamKind[] = ['APP', 'FE', 'BE', 'QA'];

export function CreateFeatureDialog({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter();
  const createFeature = useTownStore((s) => s.createFeature);
  const mode = useTownStore((s) => s.mode);
  const repositories = useTownStore((s) => s.data.workspace.repositories);
  const busy = useTownStore((s) => s.busy);

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [teams, setTeams] = React.useState<TeamKind[]>(['APP', 'BE']);
  const [priority, setPriority] = React.useState<Priority>('MEDIUM');
  const [repository, setRepository] = React.useState(repositories[0] ?? '');
  const [dueDate, setDueDate] = React.useState('');
  const [autonomy, setAutonomy] = React.useState<AutonomyLevel>(2);
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setName('');
    setDescription('');
    setTeams(['APP', 'BE']);
    setPriority('MEDIUM');
    setRepository(repositories[0] ?? '');
    setDueDate('');
    setAutonomy(2);
    setError(null);
  }

  function toggleTeam(team: TeamKind) {
    setTeams((prev) => (prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const id = await createFeature({
        name,
        description,
        teams,
        priority,
        repository,
        dueDate: dueDate === '' ? null : dueDate,
        autonomy,
      });

      /* live 모드에서는 허브에도 등록해서 모든 브라우저가 같은 Feature 를 본다. */
      if (mode === 'live') {
        const created = useTownStore.getState().data.features.find((f) => f.id === id);
        if (created) {
          const result = await sendControl({ t: 'feature', feature: created });
          if (!result.ok) {
            setError(result.error ?? '허브에 Feature 를 등록하지 못했습니다.');
            return;
          }
        }
      }

      setOpen(false);
      reset();
      toast({
        tone: 'success',
        title: 'Feature Room이 생성되었습니다',
        description: 'Coordinator가 요구사항 분석을 시작했습니다.',
      });
      router.push(`/features/${id}`);
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
        {trigger ?? (
          <Button variant="primary">
            <Plus aria-hidden />
            Create Feature
          </Button>
        )}
      </DialogTrigger>
      <DialogContent wide>
        <DialogHeader>
          <DialogTitle>새 Feature 등록</DialogTitle>
          <DialogDescription>
            등록하면 Feature Room이 만들어지고 Coordinator Agent가 요구사항 분석을 시작합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto at-scroll-thin">
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="feature-name">Feature name</Label>
              <Input
                id="feature-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 정기 결제 실패 알림"
                required
                className="mt-1.5"
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="feature-desc">Description</Label>
              <Textarea
                id="feature-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Agent가 작업을 분해할 수 있도록 사용자 관점의 요구사항을 적어 주세요."
                className="mt-1.5"
              />
            </div>

            <fieldset className="sm:col-span-2">
              <legend className="text-[12px] font-medium text-[var(--at-text-muted)]">
                참여 팀
              </legend>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {SELECTABLE_TEAMS.map((team) => {
                  const selected = teams.includes(team);
                  return (
                    <button
                      key={team}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleTeam(team)}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-[12px] font-medium ring-1 transition-colors',
                        selected
                          ? 'bg-[#3d5bd9]/20 text-[#c3cffb] ring-[#3d5bd9]/60'
                          : 'bg-[var(--at-surface-2)] text-[var(--at-text-muted)] ring-[var(--at-border)] hover:text-[var(--at-text)]',
                      )}
                    >
                      {selected ? '✓ ' : ''}
                      {TEAM_LABEL[team]}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <Label htmlFor="feature-priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger id="feature-priority" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="feature-repo">Repository</Label>
              <Select value={repository} onValueChange={setRepository}>
                <SelectTrigger id="feature-repo" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {repositories.map((repo) => (
                    <SelectItem key={repo} value={repo}>
                      {repo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="feature-due">Due date</Label>
              <Input
                id="feature-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="feature-autonomy">Agent autonomy level</Label>
              <Select
                value={String(autonomy)}
                onValueChange={(v) => setAutonomy(Number(v) as AutonomyLevel)}
              >
                <SelectTrigger id="feature-autonomy" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTONOMY_LEVELS.map((level) => (
                    <SelectItem key={level} value={String(level)}>
                      {AUTONOMY_LABEL[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-meta mt-1.5">
                Level 3 이상부터 Agent가 branch와 PR을 만들 수 있습니다.
              </p>
            </div>

            {error && (
              <div className="sm:col-span-2">
                <ErrorState title="Feature를 만들지 못했습니다" description={error} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
              Feature 생성
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
