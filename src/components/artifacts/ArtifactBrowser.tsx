'use client';

import * as React from 'react';
import { useTownStore } from '@/store/town-store';
import { ArtifactGrid } from './ArtifactGrid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ARTIFACT_STATUS_LABEL } from '@/lib/labels';
import { ARTIFACT_STATUSES, type ArtifactStatus } from '@/types/domain';

export function ArtifactBrowser() {
  const data = useTownStore((s) => s.data);
  const [featureId, setFeatureId] = React.useState('all');
  const [status, setStatus] = React.useState<ArtifactStatus | 'all'>('all');

  const artifacts = data.artifacts.filter(
    (a) => (featureId === 'all' || a.featureId === featureId) && (status === 'all' || a.status === status),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="artifact-feature" className="text-meta">
            Feature
          </label>
          <Select value={featureId} onValueChange={setFeatureId}>
            <SelectTrigger id="artifact-feature" className="h-8 w-56 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {data.features.map((feature) => (
                <SelectItem key={feature.id} value={feature.id}>
                  {feature.key} · {feature.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="artifact-status" className="text-meta">
            상태
          </label>
          <Select value={status} onValueChange={(v) => setStatus(v as ArtifactStatus | 'all')}>
            <SelectTrigger id="artifact-status" className="h-8 w-40 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {ARTIFACT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {ARTIFACT_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ArtifactGrid
        artifacts={artifacts}
        showFeature
        emptyDescription="선택한 조건에 해당하는 산출물이 없습니다. 필터를 전체로 바꿔 보세요."
      />
    </div>
  );
}
