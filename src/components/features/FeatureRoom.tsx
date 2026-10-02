'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bot, Gavel, PanelRight, SearchX } from 'lucide-react';
import { useTownStore } from '@/store/town-store';
import { artifactsOf, decisionsOf } from '@/store/selectors';
import { FeatureStatusBar } from '@/components/workspace/FeatureStatusBar';
import { OfficeMap } from '@/components/workspace/OfficeMap';
import { InspectorPanel } from '@/components/inspector/InspectorPanel';
import { AgentInspector } from '@/components/inspector/AgentInspector';
import { ConversationPanel } from '@/components/conversation/ConversationPanel';
import { ActivityTimeline } from '@/components/timeline/ActivityTimeline';
import { ArtifactGrid } from '@/components/artifacts/ArtifactGrid';
import { DecisionCard } from '@/components/decisions/DecisionCard';
import { FeatureInspector } from '@/components/inspector/FeatureInspector';
import { AgentChip } from '@/components/common/AgentChip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/states';
import { ApprovalQueue, usePendingApprovalCount } from '@/components/live/ApprovalQueue';

type DeskTab = 'conversation' | 'timeline' | 'artifacts' | 'approvals';
type MobileTab = 'status' | 'agents' | 'conversation' | 'decisions' | 'artifacts';

export function FeatureRoom({ featureId }: { featureId: string }) {
  const data = useTownStore((s) => s.data);
  const selection = useTownStore((s) => s.selection);
  const setSelection = useTownStore((s) => s.setSelection);
  const setActiveFeature = useTownStore((s) => s.setActiveFeature);

  const mode = useTownStore((s) => s.mode);
  const approvalCount = usePendingApprovalCount();
  const [deskTab, setDeskTab] = React.useState<DeskTab>('conversation');
  const [mobileTab, setMobileTab] = React.useState<MobileTab>('status');
  const [inspectorOpen, setInspectorOpen] = React.useState(false);

  const feature = data.features.find((f) => f.id === featureId);

  React.useEffect(() => {
    if (feature) setActiveFeature(feature.id);
  }, [feature, setActiveFeature]);

  if (!feature) {
    return (
      <div className="grid h-full place-items-center p-6">
        <EmptyState
          icon={<SearchX />}
          title="Feature를 찾을 수 없습니다"
          description="삭제되었거나 주소가 잘못되었습니다. Features 목록에서 다시 선택해 주세요."
          action={
            <Button variant="primary" size="sm" asChild>
              <Link href="/features">Features로 이동</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const artifacts = artifactsOf(data, feature.id);
  const decisions = decisionsOf(data, feature.id);
  const participants = data.agents.filter((a) => feature.agentIds.includes(a.id));
  const selectedAgent =
    selection.kind === 'agent' ? data.agents.find((a) => a.id === selection.id) : undefined;

  const startChat = (agentId: string) => {
    setDeskTab('conversation');
    setMobileTab('conversation');
    setInspectorOpen(false);
    setSelection({ kind: 'agent', id: agentId });
  };

  return (
    <div id="main-content" className="flex h-full flex-col">
      <FeatureStatusBar feature={feature} />

      {/* ---------- Desktop / Tablet ---------- */}
      <div className="hidden min-h-0 flex-1 md:flex">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-[5] overflow-hidden p-3">
            <OfficeMap className="h-full" />
          </div>

          <div className="flex min-h-[260px] flex-[4] flex-col overflow-hidden border-t border-[var(--at-border)] bg-[var(--at-surface-1)]">
            <Tabs
              value={deskTab}
              onValueChange={(v) => setDeskTab(v as DeskTab)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
                <TabsList>
                  <TabsTrigger value="conversation">Conversation</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="artifacts">Artifacts ({artifacts.length})</TabsTrigger>
                  {mode === 'live' && (
                    <TabsTrigger value="approvals">
                      Approvals
                      {approvalCount > 0 && (
                        <span className="ml-1 rounded-full bg-amber-500/25 px-1.5 text-[10px] font-semibold text-amber-200">
                          {approvalCount}
                        </span>
                      )}
                    </TabsTrigger>
                  )}
                </TabsList>
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setInspectorOpen(true)}
                >
                  <PanelRight aria-hidden />
                  Inspector
                </Button>
              </div>
              <TabsContent value="conversation" className="min-h-0 flex-1 data-[state=inactive]:hidden">
                <ConversationPanel feature={feature} className="h-full" />
              </TabsContent>
              <TabsContent value="timeline" className="min-h-0 flex-1 data-[state=inactive]:hidden">
                <ActivityTimeline featureId={feature.id} className="h-full" />
              </TabsContent>
              <TabsContent value="artifacts" className="min-h-0 flex-1 overflow-y-auto at-scroll-thin p-3 data-[state=inactive]:hidden">
                <ArtifactGrid artifacts={artifacts} />
              </TabsContent>
              <TabsContent value="approvals" className="min-h-0 flex-1 overflow-y-auto at-scroll-thin p-3 data-[state=inactive]:hidden">
                <ApprovalQueue />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <InspectorPanel className="hidden w-[340px] shrink-0 lg:flex" onStartChat={startChat} />
      </div>

      <Dialog open={inspectorOpen} onOpenChange={setInspectorOpen}>
        <DialogContent className="right-0 left-auto top-0 h-dvh max-h-dvh w-[360px] max-w-[90vw] translate-x-0 translate-y-0 rounded-none p-0">
          <DialogTitle className="sr-only">상세 정보</DialogTitle>
          <InspectorPanel className="h-full border-l-0" onStartChat={startChat} />
        </DialogContent>
      </Dialog>

      {/* ---------- Mobile ---------- */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <Tabs
          value={mobileTab}
          onValueChange={(v) => setMobileTab(v as MobileTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="shrink-0 overflow-x-auto at-scroll-thin px-3 py-2">
            <TabsList>
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="agents">Agents</TabsTrigger>
              <TabsTrigger value="conversation">Conversation</TabsTrigger>
              <TabsTrigger value="decisions">Decisions</TabsTrigger>
              <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="status" className="min-h-0 flex-1 overflow-y-auto at-scroll-thin p-3 data-[state=inactive]:hidden">
            <FeatureInspector feature={feature} />
          </TabsContent>

          <TabsContent value="agents" className="min-h-0 flex-1 overflow-y-auto at-scroll-thin p-3 data-[state=inactive]:hidden">
            {participants.length === 0 ? (
              <EmptyState
                icon={<Bot />}
                title="참여 중인 Agent가 없습니다"
                description="Agents 화면에서 Agent를 연결하면 이 Feature에 참여시킬 수 있습니다."
              />
            ) : (
              <div className="space-y-1">
                {participants.map((agent) => (
                  <AgentChip
                    key={agent.id}
                    agent={agent}
                    onClick={() => setSelection({ kind: 'agent', id: agent.id })}
                    className={
                      selection.kind === 'agent' && selection.id === agent.id
                        ? 'bg-[var(--at-surface-2)] ring-1 ring-[var(--at-accent)]'
                        : ''
                    }
                  />
                ))}
                {selectedAgent && (
                  <div className="mt-3 rounded-lg bg-[var(--at-surface-1)] p-3 ring-1 ring-[var(--at-border)]">
                    <AgentInspector agent={selectedAgent} onStartChat={startChat} />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="conversation" className="min-h-0 flex-1 data-[state=inactive]:hidden">
            <ConversationPanel feature={feature} className="h-full" />
          </TabsContent>

          <TabsContent value="decisions" className="min-h-0 flex-1 space-y-3 overflow-y-auto at-scroll-thin p-3 data-[state=inactive]:hidden">
            {mode === 'live' && approvalCount > 0 && <ApprovalQueue />}
            {decisions.length === 0 ? (
              <EmptyState
                icon={<Gavel />}
                title="기록된 결정이 없습니다"
                description="Agent들이 합의하지 못한 사항이 생기면 승인 요청이 여기에 표시됩니다."
              />
            ) : (
              decisions.map((decision) => <DecisionCard key={decision.id} decision={decision} />)
            )}
          </TabsContent>

          <TabsContent value="artifacts" className="min-h-0 flex-1 overflow-y-auto at-scroll-thin p-3 data-[state=inactive]:hidden">
            <ArtifactGrid artifacts={artifacts} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
