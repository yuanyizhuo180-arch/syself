import { afterEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/tasks/[id]/complete/route';
import { POST as skip } from '@/app/api/tasks/[id]/skip/route';
import { closeDb, generateId, getTestDb as getDb } from '@/lib/db';

afterEach(() => closeDb());

describe('POST /api/tasks/[id]/complete', () => {
  it('完成任务并记录执行事件与 Personal Model 数据点', async () => {
    const goalId = generateId(); const taskId = generateId(); const date = '2026-07-13';
    getDb().prepare('INSERT INTO goal (id, raw_input, status) VALUES (?, ?, ?)').run(goalId, '学投资', 'active');
    getDb().prepare(`INSERT INTO task (id, goal_id, title, estimated_minutes, time_block, energy_level, day_date) VALUES (?, ?, '完成练习', 30, 'morning', 'high', ? )`).run(taskId, goalId, date);
    const response = await POST(new Request(`http://localhost/api/tasks/${taskId}/complete`, { method: 'POST', body: JSON.stringify({ actualMinutes: 40, difficulty: 'harder_than_expected', note: '完成了' }) }), { params: Promise.resolve({ id: taskId }) });
    expect(response.status).toBe(200);
    expect(getDb().prepare('SELECT status, actual_minutes FROM task WHERE id = ?').get(taskId)).toEqual({ status: 'done', actual_minutes: 40 });
    expect(getDb().prepare('SELECT COUNT(*) count FROM execution_event WHERE task_id = ?').get(taskId)).toEqual({ count: 1 });
    getDb().prepare('DELETE FROM execution_event WHERE task_id = ?').run(taskId); getDb().prepare('DELETE FROM task WHERE id = ?').run(taskId); getDb().prepare('DELETE FROM goal WHERE id = ?').run(goalId); getDb().prepare("DELETE FROM personal_model WHERE id = 'singleton'").run();
  });

  it('跳过任务时记录原因', async () => {
    const goalId = generateId(); const taskId = generateId();
    getDb().prepare('INSERT INTO goal (id, raw_input, status) VALUES (?, ?, ?)').run(goalId, '学投资', 'active');
    getDb().prepare(`INSERT INTO task (id, goal_id, title, estimated_minutes, time_block, energy_level, day_date) VALUES (?, ?, '完成练习', 30, 'evening', 'medium', '2026-07-13')`).run(taskId, goalId);
    const response = await skip(new Request(`http://localhost/api/tasks/${taskId}/skip`, { method: 'POST', body: JSON.stringify({ reason: 'no_time' }) }), { params: Promise.resolve({ id: taskId }) });
    expect(response.status).toBe(200);
    expect(getDb().prepare('SELECT status, skip_reason FROM task WHERE id = ?').get(taskId)).toEqual({ status: 'skipped', skip_reason: 'no_time' });
    getDb().prepare('DELETE FROM execution_event WHERE task_id = ?').run(taskId); getDb().prepare('DELETE FROM task WHERE id = ?').run(taskId); getDb().prepare('DELETE FROM goal WHERE id = ?').run(goalId); getDb().prepare("DELETE FROM personal_model WHERE id = 'singleton'").run();
  });
});
