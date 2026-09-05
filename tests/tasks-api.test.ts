import { afterEach, describe, expect, it } from 'vitest';
import { createTasksHandler } from '@/app/api/ai/tasks/route';
import { closeDb, generateId, getTestDb as getDb } from '@/lib/db';
import { validateTaskQuality, WeeklyPlanSchema } from '@/lib/schemas/task';

const sevenDayTasks = () => Array.from({ length: 21 }, (_, index) => ({
  title: `完成分析练习 ${index + 1}`,
  completion_criteria: '输出一页分析',
  minimum_action: '标记三个关键数据',
  estimated_minutes: 30,
  quadrant: 'important_not_urgent' as const,
  day_offset: Math.floor(index / 3),
  energy_level: index % 3 === 0 ? 'high' as const : 'medium' as const,
  why_this_task: '推动首周产出',
  is_output_oriented: true,
}));

afterEach(() => closeDb());

describe('POST /api/ai/tasks', () => {
  it('生成未来七天每天三条的任务草稿但不提前写入正式任务', async () => {
    const goalId = generateId(); const routeId = generateId();
    getDb().prepare('INSERT INTO goal (id, raw_input, normalized_name, status) VALUES (?, ?, ?, ?)').run(goalId, '学投资', '独立分析财报', 'active');
    getDb().prepare(`INSERT INTO plan_route (id, goal_id, route_type, title, thesis, phases_json, advantages_json, risks_json, first_month_preview_json, user_profile_basis_json, status) VALUES (?, ?, 'depth_first', '专项突破', '先做报表', '[]', '[]', '[]', '{}', '[]', 'selected')`).run(routeId, goalId);
    const tasks = sevenDayTasks();
    const handler = createTasksHandler(async () => ({ result: { tasks, total_minutes: 630, ai_note: '连续七天建立反馈' }, error: null, attempts: 1, promptVersion: 'v1', recoverable: true }));
    const response = await handler(new Request('http://localhost/api/ai/tasks', { method: 'POST', body: JSON.stringify({ goalId }) }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.plan.tasks).toHaveLength(21);
    expect(getDb().prepare('SELECT COUNT(*) count FROM task WHERE goal_id = ?').get(goalId)).toEqual({ count: 0 });
    getDb().prepare('DELETE FROM plan_route WHERE goal_id = ?').run(goalId); getDb().prepare('DELETE FROM goal WHERE id = ?').run(goalId);
  });

  it('只接受连续七天每天三条的任务草稿', () => {
    const tasks = sevenDayTasks();
    expect(WeeklyPlanSchema.parse({ tasks, total_minutes: 630, ai_note: '连续七天推进' }).tasks).toHaveLength(21);
    expect(() => WeeklyPlanSchema.parse({ tasks: tasks.slice(0, 20), total_minutes: 600, ai_note: '不足' })).toThrow();
    expect(validateTaskQuality([...tasks.slice(0, 20), { ...tasks[20], day_offset: 0 }]).issues).toContain('第 1 天必须安排 3 个任务，当前为 4 个');
  });
});
