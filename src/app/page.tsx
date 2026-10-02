import { PageContainer, PageIntro } from '@/components/shell/PageContainer';
import { SummaryCards } from '@/components/overview/SummaryCards';
import { CurrentFeatureCard } from '@/components/overview/CurrentFeatureCard';
import { RecentActivityCard } from '@/components/overview/RecentActivityCard';
import { PendingDecisionsCard } from '@/components/overview/PendingDecisionsCard';
import { TeamStatusCard } from '@/components/overview/TeamStatusCard';
import { BlockerCard } from '@/components/overview/BlockerCard';
import { RecentArtifactsCard } from '@/components/overview/RecentArtifactsCard';
import { CreateFeatureDialog } from '@/components/features/CreateFeatureDialog';

export default function OverviewPage() {
  return (
    <PageContainer>
      <PageIntro
        title="Overview"
        description="팀 Agent들이 지금 무엇을 하고 있는지, 무엇이 막혀 있는지, 그리고 사람의 결정을 기다리는 것이 무엇인지 한 화면에서 확인합니다."
        action={<CreateFeatureDialog />}
      />

      <SummaryCards />

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <CurrentFeatureCard />
          <PendingDecisionsCard />
          <RecentArtifactsCard />
        </div>
        <div className="space-y-4">
          <RecentActivityCard />
          <TeamStatusCard />
          <BlockerCard />
        </div>
      </div>
    </PageContainer>
  );
}
