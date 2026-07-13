import { generateStructured, type StructuredResult } from '@/lib/ai';
import { generateId, run, transaction } from '@/lib/db';
import {
  buildGoalUnderstandingUserMessage,
  GOAL_UNDERSTANDING_SYSTEM_PROMPT,
} from '@/lib/prompts/goal-understanding';
import {
  GoalUnderstandingSchema,
  type GoalUnderstanding,
  validateGoalUnderstanding,
} from '@/lib/schemas/goal-understanding';

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export function createUnderstandHandler(
  generate: (
    rawGoal: string,
  ) => Promise<StructuredResult<GoalUnderstanding>> = (rawGoal) =>
    generateStructured(
      'goal-understanding',
      'v1',
      GOAL_UNDERSTANDING_SYSTEM_PROMPT,
      buildGoalUnderstandingUserMessage(rawGoal),
      GoalUnderstandingSchema,
    ),
) {
  return async function handle(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as { rawGoal?: unknown };
      const rawGoal = typeof body.rawGoal === 'string' ? body.rawGoal.trim() : '';

      if (!rawGoal) {
        return json(
          { code: 'INVALID_INPUT', userMessage: '请输入你的目标', retryable: false },
          400,
        );
      }

      const { result, error, attempts } = await generate(rawGoal);
      if (!result) {
        console.error('[AI] goal-understanding failed', {
          attempts,
          error: error?.slice(0, 200),
        });
        return json(
          {
            code: 'AI_FAILED',
            userMessage: 'AI 理解失败，请点击重试',
            retryable: true,
            attempts,
          },
          422,
        );
      }

      const validation = validateGoalUnderstanding(result);
      const goalId = generateId();
      const understandingId = generateId();

      await transaction(async () => {
        await run('INSERT INTO goal (id, raw_input, status) VALUES (?, ?, ?)', goalId, rawGoal, 'draft');
        await run(
          `INSERT INTO goal_understanding (id, goal_id, extracted_json, assumptions_json, missing_info_json, confidence, prompt_version) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          understandingId, goalId, JSON.stringify(result), JSON.stringify(result.assumptions), JSON.stringify(result.missing_information), result.confidence, 'v1',
        );
      });

      const followUpQuestions = result.missing_information.filter(
        (item) => item.priority === 'critical',
      );

      return json({
        goalId,
        understanding: result,
        requiresFollowUp: followUpQuestions.length > 0,
        followUpQuestions,
        validationWarnings: validation.errors.length ? validation.errors : undefined,
      });
    } catch (error) {
      console.error('[API] /api/ai/understand error', error);
      return json(
        { code: 'INTERNAL_ERROR', userMessage: '服务器错误，请重试', retryable: true },
        500,
      );
    }
  };
}

export const POST = createUnderstandHandler();
