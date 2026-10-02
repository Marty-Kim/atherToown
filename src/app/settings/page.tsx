import { PageContainer, PageIntro } from '@/components/shell/PageContainer';
import { SettingsPanel } from '@/components/settings/SettingsPanel';

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageIntro
        title="Settings"
        description="워크스페이스 정보와 시뮬레이션 동작을 확인하고, 저장된 상태를 초기화합니다."
      />
      <SettingsPanel />
    </PageContainer>
  );
}
