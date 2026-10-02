import { PageContainer, PageIntro } from '@/components/shell/PageContainer';
import { FeatureList } from '@/components/features/FeatureList';
import { CreateFeatureDialog } from '@/components/features/CreateFeatureDialog';

export default function FeaturesPage() {
  return (
    <PageContainer>
      <PageIntro
        title="Features"
        description="등록된 기능과 각 기능의 진행 단계입니다. Feature를 열면 가상 오피스에서 Agent들의 협업 과정을 볼 수 있습니다."
        action={<CreateFeatureDialog />}
      />
      <FeatureList />
    </PageContainer>
  );
}
