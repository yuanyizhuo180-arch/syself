import { z } from 'zod';

// ============================================================
// Route Generation Engine — 两条差异化路线的 Schema
// 设计原则：强制实质差异、每个建议链接用户画像、包含失败预警
// ============================================================

export const RoutePhaseSchema = z.object({
  name: z.string().describe('阶段名称'),
  duration: z.string().describe('阶段时长，如"2周""1个月"'),
  focus: z.string().describe('阶段的核心焦点'),
  key_actions: z
    .array(z.string())
    .min(1)
    .describe('阶段内的关键行动，每个必须可验证'),
  success_marker: z
    .string()
    .describe('怎么知道这个阶段完成了？必须有客观判断标准'),
  weekly_hours: z.number().min(1).max(60).describe('每周预计投入小时数'),
});

export const RouteAdvantageSchema = z.object({
  point: z.string().describe('优势描述'),
  why_relevant_to_user: z
    .string()
    .describe('为什么这个优势对这个用户特别重要——必须引用用户画像中的具体信息'),
});

export const RouteRiskSchema = z.object({
  risk: z.string().describe('风险描述'),
  probability: z.enum(['low', 'medium', 'high']).describe('发生概率'),
  mitigation: z.string().describe('降低风险的措施'),
  early_warning_sign: z
    .string()
    .describe('出现什么信号说明这条路可能有问题，用户应重新评估'),
});

export const FirstMonthPreviewSchema = z.object({
  week1_summary: z.string(),
  week2_summary: z.string(),
  week3_summary: z.string(),
  week4_summary: z.string(),
});

export const PlanRouteSchema = z.object({
  id: z.string().optional().describe('路线 ID，生成后由系统分配'),
  route_type: z
    .enum(['depth_first', 'breadth_first'])
    .describe('路线策略类型'),

  title: z.string().describe('路线名称，简洁有力。不能和另一条路线标题相同。'),

  thesis: z
    .string()
    .describe('核心理念：为什么这条路线适合这个用户？1-2句话。'),

  phases: z
    .array(RoutePhaseSchema)
    .min(2)
    .max(4)
    .describe('2-4 个执行阶段'),

  advantages: z
    .array(RouteAdvantageSchema)
    .min(2)
    .max(4)
    .describe('2-4 个优势，每个必须链接到用户画像'),

  risks: z
    .array(RouteRiskSchema)
    .min(2)
    .max(4)
    .describe('2-4 个风险，包含概率、缓解措施和预警信号'),

  first_month_preview: FirstMonthPreviewSchema.describe('首月每周预览'),

  user_profile_basis: z
    .array(z.string())
    .describe('设计这条路线时引用了用户画像中的哪些信息'),

  status: z
    .enum(['draft', 'selected', 'rejected'])
    .default('draft')
    .describe('路线状态'),
});

export type PlanRoute = z.infer<typeof PlanRouteSchema>;

// ============================================================
// 路线对比的完整输出
// ============================================================

export const RouteComparisonSchema = z.object({
  routes: z.array(PlanRouteSchema).length(2).describe('恰好 2 条差异化路线'),
  comparison_summary: z
    .string()
    .describe('用 2-3 句话概括两条路线的核心区别'),
  recommendation: z
    .string()
    .nullable()
    .describe('不做推荐则为 null，让用户自主选择'),
});

export type RouteComparison = z.infer<typeof RouteComparisonSchema>;

// ============================================================
// 差异化维度的定义
// ============================================================

export const DIFFERENTIATOR_DIMENSIONS = [
  'phase_structure',       // 阶段划分方式
  'time_distribution',     // 每周时间分布节奏
  'learn_practice_ratio',  // 学习 vs 实践的比例
  'risk_structure',        // 主要风险类型
  'milestone_style',       // 阶段性成果的定义方式
  'failure_mode',          // 路线失败的模式
  'intensity_curve',       // 投入强度的曲线（前重后轻 vs 均匀 vs 前轻后重）
] as const;

// ============================================================
// 差异化校验函数
// ============================================================

export interface DiversityCheckResult {
  valid: boolean;
  failures: string[];
  differentDimensions: string[];
  details: {
    dimension: string;
    routeA: string;
    routeB: string;
    isDifferent: boolean;
  }[];
}

/**
 * 验证两条路线是否在足够多的维度上有实质差异
 * 仅 "标题不同" 或 "阶段数不同" 是不够的
 */
export function validateRouteDiversity(routes: PlanRoute[]): DiversityCheckResult {
  const failures: string[] = [];
  const [a, b] = routes;

  if (!a || !b) {
    return {
      valid: false,
      failures: ['必须恰好有 2 条路线来进行对比'],
      differentDimensions: [],
      details: [],
    };
  }

  // 逐维度比较
  const details: DiversityCheckResult['details'] = [
    {
      dimension: '策略类型',
      routeA: a.route_type,
      routeB: b.route_type,
      isDifferent: a.route_type !== b.route_type,
    },
    {
      dimension: '阶段结构',
      routeA: `${a.phases.length}阶段: ${a.phases.map((p) => p.name).join('→')}`,
      routeB: `${b.phases.length}阶段: ${b.phases.map((p) => p.name).join('→')}`,
      isDifferent:
        a.phases.length !== b.phases.length ||
        JSON.stringify(a.phases.map((p) => p.name)) !==
          JSON.stringify(b.phases.map((p) => p.name)),
    },
    {
      dimension: '平均周投入',
      routeA: `${(a.phases.reduce((s, p) => s + p.weekly_hours, 0) / a.phases.length).toFixed(1)}h`,
      routeB: `${(b.phases.reduce((s, p) => s + p.weekly_hours, 0) / b.phases.length).toFixed(1)}h`,
      isDifferent:
        a.phases.reduce((s, p) => s + p.weekly_hours, 0) / a.phases.length !==
        b.phases.reduce((s, p) => s + p.weekly_hours, 0) / b.phases.length,
    },
    {
      dimension: '风险结构',
      routeA: a.risks.map((r) => r.risk).join('; '),
      routeB: b.risks.map((r) => r.risk).join('; '),
      isDifferent:
        JSON.stringify(a.risks.map((r) => r.risk).sort()) !==
        JSON.stringify(b.risks.map((r) => r.risk).sort()),
    },
    {
      dimension: '核心理念',
      routeA: a.thesis,
      routeB: b.thesis,
      isDifferent: a.thesis !== b.thesis,
    },
    {
      dimension: '首月安排',
      routeA: `${a.first_month_preview.week1_summary} | ${a.first_month_preview.week4_summary}`,
      routeB: `${b.first_month_preview.week1_summary} | ${b.first_month_preview.week4_summary}`,
      isDifferent:
        JSON.stringify(a.first_month_preview) !==
        JSON.stringify(b.first_month_preview),
    },
  ];

  const differentDimensions = details
    .filter((d) => d.isDifferent)
    .map((d) => d.dimension);

  // 标题完全相同 → 明显是伪差异化
  if (a.title === b.title) {
    failures.push('两条路线标题完全相同，实质差异不足');
  }

  // 优势完全相同 → 伪差异化
  if (
    JSON.stringify(a.advantages.map((ad) => ad.point).sort()) ===
    JSON.stringify(b.advantages.map((ad) => ad.point).sort())
  ) {
    failures.push('两条路线的优势描述完全相同');
  }

  // 少于 3 个维度不同 → 差异化不充分
  if (differentDimensions.length < 3) {
    failures.push(
      `两条路线仅 ${differentDimensions.length} 个维度有差异（${differentDimensions.join(', ') || '无'}），要求至少 3 个维度不同`,
    );
  }

  return {
    valid: failures.length === 0,
    failures,
    differentDimensions,
    details,
  };
}

// ============================================================
// 路线选择的用户输入
// ============================================================

export interface RouteSelection {
  selectedRouteId: string;
  rejectedRouteId: string;
  userNotes: string; // 用户为什么选这条
  modifications: string[]; // 用户对选中路线做了什么修改
}
