# 工作台短标题实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将五个工作台页面的主标题统一压缩至八个汉字以内。

**Architecture:** 仅替换各页面组件中的静态 `h1` 文案。为每个已有页面渲染测试补充对应标题断言，确保文案在后续改动中不被意外替换。

**Tech Stack:** Next.js、React、TypeScript、Vitest。

## Global Constraints

- 只修改五个工作台页面的主标题，不调整布局、路由、数据或交互。
- 每个新标题不超过八个汉字。
- JavaScript/TypeScript 修改后必须运行 `npm test`。

---

### Task 1: 更新标题与页面渲染断言

**Files:**
- Modify: `app/workspace/dashboard-panel.tsx`
- Modify: `app/workspace/decision-timeline.tsx`
- Modify: `app/workspace/goal-work-tree.tsx`
- Modify: `app/today/today-client.tsx`
- Modify: `app/reflection/reflection-client.tsx`
- Modify: `tests/dashboard-page.test.tsx`
- Modify: `tests/decision-path-page.test.tsx`
- Modify: `tests/goal-tree-page.test.tsx`
- Modify: `tests/today-page.test.tsx`
- Modify: `tests/reflection-page.test.tsx`

**Interfaces:**
- Consumes: 各页面现有的静态 `h1` 元素与 Vitest 的 `renderToStaticMarkup`。
- Produces: 五个固定短标题及其渲染测试覆盖。

- [ ] **Step 1: 添加会失败的标题断言**

在五个测试的断言中分别加入：

```ts
expect(html).toContain('今天先做关键事');
expect(html).toContain('每一步都有来处');
expect(html).toContain('远大目标近处落地');
expect(html).toContain('此刻只做一件事');
expect(html).toContain('为明天留出余地');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --run tests/dashboard-page.test.tsx tests/decision-path-page.test.tsx tests/goal-tree-page.test.tsx tests/today-page.test.tsx tests/reflection-page.test.tsx`

Expected: FAIL，缺少新的短标题文本。

- [ ] **Step 3: 最小化替换五处 `h1` 文案**

将对应主标题替换为：

```tsx
<h1>今天先做关键事</h1>
<h1>每一步都有来处</h1>
<h1>远大目标近处落地</h1>
<h1>此刻只做一件事</h1>
<h1>为明天留出余地</h1>
```

- [ ] **Step 4: 运行目标测试确认通过**

Run: `npm test -- --run tests/dashboard-page.test.tsx tests/decision-path-page.test.tsx tests/goal-tree-page.test.tsx tests/today-page.test.tsx tests/reflection-page.test.tsx`

Expected: PASS，五个页面测试全部通过。

- [ ] **Step 5: 运行完整测试**

Run: `npm test`

Expected: PASS，全部测试通过。

- [ ] **Step 6: 提交**

```bash
git add app/workspace/dashboard-panel.tsx app/workspace/decision-timeline.tsx app/workspace/goal-work-tree.tsx app/today/today-client.tsx app/reflection/reflection-client.tsx tests/dashboard-page.test.tsx tests/decision-path-page.test.tsx tests/goal-tree-page.test.tsx tests/today-page.test.tsx tests/reflection-page.test.tsx
git commit -m "feat: shorten workspace page titles"
```
