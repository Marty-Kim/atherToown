'use client';

import * as React from 'react';
import Link from 'next/link';
import { Check, Gavel, MessageSquarePlus, ShieldAlert, X } from 'lucide-react';
import type { Decision } from '@/types/domain';
import { useTownStore } from '@/store/town-store';
import { displayName } from '@/store/selectors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { DECISION_STATUS_LABEL, DECISION_STATUS_TONE } from '@/lib/labels';
import { formatClock } from '@/lib/utils';
import { OPTION_DISCUSS } from '@/mock';
import { sendControl } from '@/services/hub-client';

/**
 * DECISION_REQUEST 는 일반 메시지와 시각적으로 구분되는 강조 카드로 표시한다.
 */
export function DecisionCard({
  decision,
  showFeatureLink = false,
}: {
  decision: Decision;
  showFeatureLink?: boolean;
}) {
  const data = useTownStore((s) => s.data);
  const mode = useTownStore((s) => s.mode);
  const approveDecision = useTownStore((s) => s.approveDecision);
  const rejectDecision = useTownStore((s) => s.rejectDecision);
  const pendingRequestIdFor = useTownStore((s) => s.pendingRequestIdFor);

  const [note, setNote] = React.useState('');
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [confirmReject, setConfirmReject] = React.useState(false);

  const feature = data.features.find((f) => f.id === decision.featureId);
  const resolved = decision.status === 'APPROVED' || decision.status === 'REJECTED';
  const chosen = decision.options.find((o) => o.id === decision.chosenOptionId);

  const trimmedNote = (): string | null => (note.trim() === '' ? null : note.trim());

  function clearDraft() {
    setNote('');
    setNoteOpen(false);
  }

  /**
   * live 모드에서는 결정을 로컬에서 바꾸지 않는다.
   * 허브로 보내고, 결과는 러너가 만든 스텝으로 되돌아온다 — 쓰기 경로가 하나로 유지된다.
   */
  async function handleChoose(optionId: string) {
    const requestId = mode === 'live' ? pendingRequestIdFor(decision.id) : null;
    if (requestId) {
      const isDiscuss = optionId === OPTION_DISCUSS;
      const result = await sendControl({
        t: 'decision',
        requestId,
        status: isDiscuss ? 'NEEDS_DISCUSSION' : 'APPROVED',
        chosenOptionId: isDiscuss ? null : optionId,
        note: trimmedNote(),
      });
      clearDraft();
      toast(
        result.ok
          ? {
              tone: 'success',
              title: '결정을 전달했습니다',
              description: 'Agent 가 이 결정을 반영해 작업을 이어갑니다.',
            }
          : { tone: 'error', title: '전달하지 못했습니다', description: result.error ?? '' },
      );
      return;
    }

    const outcome = approveDecision(decision.id, optionId, trimmedNote());
    clearDraft();
    toast({
      tone: optionId === OPTION_DISCUSS ? 'info' : 'success',
      title: outcome.headline,
      description: outcome.detail,
    });
  }

  async function handleReject() {
    const requestId = mode === 'live' ? pendingRequestIdFor(decision.id) : null;
    if (requestId) {
      const result = await sendControl({
        t: 'decision',
        requestId,
        status: 'REJECTED',
        chosenOptionId: null,
        note: trimmedNote(),
      });
      clearDraft();
      toast(
        result.ok
          ? {
              tone: 'error',
              title: '제안을 거절했습니다',
              description: 'Agent 에게 거절 사유가 전달됩니다.',
            }
          : { tone: 'error', title: '전달하지 못했습니다', description: result.error ?? '' },
      );
      return;
    }

    const outcome = rejectDecision(decision.id, trimmedNote());
    clearDraft();
    toast({ tone: 'error', title: outcome.headline, description: outcome.detail });
  }

  return (
    <article
      aria-labelledby={`decision-${decision.id}`}
      className="overflow-hidden rounded-lg border border-amber-400/30 bg-amber-500/[0.045]"
    >
      <header className="flex flex-wrap items-start gap-2 border-b border-amber-400/20 bg-amber-500/[0.06] px-3.5 py-2.5">
        <Gavel className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 id={`decision-${decision.id}`} className="text-[13.5px] font-semibold">
            {decision.title}
          </h3>
          <p className="text-meta mt-0.5">
            {displayName(data, decision.requestedByAgentId)} 요청 · {formatClock(decision.requestedAt)}
            {showFeatureLink && feature ? (
              <>
                {' · '}
                <Link href={`/features/${feature.id}`} className="underline underline-offset-2 hover:text-[var(--at-text)]">
                  {feature.key}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <Badge tone={DECISION_STATUS_TONE[decision.status]}>
          {DECISION_STATUS_LABEL[decision.status]}
        </Badge>
      </header>

      <div className="space-y-3 px-3.5 py-3">
        <div>
          <p className="text-[13px] font-medium">{decision.question}</p>
          <p className="text-meta mt-1 leading-relaxed">{decision.context}</p>
        </div>

        <ul className="space-y-2">
          {decision.options.map((option) => {
            const isChosen = decision.chosenOptionId === option.id;
            return (
              <li
                key={option.id}
                className={`rounded-md p-2.5 ring-1 ${
                  isChosen
                    ? 'bg-emerald-500/10 ring-emerald-400/40'
                    : 'bg-[var(--at-surface-2)] ring-[var(--at-border)]'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12.5px] font-medium">{option.label}</span>
                  {option.proposedByAgentId && (
                    <span className="text-[11px] text-[var(--at-text-dim)]">
                      {displayName(data, option.proposedByAgentId)} 제안
                    </span>
                  )}
                  {isChosen && (
                    <Badge tone="success" icon={<Check />}>
                      채택됨
                    </Badge>
                  )}
                </div>
                <p className="text-meta mt-1">{option.summary}</p>
                {option.tradeoffs.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {option.tradeoffs.map((t) => (
                      <li key={t} className="text-[11.5px] text-[var(--at-text-dim)]">
                        · {t}
                      </li>
                    ))}
                  </ul>
                )}
                {!resolved && (
                  <Button
                    variant={option.id === OPTION_DISCUSS ? 'outline' : 'primary'}
                    size="sm"
                    className="mt-2"
                    onClick={() => void handleChoose(option.id)}
                  >
                    {option.id === OPTION_DISCUSS ? <MessageSquarePlus aria-hidden /> : <Check aria-hidden />}
                    {option.label}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>

        {!resolved && (
          <div className="space-y-2">
            {noteOpen ? (
              <div>
                <label htmlFor={`note-${decision.id}`} className="text-meta mb-1 block">
                  결정 메모 (Decision Log에 함께 기록됩니다)
                </label>
                <Textarea
                  id={`note-${decision.id}`}
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="예: 다른 POST API에도 같은 규칙을 적용할 예정이라 header 방식으로 통일합니다."
                />
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setNoteOpen(true)}>
                <MessageSquarePlus aria-hidden />
                메모 추가
              </Button>
            )}

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmReject(true)}>
                <X aria-hidden />
                모두 거절
              </Button>
            </div>
          </div>
        )}

        {resolved && (
          <div className="rounded-md bg-[var(--at-surface-2)] px-2.5 py-2 ring-1 ring-[var(--at-border)]">
            <p className="text-[12px]">
              {decision.status === 'APPROVED' ? (
                <>
                  <Check className="mr-1 inline size-3.5 text-emerald-300" aria-hidden />
                  {chosen?.label ?? '옵션'} 승인됨 · {decision.resolvedAt ? formatClock(decision.resolvedAt) : ''}
                </>
              ) : (
                <>
                  <ShieldAlert className="mr-1 inline size-3.5 text-rose-300" aria-hidden />
                  거절됨 · {decision.resolvedAt ? formatClock(decision.resolvedAt) : ''}
                </>
              )}
            </p>
            {decision.note && <p className="text-meta mt-1">메모: {decision.note}</p>}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmReject}
        onOpenChange={setConfirmReject}
        title="제안을 모두 거절하시겠습니까?"
        description="관련 단계가 차단되고 참여 Agent가 Blocked Zone으로 이동합니다. Reset으로 처음부터 다시 진행할 수 있습니다."
        confirmLabel="거절하고 작업 중단"
        destructive
        onConfirm={() => void handleReject()}
      />
    </article>
  );
}
