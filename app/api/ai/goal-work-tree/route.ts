import { get } from '@/lib/db';
import { createGoalWorkNode, getActiveBranch } from '@/lib/workspace-repository';

type RoutePhase = { name?: unknown; focus?: unknown };

const dateAfter = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export async function POST(request: Request): Promise<Response> {
  try {
    const { goalId } = await request.json() as { goalId?: string };
    if (!goalId) return Response.json({ code: 'INVALID_INPUT', userMessage: '缺少主目标。', retryable: false }, { status: 400 });
    const [goal, route, branch] = await Promise.all([
      get<{ normalized_name: string | null; raw_input: string }>('SELECT normalized_name, raw_input FROM goal WHERE id = ?', goalId),
      get<{ phases_json: string }>("SELECT phases_json FROM plan_route WHERE goal_id = ? AND status = 'selected' ORDER BY created_at DESC LIMIT 1", goalId),
      getActiveBranch(goalId),
    ]);
    if (!goal || !route || !branch) return Response.json({ code: 'NOT_FOUND', userMessage: '请先确认主目标和路线。', retryable: false }, { status: 404 });

    const phases = JSON.parse(route.phases_json) as RoutePhase[];
    const firstPhase = Array.isArray(phases) ? phases[0] ?? {} : {};
    const phaseName = typeof firstPhase.name === 'string' && firstPhase.name.trim() ? firstPhase.name.trim() : '建立实践基础';
    const phaseFocus = typeof firstPhase.focus === 'string' && firstPhase.focus.trim() ? firstPhase.focus.trim() : `围绕“${goal.normalized_name ?? goal.raw_input}”完成第一阶段练习`;
    const startDate = new Date().toISOString().slice(0, 10);
    const month = await createGoalWorkNode({ goalId, branchId: branch.id, parentId: null, nodeType: 'month', title: `第一个月：${phaseName}`, successCriteria: phaseFocus, startDate, endDate: dateAfter(30), source: 'ai_suggestion', status: 'suggested', routePhaseRef: phaseName });
    const week = await createGoalWorkNode({ goalId, branchId: branch.id, parentId: month!.id, nodeType: 'week', title: `第 1 周：${phaseName}`, successCriteria: `完成 ${phaseName} 的最小可验证产出`, startDate, endDate: dateAfter(6), source: 'ai_suggestion', status: 'suggested', routePhaseRef: phaseName });
    return Response.json({ nodes: [month, week] }, { status: 201 });
  } catch {
    return Response.json({ code: 'AI_SUGGESTION_FAILED', userMessage: '暂时无法生成路线建议，请稍后重试。', retryable: true }, { status: 422 });
  }
}
