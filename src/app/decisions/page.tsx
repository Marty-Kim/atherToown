import { PageContainer, PageIntro } from '@/components/shell/PageContainer';
import { DecisionList } from '@/components/decisions/DecisionList';

export default function DecisionsPage() {
  return (
    <PageContainer>
      <PageIntro
        title="Decisions"
        description="Agent가 스스로 판단하지 않고 사람에게 넘긴 결정들입니다. 승인하면 관련 단계와 산출물이 즉시 갱신됩니다."
      />
      <DecisionList />
    </PageContainer>
  );
}
