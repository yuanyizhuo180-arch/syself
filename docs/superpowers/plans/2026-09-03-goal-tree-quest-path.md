# 目标工作树行动路径 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将目标工作树改造成主目标 → 月目标 → 周目标 → 今日三任务的纵向行动路径，并保留现有节点编辑和状态持久化能力。

**Architecture:** 扩展既有工作树读模型，以同一活跃分支的 `task` 摘要丰富月周节点；页面组件依据日期和节点状态将当前路径默认展开，并将未来节点收起。任务继续调用既有完成接口，客户端成功后移除本地任务状态。

**Tech Stack:** Next.js 16、React 19、TypeScript、CSS Modules、SQLite/D1 适配层、Vitest。

## Global Constraints

- 保持唯一活跃主目标和单一活跃规划分支，不新增数据库迁移。
- 不添加生产依赖或图形图库；只使用现有 React 与 CSS Modules。
- 保留月、周目标的创建、编辑、采纳、完成和暂停操作。
- `start_date` 晚于本地当天的月、周节点默认淡化收起；状态不只用颜色表达。
- 今日行动组显示最多 3 个计划中任务：一项关键行动与至少两项支撑行动；超过 3 项链接到 `/today`。
- 每次 JavaScript/TypeScript 改动后运行 `npm test`；完成前运行 `npm run typecheck` 与 `npm run lint`。
- 每项通过测试的功能在 `codex/syself-workspace-upgrade` 分支独立提交；不合并、不上传。

---

## File Structure

- `lib/workspace-repository.ts`：工作树节点与任务摘要读模型。
- `tests/workspace-api.test.ts`：读模型返回任务与分支边界测试。
- `app/workspace/goal-work-tree.tsx`：纵向行动路径、未来节点和三任务组。
- `app/workspace/goal-work-tree.module.css`：协调色彩、层级、窄屏布局与减少动效。
- `tests/goal-tree-page.test.tsx`：页面结构与三任务渲染测试。
- `app/goal-tree/goal-tree-client.tsx`：获取任务摘要并从树中完成任务。

### Task 1: 扩展工作树读模型

**Files:**
- Modify: `lib/workspace-repository.ts:4-20`
- Modify: `tests/workspace-api.test.ts:1-25`

**Interfaces:**
- Consumes: `goal_work_node`、`planning_branch` 和 `task.work_node_id`。
- Produces: `GoalWorkTreeTaskRecord` 与 `getGoalWorkTree(goalId): Promise<{ branch; nodes; tasks }>`；无活跃分支时 `tasks: []`。

- [ ] **Step 1: 写入失败的任务摘要测试**

在 `tests/workspace-api.test.ts` 追加：

```ts
import { getGoalWorkTree } from '@/lib/workspace-repository';

it('返回当前分支中归属周目标的任务摘要', async () => {
  const db = getTestDb(); const goal = generateId(), branch = generateId(), month = generateId(), week = generateId(), task = generateId();
  db.prepare("UPDATE goal SET status = 'draft' WHERE status = 'active'").run();
  db.prepare("INSERT INTO goal (id, raw_input, status) VALUES (?, ?, 'active')").run(goal, '学习 NLP');
  db.prepare("INSERT INTO planning_branch (id, goal_id, status) VALUES (?, ?, 'active')").run(branch, goal);
  db.prepare("INSERT INTO goal_work_node (id, goal_id, parent_id, branch_id, node_type, title, success_criteria, start_date, end_date, status, source) VALUES (?, ?, NULL, ?, 'month', '建立 NLP 基础', '完成数据准备', '2026-09-01', '2026-09-30', 'active', 'manual')").run(month, goal, branch);
  db.prepare("INSERT INTO goal_work_node (id, goal_id, parent_id, branch_id, node_type, title, success_criteria, start_date, end_date, status, source) VALUES (?, ?, ?, ?, 'week', '训练首个基线', '跑通训练', '2026-09-01', '2026-09-07', 'active', 'manual')").run(week, goal, month, branch);
  db.prepare("INSERT INTO task (id, goal_id, work_node_id, title, completion_criteria, minimum_action, estimated_minutes, day_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned')").run(task, goal, week, '整理中文情感数据集', '输出可训练数据', '标记 20 条样本', 60, '2026-09-04');
  await expect(getGoalWorkTree(goal)).resolves.toMatchObject({ tasks: [expect.objectContaining({ id: task, work_node_id: week, minimum_action: '标记 20 条样本', estimated_minutes: 60 })] });
});
```

- [ ] **Step 2: 运行失败测试**

运行：`npm test -- tests/workspace-api.test.ts`  
预期：新增测试失败，因为返回对象没有 `tasks`。

- [ ] **Step 3: 实现分支限定的任务查询**

在 `lib/workspace-repository.ts` 的 `GoalWorkNodeRecord` 下新增：

```ts
export type GoalWorkTreeTaskRecord = {
  id: string; work_node_id: string | null; title: string; completion_criteria: string | null;
  minimum_action: string | null; estimated_minutes: number | null; day_date: string | null;
  status: 'planned' | 'done' | 'skipped' | 'partial';
};
```

将 `getGoalWorkTree` 替换为：

```ts
export async function getGoalWorkTree(goalId: string) {
  const branch = await getActiveBranch(goalId);
  if (!branch) return { branch: null, nodes: [] as GoalWorkNodeRecord[], tasks: [] as GoalWorkTreeTaskRecord[] };
  const nodes = await all<GoalWorkNodeRecord>('SELECT * FROM goal_work_node WHERE goal_id = ? AND branch_id = ? ORDER BY start_date, created_at', goalId, branch.id);
  const tasks = await all<GoalWorkTreeTaskRecord>(
    `SELECT task.id, task.work_node_id, task.title, task.completion_criteria, task.minimum_action, task.estimated_minutes, task.day_date, task.status
     FROM task INNER JOIN goal_work_node ON goal_work_node.id = task.work_node_id
     WHERE task.goal_id = ? AND goal_work_node.branch_id = ? ORDER BY task.day_date, task.created_at`, goalId, branch.id,
  );
  return { branch, nodes, tasks };
}
```

- [ ] **Step 4: 验证并提交**

运行：`npm test -- tests/workspace-api.test.ts`，预期 PASS。  
运行：`npm test`，预期全部 PASS。

```bash
git add lib/workspace-repository.ts tests/workspace-api.test.ts
git commit -m "feat: expose tasks in goal work tree"
```

### Task 2: 渲染纵向行动路径与三任务行动组

**Files:**
- Modify: `app/workspace/goal-work-tree.tsx:1-6`
- Modify: `app/workspace/goal-work-tree.module.css:1-2`
- Modify: `tests/goal-tree-page.test.tsx:1-30`

**Interfaces:**
- Consumes: `TreeNode` 日期字段、`TreeTask[]` 与 `onCompleteTask(id)`。
- Produces: `GoalWorkTree({ goalName, nodes, tasks, today, onAction, onEdit, onCreate, onSuggest, onCompleteTask })`；未来节点以原生 `details` 提供键盘可用的折叠。

- [ ] **Step 1: 用路径和三任务案例替换首个页面测试**

在 `tests/goal-tree-page.test.tsx` 传入如下核心数据，并断言结构：

```tsx
const html = renderToStaticMarkup(<GoalWorkTree goalName="学习 NLP" today="2026-09-04"
  nodes={[
    { id: 'm1', parent_id: null, node_type: 'month', title: '建立 NLP 基础', success_criteria: '完成数据准备', start_date: '2026-09-01', end_date: '2026-09-30', status: 'active', source: 'manual' },
    { id: 'w1', parent_id: 'm1', node_type: 'week', title: '训练首个基线', success_criteria: '跑通训练', start_date: '2026-09-01', end_date: '2026-09-07', status: 'active', source: 'manual' },
    { id: 'm2', parent_id: null, node_type: 'month', title: '评估模型表现', success_criteria: '完成误差分析', start_date: '2026-10-01', end_date: '2026-10-31', status: 'suggested', source: 'ai_suggestion' },
  ]}
  tasks={[
    { id: 't1', work_node_id: 'w1', title: '整理中文情感数据集', completion_criteria: '输出可训练数据', minimum_action: '标记 20 条样本', estimated_minutes: 60, day_date: '2026-09-04', status: 'planned' },
    { id: 't2', work_node_id: 'w1', title: '训练 TF-IDF 基线', completion_criteria: '记录 F1', minimum_action: '运行训练脚本', estimated_minutes: 45, day_date: '2026-09-04', status: 'planned' },
    { id: 't3', work_node_id: 'w1', title: '写误差分析笔记', completion_criteria: '写下 3 个发现', minimum_action: '记录一个样本', estimated_minutes: 30, day_date: '2026-09-04', status: 'planned' },
  ]}
/>);
expect(html).toContain('学习 NLP');
expect(html).toContain('今日行动 · AI 已安排 3 项');
expect(html).toContain('整理中文情感数据集');
expect(html).toContain('训练 TF-IDF 基线');
expect(html).toContain('写误差分析笔记');
expect(html).toContain('未来节点，点击展开');
expect(html).toContain('查看今日全部任务');
```

- [ ] **Step 2: 运行失败测试**

运行：`npm test -- tests/goal-tree-page.test.tsx`  
预期：FAIL，组件尚不接受新的属性，也没有三任务区域。

- [ ] **Step 3: 实现语义化路径组件**

在 `app/workspace/goal-work-tree.tsx` 使用以下类型和筛选函数：

```ts
export type TreeNode = { id: string; parent_id: string | null; node_type: 'month' | 'week'; title: string; success_criteria: string; start_date: string; end_date: string; status: string; source: string };
export type TreeTask = { id: string; work_node_id: string | null; title: string; completion_criteria: string | null; minimum_action: string | null; estimated_minutes: number | null; day_date: string | null; status: string };
const isFuture = (node: TreeNode, today: string) => node.start_date > today;
const plannedToday = (tasks: TreeTask[], weekId: string, today: string) => tasks.filter((task) => task.work_node_id === weekId && task.day_date === today && task.status === 'planned');
```

根节点使用 `<article className={styles.goalNode}>`，月与周使用嵌套 `<ol>`，层级间输出 `<span className={styles.connector} aria-hidden="true" />`。未来节点必须使用：

```tsx
<details className={styles.futureNode}>
  <summary><span>{node.title}</span><small>{node.start_date} 开始 · 未来节点，点击展开</small></summary>
  <p>{node.success_criteria}</p>
  {children}
</details>
```

当前周节点后渲染以下行动组；`slice(0, 3)` 确保聚焦，第一项为关键行动：

```tsx
const actions = plannedToday(tasks, week.id, today);
<section className={styles.actionGroup} aria-label="今日行动">
  <div className={styles.actionGroupHeader}><p>今日行动 · AI 已安排 {actions.length} 项</p><a href="/today">查看今日全部任务</a></div>
  <ol className={styles.taskList}>{actions.slice(0, 3).map((task, index) => <li key={task.id} className={index === 0 ? styles.primaryTask : styles.supportTask}>
    <p>{index === 0 ? '关键行动' : '支撑行动'}</p><h4>{task.title}</h4><span>完成标准：{task.completion_criteria ?? task.minimum_action ?? '待补充'} · {task.estimated_minutes ?? 0} 分钟</span>
    <button type="button" onClick={() => onCompleteTask?.(task.id)}>完成</button>
  </li>)}</ol>
  {actions.length > 3 && <small>另有 {actions.length - 3} 项任务</small>}
</section>
```

- [ ] **Step 4: 替换左色条样式并实现窄屏布局**

以如下规则替换 `app/workspace/goal-work-tree.module.css` 中的 `.month` 左色条与旧卡片规则：

```css
.tree { --ink: #193e31; --paper: #fbfaf6; --line: #d7ded6; --mist: #eef1ed; --future: #79847e; max-width: 760px; }
.path { list-style: none; margin: 30px 0 0; padding: 0; }
.goalNode, .monthNode, .weekNode, .primaryTask, .supportTask { border: 1px solid var(--line); border-radius: 16px; background: var(--paper); box-shadow: 0 10px 28px rgb(25 62 49 / 6%); }
.goalNode { margin-inline: auto; max-width: 580px; padding: 28px; text-align: center; color: var(--ink); }
.monthNode { margin-inline: auto; max-width: 470px; padding: 22px; }.weekNode { margin-inline: auto; max-width: 390px; padding: 18px; }
.connector { display: block; width: 1px; height: 28px; margin: 0 auto; background: var(--line); }
.futureNode { max-width: 470px; margin: 16px auto; padding: 14px 18px; border: 1px dashed #c7cec8; border-radius: 14px; background: var(--mist); color: var(--future); }
.futureNode summary { cursor: pointer; display: grid; gap: 4px; }
.actionGroup { max-width: 560px; margin: 24px auto 0; padding: 18px; border: 1px solid var(--line); border-radius: 18px; background: #f4f6f1; }
.taskList { display: grid; grid-template-columns: 1.15fr 1fr 1fr; gap: 10px; list-style: none; padding: 0; }.primaryTask, .supportTask { padding: 14px; }
.primaryTask { background: #e8f0e9; border-color: #a8bbaa; }
@media (max-width: 640px) { .taskList { grid-template-columns: 1fr; } .goalNode, .monthNode, .weekNode { max-width: none; } }
@media (prefers-reduced-motion: reduce) { .futureNode, .futureNode * { transition: none; } }
```

- [ ] **Step 5: 验证并提交路径组件**

运行：`npm test -- tests/goal-tree-page.test.tsx`，预期 PASS。  
运行：`npm test`，预期全部 PASS。

```bash
git add app/workspace/goal-work-tree.tsx app/workspace/goal-work-tree.module.css tests/goal-tree-page.test.tsx
git commit -m "feat: render action-focused goal path"
```

### Task 3: 接入真实数据并从树中完成任务

**Files:**
- Modify: `app/goal-tree/goal-tree-client.tsx:1-20`
- Modify: `tests/goal-tree-page.test.tsx:1-70`
- Modify: `docs/superpowers/specs/2026-09-03-goal-tree-quest-path-design.md:3`

**Interfaces:**
- Consumes: Task 1 的 `tasks` 字段与 Task 2 的 `TreeTask`、`onCompleteTask`。
- Produces: 加载真实任务并调用 `POST /api/tasks/[id]/complete`；成功后将任务从树中移除。

- [ ] **Step 1: 追加完成回调契约测试**

在 `tests/goal-tree-page.test.tsx` 添加：

```tsx
it('为今日任务提供完成入口但静态渲染不触发回调', () => {
  const completed: string[] = [];
  const html = renderToStaticMarkup(<GoalWorkTree goalName="学习 NLP" today="2026-09-04" nodes={[{ id: 'm1', parent_id: null, node_type: 'month', title: '建立基础', success_criteria: '完成准备', start_date: '2026-09-01', end_date: '2026-09-30', status: 'active', source: 'manual' }, { id: 'w1', parent_id: 'm1', node_type: 'week', title: '跑通基线', success_criteria: '运行训练', start_date: '2026-09-01', end_date: '2026-09-07', status: 'active', source: 'manual' }]} tasks={[{ id: 't1', work_node_id: 'w1', title: '训练基线', completion_criteria: '记录 F1', minimum_action: '运行脚本', estimated_minutes: 45, day_date: '2026-09-04', status: 'planned' }]} onCompleteTask={(id) => completed.push(id)} />);
  expect(html).toContain('完成');
  expect(completed).toEqual([]);
});
```

- [ ] **Step 2: 运行测试并确认静态行为不回归**

运行：`npm test -- tests/goal-tree-page.test.tsx`  
预期：PASS。

- [ ] **Step 3: 更新客户端加载和完成处理**

在 `app/goal-tree/goal-tree-client.tsx` 扩展导入、状态和加载逻辑：

```ts
import { GoalWorkTree, type NewGoalWorkNode, type TreeNode, type TreeTask } from '@/app/workspace/goal-work-tree';
const [tasks, setTasks] = useState<TreeTask[]>([]);
// 在工作树响应后：
setNodes(body.nodes ?? []); setTasks(body.tasks ?? []); setBranchId(body.branch?.id ?? '');
```

加入完成函数并传入组件：

```ts
async function completeTask(id: string) {
  const response = await fetch(`/api/tasks/${id}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (!response.ok) { setError('完成今日任务失败，请重试。'); return; }
  setTasks((current) => current.filter((task) => task.id !== id));
}

<GoalWorkTree goalName={goal?.normalized_name ?? goal?.raw_input ?? '当前主目标'} nodes={nodes} tasks={tasks} today={new Date().toISOString().slice(0, 10)} onAction={act} onEdit={edit} onCreate={create} onSuggest={suggest} onCompleteTask={completeTask} />
```

将设计文档状态行更新为：

```md
状态：已实施，待用户体验确认
```

- [ ] **Step 4: 执行最终验证、人工演示和提交**

运行：`npm test && npm run typecheck && npm run lint`  
预期：三个命令均以退出码 0 完成。  
运行：`npm run dev`，打开 `http://localhost:3000/goal-tree`。  
预期：学习 NLP 的当前月/周和三项今日任务位于同一路径；未来节点默认收起且可展开；完成一项任务后它从树中消失。

```bash
git add app/goal-tree/goal-tree-client.tsx tests/goal-tree-page.test.tsx docs/superpowers/specs/2026-09-03-goal-tree-quest-path-design.md
git commit -m "feat: complete daily actions from goal path"
```

## Self-Review

- 规格覆盖：任务 1 覆盖任务数据及规划分支边界；任务 2 覆盖纵向结构、未来节点、三任务组、协调色彩、响应式与可访问性；任务 3 覆盖持久任务完成、页面同步与演示验收。
- 占位符扫描：未发现任何待填内容或模糊的延期实现步骤；每个实现动作包含具体的文件、代码或命令。
- 类型一致性：`GoalWorkTreeTaskRecord` 映射为前端 `TreeTask`，字段保持 snake_case；`onCompleteTask(id)` 调用已有 `/api/tasks/[id]/complete`，不引入新接口。
