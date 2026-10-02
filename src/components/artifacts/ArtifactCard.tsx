'use client';

import * as React from 'react';
import { FileCode2, FileText, ListChecks, ScrollText, TestTube2, GitPullRequest } from 'lucide-react';
import type { Artifact, ArtifactKind } from '@/types/domain';
import { useTownStore } from '@/store/town-store';
import { displayName } from '@/store/selectors';
import { Badge } from '@/components/ui/badge';
import { ARTIFACT_KIND_LABEL, ARTIFACT_STATUS_LABEL, ARTIFACT_STATUS_TONE } from '@/lib/labels';
import { ArtifactViewer } from './ArtifactViewer';

const KIND_ICON: Record<ArtifactKind, React.ComponentType<{ className?: string }>> = {
  OPENAPI: FileCode2,
  PLAN: FileText,
  TEST_SCENARIO: TestTube2,
  DECISION_LOG: ScrollText,
  ACCEPTANCE_CRITERIA: ListChecks,
  PULL_REQUEST: GitPullRequest,
};

export function ArtifactCard({ artifact, showFeature = false }: { artifact: Artifact; showFeature?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const data = useTownStore((s) => s.data);
  const feature = data.features.find((f) => f.id === artifact.featureId);
  const Icon = KIND_ICON[artifact.kind];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-start gap-2.5 rounded-lg bg-[var(--at-surface-2)] p-3 text-left ring-1 ring-[var(--at-border)] transition-colors hover:bg-[var(--at-surface-3)]"
      >
        <Icon className="mt-0.5 size-4 shrink-0 text-[var(--at-text-muted)]" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium">{artifact.name}</span>
          <span className="text-meta block truncate">
            {ARTIFACT_KIND_LABEL[artifact.kind]} · {displayName(data, artifact.createdByAgentId)} · v
            {artifact.version}
            {showFeature && feature ? ` · ${feature.key}` : ''}
          </span>
        </span>
        <Badge tone={ARTIFACT_STATUS_TONE[artifact.status]} className="shrink-0">
          {ARTIFACT_STATUS_LABEL[artifact.status]}
        </Badge>
      </button>
      <ArtifactViewer artifact={artifact} open={open} onOpenChange={setOpen} />
    </>
  );
}

export { KIND_ICON };
