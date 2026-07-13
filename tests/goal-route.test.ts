import { afterEach, describe, expect, it } from 'vitest';

import { PUT } from '@/app/api/goal/route';
import { closeDb, generateId, getTestDb as getDb } from '@/lib/db';

afterEach(() => closeDb());

describe('PUT /api/goal', () => {
  it('确认目标并保存用户修订', async () => {
    const goalId = generateId();
    getDb().prepare('INSERT INTO goal (id, raw_input, status) VALUES (?, ?, ?)').run(
      goalId,
      '我想学投资',
      'draft',
    );

    const response = await PUT(new Request('http://localhost/api/goal', {
      method: 'PUT',
      body: JSON.stringify({
        goalId,
        desiredOutcome: '六个月内独立分析财报',
        currentState: '零基础',
        timeHorizon: '6个月',
      }),
    }));

    expect(response.status).toBe(200);
    const stored = getDb().prepare(
      'SELECT normalized_name, success_criteria, target_date, status FROM goal WHERE id = ?',
    ).get(goalId);
    expect(stored).toEqual({
      normalized_name: '六个月内独立分析财报',
      success_criteria: '六个月内独立分析财报',
      target_date: '6个月',
      status: 'active',
    });
    getDb().prepare('DELETE FROM goal WHERE id = ?').run(goalId);
  });
});
