import { afterEach, describe, expect, it } from 'vitest';
import { createTasksHandler } from '@/app/api/ai/tasks/route';
import { closeDb, generateId, getDb } from '@/lib/db';

afterEach(() => closeDb());

describe('POST /api/ai/tasks', () => {
  it('生成容量内的任务草稿但不提前写入正式任务', async () => {
    const goalId = generateId(); const routeId = generateId();
    getDb().prepare('INSERT INTO goal (id, raw_input, normalized_name, status) VALUES (?, ?, ?, ?)').run(goalId, '学投资', '独立分析财报', 'active');
    getDb().prepare(`INSERT INTO plan_route (id, goal_id, route_type, title, thesis, phases_json, advantages_json, risks_json, first_month_preview_json, user_profile_basis_json, status) VALUES (?, ?, 'depth_first', '专项突破', '先做报表', '[]', '[]', '[]', '{}', '[]', 'selected')`).run(routeId, goalId);
    const tasks = Array.from({ length: 5 }, (_, index) => ({ title: `完成分析练习 ${index + 1}`, completion_criteria: '输出一页分析', minimum_action: '标记三个关键数据', estimated_minutes: 30, quadrant: 'important_not_urgent' as const, day_of_week: index + 1, energy_level: 'medium' as const, why_this_task: '推动首周产出', is_output_oriented: true }));
    const handler = createTasksHandler(async () => ({ result: { tasks, total_minutes: 150, weekly_capacity_percentage: 50, ai_note: '首周建立反馈', overload_warning: null }, error: null, attempts: 1, promptVersion: 'v1', recoverable: true }));
    const response = await handler(new Request('http://localhost/api/ai/tasks', { method: 'POST', body: JSON.stringify({ goalId, weeklyHours: 5 }) }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.plan.tasks).toHaveLength(5);
    expect(getDb().prepare('SELECT COUNT(*) count FROM task WHERE goal_id = ?').get(goalId)).toEqual({ count: 0 });
    getDb().prepare('DELETE FROM plan_route WHERE goal_id = ?').run(goalId); getDb().prepare('DELETE FROM goal WHERE id = ?').run(goalId);
  });
});
