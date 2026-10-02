'use client';

import { FileCode2 } from 'lucide-react';
import type { Artifact } from '@/types/domain';
import { ArtifactCard } from './ArtifactCard';
import { EmptyState } from '@/components/ui/states';

export function ArtifactGrid({
  artifacts,
  showFeature = false,
  emptyDescription = 'Agent가 contract, 구현 계획, 테스트 시나리오를 만들면 여기에 모입니다.',
}: {
  artifacts: readonly Artifact[];
  showFeature?: boolean;
  emptyDescription?: string;
}) {
  if (artifacts.length === 0) {
    return (
      <EmptyState
        icon={<FileCode2 />}
        title="아직 생성된 artifact가 없습니다"
        description={emptyDescription}
      />
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {artifacts.map((artifact) => (
        <ArtifactCard key={artifact.id} artifact={artifact} showFeature={showFeature} />
      ))}
    </div>
  );
}
