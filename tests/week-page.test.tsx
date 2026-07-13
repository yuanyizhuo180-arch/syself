import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WeekPlanPanel } from '@/app/plan/week/week-plan-panel';
import type { WeeklyPlan } from '@/lib/schemas/task';

describe('首周任务确认页', () => {
  it('显示容量和每项最低行动，并要求用户确认', () => {
    const plan: WeeklyPlan = { tasks: Array.from({ length: 5 }, (_, index) => ({ title: `完成练习 ${index + 1}`, completion_criteria: '交付笔记', minimum_action: '标记数据', estimated_minutes: 30, quadrant: 'important_not_urgent', day_of_week: index + 1, energy_level: 'medium', why_this_task: '建立节奏', is_output_oriented: true })), total_minutes: 150, weekly_capacity_percentage: 50, ai_note: '先建立节奏', overload_warning: null };
    const html = renderToStaticMarkup(<WeekPlanPanel plan={plan} weeklyMinutes={300} onConfirm={() => {}} />);
    expect(html).toContain('首周，不求塞满');
    expect(html).toContain('150 / 210 分钟');
    expect(html).toContain('最低行动');
    expect(html).toContain('确认这一周');
  });
});
