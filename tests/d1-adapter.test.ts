import { describe, expect, it } from 'vitest';
import { createD1Adapter } from '@/lib/d1-adapter';

describe('D1Adapter', () => {
  it('使用参数绑定执行读写查询', async () => {
    const calls: unknown[][] = [];
    const adapter = createD1Adapter({
      prepare(sql) {
        return {
          bind(...params: unknown[]) {
            calls.push([sql, ...params]);
            return {
              run: async () => ({ meta: { changes: 2 } }),
              first: async () => ({ id: 'goal-1' }),
              all: async () => ({ results: [{ id: 'goal-1' }, { id: 'goal-2' }] }),
            };
          },
        };
      },
    });

    await expect(adapter.run('UPDATE goal SET status = ? WHERE id = ?', 'active', 'goal-1')).resolves.toEqual({ changes: 2 });
    await expect(adapter.get<{ id: string }>('SELECT id FROM goal WHERE id = ?', 'goal-1')).resolves.toEqual({ id: 'goal-1' });
    await expect(adapter.all<{ id: string }>('SELECT id FROM goal')).resolves.toEqual([{ id: 'goal-1' }, { id: 'goal-2' }]);
    expect(calls).toEqual([
      ['UPDATE goal SET status = ? WHERE id = ?', 'active', 'goal-1'],
      ['SELECT id FROM goal WHERE id = ?', 'goal-1'],
      ['SELECT id FROM goal'],
    ]);
  });
});
