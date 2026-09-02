import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReflectionPanel } from '@/app/reflection/reflection-panel';
import { ReflectionClient } from '@/app/reflection/reflection-client';
import type { AIInsight } from '@/lib/schemas/reflection';

const insight: AIInsight = {
  one_line_insight: '今天的关键任务已经推进，明天为剩余事项安排缓冲。',
  positive_observation: '你完成了最重要的一项任务。',
  improvement_hint: '将未完成事项放进明天的第一个空闲时段并留出缓冲。',
  adjustment_suggestion: { type: 'add_buffer', description: '预留十五分钟缓冲。', reason: '今天有任务被时间打断。' },
  tomorrow_preview: '明天先收尾，再开始新的任务。',
  tone: 'direct',
};

describe('每日复盘页', () => {
  it('使用为明天调整的短标题', () => {
    const html = renderToStaticMarkup(<ReflectionClient />);
    expect(html).toContain('为明天留出余地');
  });

  it('提供三题复盘、emoji 评分与 AI 洞察展示', () => {
    const html = renderToStaticMarkup(<ReflectionPanel loading={false} onSubmit={() => {}} insight={insight} />);
    expect(html).toContain('今天完成情况怎么样？');
    expect(html).toContain('没完成的任务是因为什么？');
    expect(html).toContain('明天需要调整什么？');
    expect(html).toContain('😄');
    expect(html).toContain('保存复盘');
    expect(html).toContain('AI 洞察');
    expect(html).toContain(insight.one_line_insight);
  });
});
