import { generateStructured, type StructuredResult } from '@/lib/ai';
import { get } from '@/lib/db';
import { PersonalModel } from '@/lib/personal-model-integration';
import { buildTaskGenerationUserMessage, serializeRoutePhases, TASK_GENERATION_SYSTEM_PROMPT } from '@/lib/prompts/task-generation';
import { checkCapacity, validateTaskQuality, WeeklyPlanSchema, type WeeklyPlan } from '@/lib/schemas/task';

type Context = { goalName: string; routeTitle: string; routeThesis: string; phases: Parameters<typeof serializeRoutePhases>[0]; weeklyHours: number };

export function createTasksHandler(generate: (context: Context) => Promise<StructuredResult<WeeklyPlan>> = (context) => generateStructured(
  'task-generation', 'v1', TASK_GENERATION_SYSTEM_PROMPT,
  buildTaskGenerationUserMessage({ goalName: context.goalName, selectedRouteTitle: context.routeTitle, selectedRouteThesis: context.routeThesis, routePhases: serializeRoutePhases(context.phases), weeklyHours: context.weeklyHours, fixedResponsibilities: '', bestTimeOfDay: '', primaryDifficulty: '', personalModelSummary: PersonalModel.getSummary() }),
  WeeklyPlanSchema,
)) {
  return async (request: Request): Promise<Response> => {
    try {
      const body = await request.json() as { goalId?: string; weeklyHours?: number };
      if (!body.goalId || !body.weeklyHours || body.weeklyHours <= 0) return Response.json({ code: 'INVALID_INPUT', userMessage: '缺少目标或每周可用时间', retryable: false }, { status: 400 });
      const row = await get<{ normalized_name: string; id: string; title: string; thesis: string; phases_json: string }>(
        `SELECT g.normalized_name, r.id, r.title, r.thesis, r.phases_json FROM goal g JOIN plan_route r ON r.goal_id = g.id WHERE g.id = ? AND r.status = 'selected' LIMIT 1`,
        body.goalId,
      );
      if (!row) return Response.json({ code: 'NOT_FOUND', userMessage: '请先选择一条路线', retryable: false }, { status: 404 });
      const generated = await generate({ goalName: row.normalized_name, routeTitle: row.title, routeThesis: row.thesis, phases: JSON.parse(row.phases_json), weeklyHours: body.weeklyHours });
      if (!generated.result) return Response.json({ code: 'AI_FAILED', userMessage: '任务生成失败，请重试', retryable: true }, { status: 422 });
      const capacity = checkCapacity(generated.result.tasks, body.weeklyHours * 60);
      const quality = validateTaskQuality(generated.result.tasks);
      return Response.json({ plan: generated.result, routeId: row.id, capacity, quality, draft: true });
    } catch (error) {
      console.error('[API] /api/ai/tasks error', error);
      return Response.json({ code: 'INTERNAL_ERROR', userMessage: '服务器错误，请重试', retryable: true }, { status: 500 });
    }
  };
}

export const POST = createTasksHandler();
