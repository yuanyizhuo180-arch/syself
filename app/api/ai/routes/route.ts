import { generateStructured, type StructuredResult } from '@/lib/ai';
import { generateId, getDb } from '@/lib/db';
import { buildRouteGenerationUserMessage, ROUTE_GENERATION_SYSTEM_PROMPT } from '@/lib/prompts/route-generation';
import { RouteComparisonSchema, type RouteComparison, validateRouteDiversity } from '@/lib/schemas/plan-route';
import type { GoalUnderstanding } from '@/lib/schemas/goal-understanding';
import { PersonalModel } from '@/lib/personal-model-integration';

export function createRoutesHandler(
  generate: (understanding: GoalUnderstanding, rawGoal: string) => Promise<StructuredResult<RouteComparison>> =
    (understanding, rawGoal) => generateStructured(
      'route-generation', 'v1', ROUTE_GENERATION_SYSTEM_PROMPT,
      buildRouteGenerationUserMessage({
        goalDescription: rawGoal,
        desiredOutcome: understanding.desired_outcome,
        currentState: understanding.current_state,
        timeHorizon: understanding.time_horizon,
        weeklyHours: understanding.implicit_constraints.time_per_week_hours,
        primaryDifficulty: understanding.risks.behavioral_risks.join('；'),
        pastAttempts: understanding.risks.dropout_triggers.join('；'),
      }), RouteComparisonSchema,
    ),
) {
  return async (request: Request): Promise<Response> => {
    try {
      const { goalId } = await request.json() as { goalId?: string };
      if (!goalId) return Response.json({ code: 'INVALID_INPUT', userMessage: '缺少目标 ID', retryable: false }, { status: 400 });
      const db = getDb();
      const row = db.prepare(`SELECT g.raw_input, u.extracted_json FROM goal g JOIN goal_understanding u ON u.goal_id = g.id WHERE g.id = ? ORDER BY u.created_at DESC LIMIT 1`).get(goalId) as { raw_input: string; extracted_json: string } | undefined;
      if (!row) return Response.json({ code: 'NOT_FOUND', userMessage: '找不到目标理解结果', retryable: false }, { status: 404 });

      const generated = await generate(JSON.parse(row.extracted_json) as GoalUnderstanding, row.raw_input);
      if (!generated.result) return Response.json({ code: 'AI_FAILED', userMessage: '路线生成失败，请重试', retryable: true }, { status: 422 });
      const diversity = validateRouteDiversity(generated.result.routes);
      if (!diversity.valid) return Response.json({ code: 'ROUTES_TOO_SIMILAR', userMessage: '两条路线差异不足，请重新生成', retryable: true, failures: diversity.failures }, { status: 422 });

      const insert = db.prepare(`INSERT INTO plan_route (id, goal_id, route_type, title, thesis, phases_json, advantages_json, risks_json, first_month_preview_json, user_profile_basis_json, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`);
      const savedRoutes = db.transaction(() => generated.result!.routes.map((route) => {
        const id = generateId();
        insert.run(id, goalId, route.route_type, route.title, route.thesis, JSON.stringify(route.phases), JSON.stringify(route.advantages), JSON.stringify(route.risks), JSON.stringify(route.first_month_preview), JSON.stringify(route.user_profile_basis));
        return { ...route, id };
      }))();
      return Response.json({ ...generated.result, routes: savedRoutes, diversity });
    } catch (error) {
      console.error('[API] /api/ai/routes error', error);
      return Response.json({ code: 'INTERNAL_ERROR', userMessage: '服务器错误，请重试', retryable: true }, { status: 500 });
    }
  };
}

export const POST = createRoutesHandler();

export async function PUT(request: Request): Promise<Response> {
  try {
    const { goalId, routeId } = await request.json() as { goalId?: string; routeId?: string };
    if (!goalId || !routeId) return Response.json({ code: 'INVALID_INPUT', userMessage: '请选择一条路线', retryable: false }, { status: 400 });
    const db = getDb();
    const selected = db.prepare('SELECT route_type FROM plan_route WHERE id = ? AND goal_id = ?').get(routeId, goalId) as { route_type: 'depth_first' | 'breadth_first' } | undefined;
    if (!selected) return Response.json({ code: 'NOT_FOUND', userMessage: '路线不存在', retryable: false }, { status: 404 });
    db.transaction(() => {
      db.prepare("UPDATE plan_route SET status = 'rejected' WHERE goal_id = ?").run(goalId);
      db.prepare("UPDATE plan_route SET status = 'selected' WHERE id = ?").run(routeId);
    })();
    PersonalModel.routeSelected(selected.route_type);
    return Response.json({ goalId, routeId, status: 'selected' });
  } catch (error) {
    console.error('[API] route selection error', error);
    return Response.json({ code: 'INTERNAL_ERROR', userMessage: '保存路线失败', retryable: true }, { status: 500 });
  }
}
