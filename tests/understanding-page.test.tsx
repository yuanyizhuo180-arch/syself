import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { UnderstandingPanel } from '@/app/plan/understanding/understanding-panel';

describe('目标理解确认页', () => {
  it('区分用户信息、AI 假设和关键追问', () => {
    const html = renderToStaticMarkup(
      <UnderstandingPanel
        goalId="goal-1"
        understanding={{
          goal_type: 'skill_acquisition',
          desired_outcome: '六个月内独立分析上市公司财报',
          current_state: '没有系统财务基础',
          time_horizon: '6个月',
          intensity: 'moderate',
          implicit_constraints: {
            time_per_week_hours: 5,
            budget_required: null,
            location_dependent: false,
            requires_mentor: false,
          },
          risks: {
            dropout_triggers: ['只阅读、不输出'],
            knowledge_gaps: ['会计基础'],
            behavioral_risks: ['信息过载'],
          },
          missing_information: [
            {
              field: 'past_attempts',
              question: '你以前尝试过哪些学习方式？',
              why_important: '用于避开已经失败的路径',
              priority: 'critical',
            },
          ],
          assumptions: [
            {
              statement: '可能更适合边学边做',
              basis: 'inferred',
              verifiable: true,
              verification_method: '首周任务反馈',
            },
          ],
          confidence: 0.58,
        }}
      />,
    );

    expect(html).toContain('AI 对你的理解');
    expect(html).toContain('需要你确认的假设');
    expect(html).toContain('可能更适合边学边做');
    expect(html).toContain('关键追问');
    expect(html).toContain('你以前尝试过哪些学习方式？');
    expect(html).toContain('确认并比较路线');
  });
});
