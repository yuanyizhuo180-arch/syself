/**
 * Daily Reflection Prompt 质量评估 + Schema 校验测试
 *
 * Claude Code 产物：在 Codex 接入真实 AI 之前，验证 reflection 层的所有纯函数和校验规则。
 *
 * 覆盖：
 * - computeDailyStats() 边界计算
 * - AIInsightSchema 合法/非法输出
 * - validateReflectionQuality() 安全违规检测
 * - buildReflectionUserMessage() 4 场景正确性
 * - Prompt 模板无矛盾指令
 */

import { describe, expect, it } from 'vitest';
import {
  AIInsightSchema,
  computeDailyStats,
  validateReflectionQuality,
  type AIInsight,
  type DailyStats,
  type ExecutionEvent,
} from '@/lib/schemas/reflection';
import { buildReflectionUserMessage, REFLECTION_SYSTEM_PROMPT } from '@/lib/prompts/daily-reflection';

// ============================================================
// 1. computeDailyStats — 统计计算纯函数
// ============================================================

describe('computeDailyStats', () => {
  it('空事件列表 → 全零统计', () => {
    const stats = computeDailyStats([]);
    expect(stats.totalTasks).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.importantCompletionRate).toBe(0);
  });

  it('全部完成 → 100% 完成率', () => {
    const events: ExecutionEvent[] = [
      { taskId: '1', goalId: 'g1', date: '2026-07-13', status: 'done', actualMinutes: 30, difficulty: 'as_expected', note: null, skipReason: null },
      { taskId: '2', goalId: 'g1', date: '2026-07-13', status: 'done', actualMinutes: 45, difficulty: 'easier_than_expected', note: '顺利', skipReason: null },
    ];
    const stats = computeDailyStats(events);
    expect(stats.totalTasks).toBe(2);
    expect(stats.completedTasks).toBe(2);
    expect(stats.completionRate).toBe(1.0);
    expect(stats.actualMinutes).toBe(75);
  });

  it('全部跳过 → 0% 完成率', () => {
    const events: ExecutionEvent[] = [
      { taskId: '1', goalId: 'g1', date: '2026-07-13', status: 'skipped', actualMinutes: null, difficulty: null, note: null, skipReason: 'no_time' },
      { taskId: '2', goalId: 'g1', date: '2026-07-13', status: 'skipped', actualMinutes: null, difficulty: null, note: null, skipReason: 'not_in_mood' },
    ];
    const stats = computeDailyStats(events);
    expect(stats.completionRate).toBe(0);
    expect(stats.skippedTasks).toBe(2);
    expect(stats.actualMinutes).toBe(0);
  });

  it('混合状态 → 部分完成计入完成率', () => {
    const events: ExecutionEvent[] = [
      { taskId: '1', goalId: 'g1', date: '2026-07-13', status: 'done', actualMinutes: 30, difficulty: null, note: null, skipReason: null },
      { taskId: '2', goalId: 'g1', date: '2026-07-13', status: 'partial', actualMinutes: 20, difficulty: 'harder_than_expected', note: '做到一半卡住了', skipReason: null },
      { taskId: '3', goalId: 'g1', date: '2026-07-13', status: 'skipped', actualMinutes: null, difficulty: null, note: null, skipReason: 'too_hard' },
    ];
    const stats = computeDailyStats(events);
    expect(stats.totalTasks).toBe(3);
    expect(stats.completedTasks).toBe(2); // done + partial
    expect(stats.skippedTasks).toBe(1);
    expect(stats.completionRate).toBeCloseTo(2 / 3);
  });

  it('时间偏差计算：实际 > 计划 → 正值', () => {
    const events: ExecutionEvent[] = [
      { taskId: '1', goalId: 'g1', date: '2026-07-13', status: 'done', actualMinutes: 60, difficulty: null, note: null, skipReason: null },
      { taskId: '2', goalId: 'g1', date: '2026-07-13', status: 'done', actualMinutes: 40, difficulty: null, note: null, skipReason: null },
    ];
    const stats = computeDailyStats(events);
    // plannedMinutes = actualMinutes(sum of all events) = 100, actualMinutes = sum of done/partial = 100
    // estimateError = 100/100 - 1 = 0
    expect(stats.plannedMinutes).toBe(100);
    expect(stats.actualMinutes).toBe(100);
    expect(stats.estimateError).toBe(0);
  });

  it('跳过任务的分钟不计入 actualMinutes', () => {
    const events: ExecutionEvent[] = [
      { taskId: '1', goalId: 'g1', date: '2026-07-13', status: 'done', actualMinutes: 45, difficulty: null, note: null, skipReason: null },
      { taskId: '2', goalId: 'g1', date: '2026-07-13', status: 'skipped', actualMinutes: null, difficulty: null, note: null, skipReason: 'no_time' },
    ];
    const stats = computeDailyStats(events);
    expect(stats.actualMinutes).toBe(45); // 只算 done 的
  });
});

// ============================================================
// 2. AIInsightSchema — 合法/非法输出
// ============================================================

describe('AIInsightSchema', () => {
  const validInsight: AIInsight = {
    one_line_insight: '高精力任务全部完成，低精力任务被跳过',
    positive_observation: '重要任务全部按时完成',
    improvement_hint: '明天试试把需要专注的任务安排在上午',
    adjustment_suggestion: {
      type: 'reorder',
      description: '将高精力任务移到上午第一个',
      reason: '今天上午完成率100%，下午和晚上任务都被跳过',
    },
    tomorrow_preview: '明天有2个重要任务，安排在上午完成',
    tone: 'direct',
  };

  it('接受合法的完整洞察', () => {
    const result = AIInsightSchema.safeParse(validInsight);
    expect(result.success).toBe(true);
  });

  it('接受 positive_observation 为 null（确实没有好的）', () => {
    const insight = { ...validInsight, positive_observation: null };
    const result = AIInsightSchema.safeParse(insight);
    expect(result.success).toBe(true);
  });

  it('拒绝无效的 tone', () => {
    const insight = { ...validInsight, tone: 'angry' };
    const result = AIInsightSchema.safeParse(insight);
    expect(result.success).toBe(false);
  });

  it('拒绝无效的 adjustment_suggestion.type', () => {
    const insight = {
      ...validInsight,
      adjustment_suggestion: { ...validInsight.adjustment_suggestion, type: 'delete_all' },
    };
    const result = AIInsightSchema.safeParse(insight);
    expect(result.success).toBe(false);
  });

  it('拒绝缺少必填字段', () => {
    const { one_line_insight, ...rest } = validInsight;
    const result = AIInsightSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// 3. validateReflectionQuality — 安全违规检测
// ============================================================

describe('validateReflectionQuality', () => {
  function insight(overrides: Partial<AIInsight> = {}): AIInsight {
    return {
      one_line_insight: '今天任务完成率60%',
      positive_observation: '上午的任务完成得很好',
      improvement_hint: '明天减少一个晚间任务，留出恢复时间',
      adjustment_suggestion: {
        type: 'reduce',
        description: '减少晚间任务数',
        reason: '晚间完成率偏低',
      },
      tomorrow_preview: '明天任务量会轻一些',
      tone: 'direct',
      ...overrides,
    };
  }

  it('通过：正常的复盘洞察', () => {
    const result = validateReflectionQuality(insight());
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('拒绝：包含"你是一个"人格判断', () => {
    const result = validateReflectionQuality(
      insight({ one_line_insight: '你是一个不擅长时间管理的人' }),
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('人格判断'))).toBe(true);
  });

  it('拒绝：包含"你总是"稳定规律暗示', () => {
    const result = validateReflectionQuality(
      insight({ improvement_hint: '你总是低估任务所需时间，建议多预留缓冲' }),
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('人格判断'))).toBe(true);
  });

  it('拒绝：包含"你从不"绝对化判断', () => {
    const result = validateReflectionQuality(
      insight({ one_line_insight: '你从不认真对待晚间任务' }),
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('人格判断'))).toBe(true);
  });

  it('拒绝：包含"你这个人"', () => {
    const result = validateReflectionQuality(
      insight({ positive_observation: '你这个人还是很有潜力的' }),
    );
    expect(result.valid).toBe(false);
  });

  it('拒绝：包含"你天生"', () => {
    const result = validateReflectionQuality(
      insight({ improvement_hint: '你天生不擅长早起，把任务移到下午' }),
    );
    expect(result.valid).toBe(false);
  });

  it('拒绝：包含"你习惯性"', () => {
    const result = validateReflectionQuality(
      insight({ one_line_insight: '你习惯性拖延高难度任务' }),
    );
    expect(result.valid).toBe(false);
  });

  it('拒绝：包含"你本质上"', () => {
    const result = validateReflectionQuality(
      insight({ improvement_hint: '你本质上是个完美主义者' }),
    );
    expect(result.valid).toBe(false);
  });

  it('拒绝：包含空洞鼓励"坚持就是胜利"', () => {
    const result = validateReflectionQuality(
      insight({ improvement_hint: '坚持就是胜利，明天继续！' }),
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('空洞鼓励'))).toBe(true);
  });

  it('拒绝：包含"加油"', () => {
    const result = validateReflectionQuality(
      insight({ tomorrow_preview: '明天加油！你一定可以的' }),
    );
    expect(result.valid).toBe(false);
  });

  it('拒绝：包含"相信自己"', () => {
    const result = validateReflectionQuality(
      insight({ improvement_hint: '相信自己，你比想象中更强大' }),
    );
    expect(result.valid).toBe(false);
  });

  it('拒绝：包含"努力一定有回报"', () => {
    const result = validateReflectionQuality(
      insight({ one_line_insight: '努力一定有回报，继续加油' }),
    );
    expect(result.valid).toBe(false);
  });

  it('拒绝：微调建议过短（< 10 字且有调整建议）', () => {
    const result = validateReflectionQuality(
      insight({ improvement_hint: '加油', adjustment_suggestion: { type: 'reduce', description: '减少任务', reason: '太多' } }),
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('过于简短'))).toBe(true);
  });

  it('通过：微调建议短但 type=none（无需调整）', () => {
    // type=none 时 improvement_hint 短是合理的
    const result = validateReflectionQuality(
      insight({
        improvement_hint: '保持',
        adjustment_suggestion: { type: 'none', description: '', reason: '' },
      }),
    );
    // "保持" < 10 字符但 type=none → 不应报过于简短
    expect(result.violations.some((v) => v.includes('过于简短'))).toBe(false);
  });

  it('通过：positive_observation 为 null 时不触发误报', () => {
    const result = validateReflectionQuality(
      insight({ positive_observation: null }),
    );
    expect(result.valid).toBe(true);
  });

  it('通过：tone=light + 完成率低时的合理洞察', () => {
    const result = validateReflectionQuality(
      insight({
        one_line_insight: '今天可能比较忙，只完成了1个任务',
        positive_observation: null,
        improvement_hint: '明天要不要把任务减到1个？先找回节奏',
        adjustment_suggestion: { type: 'reduce', description: '临时降到1个任务', reason: '今日完成率过低' },
        tone: 'light',
      }),
    );
    expect(result.valid).toBe(true);
  });
});

// ============================================================
// 4. buildReflectionUserMessage — 4 场景正确性
// ============================================================

describe('buildReflectionUserMessage', () => {
  const baseParams = {
    date: '2026-07-13',
    completedTasks: [] as string[],
    skippedTasks: [] as { title: string; reason: string }[],
    partialTasks: [] as { title: string; note: string }[],
    plannedMinutes: 0,
    actualMinutes: 0,
    personalModelSummary: '（暂无足够数据）',
  };

  it('场景1 好日子：100%完成率 → 显示完整数据', () => {
    const msg = buildReflectionUserMessage({
      ...baseParams,
      completionRate: 1.0,
      importantCompletionRate: 1.0,
      completedTasks: ['完成财报分析练习', '完成行业研究笔记'],
      skippedTasks: [],
      plannedMinutes: 90,
      actualMinutes: 85,
      estimateErrorPercent: -5,
      userRating: 5,
    });
    expect(msg).toContain('100%');
    expect(msg).toContain('😄');
    expect(msg).toContain('比计划少花了');
    expect(msg).toContain('完成财报分析练习');
  });

  it('场景2 普通日子：60%完成率 → 显示跳过原因', () => {
    const msg = buildReflectionUserMessage({
      ...baseParams,
      completionRate: 0.6,
      importantCompletionRate: 0.5,
      completedTasks: ['完成阅读任务'],
      skippedTasks: [{ title: '写分析报告', reason: '没时间' }],
      partialTasks: [],
      plannedMinutes: 120,
      actualMinutes: 60,
      estimateErrorPercent: 50,
      userRating: 3,
    });
    expect(msg).toContain('60%');
    expect(msg).toContain('😐');
    expect(msg).toContain('写分析报告');
    expect(msg).toContain('没时间');
    expect(msg).toContain('比计划多花了');
  });

  it('场景3 差日子：0%完成率 → 所有任务跳过', () => {
    const msg = buildReflectionUserMessage({
      ...baseParams,
      completionRate: 0,
      importantCompletionRate: 0,
      completedTasks: [],
      skippedTasks: [
        { title: '完成练习', reason: '不想做' },
        { title: '阅读材料', reason: '忘了' },
      ],
      plannedMinutes: 60,
      actualMinutes: 0,
      estimateErrorPercent: 0,
      userRating: 1,
    });
    expect(msg).toContain('0%');
    expect(msg).toContain('😞');
    expect(msg).toContain('不想做');
    expect(msg).toContain('忘了');
    expect(msg).toContain('实际用时和计划基本一致');
  });

  it('场景4 有 Personal Model 上下文 → 注入历史数据', () => {
    const msg = buildReflectionUserMessage({
      ...baseParams,
      completionRate: 0.6,
      importantCompletionRate: 0.5,
      completedTasks: ['完成任务A'],
      skippedTasks: [{ title: '任务B', reason: '没时间' }],
      plannedMinutes: 60,
      actualMinutes: 45,
      estimateErrorPercent: 0,
      userRating: 3,
      personalModelSummary: '最佳执行时段：上午（完成率 90%）\n最常见跳过原因：没时间（3次）\n已连续使用 5 天',
    });
    expect(msg).toContain('最佳执行时段：上午');
    expect(msg).toContain('最常见跳过原因：没时间');
    expect(msg).toContain('已连续使用 5 天');
  });

  it('部分完成任务 → 包含部分完成记录', () => {
    const msg = buildReflectionUserMessage({
      ...baseParams,
      completionRate: 0.5,
      importantCompletionRate: 0.5,
      completedTasks: ['完成任务A'],
      skippedTasks: [],
      partialTasks: [{ title: '任务B', note: '做到一半遇到困难，明天继续' }],
      plannedMinutes: 90,
      actualMinutes: 45,
      estimateErrorPercent: 0,
      userRating: 3,
    });
    expect(msg).toContain('任务B');
    expect(msg).toContain('做到一半遇到困难');
  });
});

// ============================================================
// 5. Prompt 模板质量检查
// ============================================================

describe('REFLECTION_SYSTEM_PROMPT', () => {
  it('包含语气选择规则（≥80% supportive）', () => {
    expect(REFLECTION_SYSTEM_PROMPT).toContain('supportive');
    expect(REFLECTION_SYSTEM_PROMPT).toContain('80%');
  });

  it('包含语气选择规则（40%-79% direct）', () => {
    expect(REFLECTION_SYSTEM_PROMPT).toContain('direct');
    expect(REFLECTION_SYSTEM_PROMPT).toContain('40%');
  });

  it('包含语气选择规则（<40% light）', () => {
    expect(REFLECTION_SYSTEM_PROMPT).toContain('light');
  });

  it('明确禁止人格判断', () => {
    expect(REFLECTION_SYSTEM_PROMPT).toContain('单日数据 ≠ 人格规律');
    expect(REFLECTION_SYSTEM_PROMPT).toContain('不做人格判断');
  });

  it('明确禁止空洞鼓励词', () => {
    expect(REFLECTION_SYSTEM_PROMPT).toContain('不使用"坚持""努力""奋斗"等空洞鼓励词');
  });

  it('明确要求一次只给一条建议', () => {
    expect(REFLECTION_SYSTEM_PROMPT).toContain('一次只给一条微调建议');
  });

  it('明确数字由程序计算', () => {
    expect(REFLECTION_SYSTEM_PROMPT).toContain('数字由程序计算');
    expect(REFLECTION_SYSTEM_PROMPT).toContain('不要质疑或重新计算统计数据');
  });

  it('包含正确示例（✅）和错误示例（❌）帮助模型理解', () => {
    expect(REFLECTION_SYSTEM_PROMPT).toContain('✅');
    expect(REFLECTION_SYSTEM_PROMPT).toContain('❌');
  });

  it('包含 JSON 输出格式示例', () => {
    expect(REFLECTION_SYSTEM_PROMPT).toContain('one_line_insight');
    expect(REFLECTION_SYSTEM_PROMPT).toContain('adjustment_suggestion');
  });

  it('禁止第一周质疑路线选择', () => {
    expect(REFLECTION_SYSTEM_PROMPT).toContain('不要在第一周就说"你选的路线可能不适合你"');
  });
});
