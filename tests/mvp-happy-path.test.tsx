import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import Home from '@/app/page';
import { closeDb, getDb } from '@/lib/db';

describe('MVP 首页骨架', () => {
  it('聚焦单一目标输入并说明完整规划闭环', () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('把模糊目标，');
    expect(html).toContain('变成今天能开始的行动');
    expect(html).toContain('告诉我，你现在最想推进的一件事');
    expect(html).toContain('帮我规划');
    expect(html).toContain('理解目标');
    expect(html).toContain('比较路线');
    expect(html).toContain('开始本周');
  });
});

describe('SQLite 工程基座', () => {
  it('初始化 MVP 核心数据表', () => {
    const db = getDb();
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as { name: string }[];
    const tables = rows.map((row) => row.name);

    expect(tables).toEqual(
      expect.arrayContaining([
        'goal',
        'goal_understanding',
        'plan_route',
        'task',
        'execution_event',
        'daily_reflection',
        'personal_model',
      ]),
    );

    closeDb();
  });
});
