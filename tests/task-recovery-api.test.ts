import { afterEach, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/tasks/[id]/recover/route';
import { closeDb, generateId, getTestDb } from '@/lib/db';

afterEach(() => closeDb());

describe('任务恢复 API', () => {
  it('将被跳过的任务缩小为今天的最低行动并记录决策', async () => {
    const db = getTestDb();
    const goalId = generateId(); const branchId = generateId(); const taskId = generateId();
    db.prepare("INSERT INTO goal (id, raw_input, status) VALUES (?, ?, 'active')").run(goalId, '学习 NLP');
    db.prepare("INSERT INTO planning_branch (id, goal_id, status) VALUES (?, ?, 'active')").run(branchId, goalId);
    db.prepare("INSERT INTO task (id, goal_id, title, completion_criteria, minimum_action, estimated_minutes, day_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'planned')").run(taskId, goalId, '训练分类基线', '记录 F1', '跑通训练脚本', 45, new Date().toISOString().slice(0, 10));

    const response = await POST(new Request(`http://localhost/api/tasks/${taskId}/recover`, { method: 'POST', body: JSON.stringify({ action: 'shrink', reason: 'no_time' }) }), { params: Promise.resolve({ id: taskId }) });

    expect(response.status).toBe(200);
    expect(db.prepare('SELECT status, estimated_minutes, partial_note FROM task WHERE id = ?').get(taskId)).toEqual({ status: 'planned', estimated_minutes: 15, partial_note: '已缩小为最低行动：跑通训练脚本' });
    expect(db.prepare("SELECT event_type FROM decision_event WHERE entity_id = ? AND event_type = 'task_recovered'").get(taskId)).toEqual({ event_type: 'task_recovered' });
  });

  it('将被跳过的任务移至明天并保留恢复记录', async () => {
    const db = getTestDb();
    const goalId = generateId(); const branchId = generateId(); const taskId = generateId();
    db.prepare("INSERT INTO goal (id, raw_input, status) VALUES (?, ?, 'active')").run(goalId, '学习 NLP');
    db.prepare("INSERT INTO planning_branch (id, goal_id, status) VALUES (?, ?, 'active')").run(branchId, goalId);
    db.prepare("INSERT INTO task (id, goal_id, title, completion_criteria, minimum_action, estimated_minutes, day_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'planned')").run(taskId, goalId, '训练分类基线', '记录 F1', '跑通训练脚本', 45, new Date().toISOString().slice(0, 10));

    const response = await POST(new Request(`http://localhost/api/tasks/${taskId}/recover`, { method: 'POST', body: JSON.stringify({ action: 'reschedule', reason: 'no_time' }) }), { params: Promise.resolve({ id: taskId }) });

    expect(response.status).toBe(200);
    expect(db.prepare('SELECT status, day_date FROM task WHERE id = ?').get(taskId)).toEqual({ status: 'planned', day_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10) });
    expect(db.prepare("SELECT event_type FROM decision_event WHERE entity_id = ? AND event_type = 'task_recovered'").get(taskId)).toEqual({ event_type: 'task_recovered' });
  });

  it('暂停任务所属的周目标并保留恢复记录', async () => {
    const db = getTestDb();
    const goalId = generateId(); const branchId = generateId(); const weekId = generateId(); const taskId = generateId();
    db.prepare("INSERT INTO goal (id, raw_input, status) VALUES (?, ?, 'active')").run(goalId, '学习 NLP');
    db.prepare("INSERT INTO planning_branch (id, goal_id, status) VALUES (?, ?, 'active')").run(branchId, goalId);
    db.prepare("INSERT INTO goal_work_node (id, goal_id, parent_id, branch_id, node_type, title, success_criteria, start_date, end_date, status, source) VALUES (?, ?, NULL, ?, 'week', '完成基线', '跑通训练', '2026-09-01', '2026-09-07', 'active', 'manual')").run(weekId, goalId, branchId);
    db.prepare("INSERT INTO task (id, goal_id, work_node_id, title, completion_criteria, minimum_action, estimated_minutes, day_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned')").run(taskId, goalId, weekId, '训练分类基线', '记录 F1', '跑通训练脚本', 45, new Date().toISOString().slice(0, 10));

    const response = await POST(new Request(`http://localhost/api/tasks/${taskId}/recover`, { method: 'POST', body: JSON.stringify({ action: 'pause_week', reason: 'too_hard' }) }), { params: Promise.resolve({ id: taskId }) });

    expect(response.status).toBe(200);
    expect(db.prepare('SELECT status FROM goal_work_node WHERE id = ?').get(weekId)).toEqual({ status: 'paused' });
    expect(db.prepare('SELECT note FROM execution_event WHERE task_id = ?').get(taskId)).toEqual({ note: '已暂停所属周目标' });
    expect(db.prepare("SELECT event_type FROM decision_event WHERE entity_id = ? AND event_type = 'task_recovered'").get(taskId)).toEqual({ event_type: 'task_recovered' });
  });
});
