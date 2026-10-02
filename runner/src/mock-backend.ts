import { randomUUID } from 'node:crypto';
import type { Decision, DecisionOption } from '../../src/types/domain';
import {
  artifactSteps,
  messageSteps,
  stageStep,
  statusStep,
  type AgentBackend,
  type BackendResult,
  type RunContext,
} from './backend';

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * 모델을 전혀 호출하지 않는 테스트 러너.
 * 프로토콜·승인 루프·UI 반영을 자격증명 없이 끝까지 확인할 수 있다.
 * `--mock` 으로 실행한다.
 */
export class MockBackend implements AgentBackend {
  private cancelled = false;

  async interrupt(): Promise<void> {
    this.cancelled = true;
  }

  async run(ctx: RunContext): Promise<BackendResult> {
    this.cancelled = false;
    const agentId = ctx.identity.agentId;
    const featureId = ctx.task.featureId;
    const step = (ms: number) => wait(ms);

    await ctx.emit([
      statusStep(agentId, 'THINKING', '요구사항 파악 중'),
      stageStep('API_CONTRACT', 'IN_PROGRESS'),
    ]);
    await step(1200);
    if (this.cancelled) return { sessionId: null, costUsd: 0 };

    await ctx.emit(
      messageSteps({
        agentId,
        featureId,
        type: 'QUESTION',
        to: 'all',
        body: `"${ctx.task.prompt}" 작업을 시작합니다. ${ctx.repo.name} 에서 진행하겠습니다.`,
        blocking: false,
        artifactId: null,
        topic: '작업 착수',
      }),
    );
    await step(1200);

    await ctx.emit([statusStep(agentId, 'CODING', '초안 작성 중')]);
    const { steps, artifactId } = artifactSteps({
      agentId,
      featureId,
      name: 'mock-plan.md',
      kind: 'PLAN',
      language: 'markdown',
      content: `# Mock 구현 계획\n\n- 이 문서는 --mock 러너가 생성했습니다.\n- 대상: ${ctx.repo.name}\n- 지시: ${ctx.task.prompt}\n`,
    });
    await ctx.emit(steps);
    await ctx.emit(
      messageSteps({
        agentId,
        featureId,
        type: 'PROPOSAL',
        to: 'all',
        body: '구현 계획 초안을 올렸습니다. 검토 부탁드립니다.',
        blocking: false,
        artifactId,
        optionLabel: 'mock 계획 초안',
      }),
    );
    await step(1200);
    if (this.cancelled) return { sessionId: null, costUsd: 0 };

    /* 도구 승인 루프를 실제로 한 번 태운다. */
    const allowed = await ctx.requestToolApproval({
      toolName: 'Write',
      title: `${ctx.repo.name} 에 mock-plan.md 를 쓰려고 합니다`,
      inputPreview: '{"file_path":"<repo>/mock-plan.md","content":"# Mock 구현 계획…"}',
    });
    await ctx.emit(
      messageSteps({
        agentId,
        featureId,
        type: allowed ? 'ANSWER' : 'BLOCKED',
        to: 'human',
        body: allowed
          ? '승인 감사합니다. 파일을 기록했습니다. (mock 이라 실제로 쓰지는 않았습니다)'
          : '쓰기가 거절되어 파일 생성을 건너뜁니다.',
        blocking: false,
        artifactId: null,
        reason: allowed ? undefined : '사람이 쓰기를 거절함',
      }),
    );
    await step(900);

    /* 사람의 결정 루프도 한 번 태운다. */
    const options: DecisionOption[] = [
      {
        id: 'opt_1',
        label: 'Header 방식',
        summary: 'Idempotency-Key HTTP header 로 재시도를 식별한다.',
        proposedByAgentId: agentId,
        tradeoffs: ['다른 POST API 에도 재사용 가능', 'BE 미들웨어 추가 필요'],
      },
      {
        id: 'opt_2',
        label: 'Body 방식',
        summary: 'request body 의 retryToken 으로 식별한다.',
        proposedByAgentId: agentId,
        tradeoffs: ['기존 패턴과 동일해 구현이 빠름', '확장성이 낮음'],
      },
    ];
    const decision: Decision = {
      id: `dec_${randomUUID()}`,
      featureId,
      title: '재시도 식별 방식 결정 필요 (mock)',
      question: '멱등 식별자를 header 와 body 중 어디에 둘까요?',
      context: '--mock 러너가 승인 흐름을 확인하려고 만든 결정 요청입니다.',
      options,
      status: 'OPEN',
      requestedByAgentId: agentId,
      requestedAt: new Date().toISOString(),
      resolvedAt: null,
      chosenOptionId: null,
      note: null,
      blocksStage: 'API_CONTRACT',
    };

    await ctx.emit([statusStep(agentId, 'WAITING_FOR_APPROVAL', '사람의 결정을 기다리는 중')]);
    const outcome = await ctx.requestDecision(decision);
    const chosen = options.find((o) => o.id === outcome.chosenOptionId);

    await ctx.emit(
      messageSteps({
        agentId,
        featureId,
        type: outcome.status === 'APPROVED' ? 'COMPLETED' : 'BLOCKED',
        to: 'all',
        body:
          outcome.status === 'APPROVED'
            ? `${chosen?.label ?? '선택한 방식'} 으로 진행하겠습니다.`
            : '결정이 확정되지 않아 대기합니다.',
        blocking: false,
        artifactId: null,
        stage: 'API_CONTRACT',
        reason: outcome.status === 'APPROVED' ? undefined : '결정 미확정',
      }),
    );

    if (outcome.status === 'APPROVED') {
      await ctx.emit([
        stageStep('API_CONTRACT', 'COMPLETED'),
        statusStep(agentId, 'COMPLETED', 'mock 작업 완료'),
      ]);
    } else {
      await ctx.emit([statusStep(agentId, 'IDLE', null)]);
    }

    return { sessionId: `mock_${randomUUID()}`, costUsd: 0 };
  }
}
