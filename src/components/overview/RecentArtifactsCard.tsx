'use client';

import Link from 'next/link';
import { ArrowRight, FileCode2 } from 'lucide-react';
import { useTownStore } from '@/store/town-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { ArtifactCard } from '@/components/artifacts/ArtifactCard';

export function RecentArtifactsCard() {
  const artifacts = useTownStore((s) => s.data.artifacts);
  const recent = [...artifacts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 생성된 artifact</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/artifacts">
            전체 보기 <ArrowRight aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <EmptyState
            icon={<FileCode2 />}
            title="생성된 artifact가 없습니다"
            description="Agent가 contract, 계획, 테스트 시나리오를 만들면 여기에 모입니다."
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {recent.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
