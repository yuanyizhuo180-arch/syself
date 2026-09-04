import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { GoalWorkTree } from '@/app/workspace/goal-work-tree';
import { GoalNodeEditor } from '@/app/goal-tree/goal-node-editor';

describe('目标工作树', () => {
  it('沿主目标、月、周到今日三项行动展示当前路径', () => {
    const html = renderToStaticMarkup(<GoalWorkTree goalName="学习 NLP" today="2026-09-04" nodes={[
      { id: 'm1', parent_id: null, node_type: 'month', title: '建立 NLP 基础', success_criteria: '完成数据准备', start_date: '2026-09-01', end_date: '2026-09-30', status: 'active', source: 'manual' },
      { id: 'w1', parent_id: 'm1', node_type: 'week', title: '训练首个基线', success_criteria: '跑通训练', start_date: '2026-09-01', end_date: '2026-09-07', status: 'active', source: 'manual' },
      { id: 'w2', parent_id: 'm1', node_type: 'week', title: '误差分析与迭代', success_criteria: '完成误差诊断', start_date: '2026-09-08', end_date: '2026-09-14', status: 'suggested', source: 'ai_suggestion' },
      { id: 'm2', parent_id: null, node_type: 'month', title: '评估模型表现', success_criteria: '完成误差分析', start_date: '2026-10-01', end_date: '2026-10-31', status: 'suggested', source: 'ai_suggestion' },
    ]} tasks={[
      { id: 't1', work_node_id: 'w1', title: '整理中文情感数据集', completion_criteria: '输出可训练数据', minimum_action: '标记 20 条样本', estimated_minutes: 60, day_date: '2026-09-04', status: 'planned' },
      { id: 't2', work_node_id: 'w1', title: '训练 TF-IDF 基线', completion_criteria: '记录 F1', minimum_action: '运行训练脚本', estimated_minutes: 45, day_date: '2026-09-04', status: 'planned' },
      { id: 't3', work_node_id: 'w1', title: '写误差分析笔记', completion_criteria: '写下 3 个发现', minimum_action: '记录一个样本', estimated_minutes: 30, day_date: '2026-09-04', status: 'planned' },
      { id: 't4', work_node_id: 'w1', title: '暂缓的阅读任务', completion_criteria: '完成阅读', minimum_action: '读一页', estimated_minutes: 20, day_date: '2026-09-04', status: 'paused' },
    ]} />);
    expect(html).toContain('学习 NLP');
    expect(html).toContain('建立 NLP 基础');
    expect(html).toContain('当前月 · 第一个月');
    expect(html).toContain('训练首个基线');
    expect(html).toContain('今日行动 · AI 已安排 3 项');
    expect(html).toContain('整理中文情感数据集');
    expect(html).toContain('训练 TF-IDF 基线');
    expect(html).toContain('写误差分析笔记');
    expect(html).toContain('当前周 · 第 1 周');
    expect(html).toContain('下一章节 · 未展开');
    expect(html).toContain('后续任务 · 未展开');
    expect(html).toContain('已暂停 · 1 项');
  });

  it('提供页面内的目标编辑表单', () => {
    const html = renderToStaticMarkup(<GoalNodeEditor editor={{ mode: 'create', nodeType: 'month', parentId: null, title: '', successCriteria: '', startDate: '2026-09-03', endDate: '2026-10-03' }} onSave={() => {}} onCancel={() => {}} />);
    expect(html).toContain('新建月目标');
    expect(html).toContain('目标名称');
    expect(html).toContain('完成标准');
    expect(html).toContain('开始日期');
    expect(html).toContain('保存目标');
  });

  it('将日任务编辑与暂停操作连接到任务 PATCH 接口', () => {
    const source = readFileSync(join(process.cwd(), 'app/goal-tree/goal-tree-client.tsx'), 'utf8');
    expect(source).toContain("fetch(`/api/tasks/${id}`, { method: 'PATCH'");
    expect(source).toContain("action: 'pause'");
    expect(source).toContain('onEditTask={editTask}');
    expect(source).toContain('onPauseTask={pauseTask}');
  });
});
