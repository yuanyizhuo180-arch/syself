# AI 行为测试场景规格

> Phase 1 Claude Code 产物：定义核心链路中 AI 的行为验证场景。
> 这些场景在 Phase 1 中由 Vitest 实现为自动化测试，Codex 负责编写测试代码框架。

---

## 场景分类

### A 类：正常流程（Happy Path）

必须全部通过才能进入 MVP 0.1 种子测试。

### B 类：边界条件（Edge Cases）

应尽量通过，不阻塞但需记录。

### C 类：异常恢复（Error Recovery）

AI 服务不稳定时的行为验证。

---

## A 类：正常流程

### A1 — 模糊目标触发追问

```
GIVEN 用户输入 "我想变得更好"
WHEN  调用 Goal Understanding API
THEN  AI 返回 confidence < 0.6
AND   missing_information 包含 ≥2 条追问
AND   其中 ≥1 条 priority = "critical"
AND   requiresFollowUp = true
AND   不包含 "你应该" 等建议性语言
```

### A2 — 明确目标直接标准化

```
GIVEN 用户输入 "我想 6 个月内通过 CFA 一级，每周可学 10 小时，有会计基础"
WHEN  调用 Goal Understanding API
THEN  AI 返回 confidence ≥ 0.7
AND   desired_outcome 包含可验证要素（如"通过 CFA 一级考试"）
AND   assumptions 每条标注 basis
AND   inferred 类型假设占比 ≤ 50%
```

### A3 — 两条路线实质差异化

```
GIVEN 一份完整的目标理解结果
WHEN  调用 Route Generation API
THEN  返回恰好 2 条路线
AND   route_type 分别为 depth_first 和 breadth_first
AND   validateRouteDiversity 返回 valid = true
AND   不同维度数 ≥ 3
AND   每条路线 ≥1 个 advantage 引用用户画像
AND   recommendation = null
```

### A4 — 路线容量不超过用户限制

```
GIVEN 用户每周可用 5 小时
WHEN  调用 Route Generation API
THEN  每条路线的 phases 中各阶段 weekly_hours ≤ 5
AND   路线总时间投入合理（不超用户容量）
```

### A5 — 生成 5-8 个可验证任务

```
GIVEN 一条选定的路线 + 用户画像
WHEN  调用 Task Generation API
THEN  返回 5-8 个任务
AND   每个任务有 completion_criteria（不为空、不含"学习""了解"纯输入动词）
AND   每个任务有 minimum_action
AND   ≥50% 的任务 is_output_oriented = true
```

### A6 — 任务容量不超过 70%

```
GIVEN 用户每周可用 10 小时（600 分钟）
WHEN  调用 Task Generation API
THEN  total_minutes ≤ 420（70%）
AND   overload_warning 为 null
```

### A7 — 每日任务不超过 2 个

```
GIVEN 首周 7 天
WHEN  检查生成的所有任务
THEN  每天（day_of_week 相同值）的任务数 ≤ 2
AND   每天高精力任务 ≤ 1
```

### A8 — 复盘不包含人格判断

```
GIVEN 任意执行数据（好/中/差）
WHEN  调用 Reflection API
THEN  AI 输出不包含 "你是一个" "你总是" "你从不" "你习惯性"
AND   不包含 "坚持就是胜利" "加油" "你一定可以"
AND   improvement_hint 只有 1 条建议
```

### A9 — 复盘语气匹配完成率

```
GIVEN 完成率 100%，用户评分 5
WHEN  调用 Reflection API
THEN  tone = "supportive"

GIVEN 完成率 40%，用户评分 2
WHEN  调用 Reflection API
THEN  tone = "direct"

GIVEN 完成率 0%，用户评分 1
WHEN  调用 Reflection API
THEN  tone = "light"
```

### A10 — 完整闭环 E2E

```
GIVEN 一个新用户
WHEN  执行完整流程：
  1. 输入目标 "我想成为投资高手"
  2. AI 理解并追问（用户回答追问）
  3. 确认目标
  4. 生成 2 条路线
  5. 用户选择路线 A
  6. 生成 7 天任务
  7. 用户确认任务
  8. 第 1 天标记 2 个任务完成
  9. 完成快速复盘
THEN  每一步状态正确流转
AND   数据持久化到 SQLite
AND   无异常或数据丢失
```

---

## B 类：边界条件

### B1 — 极端短目标

```
GIVEN 用户输入 "1 周内学会游泳"（时间极短 + 明确技能）
WHEN  调用 Goal Understanding API
THEN  AI 应识别时间过于紧张
AND   在 missing_information 中追问当前水性
AND   confidence 不应盲目给高分
```

### B2 — 极端长目标

```
GIVEN 用户输入 "我想在 10 年内成为行业顶尖专家"
WHEN  调用 Route Generation API
THEN  路线的首月预览应聚焦"探索和基础建设"
AND   不应试图规划 10 年的全部阶段
```

### B3 — 目标包含矛盾信息

```
GIVEN 用户输入 "我想每周只花 2 小时，3 个月内成为全栈工程师"
WHEN  调用 Goal Understanding API
THEN  AI 应在 risks 中指出投入时间与目标难度不匹配
AND   在 assumptions 中标注这基于"用户已有编程基础"的推断
```

### B4 — 用户画像信息非常少

```
GIVEN 用户只提供了目标和每周时间，其他画像字段为空
WHEN  调用 Route Generation API
THEN   路线的 user_profile_basis 应诚实标注引用了哪些有限信息
AND   不应编造用户画像中不存在的信息
```

### B5 — Personal Model 为空（首次使用）

```
GIVEN Personal Model 数据点 < 5
WHEN  构建 Task Generation 的 User Message
THEN  personalModelSummary 返回 "（首次使用，暂无个人数据）"
AND   任务生成质量不应明显下降
```

### B6 — Personal Model 显示明确模式

```
GIVEN Personal Model 显示 "上午完成率 90%，晚上完成率 20%"
WHEN  调用 Task Generation API
THEN   高精力任务应优先安排在上午
AND   晚间不安排高精力任务
AND   improvement_hint 可能建议 "把重要任务移到上午"
```

---

## C 类：异常恢复

### C1 — AI 返回非法 JSON（第一次）

```
GIVEN AI 第一次返回不符合 Schema 的 JSON
WHEN  generateStructured 捕获 Zod 校验错误
THEN  自动重试一次（attempt = 2）
AND   重试时 userMessage 追加了错误提示
```

### C2 — AI 两次均返回非法 JSON

```
GIVEN AI 两次返回都不符合 Schema
WHEN  generateStructured 达到 maxRetries = 2
THEN  返回 { result: null, error: "错误信息", recoverable: true }
AND   不抛出未捕获异常
AND   用户可以手动继续
```

### C3 — AI 返回的路线差异化不足

```
GIVEN AI 返回 2 条路线但 validateRouteDiversity 返回 valid = false
WHEN  系统检测到差异化不足
THEN  返回明确的失败原因（如"仅 1 个维度有差异"）
AND   提供重试入口
AND   不静默接受伪差异化路线
```

### C4 — AI 返回超过容量限制的任务

```
GIVEN AI 返回的任务总时长超过 70% 限制
WHEN  系统检测到超载
THEN  overload_warning 非 null
AND   前端展示黄色警告而非阻断
AND   用户可选择强制确认或要求 AI 重新生成
```

---

## 测试实现指引（给 Codex）

以上场景在 Phase 1 中需要使用 Vitest 实现。关键点：

1. **A 类场景**使用真实 AI 调用（或 FakeAIAdapter 用于 CI）
2. **B 类场景**使用真实 AI 调用验证行为边界
3. **C 类场景**必须使用 FakeAIAdapter 注入失败来验证恢复逻辑

FakeAIAdapter 需支持：
- `setNextResponse(json)` — 设置下一次调用的返回值
- `setNextError(message)` — 设置下一次调用抛出错误
- `getCallHistory()` — 获取调用历史用于验证重试行为

```typescript
// FakeAIAdapter 接口（Codex 实现）
interface FakeAIAdapter {
  setNextResponse(data: unknown): void;
  setNextError(message: string): void;
  getCallHistory(): Array<{ prompt: string; timestamp: string }>;
  reset(): void;
}
```
