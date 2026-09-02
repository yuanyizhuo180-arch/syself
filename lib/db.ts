/**
 * 数据库层 — 自动适配 Vercel Postgres (prod) / better-sqlite3 (dev)
 *
 * Vercel 部署时自动检测 POSTGRES_URL 环境变量，切换到 @vercel/postgres。
 * 本地开发时使用 better-sqlite3 零配置运行。
 *
 * 对外暴露统一 API：run / get / all / transaction / generateId / closeDb
 */

import type Database from 'better-sqlite3';
import { createD1Adapter, type D1DatabaseLike } from './d1-adapter';

// ============================================================
// 后端检测
// ============================================================

const isPostgres = !!(
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING
);

// ============================================================
// Postgres 后端（Vercel 生产环境）
// ============================================================

let _pgPool: import('@vercel/postgres').VercelPool | null = null;
let _d1Adapter: ReturnType<typeof createD1Adapter> | null = null;

async function getD1Adapter(): Promise<ReturnType<typeof createD1Adapter> | null> {
  if (_d1Adapter) return _d1Adapter;
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const context = await getCloudflareContext();
    const env = context.env as unknown as { DB?: D1DatabaseLike };
    if (!env.DB) return null;
    _d1Adapter = createD1Adapter(env.DB);
    return _d1Adapter;
  } catch {
    return null;
  }
}

async function getPgPool(): Promise<import('@vercel/postgres').VercelPool> {
  if (!_pgPool) {
    const { createPool } = await import('@vercel/postgres');
    _pgPool = createPool();
    await initPgSchema(_pgPool);
  }
  return _pgPool;
}

/** 将 SQLite ? 占位符转为 Postgres $1, $2, ... */
function toPgParams(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function initPgSchema(pool: import('@vercel/postgres').VercelPool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS goal (
      id TEXT PRIMARY KEY,
      raw_input TEXT NOT NULL,
      normalized_name TEXT,
      success_criteria TEXT,
      target_date TEXT,
      primary_area TEXT,
      current_state TEXT,
      status TEXT DEFAULT 'draft',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS goal_understanding (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL REFERENCES goal(id),
      extracted_json TEXT NOT NULL,
      assumptions_json TEXT NOT NULL,
      missing_info_json TEXT,
      confidence DOUBLE PRECISION DEFAULT 0,
      prompt_version TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS follow_up_answers (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL REFERENCES goal(id),
      field TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS plan_route (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL REFERENCES goal(id),
      route_type TEXT NOT NULL,
      title TEXT NOT NULL,
      thesis TEXT NOT NULL,
      phases_json TEXT NOT NULL,
      advantages_json TEXT NOT NULL,
      risks_json TEXT NOT NULL,
      first_month_preview_json TEXT NOT NULL,
      user_profile_basis_json TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS route_selection (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL REFERENCES goal(id),
      selected_route_id TEXT NOT NULL REFERENCES plan_route(id),
      rejected_route_id TEXT NOT NULL REFERENCES plan_route(id),
      user_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS task (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL REFERENCES goal(id),
      route_id TEXT REFERENCES plan_route(id),
      title TEXT NOT NULL,
      completion_criteria TEXT,
      minimum_action TEXT,
      estimated_minutes INTEGER,
      actual_minutes INTEGER,
      quadrant TEXT DEFAULT 'important_not_urgent',
      time_block TEXT,
      day_date TEXT,
      energy_level TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'planned',
      skip_reason TEXT,
      partial_note TEXT,
      user_modified_fields TEXT DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS execution_event (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES task(id),
      goal_id TEXT NOT NULL REFERENCES goal(id),
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      actual_minutes INTEGER,
      difficulty TEXT,
      note TEXT,
      skip_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS daily_reflection (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL REFERENCES goal(id),
      date TEXT NOT NULL,
      stats_json TEXT NOT NULL,
      user_rating INTEGER,
      user_note TEXT,
      incomplete_reasons_json TEXT DEFAULT '[]',
      ai_insight_json TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS personal_model (
      id TEXT PRIMARY KEY DEFAULT 'singleton',
      behavior_patterns_json TEXT DEFAULT '{}',
      goal_preferences_json TEXT DEFAULT '{}',
      calibration_json TEXT DEFAULT '{}',
      data_points INTEGER DEFAULT 0,
      confidence DOUBLE PRECISION DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS planning_branch (
      id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id), parent_branch_id TEXT REFERENCES planning_branch(id),
      base_decision_event_id TEXT, status TEXT NOT NULL DEFAULT 'active', reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS goal_work_node (
      id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id), parent_id TEXT REFERENCES goal_work_node(id),
      branch_id TEXT NOT NULL REFERENCES planning_branch(id), node_type TEXT NOT NULL, title TEXT NOT NULL, success_criteria TEXT NOT NULL,
      start_date TEXT NOT NULL, end_date TEXT NOT NULL, status TEXT NOT NULL, source TEXT NOT NULL, route_phase_ref TEXT,
      supersedes_id TEXT REFERENCES goal_work_node(id), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), completed_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS decision_event (
      id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id), branch_id TEXT NOT NULL REFERENCES planning_branch(id),
      event_type TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, before_json TEXT, after_json TEXT,
      rationale TEXT, impact_json TEXT NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE task ADD COLUMN IF NOT EXISTS work_node_id TEXT REFERENCES goal_work_node(id);
  `);
}

// ============================================================
// SQLite 后端（本地开发）
// ============================================================

let _sqliteDb: Database.Database | null = null;

function getSqliteDb(): Database.Database {
  if (!_sqliteDb) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- SQLite is a Node-only local-development fallback.
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- SQLite is a Node-only local-development fallback.
    const path = require('path');
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- SQLite is a Node-only local-development fallback.
    const Database = require('better-sqlite3');
    const dbPath = path.join(process.cwd(), 'data', 'mvp-0.1.db');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSqliteSchema(db);
    _sqliteDb = db;
  }
  return _sqliteDb!;
}

function initSqliteSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS goal (
      id TEXT PRIMARY KEY, raw_input TEXT NOT NULL, normalized_name TEXT, success_criteria TEXT,
      target_date TEXT, primary_area TEXT, current_state TEXT, status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS goal_understanding (
      id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id), extracted_json TEXT NOT NULL,
      assumptions_json TEXT NOT NULL, missing_info_json TEXT, confidence REAL DEFAULT 0,
      prompt_version TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS follow_up_answers (
      id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id), field TEXT NOT NULL,
      question TEXT NOT NULL, answer TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS plan_route (
      id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id), route_type TEXT NOT NULL,
      title TEXT NOT NULL, thesis TEXT NOT NULL, phases_json TEXT NOT NULL, advantages_json TEXT NOT NULL,
      risks_json TEXT NOT NULL, first_month_preview_json TEXT NOT NULL, user_profile_basis_json TEXT NOT NULL,
      status TEXT DEFAULT 'draft', created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS route_selection (
      id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id),
      selected_route_id TEXT NOT NULL REFERENCES plan_route(id),
      rejected_route_id TEXT NOT NULL REFERENCES plan_route(id), user_notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS task (
      id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id), route_id TEXT REFERENCES plan_route(id),
      title TEXT NOT NULL, completion_criteria TEXT, minimum_action TEXT, estimated_minutes INTEGER,
      actual_minutes INTEGER, quadrant TEXT DEFAULT 'important_not_urgent', time_block TEXT, day_date TEXT,
      energy_level TEXT DEFAULT 'medium', work_node_id TEXT REFERENCES goal_work_node(id), status TEXT DEFAULT 'planned', skip_reason TEXT, partial_note TEXT,
      user_modified_fields TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS execution_event (
      id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES task(id), goal_id TEXT NOT NULL REFERENCES goal(id),
      date TEXT NOT NULL, status TEXT NOT NULL, actual_minutes INTEGER, difficulty TEXT, note TEXT,
      skip_reason TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS daily_reflection (
      id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id), date TEXT NOT NULL,
      stats_json TEXT NOT NULL, user_rating INTEGER, user_note TEXT, incomplete_reasons_json TEXT DEFAULT '[]',
      ai_insight_json TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS personal_model (
      id TEXT PRIMARY KEY DEFAULT 'singleton', behavior_patterns_json TEXT DEFAULT '{}',
      goal_preferences_json TEXT DEFAULT '{}', calibration_json TEXT DEFAULT '{}', data_points INTEGER DEFAULT 0,
      confidence REAL DEFAULT 0, updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS planning_branch (
      id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id), parent_branch_id TEXT REFERENCES planning_branch(id),
      base_decision_event_id TEXT, status TEXT NOT NULL DEFAULT 'active', reason TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS goal_work_node (
      id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id), parent_id TEXT REFERENCES goal_work_node(id),
      branch_id TEXT NOT NULL REFERENCES planning_branch(id), node_type TEXT NOT NULL, title TEXT NOT NULL, success_criteria TEXT NOT NULL,
      start_date TEXT NOT NULL, end_date TEXT NOT NULL, status TEXT NOT NULL, source TEXT NOT NULL, route_phase_ref TEXT,
      supersedes_id TEXT REFERENCES goal_work_node(id), created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS decision_event (
      id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goal(id), branch_id TEXT NOT NULL REFERENCES planning_branch(id),
      event_type TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, before_json TEXT, after_json TEXT,
      rationale TEXT, impact_json TEXT NOT NULL DEFAULT '{}', created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  try { db.exec('ALTER TABLE goal ADD COLUMN current_state TEXT'); } catch { /* 列已存在 */ }
  try { db.exec('ALTER TABLE task ADD COLUMN work_node_id TEXT REFERENCES goal_work_node(id)'); } catch { /* 列已存在 */ }
}

// ============================================================
// 统一异步 API（两种后端共用）
// ============================================================

export async function run(sql: string, ...params: unknown[]): Promise<{ changes: number }> {
  if (isPostgres) {
    const pool = await getPgPool();
    const { rowCount } = await pool.query(toPgParams(sql), params);
    return { changes: rowCount ?? 0 };
  }
  const d1 = await getD1Adapter();
  if (d1) return d1.run(sql, ...params);
  // SQLite 同步 → 包装为 Promise
  const db = getSqliteDb();
  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return { changes: result.changes };
}

export async function get<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
  if (isPostgres) {
    const pool = await getPgPool();
    const { rows } = await pool.query(toPgParams(sql), params);
    return rows[0] as T | undefined;
  }
  const d1 = await getD1Adapter();
  if (d1) return d1.get<T>(sql, ...params);
  const db = getSqliteDb();
  return db.prepare(sql).get(...params) as T | undefined;
}

export async function all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
  if (isPostgres) {
    const pool = await getPgPool();
    const { rows } = await pool.query(toPgParams(sql), params);
    return rows as T[];
  }
  const d1 = await getD1Adapter();
  if (d1) return d1.all<T>(sql, ...params);
  const db = getSqliteDb();
  return db.prepare(sql).all(...params) as T[];
}

export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  if (isPostgres) {
    const pool = await getPgPool();
    await pool.query('BEGIN');
    try {
      const result = await fn();
      await pool.query('COMMIT');
      return result;
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }
  }
  const d1 = await getD1Adapter();
  if (d1) return fn();
  // SQLite: BEGIN/COMMIT/ROLLBACK 手动事务
  // fn 内的 run/get/all 在 SQLite 模式下同步 resolve，不会真正挂起
  const db = getSqliteDb();
  db.prepare('BEGIN').run();
  try {
    const result = await fn();
    db.prepare('COMMIT').run();
    return result;
  } catch (e) {
    db.prepare('ROLLBACK').run();
    throw e;
  }
}

// ============================================================
// 辅助函数
// ============================================================

export function generateId(): string {
  return crypto.randomUUID();
}

export async function closeDb(): Promise<void> {
  if (isPostgres && _pgPool) {
    await _pgPool.end();
    _pgPool = null;
  } else if (_sqliteDb) {
    _sqliteDb.close();
    _sqliteDb = null;
  }
}

// ============================================================
// 测试辅助：获取原始 SQLite 实例（仅本地测试使用）
// Postgres 环境下抛出，禁止在测试中连接生产 DB
// ============================================================

export function getTestDb(): Database.Database {
  if (isPostgres) {
    throw new Error('getTestDb() 仅在 SQLite 本地开发环境可用。Postgres 测试请使用 run/get/all。');
  }
  return getSqliteDb();
}
