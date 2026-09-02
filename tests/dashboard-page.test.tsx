import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DashboardPanel } from '@/app/workspace/dashboard-panel';

describe('仪表盘', () => {
  it('将今天关键行动置于其他行动之前，并显示目标关联', () => {
    const html = renderToStaticMarkup(<DashboardPanel data={{ goalName: '独立完成财报分析', keyAction: { title: '写现金流观察', completionCriteria: '完成一页笔记', minimumAction: '找到现金流量表', estimatedMinutes: 45, monthTitle: '建立框架', weekTitle: '现金流判断' }, supportingActions: [], capacity: { committed: 45, limit: 210 } }} />);
    expect(html).toContain('今天的关键行动');
    expect(html).toContain('写现金流观察');
    expect(html).toContain('建立框架 / 现金流判断');
    expect(html).toContain('开始行动');
  });
});
