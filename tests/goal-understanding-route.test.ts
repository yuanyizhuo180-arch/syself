import { afterEach, describe, expect, it } from 'vitest';

import { createUnderstandHandler } from '@/app/api/ai/understand/route';
import { closeDb, getTestDb as getDb } from '@/lib/db';

const validUnderstanding = {
  goal_type: 'skill_acquisition' as const,
  desired_outcome: '在六个月内独立分析一家上市公司的三张财务报表',
  current_state: '尚未系统学习财务知识',
  time_horizon: '6个月',
  intensity: 'moderate' as const,
  implicit_constraints: {
    time_per_week_hours: 5,
    budget_required: null,
    location_dependent: false,
    requires_mentor: false,
  },
  risks: {
    dropout_triggers: ['连续两周看不到可验证成果'],
    knowledge_gaps: ['会计基础'],
    behavioral_risks: ['容易只阅读而不实践'],
  },
  missing_information: [],
  assumptions: [
    {
      statement: '用户尚未系统学习财务知识',
      basis: 'user_stated' as const,
      verifiable: true,
      verification_method: '询问学习经历',
    },
  ],
  confidence: 0.8,
};

afterEach(() => closeDb());

describe('POST /api/ai/understand', () => {
  it('拒绝空目标', async () => {
    const handler = createUnderstandHandler(async () => {
      throw new Error('不应调用 AI');
    });
    const response = await handler(
      new Request('http://localhost/api/ai/understand', {
        method: 'POST',
        body: JSON.stringify({ rawGoal: '   ' }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('保存 AI 理解草稿并返回目标 ID', async () => {
    const handler = createUnderstandHandler(async () => ({
      result: validUnderstanding,
      error: null,
      attempts: 1,
      promptVersion: 'v1',
      recoverable: true,
    }));
    const response = await handler(
      new Request('http://localhost/api/ai/understand', {
        method: 'POST',
        body: JSON.stringify({ rawGoal: '我想学会分析财报' }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      understanding: validUnderstanding,
      requiresFollowUp: false,
    });
    expect(payload.goalId).toEqual(expect.any(String));

    const stored = getDb()
      .prepare('SELECT raw_input, status FROM goal WHERE id = ?')
      .get(payload.goalId) as { raw_input: string; status: string };
    expect(stored).toEqual({ raw_input: '我想学会分析财报', status: 'draft' });

    getDb().prepare('DELETE FROM goal_understanding WHERE goal_id = ?').run(payload.goalId);
    getDb().prepare('DELETE FROM goal WHERE id = ?').run(payload.goalId);
  });
});
