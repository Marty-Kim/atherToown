'use client';

import { useEffect } from 'react';
import { useTownStore } from '@/store/town-store';
import { openHubStream } from '@/services/hub-client';
import { toast } from '@/components/ui/toast';

/**
 * live 모드일 때만 허브 이벤트를 구독한다.
 * 받은 스텝은 mock 시뮬레이션과 똑같이 applyStep 을 통과한다.
 */
export function LiveDriver() {
  const mode = useTownStore((s) => s.mode);
  const applySnapshot = useTownStore((s) => s.applyHubSnapshot);
  const applyStep = useTownStore((s) => s.applyHubStep);
  const setRunners = useTownStore((s) => s.setHubRunners);
  const setPending = useTownStore((s) => s.setHubPending);
  const setStatus = useTownStore((s) => s.setHubStatus);

  useEffect(() => {
    if (mode !== 'live') return;

    return openHubStream({
      onStatus: setStatus,
      onEvent: (event) => {
        switch (event.t) {
          case 'snapshot':
            applySnapshot(event);
            break;
          case 'step':
            applyStep(event.seq, event.step);
            break;
          case 'runners':
            setRunners(event.runners);
            break;
          case 'pending':
            setPending(event.pending);
            break;
          case 'log':
            if (event.level === 'error') {
              toast({ tone: 'error', title: '러너 오류', description: event.message });
            }
            break;
        }
      },
    });
  }, [mode, applySnapshot, applyStep, setRunners, setPending, setStatus]);

  return null;
}
