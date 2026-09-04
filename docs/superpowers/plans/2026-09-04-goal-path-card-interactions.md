# Goal Path Card Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已确认的目标路径视觉落实到目标工作树，并让月、周与今日任务均能通过卡片展开执行编辑、完成、暂停。

**Architecture:** 保持 `GoalTreeClient` 作为目标树的唯一请求与状态协调者；任务编辑表单是目标工作树中的纯受控组件。新增任务 PATCH 接口直接更新现有 `task` 记录并以 `decision_event` 保留可回溯记录，任务不会因暂停或编辑而脱离其周节点。

**Tech Stack:** Next.js App Router、React、TypeScript、CSS Modules、SQLite（better-sqlite3）、Vitest。

## Global Constraints

- 不添加生产依赖，保留现有 SQLite 数据结构。
- 目标工作树桌面布局必须遵循已确认的「深绿主目标 → 当前月/周 → 右侧淡色未来节点 → 三项今日行动」视觉。
- 未来月节点上移到展开后与第二周未来节点不重叠的位置；其他已确认视觉、文字和比例不变。
- 月、周、日任务均使用透明背景、1px 细边框、12px、400 字重、7px 圆角的操作按钮。
- 日任务暂停仅暂停这一个任务，不暂停所属周；暂停任务保留可回溯显示，但不计入 AI 当日安排数量。
- 所有 TypeScript/JavaScript 变更后运行 `npm test`。

---

### Task 1: 任务编辑与暂停资源接口

**Files:**
- Modify: `lib/types.ts:57`
- Modify: `lib/schemas/task.ts:92-106`
- Modify: `lib/workspace-repository.ts:10-17`
- Create: `app/api/tasks/[id]/route.ts`
- Create: `tests/task-mutation-api.test.ts`

**Interfaces:**
- Consumes: `getActiveBranch()` 与 `insertDecisionEvent()`。
- Produces: `PATCH(request, { params })`，接收 `TaskPatch`，返回 `{ task }` 或既有 API 错误对象。

- [x] **Step 1: 写入接口失败测试**

```ts
it('编辑单个任务并留下 task_edited 决策记录', async () => {
  const response = await PATCH(request(taskId, {
    action: 'edit', title: '训练 TF-IDF 基线', completionCriteria: '记录准确率与 F1',
    minimumAction: '运行一次训练', estimatedMinutes: 45,
  }), { params: Promise.resolve({ id: taskId }) });
  expect(response.status).toBe(200);
  expect(db.prepare('SELECT title, estimated_minutes FROM task WHERE id = ?').get(taskId))
    .toEqual({ title: '训练 TF-IDF 基线', estimated_minutes: 45 });
  expect(db.prepare("SELECT event_type FROM decision_event WHERE entity_id = ?").get(taskId))
    .toEqual({ event_type: 'task_edited' });
});

it('暂停单个任务而不改变所属周目标', async () => {
  const response = await PATCH(request(taskId, { action: 'pause' }), { params: Promise.resolve({ id: taskId }) });
  expect(response.status).toBe(200);
  expect(db.prepare('SELECT status FROM task WHERE id = ?').get(taskId)).toEqual({ status: 'paused' });
  expect(db.prepare('SELECT status FROM goal_work_node WHERE id = ?').get(weekId)).toEqual({ status: 'active' });
});
```

- [x] **Step 2: 运行接口测试并确认失败**

Run: `npm test -- tests/task-mutation-api.test.ts`

Expected: FAIL，因为 `app/api/tasks/[id]/route.ts` 尚不存在。

- [x] **Step 3: 增加状态契约与最小接口实现**

```ts
export type TaskStatus = 'planned' | 'done' | 'skipped' | 'partial' | 'paused';

type TaskPatch =
  | { action: 'edit'; title: string; completionCriteria: string; minimumAction: string; estimatedMinutes: number }
  | { action: 'pause' };

if (body.action === 'pause') {
  await run("UPDATE task SET status = 'paused', updated_at = datetime('now') WHERE id = ?", id);
  await insertDecisionEvent({ goalId: task.goal_id, branchId: branch.id, entityType: 'task', entityId: id,
    eventType: 'task_paused', before: task, after: { ...task, status: 'paused' }, rationale: null });
}
```

对 edit 分支校验 `title`、`completionCriteria`、`minimumAction` 均为去空格后的非空字符串，且 `estimatedMinutes` 为 5–240 的整数；更新四个 task 字段，写入 `task_edited`，并返回更新后的任务。无任务、无活跃分支及非法输入分别返回 404、404、400。

- [x] **Step 4: 运行接口测试并确认通过**

Run: `npm test -- tests/task-mutation-api.test.ts`

Expected: PASS。

- [x] **Step 5: 运行全量测试并提交**

Run: `npm test`

Expected: PASS。

Commit: `feat: support editing and pausing goal tree tasks`

### Task 2: 行动聚焦路径的可展开树组件

**Files:**
- Modify: `app/workspace/goal-work-tree.tsx`
- Modify: `app/workspace/goal-work-tree.module.css`
- Modify: `tests/goal-tree-page.test.tsx`

**Interfaces:**
- Consumes: `TreeNode`、补充 `paused` 的 `TreeTask`，以及 `onEditTask`, `onPauseTask`, `onCompleteTask` 回调。
- Produces: `GoalWorkTree` 的可展开月卡、周卡、今日任务卡与 `TaskCardEditor`。

- [x] **Step 1: 写入组件失败测试**

```tsx
expect(html).toContain('唯一主目标');
expect(html).toContain('当前月 · 第一个月');
expect(html).toContain('当前周 · 第 1 周');
expect(html).toContain('下一章节 · 未展开');
expect(html).toContain('后续任务 · 未展开');
expect(html).toContain('今日行动 · AI 已安排 3 项');
expect(html).toContain('完成标准');
expect(html).toContain('最低行动');
expect(html).toContain('预计分钟');
```

同时测试传入一个 `paused` 任务时，页面包含“已暂停”但“AI 已安排”数不增加。

- [x] **Step 2: 运行组件测试并确认失败**

Run: `npm test -- tests/goal-tree-page.test.tsx`

Expected: FAIL，因为当前组件仍使用旧标题、列表布局与单一完成按钮。

- [x] **Step 3: 以最小状态实现卡片展开和任务编辑器**

```tsx
const [expanded, setExpanded] = useState<string | null>(null);
const toggle = (key: string) => setExpanded((current) => current === key ? null : key);

function TaskCardEditor({ task, onSave, onCancel }: { task: TreeTask; onSave: (values: TaskEditValues) => void; onCancel: () => void }) {
  // 四个受控字段：title、completionCriteria、minimumAction、estimatedMinutes
}
```

以路径的当前月、当前周为中心列渲染，首个未来月为右侧 `.futureMonth`，首个未来周为右侧 `.futureWeek`；`.futureMonth` 使用明确的 `top` 值，确保展开详情底部不触及 `.futureWeek` 顶部。今日组固定渲染最多三张日任务；日任务展开时显示编辑器或操作行，操作按钮调用 `stopPropagation()`。暂停任务另外列在行动组的“已暂停”区域。

所有月/周/任务操作行均复用 `.subtleAction`：透明背景、`1px solid`、`font: 400 12px/1.2`。展开区域以 `grid-template-rows`、透明度和 8px 位移完成 220ms 动效，并在 `prefers-reduced-motion` 下去除动效。

- [x] **Step 4: 运行组件测试并确认通过**

Run: `npm test -- tests/goal-tree-page.test.tsx`

Expected: PASS。

- [x] **Step 5: 运行全量测试并提交**

Run: `npm test`

Expected: PASS。

Commit: `feat: render expandable action-focused goal path`

### Task 3: 连接客户端请求与持久化后的本地状态

**Files:**
- Modify: `app/goal-tree/goal-tree-client.tsx`
- Modify: `tests/goal-tree-page.test.tsx`

**Interfaces:**
- Consumes: `PATCH /api/tasks/[id]`、既有 `POST /api/tasks/[id]/complete`。
- Produces: `editTask(values)`, `pauseTask(id)`, `completeTask(id)` 回调给 `GoalWorkTree`。

- [x] **Step 1: 写入客户端失败测试**

```tsx
expect(source).toContain("fetch(`/api/tasks/${id}`, { method: 'PATCH'");
expect(source).toContain("action: 'pause'");
expect(source).toContain('onEditTask={editTask}');
expect(source).toContain('onPauseTask={pauseTask}');
```

- [x] **Step 2: 运行客户端测试并确认失败**

Run: `npm test -- tests/goal-tree-page.test.tsx`

Expected: FAIL，因为客户端尚未提供任务编辑或暂停回调。

- [x] **Step 3: 实现最小请求与局部状态更新**

```ts
async function pauseTask(id: string) {
  const response = await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ action: 'pause' }) });
  if (!response.ok) return setError('暂停今日任务失败，请重试。');
  setTasks((current) => current.map((task) => task.id === id ? { ...task, status: 'paused' } : task));
}
```

编辑成功后用响应内 `task` 替换同 ID 本地记录；完成成功后保留现有移除 planned 任务逻辑。每次失败均不修改本地任务且显示简短错误。

- [x] **Step 4: 运行客户端测试并确认通过**

Run: `npm test -- tests/goal-tree-page.test.tsx`

Expected: PASS。

- [x] **Step 5: 全量验证并提交**

Run: `npm test && npm run typecheck && npm run lint`

Expected: 全部通过；lint 仅允许既有警告。

Commit: `feat: persist goal path task actions`

## Plan Self-Review

- Spec coverage: Task 1 覆盖持久化、回溯和单任务暂停；Task 2 覆盖已确认视觉、展开交互、按钮样式与暂停显示；Task 3 覆盖前端请求、错误及状态同步。
- Placeholder scan: 无 TBD/TODO 或未定义接口；所有行动均给出文件、测试、命令及输出预期。
- Type consistency: `TaskStatus`、`TreeTask.status`、`TaskPatch` 与客户端回调均使用 `paused` 作为单一暂停状态。
