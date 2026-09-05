import { afterEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/tasks/route';
import { closeDb, generateId, getTestDb as getDb } from '@/lib/db';

afterEach(() => closeDb());

describe('POST /api/tasks', () => {
  it('确认后原子写入未来七天任务和四个路径节点', async () => {
    const goalId = generateId(); const routeId = generateId(); const branchId = generateId();
    getDb().prepare('INSERT INTO goal (id, raw_input, status) VALUES (?, ?, ?)').run(goalId, '学投资', 'active');
    getDb().prepare('INSERT INTO planning_branch (id, goal_id, status) VALUES (?, ?, ?)').run(branchId, goalId, 'active');
    getDb().prepare(`INSERT INTO plan_route (id, goal_id, route_type, title, thesis, phases_json, advantages_json, risks_json, first_month_preview_json, user_profile_basis_json, status) VALUES (?, ?, 'depth_first', '专项突破', '先做', ?, '[]', '[]', ?, '[]', 'selected')`).run(routeId, goalId, JSON.stringify([{ name: '建立基础', focus: '完成一份基础分析' }, { name: '形成方法', focus: '形成可复用的方法' }]), JSON.stringify({ week1_summary: '完成首个样本', week2_summary: '复盘并迭代样本' }));
    const tasks = Array.from({ length: 21 }, (_, index) => ({ title: `完成练习 ${index + 1}`, completion_criteria: '交付一页笔记', minimum_action: '标记关键数字', estimated_minutes: 30, quadrant: 'important_not_urgent', day_offset: Math.floor(index / 3), energy_level: index % 3 === 0 ? 'high' : 'medium', why_this_task: '建立产出节奏', is_output_oriented: true }));
    const response = await POST(new Request('http://localhost/api/tasks', { method: 'POST', body: JSON.stringify({ goalId, routeId, tasks }) }));
    expect(response.status).toBe(201);
    expect(getDb().prepare('SELECT COUNT(*) count FROM task WHERE goal_id = ?').get(goalId)).toEqual({ count: 21 });
    expect(getDb().prepare("SELECT COUNT(*) count FROM goal_work_node WHERE goal_id = ? AND node_type = 'month'").get(goalId)).toEqual({ count: 2 });
    expect(getDb().prepare("SELECT COUNT(*) count FROM goal_work_node WHERE goal_id = ? AND node_type = 'week'").get(goalId)).toEqual({ count: 2 });
    expect(getDb().prepare('SELECT COUNT(*) count FROM task WHERE goal_id = ? AND work_node_id IS NOT NULL').get(goalId)).toEqual({ count: 21 });
    const repeat = await POST(new Request('http://localhost/api/tasks', { method: 'POST', body: JSON.stringify({ goalId, routeId, tasks }) }));
    expect(repeat.status).toBe(201);
    expect(getDb().prepare("SELECT COUNT(*) count FROM goal_work_node WHERE goal_id = ? AND node_type = 'month'").get(goalId)).toEqual({ count: 2 });
    expect(getDb().prepare("SELECT COUNT(*) count FROM goal_work_node WHERE goal_id = ? AND node_type = 'week'").get(goalId)).toEqual({ count: 2 });
  });
});
