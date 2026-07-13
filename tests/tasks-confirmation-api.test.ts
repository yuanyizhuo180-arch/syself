import { afterEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/tasks/route';
import { closeDb, generateId, getDb } from '@/lib/db';

afterEach(() => closeDb());

describe('POST /api/tasks', () => {
  it('确认后批量写入首周任务', async () => {
    const goalId = generateId(); const routeId = generateId();
    getDb().prepare('INSERT INTO goal (id, raw_input, status) VALUES (?, ?, ?)').run(goalId, '学投资', 'active');
    getDb().prepare(`INSERT INTO plan_route (id, goal_id, route_type, title, thesis, phases_json, advantages_json, risks_json, first_month_preview_json, user_profile_basis_json, status) VALUES (?, ?, 'depth_first', '专项突破', '先做', '[]', '[]', '[]', '{}', '[]', 'selected')`).run(routeId, goalId);
    const tasks = Array.from({ length: 5 }, (_, index) => ({ title: `完成练习 ${index + 1}`, completion_criteria: '交付一页笔记', minimum_action: '标记关键数字', estimated_minutes: 30, quadrant: 'important_not_urgent', day_of_week: index + 1, energy_level: 'medium', why_this_task: '建立产出节奏', is_output_oriented: true }));
    const response = await POST(new Request('http://localhost/api/tasks', { method: 'POST', body: JSON.stringify({ goalId, routeId, tasks }) }));
    expect(response.status).toBe(201);
    expect(getDb().prepare('SELECT COUNT(*) count FROM task WHERE goal_id = ?').get(goalId)).toEqual({ count: 5 });
    getDb().prepare('DELETE FROM task WHERE goal_id = ?').run(goalId); getDb().prepare('DELETE FROM plan_route WHERE id = ?').run(routeId); getDb().prepare('DELETE FROM goal WHERE id = ?').run(goalId);
  });
});
