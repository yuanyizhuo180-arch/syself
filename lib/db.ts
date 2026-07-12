/**
 * SQLite 数据库初始化与操作封装
 *
 * MVP 0.1 使用 better-sqlite3（同步 API，零配置，零运维）
 * MVP 1.0 条件迁移到 PostgreSQL
 *
 * 所有查询以 goal_id 为租户键（MVP 0.1 单用户简化处理）
 */

import fs from 'node:fs';
import Database from 'better-sqlite3';
import path from 'path';

// ============================================================
// 数据库单例
// ============================================================

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const dbPath = path.join(process.cwd(), 'data', 'mvp-0.1.db');
    // 确保 data 目录存在
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

// ============================================================
// Schema 初始化
// ============================================================

function initSchema(db: Database.Database) {
  db.exec(`
    -- 目标表（单激活目标）
    CREATE TABLE IF NOT EXISTS goal (
      id TEXT PRIMARY KEY,
      raw_input TEXT NOT NULL,
      normalized_name TEXT,
      success_criteria TEXT,
      target_date TEXT,
      primary_area TEXT,
      current_state TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- AI 理解结果
    CREATE TABLE IF NOT EXISTS goal_understanding (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL REFERENCES goal(id),
      extracted_json TEXT NOT NULL,
      assumptions_json TEXT NOT NULL,
      missing_info_json TEXT,
      confidence REAL DEFAULT 0,
      prompt_version TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 用户对 AI 追问的回答
    CREATE TABLE IF NOT EXISTS follow_up_answers (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL REFERENCES goal(id),
      field TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 路线方案
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
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 路线选择记录（用于 Personal Model 偏好学习）
    CREATE TABLE IF NOT EXISTS route_selection (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL REFERENCES goal(id),
      selected_route_id TEXT NOT NULL REFERENCES plan_route(id),
      rejected_route_id TEXT NOT NULL REFERENCES plan_route(id),
      user_notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 任务
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 执行记录
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
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 每日复盘
    CREATE TABLE IF NOT EXISTS daily_reflection (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL REFERENCES goal(id),
      date TEXT NOT NULL,
      stats_json TEXT NOT NULL,
      user_rating INTEGER,
      user_note TEXT,
      incomplete_reasons_json TEXT DEFAULT '[]',
      ai_insight_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Personal Model（单例表，每个用户一行）
    CREATE TABLE IF NOT EXISTS personal_model (
      id TEXT PRIMARY KEY DEFAULT 'singleton',
      behavior_patterns_json TEXT DEFAULT '{}',
      goal_preferences_json TEXT DEFAULT '{}',
      calibration_json TEXT DEFAULT '{}',
      data_points INTEGER DEFAULT 0,
      confidence REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 兼容旧版 goal 表（没有 current_state 列）——安全补齐
  try {
    db.exec(`ALTER TABLE goal ADD COLUMN current_state TEXT`);
  } catch {
    // 列已存在，忽略
  }
}

// ============================================================
// 辅助：生成 UUID
// ============================================================

export function generateId(): string {
  return crypto.randomUUID();
}

// ============================================================
// 关闭数据库连接
// ============================================================

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
