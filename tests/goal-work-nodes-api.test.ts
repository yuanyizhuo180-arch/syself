import { afterEach, describe, expect, it } from 'vitest';

import { PATCH } from '@/app/api/goal-work-nodes/[id]/route';
import { closeDb, generateId, getTestDb } from '@/lib/db';

afterEach(() => closeDb());

describe('目标工作树节点 API', () => {
  it('采纳 AI 月目标时激活节点并记录不可变决策', async () => {
    const db = getTestDb();
    const goalId = generateId();
    const branchId = generateId();
    const nodeId = generateId();
    db.prepare("INSERT INTO goal (id, raw_input, status) VALUES (?, ?, 'active')").run(goalId, '完成财报分析');
    db.prepare("INSERT INTO planning_branch (id, goal_id, status) VALUES (?, ?, 'active')").run(branchId, goalId);
    db.prepare("INSERT INTO goal_work_node (id, goal_id, parent_id, branch_id, node_type, title, success_criteria, start_date, end_date, status, source) VALUES (?, ?, NULL, ?, 'month', '建立框架', '完成一页分析', '2026-09-01', '2026-09-30', 'suggested', 'ai_suggestion')").run(nodeId, goalId, branchId);

    const response = await PATCH(
      new Request(`http://localhost/api/goal-work-nodes/${nodeId}`, { method: 'PATCH', body: JSON.stringify({ action: 'accept' }) }),
      { params: Promise.resolve({ id: nodeId }) },
    );

    expect(response.status).toBe(200);
    expect(db.prepare('SELECT status FROM goal_work_node WHERE id = ?').get(nodeId)).toEqual({ status: 'active' });
    expect(db.prepare('SELECT event_type, before_json FROM decision_event WHERE entity_id = ?').get(nodeId)).toEqual(
      expect.objectContaining({ event_type: 'node_accepted' }),
    );
  });
});
