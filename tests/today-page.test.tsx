import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TodayTaskList } from '@/app/today/today-task-list';
import { TodayClient } from '@/app/today/today-client';
import { TaskRecoveryPanel } from '@/app/today/task-recovery-panel';

describe('今日执行页', () => {
  it('使用聚焦当前行动的短标题', () => {
    const html = renderToStaticMarkup(<TodayClient />);
    expect(html).toContain('此刻只做一件事');
  });

  it('展示完成标准和最小行动', () => {
    const html = renderToStaticMarkup(<TodayTaskList tasks={[{ id: '1', title: '完成一份分析', estimated_minutes: 45, completion_criteria: '交付一页笔记', minimum_action: '标记三个数据', status: 'planned' }]} onComplete={() => {}} onSkip={() => {}} />);
    expect(html).toContain('完成一份分析'); expect(html).toContain('完成标准'); expect(html).toContain('最低行动'); expect(html).toContain('完成'); expect(html).toContain('跳过');
  });

  it('为跳过任务提供温和的恢复选项', () => {
    const html = renderToStaticMarkup(<TaskRecoveryPanel taskTitle="训练分类基线" onRecover={() => {}} onCancel={() => {}} />);
    expect(html).toContain('先选择恢复方式');
    expect(html).toContain('缩小为最低行动');
    expect(html).toContain('移至明天');
    expect(html).toContain('暂停本周目标');
  });
});
