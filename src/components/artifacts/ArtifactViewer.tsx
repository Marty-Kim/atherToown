'use client';

import type { Artifact } from '@/types/domain';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useTownStore } from '@/store/town-store';
import { displayName } from '@/store/selectors';
import { ARTIFACT_KIND_LABEL, ARTIFACT_STATUS_LABEL, ARTIFACT_STATUS_TONE } from '@/lib/labels';
import { formatClock } from '@/lib/utils';

export function ArtifactViewer({
  artifact,
  open,
  onOpenChange,
}: {
  artifact: Artifact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const data = useTownStore((s) => s.data);
  const feature = data.features.find((f) => f.id === artifact.featureId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent wide className="max-h-[85vh]">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="font-mono">{artifact.name}</DialogTitle>
            <Badge tone={ARTIFACT_STATUS_TONE[artifact.status]}>
              {ARTIFACT_STATUS_LABEL[artifact.status]}
            </Badge>
          </div>
          <DialogDescription>
            {ARTIFACT_KIND_LABEL[artifact.kind]} · {feature?.key ?? '—'} ·{' '}
            {displayName(data, artifact.createdByAgentId)} 작성 · v{artifact.version} · 최종 수정{' '}
            {formatClock(artifact.updatedAt)}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto at-scroll-thin bg-[var(--at-canvas)] p-4">
          <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-[var(--at-text)]">
            {artifact.content}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
