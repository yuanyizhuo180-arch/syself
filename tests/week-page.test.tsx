import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WeekPlanPanel } from '@/app/plan/week/week-plan-panel';
import type { WeeklyPlan } from '@/lib/schemas/task';

describe('首周任务确认页', () => {
  it('按未来七天每天三条显示行动，并要求用户确认', () => {
    const plan: WeeklyPlan = { tasks: Array.from({ length: 21 }, (_, index) => ({ title: `完成练习 ${index + 1}`, completion_criteria: '交付笔记', minimum_action: '标记数据', estimated_minutes: 30, quadrant: 'important_not_urgent', day_offset: Math.floor(index / 3), energy_level: index % 3 === 0 ? 'high' : 'medium', why_this_task: '建立节奏', is_output_oriented: true })), total_minutes: 630, ai_note: '连续七天推进' };
    const html = renderToStaticMarkup(<WeekPlanPanel plan={plan} onConfirm={() => {}} />);
    expect(html).toContain('未来 7 天 · 每天 3 项');
    expect(html).not.toContain('分钟</strong>');
    expect(html).toContain('最低行动');
    expect(html).toContain('确认这 7 天计划');
  });
});
