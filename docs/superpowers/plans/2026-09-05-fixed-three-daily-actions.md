# 固定三条每日行动与未来路径 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 AI 行动计划固定为未来七天每天三条任务，并在确认时持久化当前月、当前周、下一周与下一个月，使已确认的目标树 UI 展示真实淡色未来节点。

**Architecture:** 任务草稿从按周几安排改为按“从今天起第几天”安排，以保证周中生成也覆盖未来连续七天。确认接口在同一数据库事务中补齐工作树节点、将 21 条任务关联到当前周，再写入任务；工作树只消费这些真实持久化节点，不增加前端占位数据。

**Tech Stack:** Next.js App Router、TypeScript、Zod、SQLite（better-sqlite3）、Vitest、React。

## Global Constraints

- 不添加生产依赖。
- 任务草稿必须恰为 21 条，未来连续七个自然日每天恰为 3 条。
- 不读取、询问、校验或展示每周可用时间、70% 容量、固定忙碌日或动态负荷。
- 每天至多一条高精力任务，整周至少 50% 为产出型；每项保留完成标准与最低行动。
- 当前月/周为 active；下一周和下一个月为 suggested；重复确认不得复制同一时间段节点。
- 除首周计划页文字与目标树真实数据接入外，不改动已确认的目标树视觉、动效、淡色卡片与按钮样式。
- 修改 JavaScript/TypeScript 后必须运行 `npm test`。

---

### Task 1: 用相对日期定义固定三条行动草稿

**Files:**
- Modify: `lib/schemas/task.ts`
- Modify: `lib/prompts/task-generation.ts`
- Modify: `tests/tasks-api.test.ts`

**Interfaces:**
- Produces: `TaskDraftSchema` 的 `day_offset: 0..6` 字段，取代 `day_of_week`。
- Produces: `WeeklyPlanSchema`，其中 `tasks` 是 `.length(21)`。
- Produces: `validateTaskQuality(tasks)`，对每个 `day_offset` 强制三条且高精力任务不超过一条。

- [ ] **Step 1: 写出固定数量与每日数量的失败测试**

在 `tests/tasks-api.test.ts` 增加使用 21 条草稿的构造器，并断言少于 21 条与某天四条都会触发 schema/quality 错误：

```ts
const tasks = Array.from({ length: 21 }, (_, index) => ({
  title: `完成练习 ${index + 1}`,
  completion_criteria: '交付一页笔记', minimum_action: '标记一个要点',
  estimated_minutes: 30, quadrant: 'important_not_urgent',
  day_offset: Math.floor(index / 3), energy_level: index % 3 === 0 ? 'high' : 'medium',
  why_this_task: '建立连续产出节奏', is_output_oriented: true,
}));
expect(WeeklyPlanSchema.parse({ tasks, total_minutes: 630, ai_note: '连续七天推进' }).tasks).toHaveLength(21);
expect(() => WeeklyPlanSchema.parse({ tasks: tasks.slice(0, 20), total_minutes: 600, ai_note: '不足' })).toThrow();
expect(validateTaskQuality([...tasks.slice(0, 20), { ...tasks[20], day_offset: 0 }]).issues).toContain('第 1 天必须安排 3 个任务，当前为 4 个');
```

- [ ] **Step 2: 运行测试，确认尚未支持新字段**

Run: `npm test -- tests/tasks-api.test.ts`

Expected: FAIL，因为现有 schema 仍要求 `day_of_week` 并允许 5–8 条。

- [ ] **Step 3: 最小化更新 schema 和质量检查**

在 `lib/schemas/task.ts` 采用以下核心定义：

```ts
day_offset: z.number().int().min(0).max(6).describe('从生成日开始第几天（0=今天，6=第七天）'),

export const WeeklyPlanSchema = z.object({
  tasks: z.array(TaskDraftSchema).length(21).describe('未来七天每天三条，共 21 条行动'),
  total_minutes: z.number(),
  ai_note: z.string(),
});
```

将按日数量检查替换为对 `0..6` 的完整循环，并加入精确报错：

```ts
for (let day = 0; day < 7; day += 1) {
  const count = tasks.filter((task) => task.day_offset === day).length;
  if (count !== 3) issues.push(`第 ${day + 1} 天必须安排 3 个任务，当前为 ${count}`);
}
```

保留并更新高精力检查为按 `day_offset` 聚合；移除容量类型、`checkCapacity`、`weekly_capacity_percentage` 和 `overload_warning`。

- [ ] **Step 4: 更新生成提示**

在 `lib/prompts/task-generation.ts` 中将“首周 5-8 个”“每天最多 2 个”“70% 容量”替换为下列约束，并从用户消息参数删除 `weeklyHours`、固定责任与精力时段：

```text
- 从今天开始连续 7 个自然日，每天恰好生成 3 个任务，共 21 个。
- 每天第一个任务是直接推进当前阶段的关键行动，另外两个是支撑行动。
- 使用 day_offset：0 表示今天，6 表示第七天；每个 offset 必须恰有 3 项。
- 每天最多 1 个高精力任务；至少 50% 为产出型任务。
```

- [ ] **Step 5: 运行单测并提交**

Run: `npm test -- tests/tasks-api.test.ts`

Expected: PASS。

```bash
git add lib/schemas/task.ts lib/prompts/task-generation.ts tests/tasks-api.test.ts
git commit -m "feat: require three daily actions"
```

### Task 2: 生成接口移除容量输入并返回固定计划

**Files:**
- Modify: `app/api/ai/tasks/route.ts`
- Modify: `app/plan/week/week-client.tsx`
- Modify: `app/plan/week/week-plan-panel.tsx`
- Modify: `tests/tasks-api.test.ts`
- Modify: `tests/week-page.test.tsx`

**Interfaces:**
- Consumes: Task 1 的 `WeeklyPlan` 与 `TaskDraft`。
- Produces: `POST /api/ai/tasks`，请求体仅为 `{ goalId: string }`，响应为 `{ plan, routeId, draft: true }`。

- [ ] **Step 1: 写接口与页面文案的失败测试**

将 `tests/tasks-api.test.ts` 的请求改为：

```ts
const response = await handler(new Request('http://localhost/api/ai/tasks', {
  method: 'POST', body: JSON.stringify({ goalId }),
}));
expect(response.status).toBe(200);
expect((await response.json()).plan.tasks).toHaveLength(21);
```

在 `tests/week-page.test.tsx` 断言：

```ts
expect(screen.getByText('未来 7 天 · 每天 3 项')).toBeInTheDocument();
expect(screen.queryByText(/分钟/)).not.toBeInTheDocument();
```

- [ ] **Step 2: 运行目标测试，确认旧接口仍依赖时间**

Run: `npm test -- tests/tasks-api.test.ts tests/week-page.test.tsx`

Expected: FAIL，因为接口要求 `weeklyHours`，页面显示容量读数。

- [ ] **Step 3: 简化接口上下文与页面消费**

在 `app/api/ai/tasks/route.ts`：

```ts
type Context = { goalName: string; routeTitle: string; routeThesis: string; phases: Parameters<typeof serializeRoutePhases>[0] };
const body = await request.json() as { goalId?: string };
if (!body.goalId) return Response.json({ code: 'INVALID_INPUT', userMessage: '缺少目标', retryable: false }, { status: 400 });
return Response.json({ plan: generated.result, routeId: row.id, draft: true });
```

从 `WeekClient` 请求体删除 `weeklyHours: 5`；`WeekPlanPanel` 删除 `weeklyMinutes` 属性与容量 readout，并按 `day_offset` 分组渲染七个 `<section>`，标题为“第 1 天”至“第 7 天”。页面主标题使用“未来 7 天 · 每天 3 项”，确认按钮使用“确认这 7 天计划”。

- [ ] **Step 4: 运行目标测试并提交**

Run: `npm test -- tests/tasks-api.test.ts tests/week-page.test.tsx`

Expected: PASS。

```bash
git add app/api/ai/tasks/route.ts app/plan/week/week-client.tsx app/plan/week/week-plan-panel.tsx tests/tasks-api.test.ts tests/week-page.test.tsx
git commit -m "feat: generate fixed seven-day action plan"
```

### Task 3: 确认计划时原子写入任务与四个路径节点

**Files:**
- Modify: `lib/workspace-repository.ts`
- Modify: `app/api/tasks/route.ts`
- Modify: `app/api/ai/goal-work-tree/route.ts`
- Modify: `tests/tasks-confirmation-api.test.ts`
- Modify: `tests/goal-work-ai-api.test.ts`

**Interfaces:**
- Produces: `ensureGoalWorkPath(input)`，返回 `{ currentMonth, currentWeek, futureWeek, futureMonth }`。
- Consumes: 已选路线的 `phases_json`、`first_month_preview_json` 与活动 `planning_branch`。
- Produces: 已确认任务的 `work_node_id = currentWeek.id`。

- [ ] **Step 1: 写确认接口的失败测试**

在 `tests/tasks-confirmation-api.test.ts` 用 Task 1 的 21 条草稿确认计划，并断言：

```ts
expect(getDb().prepare('SELECT COUNT(*) count FROM task WHERE goal_id = ?').get(goalId)).toEqual({ count: 21 });
expect(getDb().prepare("SELECT COUNT(*) count FROM goal_work_node WHERE goal_id = ? AND node_type = 'month'").get(goalId)).toEqual({ count: 2 });
expect(getDb().prepare("SELECT COUNT(*) count FROM goal_work_node WHERE goal_id = ? AND node_type = 'week'").get(goalId)).toEqual({ count: 2 });
expect(getDb().prepare("SELECT COUNT(*) count FROM task WHERE goal_id = ? AND work_node_id IS NOT NULL").get(goalId)).toEqual({ count: 21 });
```

再次调用同一请求并断言月、周节点数量仍各为 2。`tests/goal-work-ai-api.test.ts` 改为预期一次建议返回四个节点，其中未来月、未来周为 `suggested`。

- [ ] **Step 2: 运行目标测试，确认路径尚未被补齐**

Run: `npm test -- tests/tasks-confirmation-api.test.ts tests/goal-work-ai-api.test.ts`

Expected: FAIL，因为当前确认接口只写入任务，建议接口只创建两个节点。

- [ ] **Step 3: 实现可复用的路径补齐助手**

在 `lib/workspace-repository.ts` 添加：

```ts
export async function ensureGoalWorkPath(input: {
  goalId: string; branchId: string; route: { phases: Array<{ name?: string; focus?: string }>; firstMonthPreview: { week1_summary?: string; week2_summary?: string } };
  startDate: string;
}): Promise<{ currentMonth: GoalWorkNodeRecord; currentWeek: GoalWorkNodeRecord; futureWeek: GoalWorkNodeRecord; futureMonth: GoalWorkNodeRecord }>;
```

助手先查询同一 `goal_id`、`branch_id`、`node_type`、`start_date` 的节点；缺失时创建。第 1 阶段生成当前月和当前周，第 2 阶段（或“下一阶段”回退文本）生成未来月；首月预览第 2 周（或“继续推进{第一阶段}”回退文本）生成未来周。使用 `startDate + 0/+7/+30`，结束日对应 `+6/+13/+59`。当前节点用 `active`，未来节点用 `suggested`。

在 `app/api/tasks/route.ts` 查询路线、解析 `phases_json` 与 `first_month_preview_json`，调用助手并以 `currentWeek.id` 写入 `work_node_id`：

```ts
const path = await ensureGoalWorkPath({ goalId: body.goalId, branchId: branch.id, route, startDate: today });
await run(`INSERT INTO task (..., work_node_id, ...) VALUES (..., ?, ...)`, path.currentWeek.id);
```

将该路径生成逻辑由 `app/api/ai/goal-work-tree/route.ts` 复用，使“生成 AI 建议”在空树时创建相同四节点；已有节点不会新增副本。

- [ ] **Step 4: 运行目标测试并提交**

Run: `npm test -- tests/tasks-confirmation-api.test.ts tests/goal-work-ai-api.test.ts`

Expected: PASS。

```bash
git add lib/workspace-repository.ts app/api/tasks/route.ts app/api/ai/goal-work-tree/route.ts tests/tasks-confirmation-api.test.ts tests/goal-work-ai-api.test.ts
git commit -m "feat: persist future goal path with plans"
```

### Task 4: 将已确认的目标树 UI 接入真实未来节点

**Files:**
- Modify: `app/workspace/goal-work-tree.tsx`
- Modify: `app/goal-tree/goal-tree-client.tsx`
- Modify: `tests/goal-tree-page.test.tsx`

**Interfaces:**
- Consumes: Task 3 持久化的当前月/周及 future 月/周节点、关联任务。
- Produces: 树页当天恰好显示三张 planned 行动卡，并在存在真实 future 节点时显示两张淡色可展开卡片。

- [ ] **Step 1: 写目标树的失败测试**

在 `tests/goal-tree-page.test.tsx` 为 `m1/w1` 加入 21 条跨七天任务，并添加：

```ts
expect(screen.getByText('下一章节 · 未展开')).toBeInTheDocument();
expect(screen.getByText('后续任务 · 未展开')).toBeInTheDocument();
expect(screen.getAllByRole('listitem')).toHaveLength(3);
expect(screen.getByText('今日行动 · AI 已安排 3 项')).toBeInTheDocument();
```

- [ ] **Step 2: 运行目标测试，确认真实数据链路尚不完整**

Run: `npm test -- tests/goal-tree-page.test.tsx`

Expected: FAIL，直到 Task 3 的节点及任务关联被页面正确选取。

- [ ] **Step 3: 只做数据与文字接入，不改视觉规则**

在 `GoalWorkTree` 中保持现有 `isFuture`、`futureCard`、`slice(0, 3)`、展开动效和 `subtleAction` class 不变。将当前月/周选择按日期排序，以保证当前节点稳定；未来选择为大于今天的第一个同类型节点。`GoalTreeClient` 的确认后刷新/更新必须保留接口给出的完整节点和任务数组，不合成假节点。

不要编辑 `goal-work-tree.module.css`，除非测试证明现有已确认布局无法容纳真实节点；若需调整，只能维持当前色彩、卡片大小和细边框按钮规范。

- [ ] **Step 4: 运行目标测试并提交**

Run: `npm test -- tests/goal-tree-page.test.tsx`

Expected: PASS。

```bash
git add app/workspace/goal-work-tree.tsx app/goal-tree/goal-tree-client.tsx tests/goal-tree-page.test.tsx
git commit -m "feat: show persisted future path in goal tree"
```

### Task 5: 全量验证与本地预览

**Files:**
- Verify: `tests/**/*.test.ts*`
- Verify: `app/goal-tree/goal-tree-client.tsx`
- Verify: `app/plan/week/week-client.tsx`

- [ ] **Step 1: 运行完整测试套件**

Run: `npm test`

Expected: 所有测试通过。

- [ ] **Step 2: 运行类型检查与 lint**

Run: `npm run typecheck && npm run lint`

Expected: 类型检查通过；lint 不新增 warning 或 error。

- [ ] **Step 3: 用浏览器验证关键流程**

在本地应用中：选择已存在路线，生成并确认 21 条计划；打开目标工作树，确认当天显示三张卡、右侧显示“下一章节”和“后续任务”；展开其中一张淡色卡，确认不与另一张重叠；打开今日任务卡，确认编辑、完成、暂停仍为细边框透明按钮。

- [ ] **Step 4: 提交最终集成验证记录**

```bash
git add docs/superpowers/plans/2026-09-05-fixed-three-daily-actions.md
git commit -m "docs: add daily action implementation plan"
```

## Plan self-review

- Spec coverage: 任务数量、相对日期、无容量、节点持久化、幂等、淡色未来卡、现有交互保留、错误处理与测试均有对应任务。
- Placeholder scan: 本计划不含 TBD、TODO、稍后实现或未定义的执行步骤。
- Type consistency: 任务使用 `day_offset`；计划使用 `WeeklyPlan`；路径使用 `ensureGoalWorkPath`；确认时使用返回的 `currentWeek.id` 作为 `work_node_id`。
