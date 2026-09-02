import { generateId, get, run, transaction } from '@/lib/db';
import { getActiveBranch, insertDecisionEvent } from '@/lib/workspace-repository';

export async function POST(request: Request): Promise<Response> {
  try {
    const { goalId, eventId, reason } = await request.json() as { goalId?: string; eventId?: string; reason?: string };
    if (!goalId || !eventId || !reason?.trim()) return Response.json({ code: 'INVALID_INPUT', userMessage: '请选择历史节点并说明调整原因。', retryable: false }, { status: 400 });
    const [branch, event] = await Promise.all([
      getActiveBranch(goalId),
      get<{ id: string }>('SELECT id FROM decision_event WHERE id = ? AND goal_id = ?', eventId, goalId),
    ]);
    if (!branch || !event) return Response.json({ code: 'NOT_FOUND', userMessage: '没有找到可重新规划的当前分支或历史节点。', retryable: false }, { status: 404 });
    const nextBranchId = generateId();
    await transaction(async () => {
      await run("UPDATE planning_branch SET status = 'superseded' WHERE id = ?", branch.id);
      await run("INSERT INTO planning_branch (id, goal_id, parent_branch_id, base_decision_event_id, status, reason) VALUES (?, ?, ?, ?, 'active', ?)", nextBranchId, goalId, branch.id, eventId, reason.trim());
      await insertDecisionEvent({ goalId, branchId: nextBranchId, entityType: 'planning_branch', entityId: nextBranchId, eventType: 'replan_started', before: { branchId: branch.id }, after: { branchId: nextBranchId, baseDecisionEventId: eventId }, rationale: reason.trim() });
    });
    return Response.json({ branchId: nextBranchId }, { status: 201 });
  } catch {
    return Response.json({ code: 'REPLAN_FAILED', userMessage: '重新规划失败，请稍后重试。', retryable: true }, { status: 500 });
  }
}
