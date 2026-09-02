import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WorkspaceShell } from '@/app/workspace/workspace-shell';

describe('工作台壳层', () => {
  it('在任意页面保留所有工作区入口并突出当前页面', () => {
    const html = renderToStaticMarkup(<WorkspaceShell active="today" goalName="独立完成财报分析">内容</WorkspaceShell>);
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/decision-path"');
    expect(html).toContain('href="/goal-tree"');
    expect(html).toContain('href="/today"');
    expect(html).toContain('href="/reflection"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('独立完成财报分析');
  });
});
