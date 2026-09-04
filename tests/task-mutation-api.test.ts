import { afterEach, describe, expect, it } from 'vitest';

import { PATCH } from '@/app/api/tasks/[id]/route';
import { closeDb, generateId, getTestDb } from '@/lib/db';

afterEach(() => closeDb());

function createTaskTree() {
  const db = getTestDb();
  const goalId = generateId(); const branchId = generateId(); const weekId = generateId(); const taskId = generateId();
  db.prepare("UPDATE goal SET status = 'draft' WHERE status = 'active'").run();
  db.prepare("INSERT INTO goal (id, raw_input, status) VALUES (?, ?, 'active')").run(goalId, '学习 NLP');
  db.prepare("INSERT INTO planning_branch (id, goal_id, status) VALUES (?, ?, 'active')").run(branchId, goalId);
  db.prepare("INSERT INTO goal_work_node (id, goal_id, parent_id, branch_id, node_type, title, success_criteria, start_date, end_date, status, source) VALUES (?, ?, NULL, ?, 'week', '训练首个基线', '跑通训练', '2026-09-01', '2026-09-07', 'active', 'manual')").run(weekId, goalId, branchId);
  db.prepare("INSERT INTO task (id, goal_id, work_node_id, title, completion_criteria, minimum_action, estimated_minutes, day_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned')").run(taskId, goalId, weekId, '旧任务', '旧完成标准', '旧最低行动', 30, '2026-09-04');
  return { db, taskId, weekId };
}

describe('PATCH /api/tasks/[id]', () => {
  it('编辑单个任务并留下 task_edited 决策记录', async () => {
    const { db, taskId } = createTaskTree();
    const response = await PATCH(new Request(`http://localhost/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ action: 'edit', title: '训练 TF-IDF 基线', completionCriteria: '记录准确率与 F1', minimumAction: '运行一次训练', estimatedMinutes: 45 }) }), { params: Promise.resolve({ id: taskId }) });

    expect(response.status).toBe(200);
    expect(db.prepare('SELECT title, completion_criteria, minimum_action, estimated_minutes FROM task WHERE id = ?').get(taskId)).toEqual({ title: '训练 TF-IDF 基线', completion_criteria: '记录准确率与 F1', minimum_action: '运行一次训练', estimated_minutes: 45 });
    expect(db.prepare("SELECT event_type FROM decision_event WHERE entity_id = ? AND event_type = 'task_edited'").get(taskId)).toEqual({ event_type: 'task_edited' });
  });

  it('暂停单个任务而不改变所属周目标', async () => {
    const { db, taskId, weekId } = createTaskTree();
    const response = await PATCH(new Request(`http://localhost/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ action: 'pause' }) }), { params: Promise.resolve({ id: taskId }) });

    expect(response.status).toBe(200);
    expect(db.prepare('SELECT status FROM task WHERE id = ?').get(taskId)).toEqual({ status: 'paused' });
    expect(db.prepare('SELECT status FROM goal_work_node WHERE id = ?').get(weekId)).toEqual({ status: 'active' });
    expect(db.prepare("SELECT event_type FROM decision_event WHERE entity_id = ? AND event_type = 'task_paused'").get(taskId)).toEqual({ event_type: 'task_paused' });
  });
});
