import { get, transaction } from '@/lib/db';
import { ensureGoalWorkPath, getActiveBranch } from '@/lib/workspace-repository';

export async function POST(request: Request): Promise<Response> {
  try {
    const { goalId } = await request.json() as { goalId?: string };
    if (!goalId) return Response.json({ code: 'INVALID_INPUT', userMessage: '缺少主目标。', retryable: false }, { status: 400 });
    const [goal, route, branch] = await Promise.all([
      get<{ normalized_name: string | null; raw_input: string }>('SELECT normalized_name, raw_input FROM goal WHERE id = ?', goalId),
      get<{ phases_json: string; first_month_preview_json: string }>("SELECT phases_json, first_month_preview_json FROM plan_route WHERE goal_id = ? AND status = 'selected' ORDER BY created_at DESC LIMIT 1", goalId),
      getActiveBranch(goalId),
    ]);
    if (!goal || !route || !branch) return Response.json({ code: 'NOT_FOUND', userMessage: '请先确认主目标和路线。', retryable: false }, { status: 404 });

    const startDate = new Date().toISOString().slice(0, 10);
    const path = await transaction(() => ensureGoalWorkPath({ goalId, branchId: branch.id, startDate, route: { phases: JSON.parse(route.phases_json), firstMonthPreview: JSON.parse(route.first_month_preview_json) } }));
    return Response.json({ nodes: [path.currentMonth, path.currentWeek, path.futureWeek, path.futureMonth] }, { status: 201 });
  } catch {
    return Response.json({ code: 'AI_SUGGESTION_FAILED', userMessage: '暂时无法生成路线建议，请稍后重试。', retryable: true }, { status: 422 });
  }
}
