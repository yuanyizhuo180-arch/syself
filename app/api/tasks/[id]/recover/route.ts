import { generateId, get, run, transaction } from '@/lib/db';
import type { SkipReason } from '@/lib/types';
import { getActiveBranch, insertDecisionEvent } from '@/lib/workspace-repository';

const validReasons = new Set<SkipReason>(['no_time', 'too_hard', 'forgot', 'not_in_mood', 'other']);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await context.params;
    const { action, reason } = await request.json() as { action?: string; reason?: SkipReason };
    if (!['shrink', 'reschedule', 'pause_week'].includes(action ?? '') || !reason || !validReasons.has(reason)) return Response.json({ code: 'INVALID_INPUT', userMessage: '请选择跳过原因和恢复方式。', retryable: false }, { status: 400 });
    const task = await get<{ id: string; goal_id: string; minimum_action: string; estimated_minutes: number; work_node_id: string | null }>('SELECT id, goal_id, minimum_action, estimated_minutes, work_node_id FROM task WHERE id = ?', id);
    if (!task) return Response.json({ code: 'NOT_FOUND', userMessage: '任务不存在。', retryable: false }, { status: 404 });
    const branch = await getActiveBranch(task.goal_id);
    if (!branch) return Response.json({ code: 'NOT_FOUND', userMessage: '没有找到当前规划分支。', retryable: false }, { status: 404 });
    const isShrink = action === 'shrink';
    const isPauseWeek = action === 'pause_week';
    if (isPauseWeek && !task.work_node_id) return Response.json({ code: 'INVALID_INPUT', userMessage: '该任务尚未归属周目标，无法暂停。', retryable: false }, { status: 400 });
    const estimatedMinutes = isShrink ? Math.min(task.estimated_minutes, 15) : task.estimated_minutes;
    const note = isPauseWeek ? '已暂停所属周目标' : isShrink ? `已缩小为最低行动：${task.minimum_action}` : '已移至明天继续推进';
    const dayDate = isShrink ? new Date().toISOString().slice(0, 10) : new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await transaction(async () => {
      if (isPauseWeek) {
        await run("UPDATE task SET status = 'skipped', partial_note = ?, skip_reason = ?, updated_at = datetime('now') WHERE id = ?", '所属周目标已暂停', reason, id);
        await run("UPDATE goal_work_node SET status = 'paused', updated_at = datetime('now') WHERE id = ?", task.work_node_id!);
        await insertDecisionEvent({ goalId: task.goal_id, branchId: branch.id, entityType: 'goal_work_node', entityId: task.work_node_id!, eventType: 'node_paused', before: null, after: { status: 'paused' }, rationale: reason });
      } else {
        await run("UPDATE task SET status = 'planned', estimated_minutes = ?, partial_note = ?, skip_reason = ?, day_date = ?, updated_at = datetime('now') WHERE id = ?", estimatedMinutes, note, reason, dayDate, id);
      }
      await run("INSERT INTO execution_event (id, task_id, goal_id, date, status, skip_reason, note) VALUES (?, ?, ?, ?, 'skipped', ?, ?)", generateId(), id, task.goal_id, new Date().toISOString().slice(0, 10), reason, note);
      await insertDecisionEvent({ goalId: task.goal_id, branchId: branch.id, entityType: 'task', entityId: id, eventType: 'task_recovered', before: { estimatedMinutes: task.estimated_minutes }, after: { estimatedMinutes, recovery: action, dayDate }, rationale: reason });
    });
    return Response.json({ taskId: id, status: 'planned', recovery: action });
  } catch {
    return Response.json({ code: 'RECOVERY_FAILED', userMessage: '暂时无法恢复任务，请稍后重试。', retryable: true }, { status: 500 });
  }
}
