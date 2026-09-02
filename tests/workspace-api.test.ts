import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/workspace/route';
import { closeDb, generateId, getTestDb } from '@/lib/db';

afterEach(() => { vi.useRealTimers(); return closeDb(); });

describe('工作台读模型', () => {
  it('将今日任务关联到它所属的月目标和周目标', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-02T10:00:00.000Z'));
    const db = getTestDb(); const goal = generateId(), branch = generateId(), month = generateId(), week = generateId();
    db.prepare("UPDATE goal SET status = 'draft' WHERE status = 'active'").run();
    db.prepare("INSERT INTO goal (id, raw_input, normalized_name, status) VALUES (?, ?, ?, 'active')").run(goal, '学习 NLP', '学习 NLP');
    db.prepare("INSERT INTO planning_branch (id, goal_id, status) VALUES (?, ?, 'active')").run(branch, goal);
    db.prepare("INSERT INTO goal_work_node (id, goal_id, parent_id, branch_id, node_type, title, success_criteria, start_date, end_date, status, source) VALUES (?, ?, NULL, ?, 'month', 'NLP 月目标', '完成框架', '2026-09-01', '2026-09-30', 'active', 'manual')").run(month, goal, branch);
    db.prepare("INSERT INTO goal_work_node (id, goal_id, parent_id, branch_id, node_type, title, success_criteria, start_date, end_date, status, source) VALUES (?, ?, ?, ?, 'week', 'NLP 周目标', '训练基线', '2026-09-02', '2026-09-08', 'active', 'manual')").run(week, goal, month, branch);
    db.prepare("INSERT INTO task (id, goal_id, work_node_id, title, completion_criteria, minimum_action, estimated_minutes, day_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned')").run(generateId(), goal, week, '训练基线', '完成一次训练', '运行脚本', 45, '2026-09-02');
    const body = await (await GET()).json();
    expect(body.keyAction).toMatchObject({ monthTitle: 'NLP 月目标', weekTitle: 'NLP 周目标' });
  });
});
