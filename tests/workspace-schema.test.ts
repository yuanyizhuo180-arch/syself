import { afterEach, describe, expect, it } from 'vitest';

import { closeDb, getTestDb } from '@/lib/db';

afterEach(() => closeDb());

describe('工作台数据结构', () => {
  it('创建工作树、分支和决策事件表，并允许旧任务没有周目标', () => {
    const db = getTestDb();

    for (const name of ['goal_work_node', 'planning_branch', 'decision_event']) {
      expect(
        db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name),
      ).toEqual({ name });
    }

    expect(db.prepare('PRAGMA table_info(task)').all()).toContainEqual(
      expect.objectContaining({ name: 'work_node_id', notnull: 0 }),
    );
  });
});
