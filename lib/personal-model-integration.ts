/**
 * Personal Model 集成层 — API Route 安全调用的薄封装
 *
 * 职责：
 * - 读取/写入 Personal Model（自动适配 Postgres / SQLite）
 * - 在关键业务事件发生时触发 applyEvent()
 * - 提供人类可读摘要用于注入 AI prompt（缓存策略，避免 async 侵入 prompt 构建）
 *
 * 设计原则：
 * - API Routes 不直接操作 personal_model 表，通过本模块完成
 * - 所有 Personal Model 更新是"静默"的——失败不阻塞主流程
 * - getSummary() 使用内存缓存，避免 prompt 构建链路引入异步
 */

import { get, run } from './db';
import {
  applyEvent,
  createDefaultPersonalModel,
  summarizePersonalModel,
  type PersonalModelData,
  type PersonalModelEvent,
} from './personal-model';

// ============================================================
// 内存缓存（避免 getSummary() 引入 async）
// ============================================================

let _cachedModel: PersonalModelData | null = null;
let _cacheLoaded = false;

function invalidateCache(): void {
  _cachedModel = null;
  _cacheLoaded = false;
}

// ============================================================
// 读取 Personal Model（带缓存）
// ============================================================

async function loadModel(): Promise<PersonalModelData> {
  const row = await get<{
    behavior_patterns_json: string;
    goal_preferences_json: string;
    calibration_json: string;
    data_points: number;
    confidence: number;
    updated_at: string;
  }>('SELECT * FROM personal_model WHERE id = ?', 'singleton');

  if (!row) {
    const model = createDefaultPersonalModel();
    await run(
      `INSERT INTO personal_model (id, behavior_patterns_json, goal_preferences_json, calibration_json, data_points, confidence, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      'singleton',
      JSON.stringify(model.behaviorPatterns),
      JSON.stringify(model.goalPreferences),
      JSON.stringify(model.calibration),
      model.dataPoints,
      model.confidence,
      model.updatedAt,
    );
    _cachedModel = model;
    _cacheLoaded = true;
    return model;
  }

  const model: PersonalModelData = {
    behaviorPatterns: JSON.parse(row.behavior_patterns_json),
    goalPreferences: JSON.parse(row.goal_preferences_json),
    calibration: JSON.parse(row.calibration_json),
    dataPoints: row.data_points,
    confidence: row.confidence,
    updatedAt: row.updated_at,
  };
  _cachedModel = model;
  _cacheLoaded = true;
  return model;
}

async function getPersonalModel(): Promise<PersonalModelData> {
  if (_cacheLoaded && _cachedModel) return _cachedModel;
  return loadModel();
}

// ============================================================
// 记录事件并更新 Personal Model（异步，fire-and-forget 安全）
// ============================================================

async function recordEventAsync(event: PersonalModelEvent): Promise<{
  updated: boolean;
  changes: string[];
  error?: string;
}> {
  try {
    const model = await getPersonalModel();
    const { model: updatedModel, changes } = applyEvent(model, event);

    await run(
      `INSERT INTO personal_model (id, behavior_patterns_json, goal_preferences_json, calibration_json, data_points, confidence, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         behavior_patterns_json = excluded.behavior_patterns_json,
         goal_preferences_json = excluded.goal_preferences_json,
         calibration_json = excluded.calibration_json,
         data_points = excluded.data_points,
         confidence = excluded.confidence,
         updated_at = excluded.updated_at`,
      'singleton',
      JSON.stringify(updatedModel.behaviorPatterns),
      JSON.stringify(updatedModel.goalPreferences),
      JSON.stringify(updatedModel.calibration),
      updatedModel.dataPoints,
      updatedModel.confidence,
      updatedModel.updatedAt,
    );

    // 更新缓存
    _cachedModel = updatedModel;
    _cacheLoaded = true;

    return { updated: true, changes };
  } catch (error) {
    console.error('[PersonalModel] Failed to record event:', event.type, error instanceof Error ? error.message : error);
    return { updated: false, changes: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/** 同步触发 + 后台执行，调用方不需 await */
async function recordEvent(event: PersonalModelEvent): Promise<void> {
  await recordEventAsync(event);
}

// ============================================================
// 获取人类可读摘要（同步，使用缓存）
// ============================================================

function getPersonalModelSummary(): string {
  if (!_cacheLoaded || !_cachedModel) {
    // 首次调用时缓存未加载 → 返回空，异步加载
    loadModel().catch(() => {});
    return '（暂无个人数据）';
  }
  try {
    return summarizePersonalModel(_cachedModel);
  } catch {
    return '（暂无个人数据）';
  }
}

// ============================================================
// 便捷方法：API Route 中直接调用的语义化入口
// ============================================================

export const PersonalModel = {
  async goalCreated(goalType: string) {
    await recordEvent({ type: 'goal_created', goalType });
  },

  async routeSelected(routeType: 'depth_first' | 'breadth_first') {
    await recordEvent({ type: 'route_selected', routeType });
  },

  async quadrantOverridden(taskId: string, aiQuadrant: string, userQuadrant: string) {
    await recordEvent({ type: 'quadrant_overridden', taskId, aiQuadrant, userQuadrant });
  },

  async taskCompleted(params: { taskId: string; timeBlock: string; energyLevel: string; actualMinutes: number; estimatedMinutes: number }) {
    await recordEvent({ type: 'task_completed', ...params });
  },

  async taskSkipped(params: { taskId: string; timeBlock: string; energyLevel: string; reason: string }) {
    await recordEvent({ type: 'task_skipped', ...params });
  },

  async taskModified(taskId: string, fieldsModified: string[], goalType: string) {
    await recordEvent({ type: 'task_modified', taskId, fieldsModified, goalType });
  },

  async reflectionCompleted(date: string, rating: number) {
    await recordEvent({ type: 'reflection_completed', date, rating });
  },

  getSummary() {
    return getPersonalModelSummary();
  },
};
