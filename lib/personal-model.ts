/**
 * Personal Model — 用户个人模型，从 Day 1 开始采集
 *
 * 这是产品长期护城河的核心。
 * 即使 MVP 0.1 只积累统计数组，也比"V2 再做"好 100 倍。
 *
 * 设计原则：
 * - 只采集，不决策（MVP 阶段数据用于展示，不自动修改 AI 行为）
 * - 增量更新（每次事件只更新相关维度）
 * - 可解释（用户能看到"系统了解我什么"）
 */

// ============================================================
// Personal Model 数据结构
// ============================================================

export interface BehaviorPatterns {
  /** 各时段的完成计数 { "morning": { completed: 4, total: 5 }, ... } */
  completionRateByTimeBlock: Record<string, { completed: number; total: number }>;
  /** 各精力等级任务的完成计数 */
  completionRateByEnergy: Record<string, { completed: number; total: number }>;
  /** 用户偏好什么大小的任务（基于完成率） */
  taskSizePreference: 'micro' | 'small' | 'medium' | 'large' | 'unknown';
  /** 连续使用天数 */
  currentStreak: number;
  /** 最长连续使用天数 */
  longestStreak: number;
  /** 最后一次活跃日期 */
  lastActiveDate: string | null;
}

export interface GoalPreferences {
  /** 用户选择的路线类型历史 { "depth_first": 2, "breadth_first": 1 } */
  routeTypeHistory: Record<string, number>;
  /** 用户覆盖 AI 象限的频率 */
  quadrantOverrideRate: number;
  /** 用户最常将任务分配到哪个象限 */
  preferredQuadrant: string | null;
  /** 用户修改 AI 建议任务标题的频率 */
  titleModificationRate: number;
}

export interface Calibration {
  /** 时间估算偏差（正值=AI 低估，负值=AI 高估），若干样本后取均值 */
  timeEstimationBias: number;
  /** 时间估算样本数 */
  timeEstimationSamples: number;
  /** 各类型任务的完成率 { "skill_acquisition": 0.7, "habit_formation": 0.4 } */
  completionRateByGoalType: Record<string, number>;
  /** 跳过原因分布 { "no_time": 5, "too_hard": 3, ... } */
  skipReasonDistribution: Record<string, number>;
}

export interface PersonalModelData {
  behaviorPatterns: BehaviorPatterns;
  goalPreferences: GoalPreferences;
  calibration: Calibration;
  /** 累计数据点数量（每个事件 = 1 个数据点） */
  dataPoints: number;
  /** 模型置信度（0-1，数据点越多越高） */
  confidence: number;
  /** 最后更新时间 */
  updatedAt: string;
}

// ============================================================
// 默认初始状态
// ============================================================

export function createDefaultPersonalModel(): PersonalModelData {
  return {
    behaviorPatterns: {
      completionRateByTimeBlock: {},
      completionRateByEnergy: {},
      taskSizePreference: 'unknown',
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
    },
    goalPreferences: {
      routeTypeHistory: {},
      quadrantOverrideRate: 0,
      preferredQuadrant: null,
      titleModificationRate: 0,
    },
    calibration: {
      timeEstimationBias: 0,
      timeEstimationSamples: 0,
      completionRateByGoalType: {},
      skipReasonDistribution: {},
    },
    dataPoints: 0,
    confidence: 0,
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================
// 事件类型
// ============================================================

export type PersonalModelEvent =
  | { type: 'task_completed'; taskId: string; timeBlock: string; energyLevel: string; actualMinutes: number; estimatedMinutes: number }
  | { type: 'task_skipped'; taskId: string; timeBlock: string; energyLevel: string; reason: string }
  | { type: 'task_modified'; taskId: string; fieldsModified: string[]; goalType: string }
  | { type: 'route_selected'; routeType: 'depth_first' | 'breadth_first' }
  | { type: 'quadrant_overridden'; taskId: string; aiQuadrant: string; userQuadrant: string }
  | { type: 'reflection_completed'; date: string; rating: number }
  | { type: 'goal_created'; goalType: string };

// ============================================================
// 增量更新函数（纯函数，无副作用）
// ============================================================

export function applyEvent(
  model: PersonalModelData,
  event: PersonalModelEvent,
): { model: PersonalModelData; changes: string[] } {
  const changes: string[] = [];

  switch (event.type) {
    case 'task_completed': {
      // 更新时段完成率
      const blockKey = event.timeBlock || 'unspecified';
      const prevBlock = model.behaviorPatterns.completionRateByTimeBlock[blockKey] || { completed: 0, total: 0 };
      model.behaviorPatterns.completionRateByTimeBlock[blockKey] = {
        completed: (prevBlock.completed || 0) + 1,
        total: (prevBlock.total || 0) + 1,
      };

      // 更新精力完成率
      const energyKey = event.energyLevel || 'unspecified';
      const prevEnergy = model.behaviorPatterns.completionRateByEnergy[energyKey] || { completed: 0, total: 0 };
      model.behaviorPatterns.completionRateByEnergy[energyKey] = {
        completed: (prevEnergy.completed || 0) + 1,
        total: (prevEnergy.total || 0) + 1,
      };

      // 更新时间估算偏差
      if (event.actualMinutes > 0 && event.estimatedMinutes > 0) {
        const bias = (event.actualMinutes - event.estimatedMinutes) / event.estimatedMinutes;
        const prevSamples = model.calibration.timeEstimationSamples;
        const prevBias = model.calibration.timeEstimationBias;
        model.calibration.timeEstimationBias =
          (prevBias * prevSamples + bias) / (prevSamples + 1);
        model.calibration.timeEstimationSamples = prevSamples + 1;
      }

      // 更新连续使用天数
      const today = new Date().toISOString().slice(0, 10);
      if (model.behaviorPatterns.lastActiveDate !== today) {
        const lastDate = model.behaviorPatterns.lastActiveDate;
        if (lastDate) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          if (lastDate === yesterday.toISOString().slice(0, 10)) {
            model.behaviorPatterns.currentStreak += 1;
          } else {
            model.behaviorPatterns.currentStreak = 1;
          }
        } else {
          model.behaviorPatterns.currentStreak = 1;
        }
        model.behaviorPatterns.lastActiveDate = today;
        if (model.behaviorPatterns.currentStreak > model.behaviorPatterns.longestStreak) {
          model.behaviorPatterns.longestStreak = model.behaviorPatterns.currentStreak;
        }
      }

      changes.push('behaviorPatterns.completionRateByTimeBlock');
      changes.push('behaviorPatterns.completionRateByEnergy');
      changes.push('calibration.timeEstimationBias');
      break;
    }

    case 'task_skipped': {
      // 更新跳过原因分布
      const reason = event.reason || 'unspecified';
      model.calibration.skipReasonDistribution[reason] =
        (model.calibration.skipReasonDistribution[reason] || 0) + 1;

      // 更新时段完成率（跳过也算总数）
      const blockKey = event.timeBlock || 'unspecified';
      const prevBlock = model.behaviorPatterns.completionRateByTimeBlock[blockKey] || { completed: 0, total: 0 };
      model.behaviorPatterns.completionRateByTimeBlock[blockKey] = {
        completed: prevBlock.completed || 0,
        total: (prevBlock.total || 0) + 1,
      };

      changes.push('calibration.skipReasonDistribution');
      break;
    }

    case 'task_modified': {
      model.goalPreferences.titleModificationRate =
        (model.goalPreferences.titleModificationRate * model.dataPoints + 1) / (model.dataPoints + 1);
      changes.push('goalPreferences.titleModificationRate');
      break;
    }

    case 'route_selected': {
      model.goalPreferences.routeTypeHistory[event.routeType] =
        (model.goalPreferences.routeTypeHistory[event.routeType] || 0) + 1;
      changes.push('goalPreferences.routeTypeHistory');
      break;
    }

    case 'quadrant_overridden': {
      model.goalPreferences.quadrantOverrideRate =
        (model.goalPreferences.quadrantOverrideRate * model.dataPoints + 1) / (model.dataPoints + 1);
      changes.push('goalPreferences.quadrantOverrideRate');
      break;
    }

    case 'goal_created': {
      model.calibration.completionRateByGoalType[event.goalType] =
        model.calibration.completionRateByGoalType[event.goalType] || 0;
      changes.push('calibration.completionRateByGoalType');
      break;
    }

    case 'reflection_completed': {
      // 暂时只记录活跃天数
      break;
    }
  }

  // 更新元数据
  model.dataPoints += 1;
  model.confidence = Math.min(1, model.dataPoints / 50); // 50 个数据点后达到满置信度
  model.updatedAt = new Date().toISOString();

  return { model, changes };
}

// ============================================================
// 生成 Personal Model 的人类可读摘要
// （未来可以注入到 AI prompt 中）
// ============================================================

export function summarizePersonalModel(model: PersonalModelData): string {
  if (model.dataPoints < 5) {
    return '（数据不足，Personal Model 尚未形成有意义的模式）';
  }

  const lines: string[] = [];

  // 最佳时段
  const blocks = Object.entries(model.behaviorPatterns.completionRateByTimeBlock)
    .map(([block, data]) => ({
      block,
      rate: data.total > 0 ? (data.completed || 0) / data.total : 0,
    }))
    .sort((a, b) => b.rate - a.rate);

  if (blocks.length > 0 && blocks[0].rate > 0) {
    lines.push(
      `最佳执行时段：${{ morning: '上午', afternoon: '下午', evening: '晚上' }[blocks[0].block] || blocks[0].block}（完成率 ${Math.round(blocks[0].rate * 100)}%）`,
    );
  }

  // 时间估算偏差
  if (model.calibration.timeEstimationSamples >= 3) {
    const bias = model.calibration.timeEstimationBias;
    if (Math.abs(bias) > 0.2) {
      const direction = bias > 0 ? '低估' : '高估';
      lines.push(`时间估算倾向：常${direction}任务所需时间（平均偏差 ${Math.abs(Math.round(bias * 100))}%）`);
    }
  }

  // 跳过原因
  const topSkipReason = Object.entries(model.calibration.skipReasonDistribution)
    .sort(([, a], [, b]) => b - a)[0];
  if (topSkipReason && topSkipReason[1] >= 2) {
    const reasonLabels: Record<string, string> = {
      no_time: '没时间',
      too_hard: '太难',
      forgot: '忘了',
      not_in_mood: '不想做',
    };
    lines.push(`最常见跳过原因：${reasonLabels[topSkipReason[0]] || topSkipReason[0]}（${topSkipReason[1]}次）`);
  }

  // 连续使用
  if (model.behaviorPatterns.currentStreak >= 3) {
    lines.push(`已连续使用 ${model.behaviorPatterns.currentStreak} 天`);
  }

  return lines.length > 0 ? lines.join('\n') : '（数据收集中，暂无显著模式）';
}
