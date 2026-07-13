import { afterEach, describe, expect, it } from 'vitest';
import { createReflectHandler } from '@/app/api/ai/reflect/route';
import { closeDb, generateId, getDb } from '@/lib/db';
import type { AIInsight } from '@/lib/schemas/reflection';

const insight: AIInsight = {
  one_line_insight: '今天已经完成关键练习，明天只需为未完成事项留出缓冲。',
  positive_observation: '你完成了上午安排的关键练习。',
  improvement_hint: '把未完成任务安排在明天的第一个空闲时段，并预留十五分钟缓冲。',
  adjustment_suggestion: {
    type: 'add_buffer',
    description: '为未完成任务预留十五分钟缓冲。',
    reason: '今天有一项任务因时间不足跳过。',
  },
  tomorrow_preview: '明天先完成这项未完成任务，再进入新的安排。',
  tone: 'direct',
};

afterEach(() => closeDb());

describe('POST /api/ai/reflect', () => {
  it('计算当日数据、保存复盘并写回 Personal Model', async () => {
    const goalId = generateId(); const doneTaskId = generateId(); const skippedTaskId = generateId(); const date = '2026-07-13';
    const db = getDb();
    db.prepare('INSERT INTO goal (id, raw_input, status) VALUES (?, ?, ?)').run(goalId, '学习投资', 'active');
    db.prepare("INSERT INTO task (id, goal_id, title, estimated_minutes) VALUES (?, ?, '完成练习', 30)").run(doneTaskId, goalId);
    db.prepare("INSERT INTO task (id, goal_id, title, estimated_minutes) VALUES (?, ?, '阅读资料', 20)").run(skippedTaskId, goalId);
    db.prepare("INSERT INTO execution_event (id, task_id, goal_id, date, status, actual_minutes, note) VALUES (?, ?, ?, ?, 'done', 35, '完成')").run(generateId(), doneTaskId, goalId, date);
    db.prepare("INSERT INTO execution_event (id, task_id, goal_id, date, status, skip_reason) VALUES (?, ?, ?, ?, 'skipped', 'no_time')").run(generateId(), skippedTaskId, goalId, date);

    const handler = createReflectHandler(async () => ({ result: insight, error: null, attempts: 1, promptVersion: 'v1', recoverable: false }));
    const response = await handler(new Request('http://localhost/api/ai/reflect', { method: 'POST', body: JSON.stringify({ goalId, date, userRating: 3, userNote: '下午被会议打断', incompleteReasons: ['no_time'] }) }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ stats: { totalTasks: 2, completedTasks: 1, skippedTasks: 1 }, insight });
    expect(db.prepare('SELECT user_rating, ai_insight_json FROM daily_reflection WHERE goal_id = ? AND date = ?').get(goalId, date)).toMatchObject({ user_rating: 3 });
    expect(db.prepare("SELECT data_points FROM personal_model WHERE id = 'singleton'").get()).toMatchObject({ data_points: 1 });

    db.prepare('DELETE FROM daily_reflection WHERE goal_id = ?').run(goalId);
    db.prepare('DELETE FROM execution_event WHERE goal_id = ?').run(goalId);
    db.prepare('DELETE FROM task WHERE goal_id = ?').run(goalId);
    db.prepare('DELETE FROM goal WHERE id = ?').run(goalId);
    db.prepare("DELETE FROM personal_model WHERE id = 'singleton'").run();
  });
});
