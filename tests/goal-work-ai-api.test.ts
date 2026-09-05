import { afterEach, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/ai/goal-work-tree/route';
import { closeDb, generateId, getTestDb } from '@/lib/db';

afterEach(() => closeDb());

describe('目标工作树 AI 建议 API', () => {
  it('根据已选路线保存当前与未来的月目标和周目标', async () => {
    const db = getTestDb();
    const goalId = generateId(); const branchId = generateId(); const routeId = generateId();
    db.prepare("INSERT INTO goal (id, raw_input, normalized_name, status) VALUES (?, ?, ?, 'active')").run(goalId, '学习 NLP', '掌握 NLP 实战');
    db.prepare("INSERT INTO planning_branch (id, goal_id, status) VALUES (?, ?, 'active')").run(branchId, goalId);
    db.prepare("INSERT INTO plan_route (id, goal_id, route_type, title, thesis, phases_json, advantages_json, risks_json, first_month_preview_json, user_profile_basis_json, status) VALUES (?, ?, 'depth_first', ?, ?, ?, '[]', '[]', ?, '[]', 'selected')").run(routeId, goalId, '实战优先', '先完成一个可运行项目', JSON.stringify([{ name: '分类基线', duration: '第 1 月', focus: '完成数据准备与文本分类基线' }, { name: '误差分析', duration: '第 2 月', focus: '完成误差分析与模型迭代' }]), JSON.stringify({ week1_summary: '完成分类基线', week2_summary: '复盘分类误差' }));

    const response = await POST(new Request('http://localhost/api/ai/goal-work-tree', { method: 'POST', body: JSON.stringify({ goalId }) }));

    expect(response.status).toBe(201);
    const body = await response.json() as { nodes: Array<{ node_type: string; parent_id: string | null; status: string; source: string }> };
    expect(body.nodes).toHaveLength(4);
    expect(body.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ node_type: 'month', parent_id: null, status: 'active', source: 'ai_suggestion' }),
      expect.objectContaining({ node_type: 'week', status: 'active', source: 'ai_suggestion' }),
      expect.objectContaining({ node_type: 'month', parent_id: null, status: 'suggested', source: 'ai_suggestion' }),
      expect.objectContaining({ node_type: 'week', status: 'suggested', source: 'ai_suggestion' }),
    ]));
    expect(db.prepare("SELECT COUNT(*) AS count FROM decision_event WHERE goal_id = ? AND event_type IN ('node_created', 'node_suggested')").get(goalId)).toEqual({ count: 4 });
  });
});
