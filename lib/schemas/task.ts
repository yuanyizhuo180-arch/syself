import { z } from 'zod';

// ============================================================
// Task Generation Engine — 可执行的、可验证的任务 Schema
// 设计原则：可验证 > 可学习、产出 > 输入、容量约束
// ============================================================

export const TaskDraftSchema = z.object({
  title: z
    .string()
    .describe(
      '任务标题。必须是可执行、可验证的动作。✅ "用真实年报完成三张报表关联分析" ❌ "学习财务报表"',
    ),

  completion_criteria: z
    .string()
    .describe('怎么判断任务完成了？必须有客观判断标准。'),

  minimum_action: z
    .string()
    .describe(
      '如果用户当天状态差、时间少，最少做到什么算"今天没白过"。必须比完整任务显著轻量。',
    ),

  estimated_minutes: z
    .number()
    .min(5)
    .max(240)
    .describe('预估完成时间（分钟）'),

  quadrant: z.enum([
    'important_urgent',
    'important_not_urgent',
    'urgent_not_important',
    'not_important_not_urgent',
  ]),

  day_of_week: z
    .number()
    .min(1)
    .max(7)
    .describe('建议安排在一周的第几天（1=周一, 7=周日）'),

  energy_level: z
    .enum(['high', 'medium', 'low'])
    .describe('任务需要的精力水平'),

  time_block: z
    .enum(['morning', 'afternoon', 'evening'])
    .optional()
    .describe('建议时间块'),

  why_this_task: z
    .string()
    .describe('这个任务在路线中的位置，为什么是本周做。帮助用户理解任务的意义。'),

  is_output_oriented: z
    .boolean()
    .describe('是否为产出型任务（产出具体成果）而非输入型（阅读/观看/学习）'),
});

export const WeeklyPlanSchema = z.object({
  tasks: z.array(TaskDraftSchema).min(5).max(8).describe('5-8 个首周任务'),

  total_minutes: z.number().describe('所有任务的总预估时长'),

  weekly_capacity_percentage: z
    .number()
    .min(0)
    .max(100)
    .describe('占用户每周可用时间的百分比'),

  ai_note: z
    .string()
    .describe('AI 对本周计划的一句话说明，如"本周重点是建立基础习惯，任务偏轻量"'),

  overload_warning: z
    .string()
    .nullable()
    .describe('如果超过 70% 容量，给出警告说明。否则为 null'),
});

export type TaskDraft = z.infer<typeof TaskDraftSchema>;
export type WeeklyPlan = z.infer<typeof WeeklyPlanSchema>;

// ============================================================
// 任务在数据库中的持久化形态
// ============================================================

export interface Task {
  id: string;
  goalId: string;
  routeId: string | null;
  title: string;
  completionCriteria: string;
  minimumAction: string;
  estimatedMinutes: number;
  actualMinutes: number | null;
  quadrant: string;
  timeBlock: 'morning' | 'afternoon' | 'evening' | null;
  dayDate: string; // YYYY-MM-DD
  energyLevel: 'high' | 'medium' | 'low';
  status: 'planned' | 'done' | 'skipped' | 'partial' | 'paused';
  skipReason: string | null;
  partialNote: string | null;
  userModifiedFields: string[]; // 用户修改了 AI 建议的哪些字段
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 容量校验
// ============================================================

export interface CapacityCheckResult {
  valid: boolean;
  totalMinutes: number;
  weeklyCapacity: number; // 用户每周可用时间
  limit: number; // 70% 上限
  percentage: number;
  isOverloaded: boolean;
  warning: string | null;
}

export function checkCapacity(
  tasks: TaskDraft[],
  userWeeklyMinutes: number,
): CapacityCheckResult {
  const totalMinutes = tasks.reduce((s, t) => s + t.estimated_minutes, 0);
  const limit = Math.floor(userWeeklyMinutes * 0.7);
  const percentage = userWeeklyMinutes > 0
    ? Math.round((totalMinutes / userWeeklyMinutes) * 100)
    : 100;

  const isOverloaded = totalMinutes > limit;

  let warning: string | null = null;
  if (isOverloaded) {
    const overBy = totalMinutes - limit;
    warning = `任务总时长 ${totalMinutes} 分钟，超过建议上限 ${limit} 分钟（70%），超出 ${overBy} 分钟。建议减少 1-2 个任务或缩短任务时长。`;
  } else if (percentage > 60) {
    warning = `任务总时长接近上限（${percentage}%），建议预留充足缓冲。`;
  }

  return {
    valid: !isOverloaded,
    totalMinutes,
    weeklyCapacity: userWeeklyMinutes,
    limit,
    percentage,
    isOverloaded,
    warning,
  };
}

// ============================================================
// 任务质量检查
// ============================================================

export function validateTaskQuality(tasks: TaskDraft[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // 检查可验证性——标题中不应只有"学习""了解""阅读"等纯输入动词
  const inputOnlyPatterns = [/^学习/, /^了解/, /^阅读/, /^看/, /^研究/];
  const outputPatterns = [/写/, /完成/, /创建/, /输出/, /分析/, /练习/, /实践/, /做/];

  tasks.forEach((t, i) => {
    const isInputOnly = inputOnlyPatterns.some((p) => p.test(t.title));
    const hasOutput = outputPatterns.some((p) => p.test(t.title));
    if (isInputOnly && !hasOutput) {
      issues.push(`任务 ${i + 1} "${t.title}" 看起来是纯输入型任务，缺乏可验证的产出`);
    }
  });

  // 检查产出型任务比例（至少 50% 应为产出型）
  const outputCount = tasks.filter((t) => t.is_output_oriented).length;
  if (outputCount < tasks.length * 0.5) {
    issues.push(
      `产出型任务仅 ${outputCount}/${tasks.length}（${Math.round((outputCount / tasks.length) * 100)}%），建议 ≥ 50%`,
    );
  }

  // 检查每天任务数
  const byDay = new Map<number, number>();
  tasks.forEach((t) => {
    byDay.set(t.day_of_week, (byDay.get(t.day_of_week) || 0) + 1);
  });
  byDay.forEach((count, day) => {
    if (count > 2) {
      issues.push(`第 ${day} 天安排了 ${count} 个任务，超过每日上限 2 个`);
    }
  });

  // 检查高精力任务是否集中
  const highEnergyDays = new Set(
    tasks
      .filter((t) => t.energy_level === 'high')
      .map((t) => t.day_of_week),
  );
  highEnergyDays.forEach((day) => {
    const highOnDay = tasks.filter(
      (t) => t.day_of_week === day && t.energy_level === 'high',
    );
    if (highOnDay.length > 1) {
      issues.push(`第 ${day} 天有 ${highOnDay.length} 个高精力任务，建议每天最多 1 个`);
    }
  });

  return { valid: issues.length === 0, issues };
}

// ============================================================
// 时长决策（多源合并，MVP 阶段简化版）
// ============================================================

export interface DurationEstimate {
  aiSuggestion: number; // AI 建议时长
  userEstimate: number | null; // 用户自己估计的
  userFinal: number; // 最终确认值 = 用户值 > AI 建议
  modificationReason: string | null; // 用户为什么改了
}

export function resolveDuration(
  aiSuggestion: number,
  userEstimate: number | null,
): DurationEstimate {
  return {
    aiSuggestion,
    userEstimate,
    userFinal: userEstimate ?? aiSuggestion,
    modificationReason: userEstimate !== null && userEstimate !== aiSuggestion
      ? '用户手动修改'
      : null,
  };
}
