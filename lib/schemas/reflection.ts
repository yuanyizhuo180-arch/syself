import { z } from 'zod';

// ============================================================
// Daily Reflection Engine — 快速复盘 Schema
// 设计原则：程序算数字、AI 做解释、单日不上升为人格规律
// ============================================================

// ============================================================
// 执行事件（单个任务的完成记录）
// ============================================================

export const ExecutionEventSchema = z.object({
  taskId: z.string(),
  goalId: z.string(),
  date: z.string().describe('YYYY-MM-DD'),
  status: z.enum(['done', 'skipped', 'partial']),
  actualMinutes: z.number().nullable().describe('实际花费时间'),
  difficulty: z.enum(['easier_than_expected', 'as_expected', 'harder_than_expected']).nullable(),
  note: z.string().nullable().describe('用户一句话备注'),
  skipReason: z
    .enum(['no_time', 'too_hard', 'forgot', 'not_in_mood', 'other'])
    .nullable()
    .describe('如果是跳过，原因是什么'),
});

export type ExecutionEvent = z.infer<typeof ExecutionEventSchema>;

// ============================================================
// 程序计算的每日统计（不依赖 AI）
// ============================================================

export interface DailyStats {
  date: string;
  totalTasks: number;
  completedTasks: number;
  skippedTasks: number;
  partialTasks: number;
  completionRate: number; // 0-1
  importantTotal: number;
  importantCompleted: number;
  importantCompletionRate: number; // 0-1
  plannedMinutes: number;
  actualMinutes: number;
  estimateError: number; // 实际/计划 - 1，正值表示低估
  highEnergyCompleted: number;
  highEnergyTotal: number;
}

/**
 * 纯函数：从执行事件列表计算每日统计
 * 不含任何 AI 调用，结果完全可复现
 */
export function computeDailyStats(events: ExecutionEvent[]): DailyStats {
  const done = events.filter((e) => e.status === 'done');
  const skipped = events.filter((e) => e.status === 'skipped');
  const partial = events.filter((e) => e.status === 'partial');

  const totalTasks = events.length;
  const completedTasks = done.length + partial.length; // 部分完成也算有进展
  const skippedTasks = skipped.length;

  const plannedMinutes = events.reduce(
    (s, e) => s + (e.actualMinutes ?? 0),
    0,
  );
  const actualMinutes = events
    .filter((e) => e.status === 'done' || e.status === 'partial')
    .reduce((s, e) => s + (e.actualMinutes ?? 0), 0);

  return {
    date: events[0]?.date ?? new Date().toISOString().slice(0, 10),
    totalTasks,
    completedTasks,
    skippedTasks,
    partialTasks: partial.length,
    completionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
    importantTotal: totalTasks, // MVP 简化：首周任务视为重要
    importantCompleted: completedTasks,
    importantCompletionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
    plannedMinutes,
    actualMinutes,
    estimateError: plannedMinutes > 0 ? actualMinutes / plannedMinutes - 1 : 0,
    highEnergyCompleted: 0, // MVP 简化
    highEnergyTotal: 0,
  };
}

// ============================================================
// AI 生成的复盘洞察
// ============================================================

export const AIInsightSchema = z.object({
  one_line_insight: z
    .string()
    .describe('用一句话总结今天最值得注意的发现，不超过 30 字'),

  positive_observation: z
    .string()
    .nullable()
    .describe('今天做得好的地方。如果确实没有就不编造，返回 null。'),

  improvement_hint: z
    .string()
    .describe('明天可以微调的一件事。只给一条建议，不要列清单。'),

  adjustment_suggestion: z.object({
    type: z
      .enum(['none', 'reorder', 'reduce', 'add_buffer', 'swap_task'])
      .describe('调整类型'),
    description: z.string().describe('具体建议'),
    reason: z.string().describe('基于今天什么数据给出的这个建议'),
  }),

  tomorrow_preview: z.string().describe('对明天的一句话预告'),

  tone: z
    .enum(['supportive', 'direct', 'light'])
    .describe(
      '语气：supportive（完成得好）、direct（一般，直接指出问题）、light（几乎没做，不施压）',
    ),
});

export type AIInsight = z.infer<typeof AIInsightSchema>;

// ============================================================
// 完整复盘记录
// ============================================================

export interface DailyReflection {
  id: string;
  goalId: string;
  date: string;
  stats: DailyStats; // 程序计算的统计
  userRating: number; // 用户 emoji 评分 1-5
  userNote: string | null; // 用户自由输入
  incompleteReasons: string[]; // 用户选的未完成原因标签
  aiInsight: AIInsight | null; // AI 生成的洞察
  // Personal Model 更新标记
  personalModelUpdated: boolean;
  personalModelChanges: string[]; // 哪些维度被更新了
}

// ============================================================
// 复盘质量检查
// ============================================================

export function validateReflectionQuality(insight: AIInsight): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // 禁止人格判断关键词
  const personalityJudgmentPatterns = [
    '你是一个',
    '你总是',
    '你从不',
    '你这个人',
    '你天生',
    '你习惯性',
    '你本质上',
  ];

  const fullText = JSON.stringify(insight);
  for (const pattern of personalityJudgmentPatterns) {
    if (fullText.includes(pattern)) {
      violations.push(`包含人格判断：检测到"${pattern}"。单日数据不能形成稳定人格判断。`);
    }
  }

  // 禁止空洞鼓励词
  const hollowEncouragementPatterns = [
    '坚持就是胜利',
    '努力一定有回报',
    '加油',
    '你一定可以',
    '相信自己',
  ];
  for (const pattern of hollowEncouragementPatterns) {
    if (fullText.includes(pattern)) {
      violations.push(`包含空洞鼓励："${pattern}"。应给出具体可执行的建议而非口号。`);
    }
  }

  // 建议必须具体（不能太短）
  if (
    insight.improvement_hint.length < 10 &&
    insight.adjustment_suggestion.type !== 'none'
  ) {
    violations.push('微调建议过于简短，缺乏可执行性');
  }

  return { valid: violations.length === 0, violations };
}
