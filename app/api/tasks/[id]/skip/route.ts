import { generateId, get, run, transaction } from '@/lib/db';
import { PersonalModel } from '@/lib/personal-model-integration';
import type { SkipReason } from '@/lib/types';

const validReasons = new Set<SkipReason>(['no_time', 'too_hard', 'forgot', 'not_in_mood', 'other']);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await context.params;
    const { reason } = await request.json() as { reason?: SkipReason };
    if (!reason || !validReasons.has(reason)) return Response.json({ code: 'INVALID_INPUT', userMessage: '请选择跳过原因', retryable: false }, { status: 400 });
    const task = await get<{ goal_id: string; time_block: string | null; energy_level: string }>('SELECT * FROM task WHERE id = ?', id);
    if (!task) return Response.json({ code: 'NOT_FOUND', userMessage: '任务不存在', retryable: false }, { status: 404 });
    await transaction(async () => {
      await run("UPDATE task SET status = 'skipped', skip_reason = ?, updated_at = datetime('now') WHERE id = ?", reason, id);
      await run('INSERT INTO execution_event (id, task_id, goal_id, date, status, skip_reason) VALUES (?, ?, ?, ?, ?, ?)', generateId(), id, task.goal_id, new Date().toISOString().slice(0, 10), 'skipped', reason);
    });
    await PersonalModel.taskSkipped({ taskId: id, timeBlock: task.time_block ?? 'unspecified', energyLevel: task.energy_level, reason });
    return Response.json({ taskId: id, status: 'skipped' });
  } catch (error) {
    console.error('[API] task skip error', error);
    return Response.json({ code: 'INTERNAL_ERROR', userMessage: '无法跳过任务', retryable: true }, { status: 500 });
  }
}
