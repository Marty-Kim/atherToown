'use client';

import { useEffect } from 'react';
import { useTownStore } from '@/store/town-store';

/**
 * 시뮬레이션 타이머. store 에는 타이머를 두지 않고 이 컴포넌트가 소유한다.
 * (새로고침 시 타이머가 사라지므로 store 는 RUNNING → PAUSED 로 복원한다)
 */
export function SimulationDriver() {
  const status = useTownStore((s) => s.data.simulation.status);
  const speedMs = useTownStore((s) => s.data.simulation.speedMs);
  const featureId = useTownStore((s) => s.data.simulation.featureId);
  const ensureScript = useTownStore((s) => s.ensureScript);
  const step = useTownStore((s) => s.stepSimulation);

  useEffect(() => {
    void ensureScript(featureId);
  }, [featureId, ensureScript]);

  useEffect(() => {
    if (status !== 'RUNNING') return;
    const id = window.setInterval(() => step(), speedMs);
    return () => window.clearInterval(id);
  }, [status, speedMs, step]);

  return null;
}
