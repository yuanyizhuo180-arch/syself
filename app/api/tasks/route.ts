import { generateId, getDb } from '@/lib/db';
import { TaskDraftSchema, type TaskDraft } from '@/lib/schemas/task';

function dateForWeekday(dayOfWeek: number): string {
  const date = new Date();
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset + dayOfWeek - 1);
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request): Promise<Response> {
  const date = new URL(request.url).searchParams.get('date');
  if (!date) return Response.json({ code: 'INVALID_INPUT', userMessage: '缺少日期', retryable: false }, { status: 400 });
  const tasks = getDb().prepare("SELECT * FROM task WHERE day_date = ? AND status = 'planned' ORDER BY time_block, created_at").all(date);
  return Response.json({ tasks });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { goalId?: string; routeId?: string; tasks?: unknown[] };
    if (!body.goalId || !body.routeId || !Array.isArray(body.tasks)) return Response.json({ code: 'INVALID_INPUT', userMessage: '任务确认数据不完整', retryable: false }, { status: 400 });
    const tasks = body.tasks.map((item) => TaskDraftSchema.parse(item)) as TaskDraft[];
    const db = getDb();
    const route = db.prepare("SELECT id FROM plan_route WHERE id = ? AND goal_id = ? AND status = 'selected'").get(body.routeId, body.goalId);
    if (!route) return Response.json({ code: 'INVALID_ROUTE', userMessage: '请选择有效路线后再确认任务', retryable: false }, { status: 422 });
    const insert = db.prepare(`INSERT INTO task (id, goal_id, route_id, title, completion_criteria, minimum_action, estimated_minutes, quadrant, time_block, day_date, energy_level, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned')`);
    db.transaction(() => tasks.forEach((task) => insert.run(generateId(), body.goalId, body.routeId, task.title, task.completion_criteria, task.minimum_action, task.estimated_minutes, task.quadrant, task.time_block ?? null, dateForWeekday(task.day_of_week), task.energy_level)))();
    return Response.json({ created: tasks.length }, { status: 201 });
  } catch (error) {
    console.error('[API] /api/tasks error', error);
    return Response.json({ code: 'INTERNAL_ERROR', userMessage: '保存任务失败，请重试', retryable: true }, { status: 500 });
  }
}
