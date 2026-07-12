import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RouteComparisonPanel } from '@/app/plan/routes/route-comparison-panel';
import type { RouteComparison } from '@/lib/schemas/plan-route';

const comparison = {
  comparison_summary: '一条先纵深突破，一条先搭建全局地图。', recommendation: null,
  routes: ['depth_first', 'breadth_first'].map((route_type, index) => ({
    id: `route-${index}`, route_type, title: index ? '全景试跑' : '专项突破', thesis: '适合每周五小时投入', status: 'draft',
    phases: [{ name: '第一阶段', duration: '2周', focus: '形成成果', key_actions: ['输出分析'], success_marker: '完成报告', weekly_hours: 5 }],
    advantages: [{ point: '节奏明确', why_relevant_to_user: '可用时间有限' }],
    risks: [{ risk: '反馈过慢', probability: 'medium', mitigation: '设置周检查点', early_warning_sign: '连续三天未行动' }],
    first_month_preview: { week1_summary: '起步', week2_summary: '练习', week3_summary: '应用', week4_summary: '复盘' }, user_profile_basis: ['每周五小时'],
  })),
} as RouteComparison;

describe('路线比较页', () => {
  it('平等展示两条路线且不默认选择', () => {
    const html = renderToStaticMarkup(<RouteComparisonPanel comparison={comparison} selectedId={null} />);
    expect(html).toContain('专项突破');
    expect(html).toContain('全景试跑');
    expect(html).toContain('失败预警');
    expect(html).toContain('选择这条路线');
    expect(html).not.toContain('已选中');
  });
});
