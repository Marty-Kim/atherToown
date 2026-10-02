'use client';

import * as React from 'react';
import { Loader2, Play } from 'lucide-react';
import type { Agent } from '@/types/domain';
import { AUTONOMY_LEVELS, type AutonomyLevel } from '@/types/domain';
import { useTownStore } from '@/store/town-store';
import { sendControl } from '@/services/hub-client';
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
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErrorState } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { AUTONOMY_LABEL } from '@/lib/labels';

/** 연결된 러너에게 실제 작업을 지시한다. live 모드 전용. */
export function AssignTaskDialog({ agent }: { agent: Agent }) {
  const features = useTownStore((s) => s.data.features);
  const runners = useTownStore((s) => s.hub.runners);
  const runner = runners.find((r) => r.agentId === agent.id);

  const [open, setOpen] = React.useState(false);
  const [prompt, setPrompt] = React.useState('');
  const [featureId, setFeatureId] = React.useState(features[0]?.id ?? '');
  const [repository, setRepository] = React.useState(agent.repositories[0] ?? '');
  const [autonomy, setAutonomy] = React.useState<AutonomyLevel>(2);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const offline = !runner || runner.connection === 'OFFLINE';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!featureId) {
      setError('먼저 Feature를 하나 등록해 주세요.');
      return;
    }
    setBusy(true);
    const result = await sendControl({
      t: 'assign',
      agentId: agent.id,
      task: {
        kind: 'BRIEF',
        featureId,
        prompt: prompt.trim(),
        repository: repository || null,
        autonomy,
        maxBudgetUsd: null,
      },
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? '작업을 지시하지 못했습니다.');
      return;
    }
    setOpen(false);
    setPrompt('');
    toast({
      tone: 'success',
      title: `${agent.name} 에게 작업을 보냈습니다`,
      description: '진행 상황은 Timeline과 가상 오피스에서 볼 수 있습니다.',
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary" size="sm" className="flex-1" disabled={offline}>
          <Play aria-hidden />
          작업 지시
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{agent.name} 에게 작업 지시</DialogTitle>
          <DialogDescription>
            {runner
              ? `${runner.hostname} 의 러너가 이 지시를 받아 실행합니다.`
              : '연결된 러너가 없습니다.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto at-scroll-thin">
          <div className="space-y-4 px-5 py-4">
            <div>
              <Label htmlFor="assign-prompt">지시문</Label>
              <Textarea
                id="assign-prompt"
                rows={4}
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="예: 결제 재시도 API의 멱등 저장소를 설계하고 구현 계획을 타운에 등록해 주세요."
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="assign-feature">Feature</Label>
              <Select value={featureId} onValueChange={setFeatureId}>
                <SelectTrigger id="assign-feature" className="mt-1.5">
                  <SelectValue placeholder="Feature 선택" />
                </SelectTrigger>
                <SelectContent>
                  {features.map((feature) => (
                    <SelectItem key={feature.id} value={feature.id}>
                      {feature.key} · {feature.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assign-repo">Repository</Label>
              <Select value={repository} onValueChange={setRepository}>
                <SelectTrigger id="assign-repo" className="mt-1.5">
                  <SelectValue placeholder="러너가 허용한 저장소" />
                </SelectTrigger>
                <SelectContent>
                  {agent.repositories.map((repo) => (
                    <SelectItem key={repo} value={repo}>
                      {repo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-meta mt-1.5">
                러너 설정에 없는 저장소는 러너가 거부합니다.
              </p>
            </div>

            <div>
              <Label htmlFor="assign-autonomy">Autonomy</Label>
              <Select
                value={String(autonomy)}
                onValueChange={(v) => setAutonomy(Number(v) as AutonomyLevel)}
              >
                <SelectTrigger id="assign-autonomy" className="mt-1.5">
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
                Level 3부터 허용된 저장소 안의 파일 수정이 자동 승인됩니다. push·merge는 항상 승인을 받습니다.
              </p>
            </div>

            {error && <ErrorState title="작업을 보내지 못했습니다" description={error} />}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" variant="primary" disabled={busy || prompt.trim() === ''}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />}
              보내기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
