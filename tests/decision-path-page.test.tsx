import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DecisionTimeline } from '@/app/workspace/decision-timeline';

describe('决策路径', () => {
  it('显示选择依据、影响和重新规划入口', () => {
    const html = renderToStaticMarkup(<DecisionTimeline events={[{ id: 'e1', event_type: 'route_selected', created_at: '2026-09-02', rationale: '每周只能投入五小时', impact_json: '{}' }]} />);
    expect(html).toContain('路线已选择');
    expect(html).toContain('每一步都有来处');
    expect(html).toContain('每周只能投入五小时');
    expect(html).toContain('从这里重新规划');
  });
});
