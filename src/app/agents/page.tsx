import { Suspense } from 'react';
import { PageContainer, PageIntro } from '@/components/shell/PageContainer';
import { AgentDirectory } from '@/components/agents/AgentDirectory';
import { ConnectAgentDialog } from '@/components/agents/ConnectAgentDialog';
import { LoadingState } from '@/components/ui/states';

export default function AgentsPage() {
  return (
    <PageContainer>
      <PageIntro
        title="Agents"
        description="회사 구성원이 각자 연결한 Agent 목록입니다. 권한 수준에 따라 Agent가 할 수 있는 일이 달라집니다."
        action={<ConnectAgentDialog />}
      />
      <Suspense fallback={<LoadingState label="Agent 목록을 불러오는 중" />}>
        <AgentDirectory />
      </Suspense>
    </PageContainer>
  );
}
