import { afterEach, describe, expect, it } from 'vitest';

import { createRoutesHandler, PUT } from '@/app/api/ai/routes/route';
import { closeDb, generateId, getTestDb as getDb } from '@/lib/db';

const route = (type: 'depth_first' | 'breadth_first', hours: number) => ({
  route_type: type,
  title: type === 'depth_first' ? '先攻克财报' : '先建立投资地图',
  thesis: '基于用户每周五小时的限制设计',
  phases: [
    { name: type === 'depth_first' ? '攻克报表' : '建立全景', duration: '2周', focus: '基础', key_actions: ['完成一份分析'], success_marker: '输出分析', weekly_hours: hours },
    { name: type === 'depth_first' ? '专项应用' : '多维试跑', duration: '4周', focus: '实践', key_actions: ['比较两家公司'], success_marker: '完成比较', weekly_hours: hours },
  ],
  advantages: [{ point: type === 'depth_first' ? '快速形成专项成果' : '更早看见完整地图', why_relevant_to_user: '每周只有五小时' }, { point: '节奏明确', why_relevant_to_user: '需要结构' }],
  risks: [{ risk: '范围偏窄', probability: 'medium' as const, mitigation: '月末复查', early_warning_sign: '无法解释行业差异' }, { risk: '进度中断', probability: 'low' as const, mitigation: '使用最低行动', early_warning_sign: '连续三天未行动' }],
  first_month_preview: { week1_summary: '基础', week2_summary: '练习', week3_summary: '应用', week4_summary: '复盘' },
  user_profile_basis: ['每周可用五小时'],
  status: 'draft' as const,
});

afterEach(() => closeDb());

describe('POST /api/ai/routes', () => {
  it('保存两条差异化路线', async () => {
    const goalId = generateId();
    getDb().prepare('INSERT INTO goal (id, raw_input, status) VALUES (?, ?, ?)').run(goalId, '学投资', 'active');
    getDb().prepare(`INSERT INTO goal_understanding (id, goal_id, extracted_json, assumptions_json, confidence) VALUES (?, ?, ?, ?, ?)`)
      .run(generateId(), goalId, JSON.stringify({
        desired_outcome: '独立分析财报', current_state: '零基础', time_horizon: '6个月',
        implicit_constraints: { time_per_week_hours: 5 }, risks: { behavioral_risks: [], dropout_triggers: [] },
      }), '[]', 0.8);
    const routes = [route('depth_first', 4), route('breadth_first', 6)];
    const handler = createRoutesHandler(async () => ({ result: { routes, comparison_summary: '深度与广度的选择', recommendation: null }, error: null, attempts: 1, promptVersion: 'v1', recoverable: true }));

    const response = await handler(new Request('http://localhost/api/ai/routes', { method: 'POST', body: JSON.stringify({ goalId }) }));
    const body = await response.json();

    expect(response.status, JSON.stringify(body)).toBe(200);
    expect(body.routes).toHaveLength(2);
    expect(getDb().prepare('SELECT COUNT(*) count FROM plan_route WHERE goal_id = ?').get(goalId)).toEqual({ count: 2 });
    getDb().prepare('DELETE FROM plan_route WHERE goal_id = ?').run(goalId);
    getDb().prepare('DELETE FROM goal_understanding WHERE goal_id = ?').run(goalId);
    getDb().prepare('DELETE FROM goal WHERE id = ?').run(goalId);
  });

  it('只选中用户明确选择的路线', async () => {
    const goalId = generateId();
    const depthId = generateId();
    const breadthId = generateId();
    getDb().prepare('INSERT INTO goal (id, raw_input, status) VALUES (?, ?, ?)').run(goalId, '学投资', 'active');
    const insert = getDb().prepare(`INSERT INTO plan_route (id, goal_id, route_type, title, thesis, phases_json, advantages_json, risks_json, first_month_preview_json, user_profile_basis_json) VALUES (?, ?, ?, ?, ?, '[]', '[]', '[]', '{}', '[]')`);
    insert.run(depthId, goalId, 'depth_first', '深度路线', '先深后广');
    insert.run(breadthId, goalId, 'breadth_first', '广度路线', '先广后深');

    const response = await PUT(new Request('http://localhost/api/ai/routes', {
      method: 'PUT', body: JSON.stringify({ goalId, routeId: breadthId }),
    }));
    expect(response.status).toBe(200);
    const rows = getDb().prepare('SELECT id, status FROM plan_route WHERE goal_id = ? ORDER BY id').all(goalId) as { id: string; status: string }[];
    expect(rows.find((row) => row.id === breadthId)?.status).toBe('selected');
    expect(rows.find((row) => row.id === depthId)?.status).toBe('rejected');

    getDb().prepare('DELETE FROM plan_route WHERE goal_id = ?').run(goalId);
    getDb().prepare('DELETE FROM goal WHERE id = ?').run(goalId);
    getDb().prepare("DELETE FROM personal_model WHERE id = 'singleton'").run();
  });
});
