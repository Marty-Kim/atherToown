import { randomUUID } from 'node:crypto';
import {
  createSdkMcpServer,
  query,
  tool,
  type CanUseTool,
  type Options,
  type PermissionMode,
  type Query,
  type SDKMessage,
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type {
  AgentStatus,
  ArtifactKind,
  Decision,
  DecisionOption,
  SimulationStep,
  StageKind,
  StageStatus,
} from '../../src/types/domain';
import {
  artifactSteps,
  blockerStep,
  messageSteps,
  stageStep,
  statusStep,
  type AgentBackend,
  type BackendResult,
  type RunContext,
} from './backend';
import { isInsideAllowedRepo, type RunnerConfig } from './config';

/* ------------------------------------------------------------------ *
 * 권한 정책
 * ------------------------------------------------------------------ */

const READ_ONLY_TOOLS = new Set([
  'Read',
  'Glob',
  'Grep',
  'NotebookRead',
  'TodoWrite',
  'Task',
  'BashOutput',
]);

const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

/** 자동 승인 대상에서 영구 제외. 사람이 반드시 본다. */
const ALWAYS_ASK = [
  /\bgit\s+push\b/,
  /\bgit\s+merge\b/,
  /\bgh\s+pr\s+(create|merge)\b/,
  /\bnpm\s+publish\b/,
  /\brm\s+-[a-z]*r/,
  /\bsudo\b/,
  /\bcurl\b/,
  /\bwget\b/,
];

/** 읽기에 가까운 셸 명령. autonomy 3 이상에서 자동 통과. */
const SAFE_BASH = [
  /^\s*(ls|cat|head|tail|wc|find|pwd|which|echo)\b/,
  /^\s*git\s+(status|diff|log|show|branch|rev-parse)\b/,
  /^\s*(npm|pnpm|yarn)\s+(test|run\s+(test|lint|typecheck|build))\b/,
  /^\s*(\.\/)?gradlew\s+(test|lint|assembleDebug)\b/,
  /^\s*(swift|xcodebuild)\s+test\b/,
];

function permissionModeFor(autonomy: number): PermissionMode {
  if (autonomy <= 1) return 'plan';
  if (autonomy === 2) return 'default';
  return 'acceptEdits';
}

function pathsIn(input: Record<string, unknown>): string[] {
  const keys = ['file_path', 'path', 'notebook_path'];
  return keys
    .map((k) => input[k])
    .filter((v): v is string => typeof v === 'string' && v.length > 0);
}

function preview(input: Record<string, unknown>): string {
  const text = JSON.stringify(input);
  return text.length > 400 ? `${text.slice(0, 400)}…` : text;
}

/* ------------------------------------------------------------------ *
 * 상태 추론 — SDK 메시지에서 Agent 상태를 읽어낸다
 * ------------------------------------------------------------------ */

interface ToolUseBlock {
  type: 'tool_use';
  name: string;
  input: Record<string, unknown>;
}

function toolUsesOf(message: SDKMessage): ToolUseBlock[] {
  if (message.type !== 'assistant') return [];
  const content = (message as { message?: { content?: unknown } }).message?.content;
  if (!Array.isArray(content)) return [];
  return content.filter((block): block is ToolUseBlock => {
    if (typeof block !== 'object' || block === null) return false;
    const candidate = block as { type?: unknown; name?: unknown };
    return candidate.type === 'tool_use' && typeof candidate.name === 'string';
  });
}

function statusForTool(toolName: string): { status: AgentStatus; label: string } | null {
  if (WRITE_TOOLS.has(toolName)) return { status: 'CODING', label: '코드 수정 중' };
  if (toolName === 'Bash') return { status: 'TESTING', label: '명령 실행 중' };
  if (READ_ONLY_TOOLS.has(toolName)) return { status: 'THINKING', label: '코드 탐색 중' };
  return null;
}

/* ------------------------------------------------------------------ *
 * Town 도구 — Agent 가 구조화된 메시지를 "호출"로 내보낸다
 * ------------------------------------------------------------------ */

const MESSAGE_TYPE = z.enum([
  'QUESTION',
  'ANSWER',
  'PROPOSAL',
  'COUNTER_PROPOSAL',
  'BLOCKED',
  'COMPLETED',
]);

const ARTIFACT_KIND = z.enum([
  'OPENAPI',
  'PLAN',
  'TEST_SCENARIO',
  'DECISION_LOG',
  'ACCEPTANCE_CRITERIA',
  'PULL_REQUEST',
]);

const STAGE_KIND = z.enum([
  'REQUIREMENT_ANALYSIS',
  'API_CONTRACT',
  'HUMAN_APPROVAL',
  'APP_IMPLEMENTATION',
  'BE_IMPLEMENTATION',
  'CONTRACT_TEST',
  'INTEGRATION_REVIEW',
]);

const AGENT_STATUS = z.enum([
  'IDLE',
  'THINKING',
  'DISCUSSING',
  'CODING',
  'TESTING',
  'BLOCKED',
  'COMPLETED',
]);

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function createTownServer(ctx: RunContext) {
  const { agentId } = ctx.identity;
  const featureId = ctx.task.featureId;

  return createSdkMcpServer({
    name: 'agent-town',
    version: '0.1.0',
    instructions:
      '너는 Agent Town 이라는 공유 워크스페이스에서 다른 팀 Agent 들과 협업한다. ' +
      '사람과 다른 Agent 에게 보이는 모든 발언·산출물·상태 변화는 반드시 이 도구들로 남겨야 한다. ' +
      '평범한 텍스트 응답은 타운에 표시되지 않는다.',
    tools: [
      tool(
        'town_post_message',
        '팀에게 구조화된 메시지를 보낸다. 질문·답변·제안·역제안·차단·완료를 알릴 때 쓴다.',
        {
          type: MESSAGE_TYPE,
          to: z.string().describe('받는 Agent id, 또는 전체에게 보내려면 "all"'),
          body: z.string().min(1).describe('메시지 본문. 한국어로 쓴다.'),
          blocking: z.boolean().describe('상대가 답하기 전까지 진행할 수 없으면 true'),
          optionLabel: z.string().optional().describe('제안/역제안일 때 한 줄 요약 라벨'),
          topic: z.string().optional().describe('질문일 때 주제'),
          reason: z.string().optional().describe('차단일 때 사유'),
          stage: STAGE_KIND.optional().describe('완료일 때 어떤 단계를 마쳤는지'),
        },
        async (args) => {
          await ctx.emit(
            messageSteps({
              agentId,
              featureId,
              type: args.type,
              to: args.to,
              body: args.body,
              blocking: args.blocking,
              artifactId: null,
              optionLabel: args.optionLabel,
              topic: args.topic,
              reason: args.reason,
              stage: (args.stage as StageKind | undefined) ?? null,
            }),
          );
          if (args.type === 'BLOCKED') {
            await ctx.emit([
              blockerStep(agentId, featureId, args.reason ?? args.body),
              statusStep(agentId, 'BLOCKED', args.reason ?? '차단됨', 'room_blocked'),
            ]);
          }
          return ok('타운에 메시지를 게시했습니다.');
        },
      ),

      tool(
        'town_create_artifact',
        'contract·구현 계획·테스트 시나리오 같은 산출물을 타운에 등록한다. 팀 전체가 같은 문서를 참조하게 된다.',
        {
          name: z.string().min(1).describe('파일명 또는 문서 제목'),
          kind: ARTIFACT_KIND,
          language: z.enum(['yaml', 'markdown', 'json', 'text']),
          content: z.string().min(1).describe('문서 전문'),
          announce: z.string().optional().describe('함께 남길 한 줄 설명'),
        },
        async (args) => {
          const { steps, artifactId } = artifactSteps({
            agentId,
            featureId,
            name: args.name,
            kind: args.kind as ArtifactKind,
            language: args.language,
            content: args.content,
          });
          await ctx.emit(steps);
          await ctx.emit(
            messageSteps({
              agentId,
              featureId,
              type: 'ARTIFACT_CREATED',
              to: 'all',
              body: args.announce ?? `${args.name} 을(를) 등록했습니다.`,
              blocking: false,
              artifactId,
            }),
          );
          return ok(`산출물을 등록했습니다. id=${artifactId}`);
        },
      ),

      tool(
        'town_request_decision',
        '팀 Agent 끼리 합의할 수 없어 사람의 판단이 필요할 때 호출한다. 사람이 고를 때까지 여기서 멈춘다.',
        {
          title: z.string().min(1),
          question: z.string().min(1),
          context: z.string().min(1).describe('왜 사람이 결정해야 하는지'),
          options: z
            .array(
              z.object({
                label: z.string(),
                summary: z.string(),
                tradeoffs: z.array(z.string()).default([]),
              }),
            )
            .min(2)
            .describe('선택지 2개 이상'),
          blocksStage: STAGE_KIND.optional(),
        },
        async (args) => {
          const decisionId = `dec_${randomUUID()}`;
          const options: DecisionOption[] = args.options.map((option, index) => ({
            id: `opt_${index + 1}`,
            label: option.label,
            summary: option.summary,
            proposedByAgentId: agentId,
            tradeoffs: option.tradeoffs,
          }));

          const decision: Decision = {
            id: decisionId,
            featureId,
            title: args.title,
            question: args.question,
            context: args.context,
            options,
            status: 'OPEN',
            requestedByAgentId: agentId,
            requestedAt: new Date().toISOString(),
            resolvedAt: null,
            chosenOptionId: null,
            note: null,
            blocksStage: (args.blocksStage as StageKind | undefined) ?? null,
          };

          await ctx.emit([
            statusStep(agentId, 'WAITING_FOR_APPROVAL', '사람의 결정을 기다리는 중'),
          ]);

          const outcome = await ctx.requestDecision(decision);
          const chosen = options.find((o) => o.id === outcome.chosenOptionId);

          await ctx.emit([statusStep(agentId, 'THINKING', '결정 반영 중')]);

          if (outcome.status === 'REJECTED') {
            return ok(
              `사람이 제안을 모두 거절했습니다. 사유: ${outcome.note ?? '(없음)'}. 새로운 방안을 제시하세요.`,
            );
          }
          if (outcome.status === 'NEEDS_DISCUSSION') {
            return ok(
              `사람이 추가 논의를 요청했습니다. 메모: ${outcome.note ?? '(없음)'}. 비교 근거를 더 정리하세요.`,
            );
          }
          return ok(
            `결정: ${chosen?.label ?? outcome.chosenOptionId}. 메모: ${outcome.note ?? '(없음)'}. 이 결정에 따라 진행하세요.`,
          );
        },
      ),

      tool(
        'town_set_status',
        '지금 무엇을 하고 있는지 타운에 알린다. 가상 오피스의 Agent 상태와 위치가 이 값으로 바뀐다.',
        {
          status: AGENT_STATUS,
          currentTask: z.string().describe('한 줄 요약. 예: "재시도 멱등 저장소 구현 중"'),
        },
        async (args) => {
          await ctx.emit([statusStep(agentId, args.status, args.currentTask)]);
          return ok('상태를 갱신했습니다.');
        },
      ),

      tool(
        'town_set_stage',
        'Feature 의 진행 단계를 갱신한다. 단계를 마쳤거나 착수했을 때 호출한다.',
        { stage: STAGE_KIND, status: z.enum(['IN_PROGRESS', 'WAITING', 'BLOCKED', 'COMPLETED']) },
        async (args) => {
          await ctx.emit([stageStep(args.stage as StageKind, args.status as StageStatus)]);
          return ok('단계를 갱신했습니다.');
        },
      ),
    ],
  });
}

/* ------------------------------------------------------------------ *
 * 백엔드
 * ------------------------------------------------------------------ */

function systemPromptFor(ctx: RunContext, config: RunnerConfig): string {
  return [
    `너는 "${ctx.identity.agentName}", Agent Town 의 ${ctx.identity.role} 팀 Agent 다.`,
    `작업 디렉터리는 ${ctx.repo.name} 이고, 이 저장소 밖의 파일은 읽지도 쓰지도 못한다.`,
    '',
    '타운 규칙:',
    '1. 작업을 시작할 때와 하는 일이 바뀔 때마다 town_set_status 를 호출한다.',
    '2. 다른 팀에게 할 말은 반드시 town_post_message 로 보낸다. 일반 텍스트 응답은 아무에게도 보이지 않는다.',
    '3. contract·계획·테스트 시나리오는 town_create_artifact 로 등록한다. 팀이 같은 문서를 참조해야 한다.',
    '4. 다른 Agent 와 합의할 수 없는 트레이드오프는 혼자 정하지 말고 town_request_decision 으로 사람에게 넘긴다.',
    '5. 단계를 마치면 town_set_stage 로 표시한다.',
    '',
    `자율성 레벨 ${ctx.task.autonomy}. ${autonomyNote(ctx.task.autonomy)}`,
    `파일 쓰기와 셸 실행은 사람의 승인이 필요할 수 있다. 거절되면 이유를 town_post_message 로 공유하고 다른 방법을 찾는다.`,
    '',
    '한국어로 쓴다. 코드 식별자는 영어를 유지한다.',
    config.model ? `` : ``,
  ]
    .filter(Boolean)
    .join('\n');
}

function autonomyNote(autonomy: number): string {
  switch (autonomy) {
    case 1:
      return '분석과 질문만 한다. 파일을 수정하지 않는다.';
    case 2:
      return '문서와 코드 초안까지 만든다. 모든 쓰기는 승인을 받는다.';
    case 3:
      return '허용된 저장소 안에서 코드를 수정할 수 있다. push·merge 는 승인을 받는다.';
    default:
      return '승인 후 merge 까지 진행할 수 있다.';
  }
}

export class ClaudeBackend implements AgentBackend {
  private active: Query | null = null;

  constructor(private readonly config: RunnerConfig) {}

  async interrupt(): Promise<void> {
    await this.active?.interrupt().catch(() => undefined);
  }

  async run(ctx: RunContext): Promise<BackendResult> {
    const canUseTool: CanUseTool = async (toolName, input, options) => {
      /* 타운 도구와 읽기 전용 도구는 그대로 통과. */
      if (toolName.startsWith('mcp__agent-town__')) return { behavior: 'allow' };
      if (READ_ONLY_TOOLS.has(toolName)) return { behavior: 'allow' };

      const record = input as Record<string, unknown>;

      /* 허용된 저장소 밖의 경로는 사람이 승인해도 열어주지 않는다. */
      for (const path of pathsIn(record)) {
        if (!isInsideAllowedRepo(this.config, path)) {
          return {
            behavior: 'deny',
            message: `${path} 는 이 러너에 허용된 저장소 밖입니다. 설정의 repositories 목록만 접근할 수 있습니다.`,
          };
        }
      }

      const command = typeof record.command === 'string' ? record.command : '';
      const mustAsk = toolName === 'Bash' && ALWAYS_ASK.some((re) => re.test(command));
      const autoOk =
        !mustAsk &&
        ctx.task.autonomy >= 3 &&
        (WRITE_TOOLS.has(toolName) ||
          (toolName === 'Bash' && SAFE_BASH.some((re) => re.test(command))));

      if (autoOk) return { behavior: 'allow' };

      await ctx.emit([statusStep(ctx.identity.agentId, 'WAITING_FOR_APPROVAL', '사람의 승인 대기 중')]);
      const allowed = await ctx.requestToolApproval({
        toolName,
        title: options.title ?? `${toolName} 실행을 요청합니다`,
        inputPreview: preview(record),
      });
      await ctx.emit([statusStep(ctx.identity.agentId, 'CODING', '승인 결과 반영 중')]);

      return allowed
        ? { behavior: 'allow' }
        : { behavior: 'deny', message: '사람이 이 작업을 거절했습니다.' };
    };

    const options: Options = {
      cwd: ctx.repo.path,
      additionalDirectories: [],
      systemPrompt: systemPromptFor(ctx, this.config),
      mcpServers: { 'agent-town': createTownServer(ctx) },
      disallowedTools: this.config.disallowedTools,
      permissionMode: permissionModeFor(ctx.task.autonomy),
      canUseTool,
      maxTurns: this.config.limits.maxTurns,
      maxBudgetUsd: ctx.task.maxBudgetUsd ?? this.config.limits.maxBudgetUsd,
      ...(this.config.model ? { model: this.config.model } : {}),
      ...(ctx.task.resumeSessionId ? { resume: ctx.task.resumeSessionId } : {}),
    };

    const q = query({ prompt: ctx.task.prompt, options });
    this.active = q;

    let sessionId: string | null = ctx.task.resumeSessionId;
    let costUsd = 0;
    let lastStatus: AgentStatus | null = null;

    try {
      await ctx.emit([statusStep(ctx.identity.agentId, 'THINKING', '작업을 파악하는 중')]);

      for await (const message of q) {
        const steps: SimulationStep[] = [];

        for (const use of toolUsesOf(message)) {
          const mapped = statusForTool(use.name);
          if (mapped && mapped.status !== lastStatus) {
            lastStatus = mapped.status;
            steps.push(statusStep(ctx.identity.agentId, mapped.status, mapped.label));
          }
        }

        if (message.type === 'result') {
          sessionId = message.session_id ?? sessionId;
          costUsd = typeof message.total_cost_usd === 'number' ? message.total_cost_usd : 0;
          steps.push(
            statusStep(
              ctx.identity.agentId,
              message.subtype === 'success' ? 'COMPLETED' : 'BLOCKED',
              message.subtype === 'success' ? '작업 완료' : '오류로 중단됨',
            ),
          );
        }

        if (steps.length > 0) await ctx.emit(steps);
      }
    } finally {
      this.active = null;
      q.close();
    }

    return { sessionId, costUsd };
  }
}
