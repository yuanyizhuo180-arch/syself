/**
 * Schema 模块统一导出
 */

// Goal Understanding
export {
  GoalUnderstandingSchema,
  MissingInfoSchema,
  AssumptionSchema,
  validateGoalUnderstanding,
} from './goal-understanding';
export type {
  GoalUnderstanding,
  MissingInfo,
  Assumption,
  GoalUnderstandingResult,
  ConfirmedGoal,
} from './goal-understanding';

// Plan Route
export {
  PlanRouteSchema,
  RouteComparisonSchema,
  RoutePhaseSchema,
  RouteAdvantageSchema,
  RouteRiskSchema,
  FirstMonthPreviewSchema,
  validateRouteDiversity,
  DIFFERENTIATOR_DIMENSIONS,
} from './plan-route';
export type {
  PlanRoute,
  RouteComparison,
  DiversityCheckResult,
  RouteSelection,
} from './plan-route';

// Task
export {
  TaskDraftSchema,
  WeeklyPlanSchema,
  checkCapacity,
  validateTaskQuality,
  resolveDuration,
} from './task';
export type {
  TaskDraft,
  WeeklyPlan,
  Task,
  CapacityCheckResult,
  DurationEstimate,
} from './task';

// Reflection
export {
  ExecutionEventSchema,
  computeDailyStats,
  AIInsightSchema,
  validateReflectionQuality,
} from './reflection';
export type {
  ExecutionEvent,
  DailyStats,
  AIInsight,
  DailyReflection,
} from './reflection';
