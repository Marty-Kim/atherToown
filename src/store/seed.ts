import { buildGenesisData, type TownData } from '@/mock';
import { PAY142_SCRIPT } from '@/mock/script';
import { applySimulationEvent } from './reducer';

/**
 * 첫 진입 화면은 "이미 논의가 진행되어 승인을 기다리는" 상태를 보여준다.
 * genesis 에 스크립트 앞부분(요구사항 분석 ~ Decision Request)을 적용해 만든다.
 * 같은 reducer 를 쓰므로 seed 와 simulation 결과가 어긋날 수 없다.
 */
export const SEED_CURSOR = 6;

export function buildSeedData(): TownData {
  const genesis = buildGenesisData();
  const seeded = PAY142_SCRIPT.slice(0, SEED_CURSOR).reduce(
    (acc, event) => applySimulationEvent(acc, event),
    genesis,
  );
  return {
    ...seeded,
    simulation: { ...seeded.simulation, cursor: SEED_CURSOR, status: 'AWAITING_HUMAN' },
  };
}
