import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/workspace/route';
import { closeDb, generateId, getTestDb } from '@/lib/db';
import { getGoalWorkTree } from '@/lib/workspace-repository';

afterEach(() => { vi.useRealTimers(); return closeDb(); });

describe('工作台读模型', () => {
  it('返回当前分支中归属周目标的任务摘要', async () => {
    const db = getTestDb(); const goal = generateId(), branch = generateId(), month = generateId(), week = generateId(), task = generateId(), oldBranch = generateId(), oldWeek = generateId(), oldTask = generateId();
    db.prepare("UPDATE goal SET status = 'draft' WHERE status = 'active'").run();
    db.prepare("INSERT INTO goal (id, raw_input, status) VALUES (?, ?, 'active')").run(goal, '学习 NLP');
    db.prepare("INSERT INTO planning_branch (id, goal_id, status) VALUES (?, ?, 'active')").run(branch, goal);
    db.prepare("INSERT INTO planning_branch (id, goal_id, status) VALUES (?, ?, 'superseded')").run(oldBranch, goal);
    db.prepare("INSERT INTO goal_work_node (id, goal_id, parent_id, branch_id, node_type, title, success_criteria, start_date, end_date, status, source) VALUES (?, ?, NULL, ?, 'month', '建立 NLP 基础', '完成数据准备', '2026-09-01', '2026-09-30', 'active', 'manual')").run(month, goal, branch);
    db.prepare("INSERT INTO goal_work_node (id, goal_id, parent_id, branch_id, node_type, title, success_criteria, start_date, end_date, status, source) VALUES (?, ?, ?, ?, 'week', '训练首个基线', '跑通训练', '2026-09-01', '2026-09-07', 'active', 'manual')").run(week, goal, month, branch);
    db.prepare("INSERT INTO goal_work_node (id, goal_id, parent_id, branch_id, node_type, title, success_criteria, start_date, end_date, status, source) VALUES (?, ?, NULL, ?, 'week', '历史周目标', '旧计划', '2026-08-01', '2026-08-07', 'completed', 'manual')").run(oldWeek, goal, oldBranch);
    db.prepare("INSERT INTO task (id, goal_id, work_node_id, title, completion_criteria, minimum_action, estimated_minutes, day_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned')").run(task, goal, week, '整理中文情感数据集', '输出可训练数据', '标记 20 条样本', 60, '2026-09-04');
    db.prepare("INSERT INTO task (id, goal_id, work_node_id, title, completion_criteria, minimum_action, estimated_minutes, day_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned')").run(oldTask, goal, oldWeek, '历史任务', '无需展示', '无需展示', 20, '2026-08-04');

    await expect(getGoalWorkTree(goal)).resolves.toMatchObject({
      branch: { id: branch },
      tasks: [expect.objectContaining({ id: task, work_node_id: week, minimum_action: '标记 20 条样本', estimated_minutes: 60 })],
    });
    await expect(getGoalWorkTree(goal)).resolves.not.toMatchObject({ tasks: [expect.objectContaining({ id: oldTask })] });
  });

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
