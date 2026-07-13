import { get, run, transaction } from '@/lib/db';

export async function GET(): Promise<Response> {
  const goal = await get(
    "SELECT * FROM goal WHERE status = 'active' ORDER BY updated_at DESC LIMIT 1",
  );
  return Response.json({ goal: goal ?? null });
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const goalId = typeof body.goalId === 'string' ? body.goalId : '';
    const desiredOutcome = typeof body.desiredOutcome === 'string' ? body.desiredOutcome.trim() : '';
    const timeHorizon = typeof body.timeHorizon === 'string' ? body.timeHorizon.trim() : '';

    if (!goalId || !desiredOutcome) {
      return Response.json({ code: 'INVALID_INPUT', userMessage: '目标结果不能为空', retryable: false }, { status: 400 });
    }

    const result = await transaction(async () => {
      await run("UPDATE goal SET status = 'draft' WHERE status = 'active' AND id <> ?", goalId);
      return run(
        `UPDATE goal SET normalized_name = ?, success_criteria = ?, target_date = ?, status = 'active', updated_at = datetime('now') WHERE id = ?`,
        desiredOutcome, desiredOutcome, timeHorizon || null, goalId,
      );
    });

    if (result.changes === 0) {
      return Response.json({ code: 'NOT_FOUND', userMessage: '目标不存在', retryable: false }, { status: 404 });
    }
    return Response.json({ goalId, status: 'active' });
  } catch (error) {
    console.error('[API] /api/goal error', error);
    return Response.json({ code: 'INTERNAL_ERROR', userMessage: '保存失败，请重试', retryable: true }, { status: 500 });
  }
}
