import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GoalWorkTree } from '@/app/workspace/goal-work-tree';

describe('目标工作树', () => {
  it('按月和周展示目标，并为建议节点提供采纳入口', () => {
    const html = renderToStaticMarkup(<GoalWorkTree nodes={[{ id: 'm1', parent_id: null, node_type: 'month', title: '建立分析框架', success_criteria: '完成一页笔记', status: 'active', source: 'manual' }, { id: 'w1', parent_id: 'm1', node_type: 'week', title: '现金流判断', success_criteria: '写出一个判断', status: 'suggested', source: 'ai_suggestion' }]} />);
    expect(html).toContain('建立分析框架');
    expect(html).toContain('远大目标近处落地');
    expect(html).toContain('现金流判断');
    expect(html).toContain('AI 建议');
    expect(html).toContain('采纳');
    expect(html).toContain('编辑文字');
  });
});
