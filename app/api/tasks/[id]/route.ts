import { get, run, transaction } from '@/lib/db';
import { getActiveBranch, insertDecisionEvent } from '@/lib/workspace-repository';

type TaskRecord = {
  id: string; goal_id: string; work_node_id: string | null; title: string;
  completion_criteria: string | null; minimum_action: string | null;
  estimated_minutes: number | null; status: string;
};

type TaskPatch =
  | { action: 'edit'; title: string; completionCriteria: string; minimumAction: string; estimatedMinutes: number }
  | { action: 'pause' };

function isTaskEdit(value: unknown): value is Extract<TaskPatch, { action: 'edit' }> {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return body.action === 'edit' && ['title', 'completionCriteria', 'minimumAction'].every((key) => typeof body[key] === 'string' && body[key].trim().length > 0)
    && typeof body.estimatedMinutes === 'number' && Number.isInteger(body.estimatedMinutes) && body.estimatedMinutes >= 5 && body.estimatedMinutes <= 240;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await context.params;
    const body = await request.json() as unknown;
    const isPause = !!body && typeof body === 'object' && (body as { action?: string }).action === 'pause';
    if (!isTaskEdit(body) && !isPause) return Response.json({ code: 'INVALID_INPUT', userMessage: '请填写完整且有效的任务信息。', retryable: false }, { status: 400 });

    const task = await get<TaskRecord>('SELECT id, goal_id, work_node_id, title, completion_criteria, minimum_action, estimated_minutes, status FROM task WHERE id = ?', id);
    if (!task) return Response.json({ code: 'NOT_FOUND', userMessage: '任务不存在。', retryable: false }, { status: 404 });
    const branch = await getActiveBranch(task.goal_id);
    if (!branch) return Response.json({ code: 'NOT_FOUND', userMessage: '没有找到当前规划分支。', retryable: false }, { status: 404 });

    const next = await transaction(async () => {
      if (isPause) {
        const after = { ...task, status: 'paused' };
        await run("UPDATE task SET status = 'paused', updated_at = datetime('now') WHERE id = ?", id);
        await insertDecisionEvent({ goalId: task.goal_id, branchId: branch.id, entityType: 'task', entityId: id, eventType: 'task_paused', before: task, after, rationale: null });
        return after;
      }
      const after = { ...task, title: body.title.trim(), completion_criteria: body.completionCriteria.trim(), minimum_action: body.minimumAction.trim(), estimated_minutes: body.estimatedMinutes };
      await run("UPDATE task SET title = ?, completion_criteria = ?, minimum_action = ?, estimated_minutes = ?, updated_at = datetime('now') WHERE id = ?", after.title, after.completion_criteria, after.minimum_action, after.estimated_minutes, id);
      await insertDecisionEvent({ goalId: task.goal_id, branchId: branch.id, entityType: 'task', entityId: id, eventType: 'task_edited', before: task, after, rationale: null });
      return after;
    });

    return Response.json({ task: next });
  } catch {
    return Response.json({ code: 'TASK_UPDATE_FAILED', userMessage: '暂时无法保存任务，请稍后重试。', retryable: true }, { status: 500 });
  }
}
