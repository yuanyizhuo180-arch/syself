import { afterEach, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/replans/route';
import { closeDb, generateId, getTestDb } from '@/lib/db';

afterEach(() => closeDb());

describe('重新规划 API', () => {
  it('从决策事件创建新分支而不覆盖旧分支', async () => {
    const db = getTestDb();
    const goalId = generateId(); const oldBranchId = generateId(); const eventId = generateId();
    db.prepare("INSERT INTO goal (id, raw_input, status) VALUES (?, ?, 'active')").run(goalId, '学习 NLP');
    db.prepare("INSERT INTO planning_branch (id, goal_id, status) VALUES (?, ?, 'active')").run(oldBranchId, goalId);
    db.prepare("INSERT INTO decision_event (id, goal_id, branch_id, event_type, entity_type, entity_id, before_json, after_json, rationale) VALUES (?, ?, ?, 'route_selected', 'plan_route', 'route-1', '{}', '{}', '先训练基线')").run(eventId, goalId, oldBranchId);

    const response = await POST(new Request('http://localhost/api/replans', { method: 'POST', body: JSON.stringify({ goalId, eventId, reason: '每周可投入时间减少' }) }));

    expect(response.status).toBe(201);
    const branches = db.prepare('SELECT id, parent_branch_id, status FROM planning_branch WHERE goal_id = ? ORDER BY created_at').all(goalId) as Array<{ id: string; parent_branch_id: string | null; status: string }>;
    expect(branches).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: oldBranchId, status: 'superseded' }),
      expect.objectContaining({ parent_branch_id: oldBranchId, status: 'active' }),
    ]));
    expect(db.prepare("SELECT rationale FROM decision_event WHERE goal_id = ? AND event_type = 'replan_started'").get(goalId)).toEqual({ rationale: '每周可投入时间减少' });
  });
});
