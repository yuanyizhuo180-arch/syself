import { z } from 'zod';

// ============================================================
// Goal Understanding Engine — AI 深度理解用户目标的核心 Schema
// 设计原则：区分事实/推断、追问缺失信息、标注置信度
// ============================================================

export const MissingInfoSchema = z.object({
  field: z.string().describe('缺失的信息字段名'),
  question: z.string().describe('用用户友好的语言追问'),
  why_important: z.string().describe('为什么这个信息对规划质量有影响'),
  priority: z.enum(['critical', 'important', 'nice_to_have']),
});

export const AssumptionSchema = z.object({
  statement: z.string().describe('假设的内容'),
  basis: z
    .enum(['user_stated', 'inferred', 'general_knowledge'])
    .describe('假设来源：用户说的 / AI推断的 / 一般常识'),
  verifiable: z.boolean().describe('这个假设是否可被验证'),
  verification_method: z.string().nullable().describe('如果可以验证，怎么验证'),
});

export const GoalUnderstandingSchema = z.object({
  goal_type: z.enum([
    'skill_acquisition',
    'career_change',
    'health_fitness',
    'finance_investment',
    'creative_output',
    'relationship',
    'learning_education',
    'habit_formation',
    'other',
  ]),

  desired_outcome: z
    .string()
    .describe('用户想要达到的具体成果，用用户的语言描述。必须具体、可验证。'),

  current_state: z.string().describe('用户当前在这个目标上的状态'),

  time_horizon: z.string().describe('预计时间跨度，如"3个月""1-2年"'),

  intensity: z
    .enum(['casual', 'moderate', 'intense'])
    .describe('用户期望的投入程度'),

  implicit_constraints: z.object({
    time_per_week_hours: z
      .number()
      .nullable()
      .describe('每周可投入时间，未知则为 null'),
    budget_required: z.string().nullable(),
    location_dependent: z.boolean(),
    requires_mentor: z.boolean(),
  }),

  risks: z.object({
    dropout_triggers: z
      .array(z.string())
      .describe('可能导致用户放弃的具体场景。不能是"缺乏动力"这种通用回答。'),
    knowledge_gaps: z
      .array(z.string())
      .describe('用户当前缺失的关键知识/技能'),
    behavioral_risks: z
      .array(z.string())
      .describe('用户行为模式中可能阻碍目标达成的因素'),
  }),

  missing_information: z
    .array(MissingInfoSchema)
    .describe('AI 不清楚但需要知道的关键信息'),

  assumptions: z
    .array(AssumptionSchema)
    .describe('AI 在理解过程中所做的假设，每条必须标注来源'),

  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('AI 对整体理解的置信度。<0.6 时必须至少有 1 条 critical 追问'),
});

export type GoalUnderstanding = z.infer<typeof GoalUnderstandingSchema>;
export type MissingInfo = z.infer<typeof MissingInfoSchema>;
export type Assumption = z.infer<typeof AssumptionSchema>;

// ============================================================
// 业务校验规则
// ============================================================

/**
 * 校验 Goal Understanding 的业务规则
 * 这些规则无法用 Zod 原生表达（涉及字段间的条件关系）
 */
export function validateGoalUnderstanding(
  understanding: GoalUnderstanding,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 规则 1：置信度 < 0.6 时必须有 critical 追问
  if (understanding.confidence < 0.6) {
    const criticalCount = understanding.missing_information.filter(
      (m) => m.priority === 'critical',
    ).length;
    if (criticalCount === 0) {
      errors.push(
        '置信度 < 0.6 但没有任何 critical 级别追问。AI 必须追问关键缺失信息，不得猜测填充。',
      );
    }
  }

  // 规则 2：高风险目标（intense + time_horizon < 3个月）必须有 dropout_triggers
  if (
    understanding.intensity === 'intense' &&
    understanding.time_horizon.includes('月') &&
    !understanding.risks.dropout_triggers.length
  ) {
    errors.push('高强度短周期目标必须分析至少 1 个放弃触发因素');
  }

  // 规则 3：assumptions 中 inferred 类型占比不能超过 50%
  const inferredCount = understanding.assumptions.filter(
    (a) => a.basis === 'inferred',
  ).length;
  if (
    understanding.assumptions.length > 0 &&
    inferredCount / understanding.assumptions.length > 0.5
  ) {
    errors.push(
      `推断型假设占比 ${((inferredCount / understanding.assumptions.length) * 100).toFixed(0)}%，超过 50%。AI 过多依赖推断而非用户陈述，建议追加追问。`,
    );
  }

  // 规则 4：desired_outcome 必须包含可验证要素（不能是纯形容词）
  const vaguePatterns = ['更好', '提升', '改善', '进步', '成长', '变强'];
  const onlyVague = vaguePatterns.every(
    (p) => !understanding.desired_outcome.includes(p),
  );
  if (!onlyVague && understanding.desired_outcome.length < 20) {
    errors.push(
      'desired_outcome 过于模糊（仅含"更好/提升/改善"等虚词且太短）。需要追问用户具体要达到什么可验证的状态。',
    );
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================
// AI 理解结果的 API 响应包装
// ============================================================

export interface GoalUnderstandingResult {
  goalId: string;
  understanding: GoalUnderstanding;
  requiresFollowUp: boolean; // 是否有 critical 追问需要用户回答
  followUpQuestions: MissingInfo[]; // critical 级别的追问列表
}

// ============================================================
// 用户确认/修改后的目标
// ============================================================

export interface ConfirmedGoal {
  id: string;
  rawInput: string;
  normalizedName: string;
  successCriteria: string;
  targetDate: string;
  primaryArea: string;
  constraints: {
    timePerWeekHours: number | null;
    budgetRequired: string | null;
    fixedResponsibilities: string[];
  };
  aiUnderstanding: GoalUnderstanding; // 保留 AI 原始理解用于后续对比
  userModifications: string[]; // 用户修改了哪些字段
  status: 'draft' | 'active' | 'completed';
}
