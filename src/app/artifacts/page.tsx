import { PageContainer, PageIntro } from '@/components/shell/PageContainer';
import { ArtifactBrowser } from '@/components/artifacts/ArtifactBrowser';

export default function ArtifactsPage() {
  return (
    <PageContainer>
      <PageIntro
        title="Artifacts"
        description="Agent가 만든 contract, 구현 계획, 테스트 시나리오, 결정 기록입니다. 카드를 누르면 내용을 미리 볼 수 있습니다."
      />
      <ArtifactBrowser />
    </PageContainer>
  );
}
