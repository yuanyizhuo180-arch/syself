import { generateStructured, type StructuredResult } from '@/lib/ai';
import { get } from '@/lib/db';
import { PersonalModel } from '@/lib/personal-model-integration';
import { buildTaskGenerationUserMessage, serializeRoutePhases, TASK_GENERATION_SYSTEM_PROMPT } from '@/lib/prompts/task-generation';
import { validateTaskQuality, WeeklyPlanSchema, type WeeklyPlan } from '@/lib/schemas/task';

type Context = { goalName: string; routeTitle: string; routeThesis: string; phases: Parameters<typeof serializeRoutePhases>[0] };

export function createTasksHandler(generate: (context: Context) => Promise<StructuredResult<WeeklyPlan>> = (context) => generateStructured(
  'task-generation', 'v1', TASK_GENERATION_SYSTEM_PROMPT,
  buildTaskGenerationUserMessage({ goalName: context.goalName, selectedRouteTitle: context.routeTitle, selectedRouteThesis: context.routeThesis, routePhases: serializeRoutePhases(context.phases), personalModelSummary: PersonalModel.getSummary() }),
  WeeklyPlanSchema,
)) {
  return async (request: Request): Promise<Response> => {
    try {
      const body = await request.json() as { goalId?: string };
      if (!body.goalId) return Response.json({ code: 'INVALID_INPUT', userMessage: '缺少目标', retryable: false }, { status: 400 });
      const row = await get<{ normalized_name: string; id: string; title: string; thesis: string; phases_json: string }>(
        `SELECT g.normalized_name, r.id, r.title, r.thesis, r.phases_json FROM goal g JOIN plan_route r ON r.goal_id = g.id WHERE g.id = ? AND r.status = 'selected' LIMIT 1`,
        body.goalId,
      );
      if (!row) return Response.json({ code: 'NOT_FOUND', userMessage: '请先选择一条路线', retryable: false }, { status: 404 });
      const generated = await generate({ goalName: row.normalized_name, routeTitle: row.title, routeThesis: row.thesis, phases: JSON.parse(row.phases_json) });
      if (!generated.result) return Response.json({ code: 'AI_FAILED', userMessage: '任务生成失败，请重试', retryable: true }, { status: 422 });
      const quality = validateTaskQuality(generated.result.tasks);
      if (!quality.valid) return Response.json({ code: 'INVALID_AI_PLAN', userMessage: '生成的每日行动不符合固定三项规则，请重试。', retryable: true }, { status: 422 });
      return Response.json({ plan: generated.result, routeId: row.id, quality, draft: true });
    } catch (error) {
      console.error('[API] /api/ai/tasks error', error);
      return Response.json({ code: 'INTERNAL_ERROR', userMessage: '服务器错误，请重试', retryable: true }, { status: 500 });
    }
  };
}

export const POST = createTasksHandler();
