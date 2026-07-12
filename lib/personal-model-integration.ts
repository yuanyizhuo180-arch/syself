/**
 * Personal Model 集成层 — API Route 安全调用的薄封装
 *
 * 职责：
 * - 从 SQLite 读取/写入 Personal Model
 * - 在关键业务事件发生时触发 applyEvent()
 * - 提供人类可读摘要用于注入 AI prompt
 *
 * 设计原则：
 * - API Routes 不直接操作 personal_model 表，通过本模块完成
 * - 所有 Personal Model 更新是"静默"的——失败不阻塞主流程
 * - 线程安全（better-sqlite3 同步 API 天然安全）
 */

import { getDb } from './db';
import {
  applyEvent,
  createDefaultPersonalModel,
  summarizePersonalModel,
  type PersonalModelData,
  type PersonalModelEvent,
} from './personal-model';

// ============================================================
// 读取当前 Personal Model（无锁，同步读）
// ============================================================

export function getPersonalModel(): PersonalModelData {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM personal_model WHERE id = ?')
    .get('singleton') as
    | {
        behavior_patterns_json: string;
        goal_preferences_json: string;
        calibration_json: string;
        data_points: number;
        confidence: number;
        updated_at: string;
      }
    | undefined;

  if (!row) {
    const model = createDefaultPersonalModel();
    db.prepare(
      `INSERT INTO personal_model (id, behavior_patterns_json, goal_preferences_json, calibration_json, data_points, confidence, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'singleton',
      JSON.stringify(model.behaviorPatterns),
      JSON.stringify(model.goalPreferences),
      JSON.stringify(model.calibration),
      model.dataPoints,
      model.confidence,
      model.updatedAt,
    );
    return model;
  }

  return {
    behaviorPatterns: JSON.parse(row.behavior_patterns_json),
    goalPreferences: JSON.parse(row.goal_preferences_json),
    calibration: JSON.parse(row.calibration_json),
    dataPoints: row.data_points,
    confidence: row.confidence,
    updatedAt: row.updated_at,
  };
}

// ============================================================
// 记录事件并更新 Personal Model
// 失败不抛异常——Personal Model 更新是"尽力而为"
// ============================================================

export function recordEvent(event: PersonalModelEvent): {
  updated: boolean;
  changes: string[];
  error?: string;
} {
  try {
    const model = getPersonalModel();
    const { model: updatedModel, changes } = applyEvent(model, event);

    const db = getDb();
    db.prepare(
      `UPDATE personal_model
       SET behavior_patterns_json = ?,
           goal_preferences_json = ?,
           calibration_json = ?,
           data_points = ?,
           confidence = ?,
           updated_at = ?
       WHERE id = ?`,
    ).run(
      JSON.stringify(updatedModel.behaviorPatterns),
      JSON.stringify(updatedModel.goalPreferences),
      JSON.stringify(updatedModel.calibration),
      updatedModel.dataPoints,
      updatedModel.confidence,
      updatedModel.updatedAt,
      'singleton',
    );

    return { updated: true, changes };
  } catch (error) {
    console.error(
      '[PersonalModel] Failed to record event:',
      event.type,
      error instanceof Error ? error.message : error,
    );
    return {
      updated: false,
      changes: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================
// 获取人类可读摘要（用于注入 AI prompt）
// ============================================================

export function getPersonalModelSummary(): string {
  try {
    const model = getPersonalModel();
    return summarizePersonalModel(model);
  } catch {
    return '（暂无个人数据）';
  }
}

// ============================================================
// 便捷方法：API Route 中直接调用的语义化入口
// ============================================================

export const PersonalModel = {
  /** 用户确认目标时调用 */
  goalCreated(goalType: string) {
    return recordEvent({ type: 'goal_created', goalType });
  },

  /** 用户选择路线时调用 */
  routeSelected(routeType: 'depth_first' | 'breadth_first') {
    return recordEvent({ type: 'route_selected', routeType });
  },

  /** 用户手动覆盖 AI 的四象限时调用 */
  quadrantOverridden(taskId: string, aiQuadrant: string, userQuadrant: string) {
    return recordEvent({ type: 'quadrant_overridden', taskId, aiQuadrant, userQuadrant });
  },

  /** 任务完成时调用 */
  taskCompleted(params: {
    taskId: string;
    timeBlock: string;
    energyLevel: string;
    actualMinutes: number;
    estimatedMinutes: number;
  }) {
    return recordEvent({ type: 'task_completed', ...params });
  },

  /** 任务跳过时调用 */
  taskSkipped(params: {
    taskId: string;
    timeBlock: string;
    energyLevel: string;
    reason: string;
  }) {
    return recordEvent({ type: 'task_skipped', ...params });
  },

  /** 用户修改 AI 建议时调用 */
  taskModified(taskId: string, fieldsModified: string[], goalType: string) {
    return recordEvent({ type: 'task_modified', taskId, fieldsModified, goalType });
  },

  /** 完成每日复盘时调用 */
  reflectionCompleted(date: string, rating: number) {
    return recordEvent({ type: 'reflection_completed', date, rating });
  },

  /** 获取当前 Personal Model 摘要（用于注入 AI prompt） */
  getSummary() {
    return getPersonalModelSummary();
  },
};
