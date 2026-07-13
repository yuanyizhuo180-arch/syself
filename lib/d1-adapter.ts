export interface D1StatementLike {
  bind(...params: unknown[]): {
    run(): Promise<{ meta: { changes?: number } }>;
    first(): Promise<unknown | null>;
    all(): Promise<{ results: unknown[] }>;
  };
}

export interface D1DatabaseLike {
  prepare(sql: string): D1StatementLike;
}

export function createD1Adapter(database: D1DatabaseLike) {
  return {
    async run(sql: string, ...params: unknown[]): Promise<{ changes: number }> {
      const result = await database.prepare(sql).bind(...params).run();
      return { changes: result.meta.changes ?? 0 };
    },
    async get<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
      return ((await database.prepare(sql).bind(...params).first()) as T | null) ?? undefined;
    },
    async all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      return (await database.prepare(sql).bind(...params).all()).results as T[];
    },
  };
}
