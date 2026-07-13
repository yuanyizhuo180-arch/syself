import { generateStructured, type StructuredResult } from '@/lib/ai';
import { generateId, get, run, all, transaction } from '@/lib/db';
import { PersonalModel } from '@/lib/personal-model-integration';
import { buildReflectionUserMessage, REFLECTION_SYSTEM_PROMPT } from '@/lib/prompts/daily-reflection';
import { AIInsightSchema, computeDailyStats, validateReflectionQuality, type AIInsight, type ExecutionEvent } from '@/lib/schemas/reflection';

type ReflectionContext = {
  date: string;
  stats: ReturnType<typeof computeDailyStats>;
  completedTasks: string[];
  skippedTasks: { title: string; reason: string }[];
  partialTasks: { title: string; note: string }[];
  userRating: number;
};

type EventRow = {
  task_id: string; goal_id: string; date: string; status: 'done' | 'skipped' | 'partial';
  actual_minutes: number | null; difficulty: ExecutionEvent['difficulty']; note: string | null;
  skip_reason: ExecutionEvent['skipReason']; title: string;
};

export function createReflectHandler(
  generate: (context: ReflectionContext) => Promise<StructuredResult<AIInsight>> = (context) =>
    generateStructured('daily-reflection', 'v1', REFLECTION_SYSTEM_PROMPT,
      buildReflectionUserMessage({
        date: context.date, completionRate: context.stats.completionRate,
        importantCompletionRate: context.stats.importantCompletionRate,
        completedTasks: context.completedTasks, skippedTasks: context.skippedTasks,
        partialTasks: context.partialTasks, plannedMinutes: context.stats.plannedMinutes,
        actualMinutes: context.stats.actualMinutes,
        estimateErrorPercent: Math.round(context.stats.estimateError * 100),
        userRating: context.userRating, personalModelSummary: PersonalModel.getSummary(),
      }),
      AIInsightSchema, { temperature: 0.5 },
    ),
) {
  return async (request: Request): Promise<Response> => {
    try {
      const body = (await request.json()) as Record<string, unknown>;
      const date = typeof body.date === 'string' ? body.date : '';
      const userRating = typeof body.userRating === 'number' ? body.userRating : 0;
      const userNote = typeof body.userNote === 'string' ? body.userNote.trim() : '';
      const incompleteReasons = Array.isArray(body.incompleteReasons) ? body.incompleteReasons.filter((r): r is string => typeof r === 'string') : [];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || userRating < 1 || userRating > 5) {
        return Response.json({ code: 'INVALID_INPUT', userMessage: '请填写日期并完成 1 至 5 分的今日评分。', retryable: false }, { status: 400 });
      }
      const goalId = typeof body.goalId === 'string' && body.goalId
        ? body.goalId
        : (await get<{ id: string }>("SELECT id FROM goal WHERE status = 'active' ORDER BY updated_at DESC LIMIT 1"))?.id;
      if (!goalId) return Response.json({ code: 'NOT_FOUND', userMessage: '请先确认一个进行中的目标。', retryable: false }, { status: 404 });

      const rows = await all<EventRow>(
        `SELECT e.task_id, e.goal_id, e.date, e.status, e.actual_minutes, e.difficulty, e.note, e.skip_reason, t.title
         FROM execution_event e JOIN task t ON t.id = e.task_id
         WHERE e.goal_id = ? AND e.date = ? ORDER BY e.created_at ASC`,
        goalId, date,
      );
      const events: ExecutionEvent[] = rows.map((row) => ({
        taskId: row.task_id, goalId: row.goal_id, date: row.date, status: row.status,
        actualMinutes: row.actual_minutes, difficulty: row.difficulty, note: row.note, skipReason: row.skip_reason,
      }));
      const stats = computeDailyStats(events);
      const context: ReflectionContext = {
        date, stats,
        completedTasks: rows.filter((r) => r.status === 'done').map((r) => r.title),
        skippedTasks: rows.filter((r) => r.status === 'skipped').map((r) => ({ title: r.title, reason: r.skip_reason ?? '未填写原因' })),
        partialTasks: rows.filter((r) => r.status === 'partial').map((r) => ({ title: r.title, note: r.note ?? '未填写备注' })),
        userRating,
      };
      const generated = await generate(context);
      if (!generated.result) return Response.json({ code: 'AI_FAILED', userMessage: '洞察生成失败，请稍后重试。', retryable: true }, { status: 422 });
      const quality = validateReflectionQuality(generated.result);
      if (!quality.valid) return Response.json({ code: 'AI_QUALITY_FAILED', userMessage: '洞察未通过质量检查，请稍后重试。', retryable: true, violations: quality.violations }, { status: 422 });

      await transaction(async () => {
        await run('DELETE FROM daily_reflection WHERE goal_id = ? AND date = ?', goalId, date);
        await run(
          `INSERT INTO daily_reflection (id, goal_id, date, stats_json, user_rating, user_note, incomplete_reasons_json, ai_insight_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          generateId(), goalId, date, JSON.stringify(stats), userRating, userNote || null, JSON.stringify(incompleteReasons), JSON.stringify(generated.result),
        );
      });
      await PersonalModel.reflectionCompleted(date, userRating);
      const personalModel = { updated: true };
      return Response.json({ goalId, date, stats, insight: generated.result, personalModel });
    } catch (error) {
      console.error('[API] /api/ai/reflect error', error);
      return Response.json({ code: 'INTERNAL_ERROR', userMessage: '保存复盘失败，请稍后重试。', retryable: true }, { status: 500 });
    }
  };
}

export const POST = createReflectHandler();
