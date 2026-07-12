/**
 * 全局共享类型与枚举 —— MVP 0.1 冻结接口
 *
 * 这些命名在后续开发中视为稳定契约。
 * 需要修改时先更新此文件，再同步所有引用位置。
 */

// ============================================================
// 目标相关
// ============================================================

export type GoalStatus = 'draft' | 'active' | 'completed';

export type GoalType =
  | 'skill_acquisition'
  | 'career_change'
  | 'health_fitness'
  | 'finance_investment'
  | 'creative_output'
  | 'relationship'
  | 'learning_education'
  | 'habit_formation'
  | 'other';

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  skill_acquisition: '技能学习',
  career_change: '职业转换',
  health_fitness: '健康健身',
  finance_investment: '财务投资',
  creative_output: '创作产出',
  relationship: '人际关系',
  learning_education: '学习进修',
  habit_formation: '习惯养成',
  other: '其他',
};

// ============================================================
// 路线相关
// ============================================================

export type RouteStatus = 'draft' | 'selected' | 'rejected';

export type RouteStrategy = 'depth_first' | 'breadth_first';

export const ROUTE_STRATEGY_LABELS: Record<RouteStrategy, string> = {
  depth_first: '深度优先',
  breadth_first: '广度优先',
};

// ============================================================
// 任务相关
// ============================================================

export type TaskStatus = 'planned' | 'done' | 'skipped' | 'partial';

export type Quadrant =
  | 'important_urgent'
  | 'important_not_urgent'
  | 'urgent_not_important'
  | 'not_important_not_urgent';

export const QUADRANT_LABELS: Record<Quadrant, string> = {
  important_urgent: '重要紧急',
  important_not_urgent: '重要不紧急',
  urgent_not_important: '紧急不重要',
  not_important_not_urgent: '不重要不紧急',
};

export type TimeBlock = 'morning' | 'afternoon' | 'evening';

export const TIME_BLOCK_LABELS: Record<TimeBlock, string> = {
  morning: '上午',
  afternoon: '下午',
  evening: '晚上',
};

export type EnergyLevel = 'high' | 'medium' | 'low';

export type SkipReason = 'no_time' | 'too_hard' | 'forgot' | 'not_in_mood' | 'other';

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  no_time: '没时间',
  too_hard: '太难了',
  forgot: '忘了',
  not_in_mood: '不想做',
  other: '其他原因',
};

// ============================================================
// 执行相关
// ============================================================

export type ExecutionStatus = 'done' | 'skipped' | 'partial';

export type Difficulty = 'easier_than_expected' | 'as_expected' | 'harder_than_expected';

// ============================================================
// 复盘相关
// ============================================================

export type ReflectionTone = 'supportive' | 'direct' | 'light';

export type AdjustmentType = 'none' | 'reorder' | 'reduce' | 'add_buffer' | 'swap_task';

// ============================================================
// AI 相关
// ============================================================

export type AssumptionBasis = 'user_stated' | 'inferred' | 'general_knowledge';

export type MissingInfoPriority = 'critical' | 'important' | 'nice_to_have';

export type CoachStyle = 'supportive' | 'rational' | 'strict';

export const COACH_STYLE_LABELS: Record<CoachStyle, string> = {
  supportive: '鼓励型',
  rational: '理性型',
  strict: '严格型',
};

// ============================================================
// 领域
// ============================================================

export type LifeArea = 'career' | 'learning' | 'health' | 'daily_life';

export const LIFE_AREA_LABELS: Record<LifeArea, string> = {
  career: '事业',
  learning: '学习',
  health: '健康',
  daily_life: '日常生活',
};

// ============================================================
// 用户画像
// ============================================================

export interface UserProfile {
  identity: string;
  weeklyAvailableMinutes: number;
  fixedResponsibilities: string[];
  primaryDifficulties: string[];
  coachStyle: CoachStyle;
  lifeAreas: LifeArea[];
}

// ============================================================
// API 通用响应
// ============================================================

export interface APIError {
  code: string;
  userMessage: string;
  retryable: boolean;
  workflowId?: string;
}

export interface APISuccess<T> {
  data: T;
  meta?: {
    aiPromptVersion?: string;
    aiAttempts?: number;
  };
}
