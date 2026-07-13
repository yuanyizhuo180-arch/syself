import { generateId, get, run, transaction } from '@/lib/db';
import { PersonalModel } from '@/lib/personal-model-integration';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await context.params;
    const body = await request.json() as { actualMinutes?: number; difficulty?: string; note?: string };
    const task = await get<{ id: string; goal_id: string; estimated_minutes: number; time_block: string | null; energy_level: string }>('SELECT * FROM task WHERE id = ?', id);
    if (!task) return Response.json({ code: 'NOT_FOUND', userMessage: '任务不存在', retryable: false }, { status: 404 });
    const actualMinutes = typeof body.actualMinutes === 'number' ? body.actualMinutes : null;
    await transaction(async () => {
      await run("UPDATE task SET status = 'done', actual_minutes = ?, updated_at = datetime('now') WHERE id = ?", actualMinutes, id);
      await run('INSERT INTO execution_event (id, task_id, goal_id, date, status, actual_minutes, difficulty, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', generateId(), id, task.goal_id, new Date().toISOString().slice(0, 10), 'done', actualMinutes, body.difficulty ?? null, body.note ?? null);
    });
    await PersonalModel.taskCompleted({ taskId: id, timeBlock: task.time_block ?? 'unspecified', energyLevel: task.energy_level, actualMinutes: actualMinutes ?? task.estimated_minutes, estimatedMinutes: task.estimated_minutes });
    return Response.json({ taskId: id, status: 'done' });
  } catch (error) {
    console.error('[API] task complete error', error);
    return Response.json({ code: 'INTERNAL_ERROR', userMessage: '无法完成任务', retryable: true }, { status: 500 });
  }
}
