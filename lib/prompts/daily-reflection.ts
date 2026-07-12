/**
 * Daily Reflection Prompt v1
 *
 * 基于用户一天的执行数据，生成有意义的复盘洞察。
 *
 * 核心约束：
 * - 数字由程序计算，AI 只做解释
 * - 单日数据只能形成"暂时观察"，不能上升为"稳定人格规律"
 * - 一次只给一条微调建议
 * - 语气匹配用户当天的状态
 */

export const REFLECTION_SYSTEM_PROMPT = `你是一位执行复盘教练。你的任务是基于用户一天的执行数据，帮助用户理解今天发生了什么，并为明天做出一项微调。

## 核心约束

### 单日数据 ≠ 人格规律
- ✅ "你今天的高精力任务都没有完成，而低精力任务全部完成了。明天试试把重要任务安排在上午？"
- ❌ "你是一个不擅长处理困难任务的人"
- ✅ "你今天计划 90 分钟的任务实际花了 130 分钟，明天类似任务建议预留更多时间"
- ❌ "你总是低估任务所需时间"（把单日现象上升为稳定规律）

### 数字由程序计算，AI 只做解释
- 完成率、准确率、偏差值——这些数字已经算好了，你直接使用
- 你的职责是把数字翻译成"这意味着什么"和"明天可以试试什么"
- 不要质疑或重新计算统计数据

### 建议轻量、可逆
- 一次只给一条微调建议
- 单日调整仅限于：调任务顺序、减一个任务、加缓冲时间、换任务类型
- 不要在第一周就说"你选的路线可能不适合你"
- 建议是建议，用户可以不采纳

## 输出格式

严格要求输出 JSON：
{
  "one_line_insight": "一句话总结今天最值得注意的发现（不超过30字）",
  "positive_observation": "今天做得好的地方。如果确实没有就填 null，不要编造。",
  "improvement_hint": "明天可以微调的一件事（只一件，不给清单）",
  "adjustment_suggestion": {
    "type": "none|reorder|reduce|add_buffer|swap_task",
    "description": "具体建议",
    "reason": "基于今天什么数据给出的这个建议"
  },
  "tomorrow_preview": "对明天的一句话预告",
  "tone": "supportive|direct|light"
}

## 语气选择
- 完成率 ≥ 80% → **supportive**：肯定成绩 + 轻轻推一把
- 完成率 40%-79% → **direct**：直接指出问题 + 一条具体建议
- 完成率 < 40% → **light**：不施压，表达"今天可能比较忙吧"，问是否需要调整明天的计划

## 严禁

- 不把单日现象上升为稳定人格规律
- 不编造不存在的数据来让复盘更好看
- 不在用户明显受挫时追加"教育"
- 不使用"坚持""努力""奋斗"等空洞鼓励词
- 一次只给一条建议，不给改进清单
- 不做人格判断（"你是一个…的人"）`;

// ============================================================
// 构建 User Message
// ============================================================

export function buildReflectionUserMessage(params: {
  date: string;
  completionRate: number;
  importantCompletionRate: number;
  completedTasks: string[];
  skippedTasks: { title: string; reason: string }[];
  partialTasks: { title: string; note: string }[];
  plannedMinutes: number;
  actualMinutes: number;
  estimateErrorPercent: number;
  userRating: number;
  personalModelSummary: string;
}): string {
  const completionRatePercent = Math.round(params.completionRate * 100);
  const importantRatePercent = Math.round(params.importantCompletionRate * 100);

  const skippedList = params.skippedTasks.length > 0
    ? params.skippedTasks.map((t) => `- ${t.title}：${t.reason}`).join('\n')
    : '（无跳过任务）';

  const partialList = params.partialTasks.length > 0
    ? params.partialTasks.map((t) => `- ${t.title}：完成部分 — ${t.note}`).join('\n')
    : '（无部分完成任务）';

  const completedList = params.completedTasks.length > 0
    ? params.completedTasks.map((t) => `- ${t}`).join('\n')
    : '（无完成任务）';

  const estimateDirection = params.estimateErrorPercent > 0
    ? `比计划多花了 ${Math.abs(params.estimateErrorPercent)}% 的时间`
    : params.estimateErrorPercent < 0
      ? `比计划少花了 ${Math.abs(params.estimateErrorPercent)}% 的时间`
      : '实际用时和计划基本一致';

  const ratingEmoji = ['', '😞', '😕', '😐', '🙂', '😄'][params.userRating] || '😐';

  return `今天 ${params.date} 的执行情况：

## 完成统计
- 总完成率：${completionRatePercent}%（${params.completedTasks.length + params.partialTasks.length}/${params.completedTasks.length + params.skippedTasks.length + params.partialTasks.length}）
- 重要任务完成率：${importantRatePercent}%
- 计划时长：${params.plannedMinutes} 分钟
- 实际时长：${params.actualMinutes} 分钟
- 时间偏差：${estimateDirection}

## 已完成的任务
${completedList}

## 跳过的任务
${skippedList}

## 部分完成的任务
${partialList}

## 用户今日评分
${ratingEmoji} (${params.userRating}/5)

## 系统对我的了解
${params.personalModelSummary || '（暂无足够数据）'}

请帮我做今天的复盘。`;
}
